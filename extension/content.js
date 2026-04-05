console.log("[Job Tracker] Content script loaded on", window.location.hostname);

// --- Helpers for parsing job details ----------------------------------------

function normalizeHost(hostname) {
  return hostname.replace(/^www\./, "");
}

function getBasePlatform() {
  return normalizeHost(window.location.hostname);
}

function parseLinkedIn() {
  const titleEl = document.querySelector(
    "h1.jobs-unified-top-card__job-title, h1.topcard__title, h1.t-24, h1"
  );
  const companyEl = document.querySelector(
    ".jobs-unified-top-card__company-name a, a.topcard__org-name-link, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name a"
  );
  const locationEl = document.querySelector(
    ".jobs-unified-top-card__bullet, .jobs-unified-top-card__primary-description, .job-details-jobs-unified-top-card__bullet"
  );

  return {
    company: companyEl?.innerText.trim() || null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "LinkedIn",
  };
}

function parseGreenhouse() {
  const titleEl = document.querySelector("h1.app-title, h1");
  const companyEl =
    document.querySelector(".company-name") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl =
    document.querySelector(".location") ||
    document.querySelector(".app-location");

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Greenhouse",
  };
}

function parseLever() {
  const titleEl = document.querySelector("h2.posting-headline, h1");
  const companyEl =
    document.querySelector(".posting-category.company") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl = document.querySelector(".posting-category.location");

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Lever",
  };
}

function parseWorkday() {
  // Bug 5 fix: removed the extra ')' from the selector
  const titleEl = document.querySelector("h1, h2[data-automation-id='jobTitle']");
  const companyEl =
    document.querySelector("[data-automation-id='company']") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl = document.querySelector(
    "[data-automation-id='jobLocation']"
  );

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Workday",
  };
}

function parseSmartRecruiters() {
  const titleEl = document.querySelector("h1, .job-title");
  const companyEl =
    document.querySelector(".company-name") ||
    document.querySelector("meta[property='og:site_name']");
  const locationEl =
    document.querySelector(".job-location") ||
    document.querySelector("[data-qa='job-location']");

  return {
    company:
      companyEl?.innerText?.trim() ||
      companyEl?.getAttribute("content")?.trim() ||
      null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "SmartRecruiters",
  };
}

function parseIndeed() {
  const titleEl = document.querySelector(
    "h1.jobsearch-JobInfoHeader-title, h1[data-testid='jobTitle'], h1"
  );
  const companyEl = document.querySelector(
    "[data-testid='inlineHeader-companyName'] a, .jobsearch-InlineCompanyRating-companyHeader a, [data-company-name]"
  );
  const locationEl = document.querySelector(
    "[data-testid='inlineHeader-companyLocation'], .jobsearch-JobInfoHeader-subtitle > div:last-child"
  );

  return {
    company: companyEl?.innerText?.trim() || null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Indeed",
  };
}

function parseGlassdoor() {
  const titleEl = document.querySelector(
    "h1[data-test='job-title'], h1.heading_Level1, h1"
  );
  const companyEl = document.querySelector(
    "[data-test='employer-name'], .css-87uc0g, .employer-name"
  );
  const locationEl = document.querySelector(
    "[data-test='location'], .css-56kyx5, .location"
  );

  return {
    company: companyEl?.innerText?.trim() || null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Glassdoor",
  };
}

function parseWellfound() {
  const titleEl = document.querySelector("h1, h2.header-font");
  const companyEl = document.querySelector(
    "a[data-test='startup-link'], h2.header-font + a, .company-name"
  );
  const locationEl = document.querySelector(
    ".location, [data-test='location']"
  );

  return {
    company: companyEl?.innerText?.trim() || null,
    role: titleEl?.innerText.trim() || null,
    location: locationEl?.innerText.trim() || null,
    platform: "Wellfound",
  };
}

function parseGeneric() {
  const titleEl = document.querySelector("h1, h2");
  const companyCandidates = [
    "[data-company-name]",
    ".company",
    ".employer",
    ".job-header-company-name",
    "[itemprop='hiringOrganization']",
    "meta[property='og:site_name']",
  ];
  let companyEl = null;
  for (const sel of companyCandidates) {
    companyEl = document.querySelector(sel);
    if (companyEl) break;
  }

  // Try to extract company from og:site_name meta tag
  const companyText =
    companyEl?.innerText?.trim() ||
    companyEl?.getAttribute("content")?.trim() ||
    null;

  return {
    company: companyText,
    role: titleEl?.innerText.trim() || null,
    location: null,
    platform: getBasePlatform(),
  };
}

