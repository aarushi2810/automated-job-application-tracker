const express = require("express");
const { parseJobText } = require("../services/jobParser");

const router = express.Router();

router.post("/parse", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const parsed = await parseJobText(text);
    return res.json(parsed);
  } catch (err) {
    if (err.code === "OPENAI_NOT_CONFIGURED") {
      return res.status(503).json({
        error:
          "OpenAI not configured on server. Set OPENAI_API_KEY to enable.",
      });
    }

    console.error("JOB PARSER ERROR", err);
    return res.status(500).json({ error: "Failed to parse job text" });
  }
});

module.exports = router;

