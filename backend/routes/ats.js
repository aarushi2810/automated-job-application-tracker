const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const router = express.Router();
const { analyzeResume } = require("../services/atsAnalyzer");

// Multer config — store in memory for PDF parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported"), false);
    }
  },
});

// ---------------------------------------------------------------------------
// POST /ats/analyze — Full ATS analysis
// ---------------------------------------------------------------------------
// Accepts JSON body: { resume: string, jobDescription: string }
// Or multipart form: resume (file) + jobDescription (text field)

router.post("/analyze", upload.single("resumeFile"), async (req, res) => {
  try {
    let resumeText = req.body.resume || "";
    const jobDescription = req.body.jobDescription || "";

    // If a PDF was uploaded, extract text from it
    if (req.file) {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        resumeText = pdfData.text;
      } catch (e) {
        return res.status(400).json({
          error: "Failed to parse PDF. Please try pasting resume text instead.",
        });
      }
    }

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Both resume text and job description are required.",
      });
    }

    const analysis = analyzeResume(resumeText, jobDescription);
    res.json(analysis);
  } catch (err) {
    console.error("ATS ANALYZE ERROR:", err);
    res.status(500).json({ error: "Failed to analyze resume." });
  }
});

// ---------------------------------------------------------------------------
// POST /ats/rewrite — AI-powered bullet rewriting
// ---------------------------------------------------------------------------

router.post("/rewrite", async (req, res) => {
  try {
    const { weakBullets, jobDescription, missingKeywords } = req.body;

    if (!weakBullets || !Array.isArray(weakBullets) || weakBullets.length === 0) {
      return res.status(400).json({ error: "weakBullets array is required." });
    }

    // Check if OpenAI is available
    let client = null;
    if (process.env.OPENAI_API_KEY) {
      const OpenAI = require("openai");
      client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    if (!client) {
      // Fallback: return rule-based suggestions without AI
      const rewrites = weakBullets.map((bullet) => ({
        original: bullet,
        improved: generateRuleBasedRewrite(bullet),
        reasoning: "Auto-improved using best-practice rules (no AI API key configured)",
      }));

      return res.json({
        rewrites,
        method: "rule-based",
        missingKeywordSuggestions: (missingKeywords || []).slice(0, 5).map(
          (kw) => `Consider adding "${kw}" — it appears in the job description`
        ),
      });
    }

    // AI-powered rewrite using OpenAI
    const prompt = `You are an expert ATS resume optimization consultant. Rewrite these weak resume bullet points to be ATS-friendly and impactful.

Rules for rewriting:
1. Start each bullet with a strong action verb (Architected, Built, Delivered, Reduced, etc.)
2. Include specific metrics (percentages, numbers, timeframes)
3. Mention relevant technologies naturally
4. Focus on impact and outcomes, not just responsibilities
5. Keep each bullet under 2 lines

${missingKeywords && missingKeywords.length > 0 ? `Missing keywords to naturally incorporate where relevant: ${missingKeywords.join(", ")}` : ""}

Job Description Context:
${(jobDescription || "").slice(0, 1500)}

Weak bullets to rewrite:
${weakBullets.map((b, i) => `${i + 1}. "${b}"`).join("\n")}

Respond in JSON format:
{
  "rewrites": [
    {
      "original": "original bullet text",
      "improved": "rewritten bullet text",
      "reasoning": "brief explanation of what was improved"
    }
  ],
  "tips": ["general tip 1", "general tip 2"]
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);

    res.json({
      rewrites: aiResult.rewrites || [],
      method: "ai",
      tips: aiResult.tips || [],
      missingKeywordSuggestions: (missingKeywords || []).slice(0, 5).map(
        (kw) => `Consider adding "${kw}" — it appears in the job description`
      ),
    });
  } catch (err) {
    console.error("ATS REWRITE ERROR:", err);
    res.status(500).json({ error: "Failed to generate rewrites." });
  }
});

// ---------------------------------------------------------------------------
// POST /ats/extract-pdf — Extract text from PDF (utility endpoint)
// ---------------------------------------------------------------------------

router.post("/extract-pdf", upload.single("resumeFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    const pdfData = await pdfParse(req.file.buffer);
    res.json({ text: pdfData.text, pages: pdfData.numpages });
  } catch (err) {
    console.error("PDF EXTRACT ERROR:", err);
    res.status(400).json({ error: "Failed to parse PDF file." });
  }
});

// ---------------------------------------------------------------------------
// Rule-based rewrite fallback (no AI needed)
// ---------------------------------------------------------------------------

function generateRuleBasedRewrite(bullet) {
  let improved = bullet.trim();

  // Replace weak starting verbs
  const weakStarters = {
    "helped": "Collaborated to",
    "assisted": "Supported and delivered",
    "worked on": "Developed and shipped",
    "was responsible for": "Owned and managed",
    "participated in": "Contributed to and delivered",
    "involved in": "Drove execution of",
    "handled": "Managed and executed",
    "utilized": "Leveraged",
    "used": "Applied",
    "did": "Executed",
    "made": "Designed and built",
  };

  const lower = improved.toLowerCase();
  for (const [weak, strong] of Object.entries(weakStarters)) {
    if (lower.startsWith(weak)) {
      improved = strong + improved.slice(weak.length);
      break;
    }
  }

  // Capitalize first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);

  // Add metric suggestion if none present
  if (!/\d/.test(improved)) {
    improved += " [Add specific metrics: %, count, or timeframe]";
  }

  return improved;
}

module.exports = router;
