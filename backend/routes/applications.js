const express = require("express");
const router = express.Router();
const pool = require("../db");


router.post("/", async (req, res) => {
  try {
    const { company, role, platform } = req.body;

    if (!company || !role) {
      return res.status(400).json({ error: "company and role are required" });
    }

    const result = await pool.query(
      "INSERT INTO applications (company, role, platform) VALUES ($1, $2, $3) RETURNING *",
      [company, role, platform]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create application" });
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