import { useEffect, useState } from "react";
import api from "../api/axios";
import UnclaimedApplications from "./UnclaimedApplications";

const STATUSES = ["applied", "interview", "rejected", "offer"];

export default function ApplicationsTable() {
  const [apps, setApps] = useState([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [platform, setPlatform] = useState("");

  const fetchApps = async () => {
    const res = await api.get("/applications");
    setApps(res.data);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const addApplication = async () => {
    if (!company || !role) return alert("Company & role required");

    await api.post("/applications", {
      company,
      role,
      platform
    });

    setCompany("");
    setRole("");
    setPlatform("");
    fetchApps();
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/applications/${id}/status`, { status });
    fetchApps();
  };

  return (<>
    <UnclaimedApplications onClaimed={fetchApps} />
    <div className="container">

      <h2 className="title">My Applications</h2>

      {/* ADD FORM */}
      <div className="form-row">
        <input
          className="input"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          className="input"
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <input
          className="input"
          placeholder="Platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        />
        <button className="btn" onClick={addApplication}>
          Add
        </button>
      </div>

      {/* TABLE */}
      <table className="table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 && (
            <tr>
              <td colSpan="3" className="empty">
                No applications yet
              </td>
            </tr>
          )}

          {apps.map((app) => (
            <tr key={app.id}>
              <td>{app.company}</td>
              <td>{app.role}</td>
              <td>
                <select
                  className="select"
                  value={app.status}
                  onChange={(e) =>
                    updateStatus(app.id, e.target.value)
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}