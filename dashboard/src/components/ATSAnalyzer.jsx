import { useState } from "react";
import api from "../api/axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://automated-job-application-tracker.onrender.com";

export default function ATSAnalyzer() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [rewrites, setRewrites] = useState(null);
  const [error, setError] = useState("");

  // Handle PDF upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }

    setFileName(file.name);
    setError("");

    // Extract text via backend
    const formData = new FormData();
    formData.append("resumeFile", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/ats/extract-pdf`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("PDF extraction failed");

      const data = await res.json();
      setResume(data.text);
    } catch (err) {
      setError("Failed to extract text from PDF. Try pasting text manually.");
      setFileName("");
    }
  };

  // Run ATS analysis
  const handleAnalyze = async () => {
    setError("");
    setResult(null);
    setRewrites(null);

    if (!resume.trim() || !jd.trim()) {
      setError("Both resume text and job description are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/ats/analyze", {
        resume: resume.trim(),
        jobDescription: jd.trim(),
      });
      setResult(res.data);
    } catch (err) {
      setError("Analysis failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get AI rewrites for weak bullets
  const handleRewrite = async () => {
    if (!result?.bullets?.weak?.length) return;

    setRewriteLoading(true);
    try {
      const res = await api.post("/ats/rewrite", {
        weakBullets: result.bullets.weak,
        jobDescription: jd.trim(),
        missingKeywords: result.keywordMatch?.missing || [],
      });
      setRewrites(res.data);
    } catch (err) {
      setError("Failed to generate rewrites.");
    } finally {
      setRewriteLoading(false);
    }
  };

  // Score color helper
  const getScoreColor = (score) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <section className="ats-section">
      <div className="ats-header">
        <div>
          <h2 className="ats-title">
            <span className="ats-icon">🎯</span> ATS Resume Analyzer
          </h2>
          <p className="ats-subtitle">
            Upload your resume and paste a job description to get a detailed ATS
            compatibility score with actionable optimization tips.
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="ats-input-grid">
        <div className="ats-input-col">
          <label className="ats-label">
            Resume
            <span className="ats-label-hint">Paste text or upload PDF</span>
          </label>
          <div className="ats-upload-row">
            <label className="ats-upload-btn">
              📄 Upload PDF
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
            {fileName && <span className="ats-file-name">{fileName}</span>}
          </div>
          <textarea
            className="ats-textarea"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here..."
            rows={10}
          />
        </div>

        <div className="ats-input-col">
          <label className="ats-label">
            Job Description
            <span className="ats-label-hint">From the job posting</span>
          </label>
          <textarea
            className="ats-textarea"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={12}
          />
        </div>
      </div>

      {error && <p className="ats-error">{error}</p>}

      <button
        className="ats-analyze-btn"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="ats-spinner" /> Analyzing...
          </>
        ) : (
          "🔍 Analyze Resume"
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="ats-results">
          {/* Overall Score */}
          <div className="ats-score-hero">
            <div
              className="ats-score-circle"
              style={{
                "--score-color": getScoreColor(result.overallScore),
                "--score-pct": `${result.overallScore}%`,
              }}
            >
              <div className="ats-score-inner">
                <span className="ats-score-number">{result.overallScore}</span>
                <span className="ats-score-of">/100</span>
              </div>
            </div>
            <div className="ats-score-meta">
              <span
                className="ats-score-badge"
                style={{ background: getScoreColor(result.overallScore) + "22", color: getScoreColor(result.overallScore) }}
              >
                {getScoreLabel(result.overallScore)}
              </span>
              <p className="ats-verdict">{result.verdict}</p>
            </div>
          </div>

          {/* Score Breakdown Cards */}
          <div className="ats-cards-grid">
            {/* Keyword Match */}
            <div className="ats-card">
              <div className="ats-card-header">
                <span>🔑 Keyword Match</span>
                <span
                  className="ats-card-score"
                  style={{ color: getScoreColor(result.keywordMatch.score) }}
                >
                  {result.keywordMatch.score}%
                </span>
              </div>
              <div className="ats-card-body">
                <p className="ats-card-stat">
                  {result.keywordMatch.found.length} of{" "}
                  {result.keywordMatch.total} keywords found
                </p>
                {result.keywordMatch.found.length > 0 && (
                  <div className="ats-chips-group">
                    <span className="ats-chips-label">✅ Found:</span>
                    <div className="ats-chips">
                      {result.keywordMatch.found.map((kw) => (
                        <span key={kw} className="ats-chip ats-chip-green">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywordMatch.missing.length > 0 && (
                  <div className="ats-chips-group">
                    <span className="ats-chips-label">❌ Missing:</span>
                    <div className="ats-chips">
                      {result.keywordMatch.missing.map((kw) => (
                        <span key={kw} className="ats-chip ats-chip-red">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywordMatch.extras.length > 0 && (
                  <div className="ats-chips-group">
                    <span className="ats-chips-label">💡 Bonus skills:</span>
                    <div className="ats-chips">
                      {result.keywordMatch.extras.map((kw) => (
                        <span key={kw} className="ats-chip ats-chip-blue">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Formatting */}
            <div className="ats-card">
              <div className="ats-card-header">
                <span>📝 Formatting</span>
                <span
                  className="ats-card-score"
                  style={{ color: getScoreColor(result.formatting.score) }}
                >
                  {result.formatting.score}%
                </span>
              </div>
              <div className="ats-card-body">
                {result.formatting.passed.map((item, i) => (
                  <div key={i} className="ats-check-item ats-check-pass">
                    <span>✅</span> {item}
                  </div>
                ))}
                {result.formatting.issues.map((item, i) => (
                  <div key={i} className="ats-check-item ats-check-fail">
                    <span>⚠️</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div className="ats-card">
              <div className="ats-card-header">
                <span>📊 Section Analysis</span>
                <span
                  className="ats-card-score"
                  style={{ color: getScoreColor(result.sections.score) }}
                >
                  {result.sections.score}%
                </span>
              </div>
              <div className="ats-card-body">
                {result.sections.found.length > 0 && (
                  <div className="ats-chips-group">
                    <span className="ats-chips-label">✅ Found:</span>
                    <div className="ats-chips">
                      {result.sections.found.map((s) => (
                        <span key={s} className="ats-chip ats-chip-green">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.sections.missing.length > 0 && (
                  <div className="ats-chips-group">
                    <span className="ats-chips-label">❌ Missing:</span>
                    <div className="ats-chips">
                      {result.sections.missing.map((s) => (
                        <span key={s} className="ats-chip ats-chip-red">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.sections.warnings.map((w, i) => (
                  <div key={i} className="ats-check-item ats-check-fail">
                    <span>⚠️</span> {w}
                  </div>
                ))}
              </div>
            </div>

            {/* Bullet Analysis */}
            <div className="ats-card">
              <div className="ats-card-header">
                <span>💪 Bullet Analysis</span>
                <span className="ats-card-stat-small">
                  {result.bullets.totalBullets} bullets found
                </span>
              </div>
              <div className="ats-card-body">
                {result.bullets.strong.length > 0 && (
                  <div className="ats-bullet-group">
                    <span className="ats-chips-label">
                      ✅ Strong ({result.bullets.strong.length}):
                    </span>
                    {result.bullets.strong.map((b, i) => (
                      <div key={i} className="ats-bullet ats-bullet-strong">
                        {b}
                      </div>
                    ))}
                  </div>
                )}
                {result.bullets.weak.length > 0 && (
                  <div className="ats-bullet-group">
                    <span className="ats-chips-label">
                      ⚠️ Weak ({result.bullets.weak.length}):
                    </span>
                    {result.bullets.weak.map((b, i) => (
                      <div key={i} className="ats-bullet ats-bullet-weak">
                        {b}
                      </div>
                    ))}
                    <button
                      className="ats-rewrite-btn"
                      onClick={handleRewrite}
                      disabled={rewriteLoading}
                    >
                      {rewriteLoading
                        ? "✨ Generating rewrites..."
                        : "✨ Get AI-Powered Rewrites"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Rewrites Section */}
          {rewrites && rewrites.rewrites && (
            <div className="ats-rewrites-section">
              <h3 className="ats-rewrites-title">
                ✨ AI-Powered Rewrites
                <span className="ats-rewrites-method">
                  via {rewrites.method === "ai" ? "GPT-4o" : "Rule Engine"}
                </span>
              </h3>

              {rewrites.rewrites.map((r, i) => (
                <div key={i} className="ats-rewrite-card">
                  <div className="ats-rewrite-original">
                    <span className="ats-rewrite-label">❌ Original:</span>
                    <p>{r.original}</p>
                  </div>
                  <div className="ats-rewrite-arrow">→</div>
                  <div className="ats-rewrite-improved">
                    <span className="ats-rewrite-label">✅ Improved:</span>
                    <p>{r.improved}</p>
                  </div>
                  {r.reasoning && (
                    <p className="ats-rewrite-reason">💡 {r.reasoning}</p>
                  )}
                  <button
                    className="ats-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(r.improved);
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              ))}

              {rewrites.missingKeywordSuggestions?.length > 0 && (
                <div className="ats-keyword-suggestions">
                  <h4>📌 Keyword Suggestions</h4>
                  {rewrites.missingKeywordSuggestions.map((s, i) => (
                    <p key={i} className="ats-suggestion">{s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
