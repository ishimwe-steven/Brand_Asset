import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getVerification,
} from "../../services/verification.service";

import {
  generateReport,
  downloadReport,
} from "../../services/report.service";

import {
  assetLabels,
  formatAssetResult,
  friendlyStatus,
} from "../../utils/assetFormatting";

const VerificationResult = () => {
  const { id } = useParams();

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [reportLoading, setReportLoading] =
    useState(false);

  const [reportMessage, setReportMessage] =
    useState("");

  const loadResult = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getVerification(id);

      setResult(
        response?.data || null
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load verification result"
      );
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
      setReportMessage("");
      setError("");

      /*
       * First create or update the report record
       * in the backend.
       */
      const generatedResponse =
        await generateReport(id);

      /*
       * Different backend response structures are supported.
       * If no result ID is returned, the current verification ID
       * is used.
       */
      const reportResultId =
        generatedResponse?.data?.result_id ||
        generatedResponse?.data?.verification_id ||
        generatedResponse?.result_id ||
        generatedResponse?.verification_id ||
        id;

      /*
       * Download through the Axios API instance.
       * This preserves the JWT Authorization header and
       * receives the PDF as a binary Blob.
       */
      await downloadReport(reportResultId);

      setReportMessage(
        "PDF report downloaded successfully."
      );
    } catch (err) {
      console.error(
        "PDF REPORT ERROR:",
        err
      );

      let message =
        err?.response?.data?.message ||
        err?.response?.data?.details ||
        err?.message ||
        "Failed to generate or download report.";

      /*
       * When responseType is blob, an API error can also
       * arrive as a Blob containing JSON.
       */
      const responseBlob =
        err?.response?.data;

      if (responseBlob instanceof Blob) {
        try {
          const errorText =
            await responseBlob.text();

          const parsedError =
            JSON.parse(errorText);

          message =
            parsedError?.message ||
            parsedError?.details ||
            message;
        } catch {
          // Keep the original message.
        }
      }

      setError(message);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p>Loading verification result...</p>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="page-container">
        <div className="alert-error">
          {error}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="page-container">
        <p>No result found.</p>
      </div>
    );
  }

  const detectedAssets =
    Array.isArray(result.detected_assets)
      ? result.detected_assets
      : [];

  const issues =
    Array.isArray(result.issues)
      ? result.issues
      : [];

  const suggestions =
    Array.isArray(result.suggestions)
      ? result.suggestions
      : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Verification Result</h1>

        <p>
          Compliance analysis for{" "}
          {result.product_name || "product"}
        </p>
      </div>

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {reportMessage && (
        <div className="alert-success">
          {reportMessage}
        </div>
      )}

      <div className="result-grid">
        <div className="score-card">
          <h2>
            {Number(
              result.compliance_score || 0
            ).toFixed(2)}
            %
          </h2>

          <p>Compliance Score</p>

          <span
            className={`status-badge ${
              result.export_status || ""
            }`}
          >
            {friendlyStatus(
              result.export_status
            )}
          </span>
        </div>

        <div className="summary-card">
          <h3>Summary</h3>

          <p>
            {result.summary ||
              "No verification summary available."}
          </p>

          <p>
            <strong>Category:</strong>{" "}
            {result.category_name || "—"}
          </p>

          <p>
            <strong>Market:</strong>{" "}
            {result.market_name || "—"}
          </p>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={reportLoading}
          >
            {reportLoading
              ? "Generating PDF..."
              : "Generate & Download PDF"}
          </button>
        </div>
      </div>

      <div className="section-card">
        <h3>Detected Assets</h3>

        {detectedAssets.length === 0 ? (
          <p>No detected assets found.</p>
        ) : (
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
                {detectedAssets.map(
                  (asset, index) => {
                    const formatted =
                      formatAssetResult(asset);

                    return (
                      <tr
                        key={
                          asset.id ||
                          `${asset.asset_type}-${index}`
                        }
                      >
                        <td>
                          {assetLabels[
                            asset.asset_type
                          ] ||
                            String(
                              asset.asset_type ||
                                "Unknown asset"
                            ).replaceAll(
                              "_",
                              " "
                            )}
                        </td>

                        <td>
                          <strong>
                            {formatted.result ||
                              "—"}
                          </strong>

                          {formatted.details && (
                            <div className="asset-details-text">
                              {
                                formatted.details
                              }
                            </div>
                          )}
                        </td>

                        <td>
                          {asset.confidence !=
                          null
                            ? `${Number(
                                asset.confidence
                              ).toFixed(1)}%`
                            : "—"}
                        </td>

                        <td>
                          <span
                            className={`mini-badge ${
                              asset.status || ""
                            }`}
                          >
                            {friendlyStatus(
                              asset.status
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section-card">
        <h3>Compliance Issues</h3>

        {issues.length === 0 ? (
          <p>No issues found.</p>
        ) : (
          issues.map((issue, index) => (
            <div
              className="issue-box"
              key={
                issue.id ||
                `${issue.rule_name}-${index}`
              }
            >
              <h4>
                {issue.rule_name ||
                  issue.issue_type ||
                  "Compliance issue"}
              </h4>

              <p>
                {issue.issue_description ||
                  "No description available."}
              </p>

              <p>
                <strong>
                  Recommendation:
                </strong>{" "}
                {issue.recommendation ||
                  "No recommendation available."}
              </p>

              {issue.severity && (
                <span className="severity">
                  {issue.severity}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <h3>AI Correction Suggestions</h3>

        {suggestions.length === 0 ? (
          <p>No suggestions available.</p>
        ) : (
          suggestions.map(
            (item, index) => (
              <div
                className="suggestion-box"
                key={
                  item.id ||
                  `${item.asset_type}-${index}`
                }
              >
                <h4>
                  {item.asset_type ||
                    item.issue_type ||
                    "Suggestion"}
                </h4>

                <p>
                  <strong>Problem:</strong>{" "}
                  {item.problem ||
                    "No problem description available."}
                </p>

                <p>
                  <strong>
                    Suggestion:
                  </strong>{" "}
                  {item.suggestion ||
                    "No suggestion available."}
                </p>

                {item.recommended_position && (
                  <p>
                    <strong>
                      Recommended Position:
                    </strong>{" "}
                    {
                      item.recommended_position
                    }
                  </p>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};

export default VerificationResult;