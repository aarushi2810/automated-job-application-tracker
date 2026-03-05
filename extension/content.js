console.log("Job Tracker content script loaded");

// --- Helpers for parsing job details ----------------------------------------

function normalizeHost(hostname) {
  return hostname.replace(/^www\./, "");
}

function getBasePlatform() {
  return normalizeHost(window.location.hostname);
}

function parseLinkedIn() {
  const titleEl = document.querySelector(
    "h1.jobs-unified-top-card__job-title, h1.topcard__title, h1"
  );
  const companyEl = document.querySelector(
    ".jobs-unified-top-card__company-name a, a.topcard__org-name-link, .jobs-unified-top-card__company-name"
  );
  const locationEl = document.querySelector(
    ".jobs-unified-top-card__bullet, .jobs-unified-top-card__primary-description"
  );

  return {
    company: companyEl?.innerText.trim() || null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "LinkedIn",
  };
}

function parseGreenhouse() {
  const titleEl = document.querySelector("h1.app-title, h1");
  const companyEl =
    document.querySelector(".company-name") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl =
    document.querySelector(".location") ||
    document.querySelector(".app-location");

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Greenhouse",
  };
}

function parseLever() {
  const titleEl = document.querySelector("h2.posting-headline, h1");
  const companyEl =
    document.querySelector(".posting-category.company") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl = document.querySelector(".posting-category.location");

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Lever",
  };
}

function parseWorkday() {
  const titleEl = document.querySelector("h1, h2[data-automation-id='jobTitle']");
  const companyEl =
    document.querySelector("[data-automation-id='company'])") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl = document.querySelector(
    "[data-automation-id='jobLocation']"
  );

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Workday",
  };
}

function parseSmartRecruiters() {
  const titleEl = document.querySelector("h1, .job-title");
  const companyEl =
    document.querySelector(".company-name") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl =
    document.querySelector(".job-location") ||
    document.querySelector("[data-qa='job-location']");

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "SmartRecruiters",
  };
}

function parseGeneric() {
  const titleEl = document.querySelector("h1, h2");
  const companyCandidates = [
    "[data-company-name]",
    ".company",
    ".employer",
    ".job-header-company-name",
  ];
  let companyEl = null;
  for (const sel of companyCandidates) {
    companyEl = document.querySelector(sel);
    if (companyEl) break;
  }

  return {
    company: companyEl?.innerText.trim() || null,
    role: titleEl?.innerText.trim() || null,
    location: null,
    platform: getBasePlatform(),
  };
}

function getAdapter() {
  const host = normalizeHost(window.location.hostname);

  if (host.endsWith("linkedin.com")) return parseLinkedIn;
  if (host.endsWith("greenhouse.io")) return parseGreenhouse;
  if (host.endsWith("lever.co")) return parseLever;
  if (host.endsWith("workday.com")) return parseWorkday;
  if (host.endsWith("smartrecruiters.com")) return parseSmartRecruiters;

  return parseGeneric;
}

function getJobDetails() {
  const adapter = getAdapter();
  const base = adapter();

  return {
    ...base,
    url: window.location.href,
    pageTitle: document.title,
  };
}

// --- Saving logic & de-dup per job URL -------------------------------------

let savedForUrl = {};
let lastUrl = window.location.href;

function resetForNewUrl() {
  lastUrl = window.location.href;
}

function hasSavedForCurrentUrl() {
  const key = window.location.href;
  return Boolean(savedForUrl[key]);
}

function markSavedForCurrentUrl() {
  const key = window.location.href;
  savedForUrl[key] = true;
}

function saveApplication(detectionMethod = "keyword") {
  if (hasSavedForCurrentUrl()) return;

  const job = getJobDetails();
  if (!job.company && !job.role) {
    // If we truly can't parse anything meaningful, don't spam the backend.
    console.log(
      "[Job Tracker] Skipping save – could not parse company or role."
    );
    return;
  }

  markSavedForCurrentUrl();

  console.log(
    "[Job Tracker] Job application detected via",
    detectionMethod,
    job
  );

  chrome.runtime.sendMessage({
    type: "SAVE_APPLICATION",
    payload: {
      company: job.company || job.pageTitle || "Unknown",
      role: job.role || "Unknown",
      platform: job.platform || getBasePlatform(),
      location: job.location || null,
      url: job.url,
      pageTitle: job.pageTitle,
      detectedAt: new Date().toISOString(),
      detectionMethod,
      // Send a trimmed version of the page text so the backend can run
      // LLM-based enrichment. This is best-effort and size-limited to avoid
      // huge payloads.
      pageText:
        typeof document !== "undefined" && document.body
          ? document.body.innerText.slice(0, 12000)
          : null,
    },
  });
}

