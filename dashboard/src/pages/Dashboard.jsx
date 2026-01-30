import { useAuth } from "../auth/AuthContext";
import ApplicationsTable from "../components/ApplicationsTable";

export default function Dashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <button onClick={logout}>Logout</button>
      <ApplicationsTable />
    </div>
  );
}