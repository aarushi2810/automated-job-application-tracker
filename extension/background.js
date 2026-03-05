const BACKEND_BASE_URL =
  "https://automated-job-application-tracker.onrender.com";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SAVE_APPLICATION") return;

  (async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      // Attach user token if the user has saved one in the popup
      let token;
      try {
        const stored = await chrome.storage.sync.get(["jobTrackerToken"]);
        token = stored && stored.jobTrackerToken;
      } catch (e) {
        // ignore storage failures, we'll just send without auth
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${BACKEND_BASE_URL}/applications/ingest`, {
        method: "POST",
        headers,
        body: JSON.stringify(message.payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Background save failed with status:", res.status, data);
        sendResponse({
          success: false,
          error: data && data.error ? data.error : `HTTP ${res.status}`,
        });
        return;
      }

      console.log("Background saved application:", data);
      sendResponse({ success: true, data });
    } catch (err) {
      console.error("Background save failed:", err);
      sendResponse({ success: false, error: err.toString() });
    }
  })();

  return true; // keep channel open
});
