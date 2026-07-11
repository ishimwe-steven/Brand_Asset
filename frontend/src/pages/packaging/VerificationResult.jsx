import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getVerification } from "../../services/verification.service";
import { generateReport, downloadReportUrl } from "../../services/report.service";

const VerificationResult = () => {
  const { id } = useParams();

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const loadResult = async () => {
    try {
      const res = await getVerification(id);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load verification result");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResult();
  }, [id]);

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      await generateReport(id);

      const token = localStorage.getItem("token");
      const url = downloadReportUrl(id);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = `compliance-report-${id}.pdf`;
      a.click();
    } catch {
      alert("Failed to generate report");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <p>Loading verification result...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!result) return <p>No result found.</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Verification Result</h1>
        <p>Compliance analysis for {result.product_name}</p>
      </div>

      <div className="result-grid">
        <div className="score-card">
          <h2>{result.compliance_score}%</h2>
          <p>Compliance Score</p>
          <span className={`status-badge ${result.export_status}`}>
            {result.export_status}
          </span>
        </div>

        <div className="summary-card">
          <h3>Summary</h3>
          <p>{result.summary}</p>
          <p><strong>Category:</strong> {result.category_name}</p>
          <p><strong>Market:</strong> {result.market_name}</p>

          <button onClick={handleGenerateReport} disabled={reportLoading}>
            {reportLoading ? "Generating..." : "Generate & Download PDF"}
          </button>
        </div>
      </div>

      <div className="section-card">
        <h3>Detected Assets</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Value</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.detected_assets?.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.asset_type}</td>
                  <td>{asset.detected_value || "N/A"}</td>
                  <td>{asset.confidence || "0"}%</td>
                  <td>
                    <span className={`mini-badge ${asset.status}`}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-card">
        <h3>Compliance Issues</h3>
        {result.issues?.length === 0 ? (
          <p>No issues found.</p>
        ) : (
          result.issues?.map((issue) => (
            <div className="issue-box" key={issue.id}>
              <h4>{issue.rule_name}</h4>
              <p>{issue.issue_description}</p>
              <p><strong>Recommendation:</strong> {issue.recommendation}</p>
              <span className="severity">{issue.severity}</span>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <h3>AI Correction Suggestions</h3>
        {result.suggestions?.length === 0 ? (
          <p>No suggestions available.</p>
        ) : (
          result.suggestions?.map((item) => (
            <div className="suggestion-box" key={item.id || item.asset_type}>
              <h4>{item.asset_type}</h4>
              <p><strong>Problem:</strong> {item.problem}</p>
              <p><strong>Suggestion:</strong> {item.suggestion}</p>
              <p><strong>Recommended Position:</strong> {item.recommended_position}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VerificationResult;