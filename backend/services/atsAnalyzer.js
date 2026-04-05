/**
 * ATS Resume Analyzer — Core Analysis Engine
 *
 * Pure algorithmic analysis (no API key required for core scoring).
 * Extracts keywords from JD, matches against resume, checks formatting,
 * analyzes sections, and scores bullet points.
 */

const natural = require("natural");
const { removeStopwords } = require("stopword");

const tokenizer = new natural.WordTokenizer();

// ---------------------------------------------------------------------------
// Known skill / keyword dictionaries
// ---------------------------------------------------------------------------

const TECH_SKILLS = new Set([
  // Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "golang",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
  "html", "css", "sass", "scss", "less",
  // Frontend
  "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs",
  "vue.js", "svelte", "next.js", "nextjs", "nuxt", "gatsby", "remix",
  "tailwind", "tailwindcss", "bootstrap", "material-ui", "mui", "chakra",
  "redux", "zustand", "mobx", "webpack", "vite", "rollup", "parcel",
  // Backend
  "node", "nodejs", "node.js", "express", "expressjs", "fastify", "koa",
  "django", "flask", "fastapi", "spring", "spring boot", "springboot",
  "rails", "ruby on rails", "laravel", "asp.net", ".net", "dotnet",
  "graphql", "rest", "restful", "api", "microservices",
  // Database
  "sql", "postgresql", "postgres", "mysql", "mongodb", "redis", "dynamodb",
  "cassandra", "elasticsearch", "sqlite", "oracle", "firebase", "firestore",
  "supabase", "prisma", "sequelize", "mongoose", "typeorm", "knex",
  // Cloud & DevOps
  "aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify",
  "render", "docker", "kubernetes", "k8s", "terraform", "ansible",
  "jenkins", "github actions", "gitlab ci", "ci/cd", "cicd",
  "nginx", "apache", "linux", "bash", "shell",
  // Data / ML / AI
  "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
  "scikit-learn", "sklearn", "pandas", "numpy", "jupyter", "nlp",
  "computer vision", "opencv", "llm", "openai", "langchain", "rag",
  "data science", "data engineering", "etl", "spark", "hadoop", "airflow",
  "tableau", "power bi", "powerbi",
  // Tools
  "git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack",
  "figma", "sketch", "postman", "swagger", "storybook",
  // Testing
  "jest", "mocha", "chai", "cypress", "playwright", "selenium",
  "pytest", "unittest", "testing", "tdd", "bdd", "unit testing",
  // Concepts
  "agile", "scrum", "kanban", "oop", "functional programming",
  "design patterns", "solid", "dry", "clean code", "code review",
  "system design", "scalability", "performance", "optimization",
  "security", "authentication", "authorization", "oauth", "jwt",
  "websockets", "socket.io", "real-time",
]);

const SOFT_SKILLS = new Set([
  "leadership", "communication", "teamwork", "collaboration",
  "problem-solving", "problem solving", "analytical", "critical thinking",
  "time management", "project management", "mentoring", "mentorship",
  "presentation", "stakeholder", "cross-functional", "self-motivated",
  "detail-oriented", "detail oriented", "fast-paced", "deadline",
]);

const STRONG_ACTION_VERBS = new Set([
  "achieved", "architected", "automated", "built", "created", "delivered",
  "deployed", "designed", "developed", "drove", "eliminated", "engineered",
  "established", "executed", "generated", "implemented", "improved",
  "increased", "integrated", "launched", "led", "managed", "migrated",
  "optimized", "orchestrated", "pioneered", "reduced", "refactored",
  "resolved", "scaled", "shipped", "spearheaded", "streamlined",
  "transformed",
]);

const WEAK_VERBS = new Set([
  "helped", "assisted", "worked", "was responsible", "participated",
  "involved", "contributed", "supported", "handled", "utilized", "used",
  "did", "made", "got",
]);

const EXPECTED_SECTIONS = [
  { name: "Contact Info", patterns: ["email", "phone", "linkedin", "@", "github"] },
  { name: "Summary/Objective", patterns: ["summary", "objective", "about", "professional summary", "career objective"] },
  { name: "Experience", patterns: ["experience", "work experience", "employment", "professional experience", "work history"] },
  { name: "Education", patterns: ["education", "academic", "university", "degree", "bachelor", "master", "b.tech", "b.sc", "m.tech", "m.sc"] },
  { name: "Skills", patterns: ["skills", "technical skills", "technologies", "proficiencies", "competencies", "tech stack"] },
  { name: "Projects", patterns: ["projects", "personal projects", "academic projects", "key projects", "portfolio"] },
  { name: "Certifications", patterns: ["certifications", "certificates", "certified", "credentials"] },
];

