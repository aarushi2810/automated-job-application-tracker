const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const ingestRateLimit = require("../middleware/ingestRateLimit");
const { parseJobText } = require("../services/jobParser");

// Ingest endpoint used by the browser extension. Protected by per-IP rate
// limiting and a user JWT so that applications are tied directly to the
// correct account instead of being globally "claimable".
router.post("/ingest", ingestRateLimit, async (req, res) => {
  try {
    const { company, role, platform, pageText, location } = req.body;

    // Require a valid JWT so that ingested applications are always tied to
    // a specific user account.
    let userId = null;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. A valid user token is required for ingest.",
      });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (e) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    // Start with the DOM-parsed values coming from the extension, then try to
    // enrich them using the LLM parser if pageText is available.
    let enrichedCompany = company || null;
    let enrichedRole = role || null;
    let enrichedLocation = location || null;

    if (pageText && process.env.OPENAI_API_KEY) {
      try {
        const parsed = await parseJobText(pageText);
        if (parsed && typeof parsed === "object") {
          if (parsed.company) enrichedCompany = parsed.company;
          if (parsed.role) enrichedRole = parsed.role;
          if (parsed.location) enrichedLocation = parsed.location;
          // parsed.skills and parsed.salary are available for future schema
          // extensions and analytics.
        }
      } catch (e) {
        // LLM enrichment is best-effort; fall back silently to DOM values.
        // eslint-disable-next-line no-console
        console.warn("LLM job enrichment failed, using DOM parser values.");
      }
    }

    if (!enrichedCompany) {
      return res.status(400).json({ error: "company required" });
    }

    const effectiveRole = enrichedRole || "Unknown";
    const effectivePlatform = platform || "Unknown";

    // Stronger duplicate protection: uniqueness by company, role, platform,
    // date, and user (or NULL user for anonymous ingest).
    const duplicateQuery = userId
      ? `
        SELECT *
        FROM applications
        WHERE company = $1
          AND role = $2
          AND platform = $3
          AND user_id = $4
          AND applied_date = CURRENT_DATE
      `
      : `
        SELECT *
        FROM applications
        WHERE company = $1
          AND role = $2
          AND platform = $3
          AND user_id IS NULL
          AND applied_date = CURRENT_DATE
      `;

    const duplicateParams = userId
      ? [enrichedCompany, effectiveRole, effectivePlatform, userId]
      : [enrichedCompany, effectiveRole, effectivePlatform];

    const existing = await pool.query(duplicateQuery, duplicateParams);

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: "Duplicate application ignored",
        application: existing.rows[0],
      });
    }

    const result = await pool.query(
      `
      INSERT INTO applications (company, role, platform, status, user_id)
      VALUES ($1, $2, $3, 'applied', $4)
      RETURNING *
      `,
      [enrichedCompany, effectiveRole, effectivePlatform, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("INGEST ERROR", err);
    res.status(500).json({ error: "Failed to ingest application" });
  }
});


router.post("/", authMiddleware, async (req, res) => {
  try {
    const { company, role, platform } = req.body;
    const userId = req.user.id;

    if (!company || !role) {
      return res.status(400).json({ error: "company and role are required" });
    }

    const existing = await pool.query(
      `
      SELECT * FROM applications
      WHERE company = $1
        AND role = $2
        AND platform = $3
        AND user_id = $4
        AND applied_date = CURRENT_DATE
      `,
      [company, role, platform, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: "Duplicate application ignored",
        application: existing.rows[0],
      });
    }

    const result = await pool.query(
      `
      INSERT INTO applications (company, role, platform, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [company, role, platform, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE ERROR", err);
    res.status(500).json({ error: "Failed to create application" });
  }
});


router.post("/claim", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      UPDATE applications
      SET user_id = $1
      WHERE user_id IS NULL
      RETURNING *
      `,
      [userId]
    );

    res.json({
      claimed: result.rowCount,
      applications: result.rows,
    });
  } catch (err) {
    console.error("CLAIM ERROR", err);
    res.status(500).json({ error: "Failed to claim applications" });
  }
});


router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const allowedStatuses = ["applied", "interview", "rejected", "offer"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE applications
      SET status = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
      `,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("STATUS ERROR", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});


router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM applications
      WHERE user_id = $1
      ORDER BY applied_date DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

module.exports = router;