function getAdapter() {
  const host = normalizeHost(window.location.hostname);

  if (host.endsWith("linkedin.com")) return parseLinkedIn;
  if (host.endsWith("greenhouse.io")) return parseGreenhouse;
  if (host.endsWith("lever.co")) return parseLever;
  if (host.endsWith("workday.com") || host.endsWith("myworkdayjobs.com"))
    return parseWorkday;
  if (host.endsWith("smartrecruiters.com")) return parseSmartRecruiters;
  if (host.endsWith("indeed.com")) return parseIndeed;
  if (host.endsWith("glassdoor.com") || host.endsWith("glassdoor.co.in"))
    return parseGlassdoor;
  if (host.endsWith("wellfound.com") || host.endsWith("angel.co"))
    return parseWellfound;

  return parseGeneric;
}

function getJobDetails() {
  const adapter = getAdapter();
  const base = adapter();

  return {
    ...base,
    url: window.location.href,
    pageTitle: document.title,
  };
}

// --- Saving logic & de-dup per job URL + detection method --------------------

const savedForUrl = {};
let lastUrl = window.location.href;

function resetForNewUrl() {
  lastUrl = window.location.href;
}

function hasSavedForCurrentUrl() {
  const key = window.location.href;
  return Boolean(savedForUrl[key]);
}

function markSavedForCurrentUrl() {
  const key = window.location.href;
  savedForUrl[key] = true;
}

function saveApplication(detectionMethod = "keyword") {
  if (hasSavedForCurrentUrl()) return;

  const job = getJobDetails();

  // If we can't find company, still try to use the page title or domain
  const company = job.company || extractCompanyFromTitle(job.pageTitle) || getBasePlatform();
  const role = job.role || extractRoleFromTitle(job.pageTitle) || "Unknown";

  markSavedForCurrentUrl();

  console.log(
    "[Job Tracker] ✅ Job application detected via",
    detectionMethod,
    { company, role, platform: job.platform }
  );

  chrome.runtime.sendMessage({
    type: "SAVE_APPLICATION",
    payload: {
      company,
      role,
      platform: job.platform || getBasePlatform(),
      location: job.location || null,
      url: job.url,
      pageTitle: job.pageTitle,
      detectedAt: new Date().toISOString(),
      detectionMethod,
      pageText:
        typeof document !== "undefined" && document.body
          ? document.body.innerText.slice(0, 12000)
          : null,
    },
  });
}

// Fallback extractors from page title
function extractCompanyFromTitle(title) {
  if (!title) return null;
  // Common patterns: "Role at Company", "Company - Role", "Role | Company"
  const atMatch = title.match(/at\s+(.+?)(?:\s*[-|]|$)/i);
  if (atMatch) return atMatch[1].trim();
  const pipeMatch = title.match(/\|\s*(.+?)$/);
  if (pipeMatch) return pipeMatch[1].trim();
  const dashMatch = title.match(/^(.+?)\s*-\s/);
  if (dashMatch) return dashMatch[1].trim();
  return null;
}

function extractRoleFromTitle(title) {
  if (!title) return null;
  const atMatch = title.match(/^(.+?)\s+at\s/i);
  if (atMatch) return atMatch[1].trim();
  const dashMatch = title.match(/-\s*(.+?)$/);
  if (dashMatch) return dashMatch[1].trim();
  return null;
}

// --- Expanded keyword-based detection ----------------------------------------

const CONFIRMATION_KEYWORDS = [
  "thank you for applying",
  "thanks for applying",
  "application received",
  "application submitted",
  "we have received your application",
  "successfully applied",
  "your application has been submitted",
  "application complete",
  "you've applied",
  "you have applied",
  "application was sent",
  "your application was submitted",
  "application sent successfully",
  "your application is submitted",
  "we received your application",
  "thank you for your interest",
  "you've successfully applied",
  "thanks for your application",
  "your resume has been submitted",
  "application confirmation",
  "you applied to this job",
  // LinkedIn specific
  "your application was sent",
  "done! your application was sent",
];

