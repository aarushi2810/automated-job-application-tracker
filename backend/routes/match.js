const express = require("express");
const router = express.Router();

const { matchResumeJD } = require("../services/match");
const { matchResumeJDWithEmbeddings } = require("../services/embeddingMatch");


router.post("/", (req, res) => {
  const { resume, jd } = req.body;

  if (!resume || !jd) {
    return res.status(400).json({ error: "resume and jd are required" });
  }

  const result = matchResumeJD(resume, jd);
  res.json({ ...result, method: "tf-idf" });
});


router.post("/embeddings", async (req, res) => {
  const { resume, jd } = req.body;

  if (!resume || !jd) {
    return res.status(400).json({ error: "resume and jd are required" });
  }

  try {
    const result = await matchResumeJDWithEmbeddings(resume, jd);
    return res.json({ ...result, method: "embeddings" });
  } catch (err) {
    console.warn("Embeddings unavailable, falling back to TF-IDF");

    const fallback = matchResumeJD(resume, jd);
    return res.json({ ...fallback, method: "tf-idf" });
  }
});

module.exports = router;