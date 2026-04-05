const BACKEND_BASE_URL =
  "https://automated-job-application-tracker.onrender.com";

// --- Notification helper -----------------------------------------------------

function showNotification(title, message) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%234f46e5"/><text x="24" y="32" text-anchor="middle" fill="white" font-size="24">📋</text></svg>'
      ),
      title,
      message,
      priority: 2,
    });
  } catch (e) {
    console.warn("[Job Tracker] Could not show notification:", e);
  }
}

// --- Main message handler ----------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SAVE_APPLICATION") return;

  (async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Attach user token if saved
      let token;
      try {
        const stored = await chrome.storage.sync.get(["jobTrackerToken"]);
        token = stored && stored.jobTrackerToken;
      } catch (e) {
        // ignore storage failures
      }

      if (!token) {
        console.warn(
          "[Job Tracker] No auth token found. Application cannot be saved."
        );
        showNotification(
          "⚠️ Job Tracker: Login Required",
          "Open the extension popup and paste your JWT token to start saving applications. This application was NOT saved."
        );
        sendResponse({
          success: false,
          error:
            "No auth token. Open the extension popup and paste your JWT token.",
        });
        return;
      }

      headers.Authorization = `Bearer ${token}`;

      console.log(
        "[Job Tracker] Sending application to backend:",
        message.payload.company,
        "-",
        message.payload.role
      );

      const res = await fetch(`${BACKEND_BASE_URL}/applications/ingest`, {
        method: "POST",
        headers,
        body: JSON.stringify(message.payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        console.error(
          "[Job Tracker] Auth failed — token may be expired:",
          data
        );
        showNotification(
          "⚠️ Job Tracker: Token Expired",
          "Your login token has expired. Open the extension popup to paste a new one. This application was NOT saved."
        );
        // Clear the bad token
        try {
          await chrome.storage.sync.remove("jobTrackerToken");
        } catch (e) {
          // ignore
        }
        sendResponse({
          success: false,
          error: "Token expired. Please re-login via the extension popup.",
        });
        return;
      }

      if (!res.ok) {
        console.error(
          "[Job Tracker] Save failed:",
          res.status,
          data
        );
        showNotification(
          "❌ Job Tracker: Save Failed",
          `Could not save application to ${message.payload.company}. Error: ${data.error || `HTTP ${res.status}`}`
        );
        sendResponse({
          success: false,
          error: data && data.error ? data.error : `HTTP ${res.status}`,
        });
        return;
      }

      // Success!
      const isDuplicate =
        data && data.message === "Duplicate application ignored";

      console.log(
        "[Job Tracker]",
        isDuplicate ? "Duplicate ignored:" : "✅ Application saved:",
        data
      );

      if (!isDuplicate) {
        showNotification(
          "✅ Application Saved!",
          `${message.payload.company} — ${message.payload.role}`
        );
      }

      sendResponse({ success: true, data });
    } catch (err) {
      console.error("[Job Tracker] Network error:", err);
      showNotification(
        "❌ Job Tracker: Connection Error",
        "Could not reach the backend server. Is it running? Check your internet connection."
      );
      sendResponse({ success: false, error: err.toString() });
    }
  })();

  return true; // keep channel open for async response
});

// --- Token status check on startup -------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const stored = await chrome.storage.sync.get(["jobTrackerToken"]);
    if (!stored || !stored.jobTrackerToken) {
      showNotification(
        "👋 Job Tracker Installed!",
        "Open the extension popup on any job site and paste your JWT token to start tracking applications automatically."
      );
    }
  } catch (e) {
    // ignore
  }
});
