chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_APPLICATION") {
    fetch("https://automated-job-application-tracker.onrender.com/applications/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message.payload)
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(err => {
        console.error("Ingest failed", err);
        sendResponse({ success: false, error: err.toString() });
      });

    // REQUIRED for async response
    return true;
  }
});
