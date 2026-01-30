fetch("https://automated-job-application-tracker.onrender.com/ingest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    company: document.title.slice(0, 100),
    role: "Unknown",
    platform: window.location.hostname
  })
});