const express = require("express");
const router = express.Router();
const pool = require("../db");


router.get("/pending", async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM applications
      WHERE status = 'applied'
        AND applied_date <= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY applied_date ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
});

module.exports = router;