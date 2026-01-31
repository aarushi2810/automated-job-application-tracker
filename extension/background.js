chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SAVE_APPLICATION") return;

  (async () => {
    try {
      const res = await fetch(
        "https://automated-job-application-tracker.onrender.com/applications/ingest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(message.payload)
        }
      );

      const data = await res.json();

      console.log("Background saved application:", data);
      sendResponse({ success: true, data });
    } catch (err) {
      console.error("Background save failed:", err);
      sendResponse({ success: false, error: err.toString() });
    }
  })();

  return true; // keep channel open
});
