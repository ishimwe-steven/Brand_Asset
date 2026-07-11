import { useEffect, useState } from "react";
import { getDashboardStats } from "../../services/dashboard.service";

const Dashboard = () => {
  const [stats, setStats] = useState(null);

  const loadStats = async () => {
    const res = await getDashboardStats();
    setStats(res.data);
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of packaging compliance verification activities.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h2>{stats.total_uploads}</h2>
          <p>Total Uploads</p>
        </div>

        <div className="stat-card">
          <h2>{stats.total_verifications}</h2>
          <p>Verifications</p>
        </div>

        <div className="stat-card">
          <h2>{stats.total_reports}</h2>
          <p>Reports</p>
        </div>

        <div className="stat-card">
          <h2>{stats.average_score}%</h2>
          <p>Average Score</p>
        </div>

        <div className="stat-card success">
          <h2>{stats.export_ready}</h2>
          <p>Export Ready</p>
        </div>

        <div className="stat-card danger">
          <h2>{stats.not_ready}</h2>
          <p>Not Ready</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;