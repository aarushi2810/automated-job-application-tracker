console.log(" Job Tracker content script loaded");

let saved = false;

function saveApplication() {
  if (saved) return;
  saved = true;

  console.log(" Job application detected");

  chrome.runtime.sendMessage({
    type: "SAVE_APPLICATION",
    payload: {
      pageText: document.body.innerText,
      title: document.title,
      url: window.location.href
    }
  });
}



const keywords = [
  "thank you for applying",
  "application received",
  "application submitted",
  "we have received your application",
  "successfully applied"
];

function checkKeywords() {
  const text = document.body.innerText.toLowerCase();

  for (let word of keywords) {
    if (text.includes(word)) {
      saveApplication();
      break;
    }
  }
}



let lastUrl = location.href;

const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(checkKeywords, 1000);
  }
});

urlObserver.observe(document, { subtree: true, childList: true });



document.addEventListener("click", (e) => {

  const btn = e.target.closest("button");

  if (!btn) return;

  const text = btn.innerText.toLowerCase();

  if (
    text.includes("apply") ||
    text.includes("submit application")
  ) {
    console.log(" Apply button clicked");

    setTimeout(checkKeywords, 5000);
  }

});



setInterval(checkKeywords, 2000);
