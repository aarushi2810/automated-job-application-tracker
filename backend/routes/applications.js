const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");


router.post("/ingest", async (req, res) => {
  try {
    const { company, role, platform } = req.body;

    if (!company) {
      return res.status(400).json({ error: "company required" });
    }

    const result = await pool.query(
      `
      INSERT INTO applications (company, role, platform, status)
      VALUES ($1, $2, $3, 'applied')
      RETURNING *
      `,
      [company, role || "Unknown", platform || "Unknown"]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("INGEST ERROR ", err);
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
        application: existing.rows[0]
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
    console.error("CREATE APPLICATION ERROR ", err);
    res.status(500).json({ error: "Failed to create application" });
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
    console.error("UPDATE STATUS ERROR ", err);
    res.status(500).json({ error: "Failed to update status" });
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
      applications: result.rows
    });
  } catch (err) {
    console.error("CLAIM ERROR ", err);
    res.status(500).json({ error: "Failed to claim applications" });
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
