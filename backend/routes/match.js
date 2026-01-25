const express = require("express");
const router = express.Router();
const { matchResumeJD } = require("../services/match");


router.post("/", (req, res) => {
  const { resume, jd } = req.body;

  if (!resume || !jd) {
    return res.status(400).json({ error: "resume and jd are required" });
  }

  const result = matchResumeJD(resume, jd);
  res.json(result);
});

module.exports = router;