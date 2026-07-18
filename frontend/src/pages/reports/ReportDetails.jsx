import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { downloadReportUrl, getReport } from "../../services/report.service";

const ReportDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const reportsPath = location.pathname.startsWith("/admin/") ? "/admin/reports" : "/dashboard/reports";

  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    try {
      const res = await getReport(id);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const downloadPdf = async () => {
    const token = localStorage.getItem("token");

    const response = await fetch(downloadReportUrl(report.result_id), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await response.blob();
    const fileUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `compliance-report-${report.result_id}.pdf`;
    a.click();
  };

  if (loading) return <p>Loading report...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!report) return <p>Report not found.</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Report Details</h1>
        <p>{report.product_name}</p>
      </div>

      <div className="result-grid">
        <div className="score-card">
          <h2>{report.compliance_score}%</h2>
          <p>Compliance Score</p>
          <span className={`status-badge ${report.export_status}`}>
            {report.export_status}
          </span>
        </div>

        <div className="summary-card">
          <h3>Report Information</h3>
          <p><strong>Product:</strong> {report.product_name}</p>
          <p><strong>Category:</strong> {report.category_name}</p>
          <p><strong>Market:</strong> {report.market_name}</p>
          <p><strong>Summary:</strong> {report.summary}</p>

          <button onClick={downloadPdf}>Download PDF</button>

          <Link to={reportsPath} className="secondary-link">
            Back to reports
          </Link>
        </div>
      </div>

      <div className="section-card">
        <h3>Compliance Issues</h3>

        {report.issues?.length === 0 ? (
          <p>No issues found.</p>
        ) : (
          report.issues?.map((issue) => (
            <div className="issue-box" key={issue.id}>
              <h4>{issue.rule_name}</h4>
              <p>{issue.issue_description}</p>
              <p><strong>Recommendation:</strong> {issue.recommendation}</p>
              <span className="severity">{issue.severity}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportDetails;
