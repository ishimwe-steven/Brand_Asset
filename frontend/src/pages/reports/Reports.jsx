import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadReportUrl, getReports } from "../../services/report.service";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((report) => [report.product_name, report.category_name, report.market_name, report.export_status, report.compliance_score].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [reports, search]);

  const loadReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const downloadPdf = async (resultId) => {
    const token = localStorage.getItem("token");

    const response = await fetch(downloadReportUrl(resultId), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await response.blob();
    const fileUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `compliance-report-${resultId}.pdf`;
    a.click();
  };

  if (loading) return <p>Loading reports...</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reports</h1>
        <p>View and download generated compliance reports.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="section-card admin-table-card">
        <div className="admin-table-toolbar"><div><h2>Compliance Reports</h2><p>{filteredReports.length} report{filteredReports.length === 1 ? "" : "s"}</p></div><label className="admin-search"><span>Search reports</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product, category or market" /></label></div>
        {filteredReports.length === 0 ? (
          <div className="admin-empty-row">{search ? "No reports match your search." : "No reports generated yet."}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Market</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.product_name || "N/A"}</td>
                    <td>{report.category_name}</td>
                    <td>{report.market_name}</td>
                    <td>{report.compliance_score}%</td>
                    <td>
                      <span className={`status-badge ${report.export_status}`}>
                        {report.export_status}
                      </span>
                    </td>
                    <td>{new Date(report.generated_at).toLocaleString()}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/dashboard/reports/${report.id}`} className="small-link">
                          View
                        </Link>

                        <button onClick={() => downloadPdf(report.result_id)}>
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
