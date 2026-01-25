console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cosineSimilarity(a, b) {
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function matchResumeJDWithEmbeddings(resume, jd) {
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: [resume, jd]
  });

  const [resumeVec, jdVec] = response.data.map(d => d.embedding);
  const similarity = cosineSimilarity(resumeVec, jdVec);
  const score = Math.round(similarity * 100);

  return {
    score,
    verdict:
      score >= 75 ? "Strong match" :
      score >= 45 ? "Moderate match" :
      "Weak match"
  };
}

module.exports = { matchResumeJDWithEmbeddings };