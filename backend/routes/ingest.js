const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");


router.get("/unclaimed", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM ingested_applications
      WHERE claimed = false
      ORDER BY created_at DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unclaimed applications" });
  }
});


router.post("/claim/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const app = await pool.query(
      `
      SELECT * FROM ingested_applications
      WHERE id = $1 AND claimed = false
      `,
      [id]
    );

    if (app.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    
    await pool.query(
      `
      INSERT INTO applications (company, role, platform, user_id)
      VALUES ($1, $2, $3, $4)
      `,
      [
        app.rows[0].company,
        app.rows[0].role,
        app.rows[0].platform,
        userId
      ]
    );

    await pool.query(
      `
      UPDATE ingested_applications
      SET claimed = true
      WHERE id = $1
      `,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to claim application" });
  }
});

module.exports = router;