import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { downloadReportUrl, getReports } from "../../services/report.service";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      <div className="section-card">
        {reports.length === 0 ? (
          <p>No reports generated yet.</p>
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
                {reports.map((report) => (
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