console.log("🚀 Job Tracker content script loaded");

const successKeywords = [
  "thank you for applying",
  "application submitted",
  "we received your application",
  "application received"
];

function checkForSubmission() {
  const text = document.body?.innerText?.toLowerCase() || "";
  return successKeywords.some(k => text.includes(k));
}

function saveApplication() {
  console.log(" Job application detected");

  chrome.runtime.sendMessage(
    {
      type: "SAVE_APPLICATION",
      payload: {
        company: document.title.slice(0, 100),
        role: "Unknown",
        platform: window.location.hostname
      }
    },
    response => {
      if (response?.success) {
        console.log("Saved application:", response.data);
      } else {
        console.error(" Failed to save", response?.error);
      }
    }
  );
}


document.addEventListener("DOMContentLoaded", () => {
  if (checkForSubmission()) {
    saveApplication();
  }

  const observer = new MutationObserver(() => {
    if (checkForSubmission()) {
      saveApplication();
      observer.disconnect(); 
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});