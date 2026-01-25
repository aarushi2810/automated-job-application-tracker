const express = require("express");
const router = express.Router();
const pool = require("../db");


router.post("/", async (req, res) => {
  try {
    const { company, role, platform } = req.body;

    if (!company || !role) {
      return res.status(400).json({ error: "company and role are required" });
    }

    const existing = await pool.query(
      `
      SELECT * FROM applications
      WHERE company = $1
        AND role = $2
        AND platform = $3
        AND applied_date = CURRENT_DATE
      `,
      [company, role, platform]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: "Duplicate application ignored",
        application: existing.rows[0]
      });
    }

    
    const result = await pool.query(
      `
      INSERT INTO applications (company, role, platform)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [company, role, platform]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create application" });
  }
});




router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["applied", "interview", "rejected", "offer"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE applications
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});


router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM applications ORDER BY applied_date DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

module.exports = router;