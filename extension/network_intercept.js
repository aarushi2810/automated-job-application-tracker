// network_intercept.js — Injected in the MAIN world so it can intercept the
// page's actual fetch/XHR/sendBeacon calls (content scripts run in an isolated
// world in Manifest V3 and cannot intercept these).
//
// When a likely application-submit request is detected, this script posts a
// message to the content script via window.postMessage.

(function () {
  "use strict";

  const APPLICATION_PATH_PATTERNS = [
    /\/apply/i,
    /\/applications?\b/i,
    /\/candidates?\b/i,
    /\/jobApply/i,
    /\/submitApplication/i,
    /\/submit-application/i,
    /\/job-apply/i,
    /\/easy-apply/i,
    /\/resume\/submit/i,
  ];

  function looksLikeApplicationRequest(url, method) {
    if (!url) return false;
    const m = (method || "GET").toUpperCase();
    if (m !== "POST" && m !== "PUT") return false;

    let path = url;
    try {
      const u = new URL(url, window.location.origin);
      path = u.pathname + u.search;
    } catch {
      // use raw url
    }

    return APPLICATION_PATH_PATTERNS.some((re) => re.test(path));
  }

  function notifyContentScript(url) {
    window.postMessage(
      {
        type: "JOB_TRACKER_NETWORK_DETECTED",
        url: url,
      },
      "*"
    );
  }

  // --- Patch fetch -----------------------------------------------------------
  try {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const [input, init = {}] = args;
        const url = typeof input === "string" ? input : input?.url || "";
        const method = init.method || (input?.method) || "GET";

        if (looksLikeApplicationRequest(url, method)) {
          console.log("[Job Tracker Network] Application POST detected via fetch:", url);
          notifyContentScript(url);
        }
      } catch (e) {
        // never break page fetches
      }

      return originalFetch.apply(this, args);
    };
  } catch (e) {
    // fetch might not be patchable
  }

  // --- Patch XMLHttpRequest --------------------------------------------------
  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      try {
        if (looksLikeApplicationRequest(url, method)) {
          this.addEventListener("load", function () {
            if (this.status >= 200 && this.status < 400) {
              console.log("[Job Tracker Network] Application POST detected via XHR:", url);
              notifyContentScript(url);
            }
          });
        }
      } catch (e) {
        // never break XHR
      }
      return originalOpen.call(this, method, url, ...rest);
    };
  } catch (e) {
    // XHR might not be patchable
  }

  // --- Patch sendBeacon ------------------------------------------------------
  try {
    if (navigator.sendBeacon) {
      const originalBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) {
        try {
          if (looksLikeApplicationRequest(url, "POST")) {
            console.log("[Job Tracker Network] Application POST detected via sendBeacon:", url);
            notifyContentScript(url);
          }
        } catch (e) {
          // never break sendBeacon
        }
        return originalBeacon(url, data);
      };
    }
  } catch (e) {
    // ignore
  }

  // --- Patch form submit -----------------------------------------------------
  try {
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (...args) {
      try {
        const action = this.action || window.location.href;
        if (looksLikeApplicationRequest(action, "POST")) {
          console.log("[Job Tracker Network] Form submit detected:", action);
          notifyContentScript(action);
        }
      } catch (e) {
        // never break form submit
      }
      return originalSubmit.apply(this, args);
    };
  } catch (e) {
    // ignore
  }

  console.log("[Job Tracker Network] Main-world network interceptor loaded.");
})();
