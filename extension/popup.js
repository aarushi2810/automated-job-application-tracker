const BACKEND_BASE_URL =
  "https://automated-job-application-tracker.onrender.com";

function setStatus(message, type = "info") {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = type;
}

function setTokenBadge(connected, text) {
  const badge = document.getElementById("token-badge");
  const badgeText = document.getElementById("token-badge-text");
  if (!badge || !badgeText) return;

  badge.className = connected
    ? "token-status connected"
    : "token-status disconnected";
  badgeText.textContent = text;
}

async function getActiveTab() {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["jobTrackerToken"], (result) => {
      resolve(result && result.jobTrackerToken ? result.jobTrackerToken : null);
    });
  });
}

async function testBackendConnection(token) {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });

    if (!res.ok) {
      return { ok: false, error: `Backend returned HTTP ${res.status}` };
    }

    // If we have a token, also test auth by hitting a protected endpoint
    if (token) {
      const authRes = await fetch(`${BACKEND_BASE_URL}/applications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (authRes.status === 401) {
        return { ok: false, error: "Token is invalid or expired" };
      }

      if (!authRes.ok) {
        return { ok: false, error: `Auth check returned HTTP ${authRes.status}` };
      }

      return { ok: true, authenticated: true };
    }

    return { ok: true, authenticated: false };
  } catch (e) {
    return { ok: false, error: `Cannot reach backend: ${e.message}` };
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const companyInput = document.getElementById("company");
  const roleInput = document.getElementById("role");
  const locationInput = document.getElementById("location");
  const platformInput = document.getElementById("platform");
  const saveBtn = document.getElementById("save-btn");
  const tokenInput = document.getElementById("token");
  const saveTokenBtn = document.getElementById("save-token-btn");
  const testBtn = document.getElementById("test-btn");

  // --- Check token status on load ---
  const existingToken = await getStoredToken();

  if (existingToken) {
    setTokenBadge(false, "Verifying token...");
    const result = await testBackendConnection(existingToken);
    if (result.ok && result.authenticated) {
      setTokenBadge(true, "Connected & authenticated ✓");
    } else {
      setTokenBadge(false, result.error || "Token invalid");
      setStatus(
        "⚠️ Your saved token is no longer valid. Paste a new one below.",
        "error"
      );
    }
  } else {
    setTokenBadge(false, "Not connected — paste token below");
    setStatus(
      "⚠️ No token saved. Applications will NOT be tracked until you paste a JWT token.",
      "error"
    );
  }

  // --- Prefill job details from content script ---
  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id) {
    // Don't overwrite token warning
    if (existingToken) {
      setStatus("No active tab found.", "info");
    }
  } else {
    try {
      chrome.tabs.sendMessage(
        activeTab.id,
        { type: "GET_JOB_DETAILS" },
        (response) => {
          if (chrome.runtime.lastError) {
            // Only show this if we haven't already shown a more important message
            if (existingToken) {
              setStatus(
                "This page is not a supported job site, or the content script is not loaded.",
                "info"
              );
            }
            return;
          }

          if (response && response.job) {
            const { company, role, location, platform } = response.job;
            if (company) companyInput.value = company;
            if (role) roleInput.value = role;
            if (location) locationInput.value = location;
            if (platform) platformInput.value = platform;
            setStatus("Detected job details. Review and save.", "ok");
          } else {
            if (existingToken) {
              setStatus(
                "Could not auto-detect this job. Fill details manually.",
                "info"
              );
            }
          }
        }
      );
    } catch (e) {
      // ignore
    }
  }

  // --- Save application button ---
  saveBtn.addEventListener("click", async () => {
    if (!activeTab || !activeTab.url) {
      setStatus("No active job tab to save.", "error");
      return;
    }

    const token = await getStoredToken();
    if (!token) {
      setStatus(
        "❌ No token saved! Paste your JWT token below and save it first.",
        "error"
      );
      return;
    }

    const company = companyInput.value.trim();
    const role = roleInput.value.trim();
    const location = locationInput.value.trim();
    const platform =
      platformInput.value.trim() ||
      new URL(activeTab.url).hostname.replace(/^www\./, "");

    if (!company) {
      setStatus("Company is required to save.", "error");
      return;
    }

    saveBtn.disabled = true;
    setStatus("Saving application...", "info");

    chrome.runtime.sendMessage(
      {
        type: "SAVE_APPLICATION",
        payload: {
          company,
          role: role || "Unknown",
          platform,
          location: location || null,
          url: activeTab.url,
          pageTitle: activeTab.title,
          detectedAt: new Date().toISOString(),
          detectionMethod: "manual",
        },
      },
      (response) => {
        saveBtn.disabled = false;

        if (chrome.runtime.lastError) {
          setStatus(
            `Failed to reach background: ${chrome.runtime.lastError.message}`,
            "error"
          );
          return;
        }

        if (!response || !response.success) {
          setStatus(
            response && response.error
              ? `Save failed: ${response.error}`
              : "Save failed. Please try again.",
            "error"
          );
          return;
        }

        const message =
          response.data &&
          response.data.message === "Duplicate application ignored"
            ? "Already saved today (duplicate ignored)."
            : "✅ Application saved successfully!";
        setStatus(message, "ok");
      }
    );
  });

  // --- Save token button ---
  saveTokenBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (!token) {
      chrome.storage.sync.remove("jobTrackerToken", () => {
        tokenInput.value = "";
        tokenInput.placeholder = "Token cleared";
        setTokenBadge(false, "Token cleared — paste a new one");
        setStatus("Cleared saved token.", "info");
      });
      return;
    }

    chrome.storage.sync.set({ jobTrackerToken: token }, async () => {
      tokenInput.value = "";
      tokenInput.placeholder = "Token saved ✓";
      setStatus("Verifying token...", "info");

      // Immediately verify the new token
      const result = await testBackendConnection(token);
      if (result.ok && result.authenticated) {
        setTokenBadge(true, "Connected & authenticated ✓");
        setStatus("✅ Token saved and verified! Auto-tracking is active.", "ok");
      } else {
        setTokenBadge(false, result.error || "Token invalid");
        setStatus(
          `⚠️ Token saved but verification failed: ${result.error}. Check the token and try again.`,
          "error"
        );
      }
    });
  });

  // --- Test connection button ---
  testBtn.addEventListener("click", async () => {
    testBtn.disabled = true;
    testBtn.textContent = "Testing...";

    const token = await getStoredToken();
    const result = await testBackendConnection(token);

    testBtn.disabled = false;
    testBtn.textContent = "Test connection";

    if (result.ok) {
      if (result.authenticated) {
        setTokenBadge(true, "Connected & authenticated ✓");
        setStatus("✅ Backend reachable, token valid!", "ok");
      } else {
        setTokenBadge(false, "Backend online, but no token");
        setStatus(
          "Backend is reachable but no token saved. Paste your JWT token to enable tracking.",
          "info"
        );
      }
    } else {
      setTokenBadge(false, result.error);
      setStatus(`❌ Connection test failed: ${result.error}`, "error");
    }
  });
});
