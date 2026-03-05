import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AnalyticsSummary() {
  const [total, setTotal] = useState(null);
  const [daily, setDaily] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [statusStats, setStatusStats] = useState({
    interviewRatio: null,
    responseRate: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [totalRes, dailyRes, platformRes, statusRes] = await Promise.all([
          api.get("/analytics/total"),
          api.get("/analytics/daily"),
          api.get("/analytics/platforms"),
          api.get("/analytics/status"),
        ]);
        setTotal(totalRes.data.total);
        setDaily(dailyRes.data);
        setPlatforms(platformRes.data);

        const statusCounts = statusRes.data.reduce(
          (acc, row) => ({
            ...acc,
            [row.status]: Number(row.count),
          }),
          {}
        );

        const totalApps = Object.values(statusCounts).reduce(
          (sum, val) => sum + val,
          0
        );

        if (totalApps > 0) {
          const interviews = statusCounts.interview || 0;
          const responded =
            (statusCounts.interview || 0) +
            (statusCounts.rejected || 0) +
            (statusCounts.offer || 0);

          setStatusStats({
            interviewRatio: Math.round((interviews / totalApps) * 100),
            responseRate: Math.round((responded / totalApps) * 100),
          });
        }
      } catch (err) {
        // fail silently in UI – core dashboard still works
        // eslint-disable-next-line no-console
        console.error("Failed to load analytics", err);
      }
    };

    load();
  }, []);

  return (
    <div className="analytics-grid">
      <div className="card">
        <div className="card-label">Total applications</div>
        <div className="card-value">{total ?? "—"}</div>
      </div>

      <div className="card">
        <div className="card-label">Last 7 days</div>
        <div className="card-list">
          {daily.length === 0 && <span className="muted">No data yet</span>}
          {daily.map((d) => (
            <div key={d.applied_date}>
              <span>{new Date(d.applied_date).toLocaleDateString()}</span>
              <span className="pill">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-label">By platform</div>
        <div className="card-list">
          {platforms.length === 0 && (
            <span className="muted">No platform data yet</span>
          )}
          {platforms.map((p) => (
            <div key={p.platform}>
              <span>{p.platform}</span>
              <span className="pill">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-label">Quality metrics</div>
        <div className="card-list">
          <div>
            <span>Response rate</span>
            <span className="pill">
              {statusStats.responseRate != null
                ? `${statusStats.responseRate}%`
                : "—"}
            </span>
          </div>
          <div>
            <span>Interview ratio</span>
            <span className="pill">
              {statusStats.interviewRatio != null
                ? `${statusStats.interviewRatio}%`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

