const express = require("express");
const router = express.Router();
const pool = require("../db");


router.get("/platforms", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT platform, COUNT(*) AS count
      FROM applications
      GROUP BY platform
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch platform analytics" });
  }
});


router.get("/daily", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT applied_date, COUNT(*) AS count
      FROM applications
      WHERE applied_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY applied_date
      ORDER BY applied_date
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch daily analytics" });
  }
});


router.get("/total", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total
      FROM applications
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch total applications" });
  }
});

module.exports = router;