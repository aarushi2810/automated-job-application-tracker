import ApplicationsTable from "../components/ApplicationsTable";
import AnalyticsSummary from "../components/AnalyticsSummary";
import ResumeMatcher from "../components/ResumeMatcher";

export default function Dashboard() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Application Dashboard</h1>
          <p className="page-subtitle">
            Track your applications, statuses, and platforms in one place.
          </p>
        </div>
        <a
          href="https://automated-job-application-tracker.onrender.com"
          target="_blank"
          rel="noreferrer"
          className="link"
        >
          Open backend (health check)
        </a>
      </header>

      <AnalyticsSummary />

      <ResumeMatcher />

      <section className="section">
        <h2 className="section-title">Applications</h2>
        <ApplicationsTable />
      </section>
    </div>
  );
}
