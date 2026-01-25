require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();           
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Job Tracker Backend Running" });
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB connection failed" });
  }
});

const PORT = 4000;

const applicationsRoute = require("./routes/applications");
app.use("/applications", applicationsRoute);

const analyticsRoute = require("./routes/analytics");
app.use("/analytics", analyticsRoute);

const followupRoute = require("./routes/followups");
app.use("/followups", followupRoute);
const matchRoute = require("./routes/match");
app.use("/match", matchRoute);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});