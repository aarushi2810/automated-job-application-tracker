const OpenAI = require("openai");

let client = null;

// Initialize OpenAI ONLY if key exists
if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function matchResumeJDWithEmbeddings(resume, jd) {
  if (!client) {
    throw new Error("OpenAI not configured");
  }

  const embedding = async (text) => {
    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return res.data[0].embedding;
  };

  const [v1, v2] = await Promise.all([
    embedding(resume),
    embedding(jd),
  ]);

  const dot = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  const mag1 = Math.sqrt(v1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(v2.reduce((sum, v) => sum + v * v, 0));

  const score = Math.round((dot / (mag1 * mag2)) * 100);

  return {
    score,
    verdict:
      score > 70 ? "Strong match" :
      score > 40 ? "Moderate match" :
      "Weak match",
  };
}

module.exports = { matchResumeJDWithEmbeddings };