const natural = require("natural");
const { removeStopwords } = require("stopword");

const tokenizer = new natural.WordTokenizer();

const SKILL_MAP = {
    "node.js": "javascript",
    "nodejs": "javascript",
    "postgresql": "database",
    "sql": "database",
    "backend": "server"
  };
  
function normalizeSkills(text) {
    let normalized = text.toLowerCase();
    for (const key in SKILL_MAP) {
      normalized = normalized.replaceAll(key, SKILL_MAP[key]);
    }
    return normalized;
  }

function preprocess(text) {
    const normalized = normalizeSkills(text);
    const tokens = tokenizer.tokenize(normalized);
    return removeStopwords(tokens).join(" ");
  }

function cosineSimilarity(vecA, vecB) {
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let k in vecA) {
    if (vecB[k]) dot += vecA[k] * vecB[k];
    normA += vecA[k] * vecA[k];
  }
  for (let k in vecB) normB += vecB[k] * vecB[k];
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

function tfidfVector(tfidf, text) {
  const vec = {};
  tfidf.tfidfs(text, (i, measure) => {
    vec[i] = measure;
  });
  return vec;
}

function matchResumeJD(resumeText, jdText) {
  const resume = preprocess(resumeText);
  const jd = preprocess(jdText);

  const tfidf = new natural.TfIdf();
  tfidf.addDocument(resume);
  tfidf.addDocument(jd);

  const vecA = tfidfVector(tfidf, resume);
  const vecB = tfidfVector(tfidf, jd);

  const score = Math.round(cosineSimilarity(vecA, vecB) * 100);

  return {
    score,
    verdict:
      score >= 70 ? "Strong match" :
      score >= 40 ? "Moderate match" :
      "Weak match"
  };
}

module.exports = { matchResumeJD };