// ---------------------------------------------------------------------------
// Utility: tokenize + normalize
// ---------------------------------------------------------------------------

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s\.\+\#\-\/]/g, " ").replace(/\s+/g, " ").trim();
}

function extractTokens(text) {
  const normalized = normalize(text);
  return tokenizer.tokenize(normalized);
}

// ---------------------------------------------------------------------------
// Keyword extraction from JD
// ---------------------------------------------------------------------------

function extractKeywordsFromJD(jdText) {
  const normalized = normalize(jdText);
  const tokens = extractTokens(jdText);

  const found = {
    technical: [],
    soft: [],
  };

  // Check multi-word skills first (e.g., "machine learning", "spring boot")
  for (const skill of TECH_SKILLS) {
    if (skill.includes(" ") && normalized.includes(skill)) {
      found.technical.push(skill);
    }
  }

  // Check single-word skills
  const tokenSet = new Set(tokens);
  for (const skill of TECH_SKILLS) {
    if (!skill.includes(" ") && tokenSet.has(skill)) {
      if (!found.technical.includes(skill)) {
        found.technical.push(skill);
      }
    }
  }

  // Check soft skills
  for (const skill of SOFT_SKILLS) {
    if (normalized.includes(skill)) {
      found.soft.push(skill);
    }
  }

  // Also extract N-grams that appear frequently (custom keywords not in dict)
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(tokens[i] + " " + tokens[i + 1]);
  }

  return {
    technical: [...new Set(found.technical)],
    soft: [...new Set(found.soft)],
    all: [...new Set([...found.technical, ...found.soft])],
  };
}

// ---------------------------------------------------------------------------
// Match keywords against resume
// ---------------------------------------------------------------------------

function matchKeywords(resumeText, jdKeywords) {
  const normalized = normalize(resumeText);
  const resumeTokens = new Set(extractTokens(resumeText));

  const found = [];
  const missing = [];

  for (const keyword of jdKeywords.all) {
    if (keyword.includes(" ")) {
      // Multi-word: check substring
      if (normalized.includes(keyword)) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    } else {
      // Single-word: check token set
      if (resumeTokens.has(keyword)) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    }
  }

  // Find extra skills in resume not in JD (bonus skills)
  const extras = [];
  for (const skill of TECH_SKILLS) {
    if (skill.includes(" ") ? normalized.includes(skill) : resumeTokens.has(skill)) {
      if (!jdKeywords.all.includes(skill) && !found.includes(skill)) {
        extras.push(skill);
      }
    }
  }

  const total = jdKeywords.all.length;
  const score = total > 0 ? Math.round((found.length / total) * 100) : 0;

  return { score, found, missing, extras: extras.slice(0, 10), total };
}

// ---------------------------------------------------------------------------
// Formatting analysis
// ---------------------------------------------------------------------------

function analyzeFormatting(resumeText) {
  const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  const text = resumeText.toLowerCase();
  const issues = [];
  const passed = [];

  // Check for contact info
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(resumeText);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(resumeText);
  const hasLinkedIn = text.includes("linkedin");

  if (hasEmail) passed.push("Contains email address");
  else issues.push("Missing email address");

  if (hasPhone) passed.push("Contains phone number");
  else issues.push("Missing phone number");

  if (hasLinkedIn) passed.push("Contains LinkedIn profile");
  else issues.push("Consider adding LinkedIn profile URL");

  // Check for bullet points
  const bulletLines = lines.filter((l) => /^[-•●◦▪→\*]|^\d+[.\)]/.test(l));
  if (bulletLines.length >= 5) {
    passed.push(`Uses bullet points (${bulletLines.length} found)`);
  } else if (bulletLines.length > 0) {
    issues.push(`Few bullet points found (${bulletLines.length}). Use more for readability`);
  } else {
    issues.push("No bullet points detected. ATS and recruiters prefer bulleted achievements");
  }

  // Check for measurable metrics
  const metricLines = lines.filter((l) => /\d+%|\d+x|\$\d|reduced|increased|improved|saved|generated|grew|boosted/i.test(l));
  if (metricLines.length >= 3) {
    passed.push(`Contains quantified achievements (${metricLines.length} found)`);
  } else if (metricLines.length > 0) {
    issues.push(`Only ${metricLines.length} quantified achievement(s). Add more numbers/metrics`);
  } else {
    issues.push("No measurable metrics found. Add percentages, numbers, and quantified impact");
  }

  // Check length
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount < 150) {
    issues.push(`Resume is too short (${wordCount} words). Aim for 400-800 words`);
  } else if (wordCount > 1200) {
    issues.push(`Resume is too long (${wordCount} words). Keep under 800 words for junior roles`);
  } else {
    passed.push(`Good length (${wordCount} words)`);
  }

  // Check for dates
  const hasDate = /\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current/i.test(resumeText);
  if (hasDate) {
    passed.push("Contains dates/timeline");
  } else {
    issues.push("No dates found. Include employment dates for experience entries");
  }

  // Check for common ATS-unfriendly elements
  if (text.includes("table") || text.includes("column")) {
    issues.push("Possible table layout detected. ATS may not parse tables correctly");
  }

  const score = Math.round((passed.length / (passed.length + issues.length)) * 100);

  return { score, issues, passed };
}

