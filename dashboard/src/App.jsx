import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
