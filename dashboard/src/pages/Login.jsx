
import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); 

    try {
      const res = await api.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("token", res.data.token);

    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />

      <button type="submit">Login</button>
    </form>
  );
}