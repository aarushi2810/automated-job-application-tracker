function setStatus(message, type = "info") {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = type;
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

document.addEventListener("DOMContentLoaded", async () => {
  const companyInput = document.getElementById("company");
  const roleInput = document.getElementById("role");
  const locationInput = document.getElementById("location");
  const platformInput = document.getElementById("platform");
  const saveBtn = document.getElementById("save-btn");
  const tokenInput = document.getElementById("token");
  const saveTokenBtn = document.getElementById("save-token-btn");

  setStatus("Loading current job details...", "info");

  // Prefill token state (we don't show the real token, just indicate presence)
  chrome.storage.sync.get(["jobTrackerToken"], (result) => {
    if (result && result.jobTrackerToken) {
      tokenInput.placeholder = "Token saved";
    }
  });

  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id) {
    setStatus("No active tab found.", "error");
  } else {
    // Ask the content script on the current tab for parsed job details
    try {
      chrome.tabs.sendMessage(
        activeTab.id,
        { type: "GET_JOB_DETAILS" },
        (response) => {
          if (chrome.runtime.lastError) {
            setStatus(
              "This page is not a supported job site, or the content script is not loaded.",
              "error"
            );
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
            setStatus(
              "Could not auto-detect this job. Fill details and save manually.",
              "info"
            );
          }
        }
      );
    } catch (e) {
      setStatus("Unable to reach content script on this tab.", "error");
    }
  }

  saveBtn.addEventListener("click", async () => {
    if (!activeTab || !activeTab.url) {
      setStatus("No active job tab to save.", "error");
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
          response.data && response.data.message === "Duplicate application ignored"
            ? "Already saved today (duplicate ignored)."
            : "Application saved successfully.";
        setStatus(message, "ok");
      }
    );
  });

  saveTokenBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (!token) {
      chrome.storage.sync.remove("jobTrackerToken", () => {
        tokenInput.value = "";
        tokenInput.placeholder = "Token cleared";
        setStatus("Cleared saved token.", "info");
      });
      return;
    }

    chrome.storage.sync.set({ jobTrackerToken: token }, () => {
      tokenInput.value = "";
      tokenInput.placeholder = "Token saved";
      setStatus("Token saved for extension.", "ok");
    });
  });
}