function checkKeywords(targetEl) {
  const el = targetEl || document.body;
  if (!el) return false;

  const text = el.innerText?.toLowerCase() || "";

  for (const keyword of CONFIRMATION_KEYWORDS) {
    if (text.includes(keyword)) {
      saveApplication("keyword");
      return true;
    }
  }
  return false;
}

// --- LinkedIn Easy Apply modal detection (Bug 3 fix) -------------------------

function checkLinkedInModal() {
  if (!normalizeHost(window.location.hostname).endsWith("linkedin.com")) return;

  // LinkedIn Easy Apply confirmation appears in various modal/overlay elements
  const modalSelectors = [
    ".artdeco-modal",
    ".artdeco-modal__content",
    ".jpac-modal",
    ".jobs-apply-modal",
    "[role='dialog']",
    "[role='alertdialog']",
    ".post-apply-timeline",
    ".jobs-post-apply-content",
  ];

  for (const sel of modalSelectors) {
    const modals = document.querySelectorAll(sel);
    for (const modal of modals) {
      const text = modal.innerText?.toLowerCase() || "";
      if (
        text.includes("application was sent") ||
        text.includes("applied") ||
        text.includes("your application") ||
        text.includes("done!")
      ) {
        saveApplication("linkedin-modal");
        return;
      }
    }
  }
}

// --- DOM Mutation-based confirmation observer (Bug 3 fix) --------------------

let confirmationObserver = null;

function startConfirmationObserver() {
  if (confirmationObserver) return;

  confirmationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check newly added nodes for confirmation text
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const text = node.innerText?.toLowerCase() || "";

        // Check if this new DOM element contains confirmation keywords
        for (const keyword of CONFIRMATION_KEYWORDS) {
          if (text.includes(keyword)) {
            console.log(
              "[Job Tracker] Confirmation detected via DOM mutation:",
              keyword
            );
            saveApplication("dom-mutation");
            return;
          }
        }
      }
    }
  });

  confirmationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// --- Bridge: receive network detection events from main-world script ---------

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "JOB_TRACKER_NETWORK_DETECTED") return;

  console.log(
    "[Job Tracker] Network-based application detected from main world:",
    event.data.url
  );
  saveApplication("network");
});

// --- URL-change detection (SPA support) --------------------------------------

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    console.log("[Job Tracker] URL changed, resetting state for new job.");
    resetForNewUrl();
  }
});

urlObserver.observe(document, {
  subtree: true,
  childList: true,
});

// --- Click-based detection ---------------------------------------------------

document.addEventListener("click", (e) => {
  const el = e.target.closest("button, a, div, span, input[type='submit']");
  if (!el) return;

  const text = (el.innerText || el.value || "").toLowerCase();

  if (
    text.includes("apply") ||
    text.includes("easy apply") ||
    text.includes("submit") ||
    text.includes("submit application") ||
    text.includes("finish application") ||
    text.includes("send application") ||
    text.includes("confirm application")
  ) {
    console.log("[Job Tracker] Apply/submit button clicked:", text);

    // Give the site time to send its request and show confirmation
    setTimeout(() => {
      checkKeywords();
      checkLinkedInModal();
    }, 3000);

    // Second check in case the confirmation takes longer
    setTimeout(() => {
      checkKeywords();
      checkLinkedInModal();
    }, 6000);
  }
});

document.addEventListener("submit", () => {
  console.log("[Job Tracker] Form submitted");

  setTimeout(() => {
    checkKeywords();
    checkLinkedInModal();
  }, 3000);

  setTimeout(() => {
    checkKeywords();
    checkLinkedInModal();
  }, 6000);
});

// --- Start all watchers ------------------------------------------------------

// Start the DOM mutation confirmation observer
startConfirmationObserver();

// Periodic fallback check (reduced frequency to avoid perf impact)
setInterval(() => {
  checkKeywords();
  checkLinkedInModal();
}, 5000);

// --- Message handler for popup: return parsed job details --------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_JOB_DETAILS") {
    try {
      const job = getJobDetails();
      sendResponse({ job });
    } catch (e) {
      sendResponse({ job: null, error: e.toString() });
    }
    return true;
  }

  return false;
});