// ---------------------------------------------------------------------------
// Section analysis
// ---------------------------------------------------------------------------

function analyzeSections(resumeText) {
  const text = resumeText.toLowerCase();
  const found = [];
  const missing = [];
  const warnings = [];

  for (const section of EXPECTED_SECTIONS) {
    const isPresent = section.patterns.some((p) => text.includes(p));
    if (isPresent) {
      found.push(section.name);
    } else {
      missing.push(section.name);
    }
  }

  // Check Skills section depth
  const skillsMatch = text.match(/skills[\s\S]{0,500}/i);
  if (skillsMatch && skillsMatch[0].split(/\s+/).length < 10) {
    warnings.push("Skills section appears too short. List all relevant technologies");
  }

  // Check if Experience has enough entries
  const expMatches = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/gi);
  if (expMatches && expMatches.length < 2) {
    warnings.push("Only one dated experience entry found. Add more if available");
  }

  const criticalSections = ["Experience", "Education", "Skills"];
  const criticalFound = criticalSections.filter((s) => found.includes(s));
  const score = Math.round((criticalFound.length / criticalSections.length) * 70 +
    ((found.length - criticalFound.length) / Math.max(EXPECTED_SECTIONS.length - criticalSections.length, 1)) * 30);

  return { score, found, missing, warnings };
}

// ---------------------------------------------------------------------------
// Bullet point analysis
// ---------------------------------------------------------------------------

function analyzeBullets(resumeText) {
  const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract lines that look like bullet points or achievement lines
  const bulletLines = lines.filter((l) =>
    /^[-•●◦▪→\*]/.test(l) || // starts with bullet
    /^[A-Z][a-z]+ed\s/.test(l) || // starts with past-tense verb
    l.length > 30 // long-enough lines in experience sections
  ).filter((l) => l.length > 15 && l.length < 300);

  const weak = [];
  const strong = [];

  for (const line of bulletLines) {
    const lower = line.replace(/^[-•●◦▪→\*]\s*/, "").trim();
    const words = lower.split(/\s+/);
    const firstWord = words[0]?.toLowerCase();

    const hasMetrics = /\d+%|\d+x|\$\d|\d+ (users|clients|team|projects|applications|endpoints|components|features)/i.test(line);
    const hasStrongVerb = STRONG_ACTION_VERBS.has(firstWord);
    const hasWeakVerb = WEAK_VERBS.has(firstWord) || WEAK_VERBS.has(words.slice(0, 2).join(" ").toLowerCase());
    const isTooShort = words.length < 6;
    const isTooVague = !hasMetrics && (hasWeakVerb || isTooShort);

    if (isTooVague) {
      weak.push(lower);
    } else if (hasMetrics || hasStrongVerb) {
      strong.push(lower);
    }
  }

  return {
    weak: weak.slice(0, 8),
    strong: strong.slice(0, 5),
    totalBullets: bulletLines.length,
  };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

function analyzeResume(resumeText, jobDescription) {
  const jdKeywords = extractKeywordsFromJD(jobDescription);
  const keywordMatch = matchKeywords(resumeText, jdKeywords);
  const formatting = analyzeFormatting(resumeText);
  const sections = analyzeSections(resumeText);
  const bullets = analyzeBullets(resumeText);

  // Weighted overall score
  const overallScore = Math.round(
    keywordMatch.score * 0.40 +
    formatting.score * 0.20 +
    sections.score * 0.25 +
    (bullets.strong.length / Math.max(bullets.strong.length + bullets.weak.length, 1)) * 100 * 0.15
  );

  let verdict;
  if (overallScore >= 80) verdict = "Excellent — strong ATS match";
  else if (overallScore >= 65) verdict = "Good — minor optimizations needed";
  else if (overallScore >= 45) verdict = "Fair — significant gaps to address";
  else verdict = "Needs work — major keyword and formatting gaps";

  return {
    overallScore,
    verdict,
    keywordMatch,
    formatting,
    sections,
    bullets,
    jdKeywords,
  };
}

module.exports = { analyzeResume, extractKeywordsFromJD };
