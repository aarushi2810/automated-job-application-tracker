import { useState } from "react";
import api from "../api/axios";

export default function ResumeMatcher() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleMatch = async () => {
    setError("");
    setResult(null);

    if (!resume || !jd) {
      setError("Paste both your resume and the job description.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/match/embeddings", { resume, jd });
      setResult(res.data);
    } catch (err) {
      setError("Failed to compute match – try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <h2 className="section-title">Resume vs Job Match</h2>
      <p className="page-subtitle">
        Paste your resume and a job description to see how well you match.
      </p>

      <div className="match-grid">
        <div className="match-column">
          <label className="field-label">Your resume</label>
          <textarea
            className="textarea"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here..."
          />
        </div>
        <div className="match-column">
          <label className="field-label">Job description</label>
          <textarea
            className="textarea"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here..."
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn" onClick={handleMatch} disabled={loading}>
        {loading ? "Computing match..." : "Compute match score"}
      </button>

      {result && (
        <div className="match-result">
          <p>
            Match score: <strong>{result.score}%</strong> (
            {result.verdict})
          </p>
          <p className="muted">
            Method: {result.method === "embeddings" ? "Embeddings" : "TF‑IDF"}
          </p>
        </div>
      )}
    </section>
  );
}

