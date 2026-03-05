console.log(" Job Tracker content script loaded");

let saved = false;

function saveApplication() {
  if (saved) return;
  saved = true;

  console.log("Job application detected");

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
  "successfully applied",
  "your application has been submitted",
  "application complete"
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

    console.log(" URL changed");

    lastUrl = location.href;

    setTimeout(() => {
      checkKeywords();
    }, 1500);

  }

});

urlObserver.observe(document, {
  subtree: true,
  childList: true
});



const applyKeywords = [
  "apply",
  "easy apply",
  "submit",
  "submit application",
  "finish application",
  "continue application"
];

document.addEventListener("click", (e) => {

  const btn = e.target.closest("button");

  if (!btn) return;

  const text = btn.innerText.toLowerCase();

  for (let k of applyKeywords) {

    if (text.includes(k)) {

      console.log(" Apply button clicked:", text);

      setTimeout(() => {
        checkKeywords();
      }, 4000);

      break;

    }

  }

});



document.addEventListener("submit", () => {

  console.log(" Application form submitted");

  setTimeout(() => {
    checkKeywords();
  }, 4000);

});


setInterval(() => {
  checkKeywords();
}, 3000);