// --- Keyword-based detection as a fallback ----------------------------------

const keywords = [
  "thank you for applying",
  "application received",
  "application submitted",
  "we have received your application",
  "successfully applied",
  "your application has been submitted",
  "application complete",
  "you've applied",
];

function checkKeywords() {
  const text = document.body.innerText.toLowerCase();

  for (let word of keywords) {
    if (text.includes(word)) {
      saveApplication("keyword");
      break;
    }
  }
}

// --- Network-based detection (XHR + fetch) ----------------------------------

const APPLICATION_PATH_PATTERNS = [
  /apply/i,
  /applications?/i,
  /candidates?/i,
  /jobApply/i,
  /submitApplication/i,
];

function looksLikeApplicationRequest(url, method) {
  if (!url) return false;
  const m = (method || "GET").toUpperCase();
  if (m !== "POST") return false;

  let path = url;
  try {
    const u = new URL(url, window.location.origin);
    path = u.pathname + u.search;
  } catch {
    // ignore, use raw url
  }

  return APPLICATION_PATH_PATTERNS.some((re) => re.test(path));
}

(function patchNetwork() {
  try {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const [input, init = {}] = args;
        const url = typeof input === "string" ? input : input.url;
        const method = init.method || "GET";

        if (looksLikeApplicationRequest(url, method)) {
          saveApplication("network");
        }
      } catch (e) {
        // do not break page fetches
      }

      return originalFetch.apply(window, args);
    };
  } catch (e) {
    // fetch might not be patchable in rare environments; ignore
  }

  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (looksLikeApplicationRequest(url, method)) {
        this.addEventListener("load", () => {
          saveApplication("network");
        });
      }
      return originalOpen.call(this, method, url, ...rest);
    };
  } catch (e) {
    // ignore if XHR can't be patched
  }

  try {
    const originalBeacon = navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : null;

    if (originalBeacon) {
      navigator.sendBeacon = function (url, data) {
        try {
          if (looksLikeApplicationRequest(url, "POST")) {
            saveApplication("network");
          }
        } catch (e) {
          // never break the page's beacon usage
        }
        return originalBeacon(url, data);
      };
    }
  } catch (e) {
    // ignore if sendBeacon can't be patched
  }

  try {
    const originalFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function (...args) {
      try {
        // Treat silent form submissions similarly to user-triggered submits
        setTimeout(() => {
          checkKeywords();
        }, 4000);
      } catch (e) {
        // never break the page's submit behavior
      }
      return originalFormSubmit.apply(this, args);
    };
  } catch (e) {
    // ignore if form submit can't be patched
  }
})();

// --- URL-change + user interactions ----------------------------------------

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    console.log("[Job Tracker] URL changed, resetting state for new job.");
    resetForNewUrl();
  }
});

urlObserver.observe(document, {
  subtree: true,
  childList: true,
});

document.addEventListener("click", (e) => {
  const el = e.target.closest("button, a, div, span");
  if (!el) return;

  const text = el.innerText?.toLowerCase() || "";

  if (
    text.includes("apply") ||
    text.includes("easy apply") ||
    text.includes("submit") ||
    text.includes("submit application") ||
    text.includes("finish application")
  ) {
    console.log("[Job Tracker] Apply button clicked:", text);

    // Give the site time to send its network request / show confirmation
    setTimeout(() => {
      checkKeywords();
    }, 4000);
  }
});

document.addEventListener("submit", () => {
  console.log("[Job Tracker] Application form submitted");

  setTimeout(() => {
    checkKeywords();
  }, 4000);
});

// Periodic fallback in case we missed the exact moment
setInterval(() => {
  checkKeywords();
}, 3000);

// --- Message handler for popup: return parsed job details -------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_JOB_DETAILS") {
    try {
      const job = getJobDetails();
      sendResponse({ job });
    } catch (e) {
      sendResponse({ job: null, error: e.toString() });
    }
    return true;
  }

  return false;
});
