import { useState } from "react";
import api from "../api/axios";

export default function AddApplicationForm({ onAdd }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [platform, setPlatform] = useState("");

  const submit = async () => {
    if (!company || !role) return;

    const res = await api.post("/applications", {
      company,
      role,
      platform
    });

    onAdd(res.data);
    setCompany("");
    setRole("");
    setPlatform("");
  };

  return (
    <div className="form-row">
      <input
        placeholder="Company"
        value={company}
        onChange={e => setCompany(e.target.value)}
      />
      <input
        placeholder="Role"
        value={role}
        onChange={e => setRole(e.target.value)}
      />
      <input
        placeholder="Platform"
        value={platform}
        onChange={e => setPlatform(e.target.value)}
      />
      <button onClick={submit}>Add</button>
    </div>
  );
}