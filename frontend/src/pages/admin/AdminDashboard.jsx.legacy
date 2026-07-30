import { useEffect, useState } from "react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [statistics, setStatistics] = useState({
    users: 0,
    markets: 0,
    categories: 0,
    regulationSets: 0,
    complianceRules: 0,
    referencePackages: 0,
    verifications: 0,
    reports: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    /*
      Later tuzahuza backend API hano.

      Example:
      const response = await getAdminDashboardStats();
      setStatistics(response.data);
    */

    setLoading(false);
  }, []);

  const cards = [
    {
      title: "Registered Users",
      value: statistics.users,
      description: "All users registered in the system",
    },
    {
      title: "Markets",
      value: statistics.markets,
      description: "Available destination markets",
    },
    {
      title: "Product Categories",
      value: statistics.categories,
      description: "Supported product categories",
    },
    {
      title: "Regulation Sets",
      value: statistics.regulationSets,
      description: "Created market regulation groups",
    },
    {
      title: "Compliance Rules",
      value: statistics.complianceRules,
      description: "Active packaging compliance requirements",
    },
    {
      title: "Reference Packaging",
      value: statistics.referencePackages,
      description: "Regulatory reference packaging examples",
    },
    {
      title: "Verifications",
      value: statistics.verifications,
      description: "Packaging verification activities",
    },
    {
      title: "System Reports",
      value: statistics.reports,
      description: "Generated system-wide reports",
    },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <section className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <h1>Admin Dashboard</h1>

        <p>
          Manage users, destination markets, product categories,
          regulation sets, compliance rules and verification activities.
        </p>
      </div>

      <div className="admin-dashboard-grid">
        {cards.map((card) => (
          <article
            key={card.title}
            className="admin-stat-card"
          >
            <h3>{card.value}</h3>
            <h4>{card.title}</h4>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-section">
        <h2>Administration Overview</h2>

        <div className="admin-responsibility-grid">
          <article className="admin-responsibility-card">
            <h3>Regulatory Management</h3>
            <p>
              Create destination markets, product categories,
              regulation sets and compliance rules.
            </p>
          </article>

          <article className="admin-responsibility-card">
            <h3>User Management</h3>
            <p>
              Manage exporters, designers and other system users.
            </p>
          </article>

          <article className="admin-responsibility-card">
            <h3>Verification Oversight</h3>
            <p>
              Monitor packaging verification activities and results.
            </p>
          </article>

          <article className="admin-responsibility-card">
            <h3>Reference Packaging</h3>
            <p>
              Upload regulatory packaging references for markets
              and product categories.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;