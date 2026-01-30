import { useEffect, useState } from "react";
import api from "../api/axios";

export default function UnclaimedApplications({ onClaimed }) {
  const [apps, setApps] = useState([]);

  const fetchUnclaimed = async () => {
    try {
      const res = await api.get("/ingest/unclaimed");
      setApps(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUnclaimed();
  }, []);

  const claimApp = async (id) => {
    await api.post(`/ingest/claim/${id}`);
    fetchUnclaimed();
    onClaimed(); // refresh main applications table
  };

  if (apps.length === 0) return null;

  return (
    <div className="container">
      <h3 className="title">Captured Applications</h3>

      <table className="table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Platform</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {apps.map(app => (
            <tr key={app.id}>
              <td>{app.company}</td>
              <td>{app.role}</td>
              <td>{app.platform}</td>
              <td>
                <button
                  className="btn"
                  onClick={() => claimApp(app.id)}
                >
                  Add to My Tracker
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}