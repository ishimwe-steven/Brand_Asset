import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getUpload, startVerification } from "../../services/upload.service";
import { assetLabels, formatAssetResult, friendlyStatus } from "../../utils/assetFormatting";

/*const assetLabels = {
  logo_detection: "Logo Detection",
  logo_placement: "Logo Position",
  brand_colour_consistency: "Brand Colour Consistency",
  product_name: "Product Name",
  qr_code: "QR Code",
  barcode: "Barcode",
  country_of_origin: "Country of Origin",
  storage_instructions: "Storage Instructions",
  batch_number: "Batch Number",
  net_weight: "Net Weight",
  expiry_date: "Expiry Date",
  manufacturer_address: "Manufacturer Address",
  ocr_text: "Extracted Text",
};*/

/*const parseAssetValue = (value) => {
  if (!value || typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};*/

/*const friendlyStatus = (status) => ({
  detected: "Detected",
  passed: "Compliant",
  warning: "Warning",
  failed: "Not compliant",
  missing: "Not found",
}[status] || status || "Not found");*/

/*const formatAssetResult = (asset) => {
  const value = parseAssetValue(asset.detected_value);

  if (!value || value === "N/A") return { result: "Not found", details: "—" };
  if (typeof value !== "object") return { result: String(value), details: "" };

  const status = value.status || asset.status;
  const score = value.score ?? value.confidence ?? value.consistency_score;
  let details = value.message || value.recommendation || "";

  if (asset.asset_type === "logo_placement") {
    const position = value.position || value.detected_position || value.placement;
    if (position) details = `Position: ${String(position).replaceAll("_", " ")}${details ? `. ${details}` : ""}`;
  }

  if (asset.asset_type === "brand_colour_consistency") {
    const colours = value.details?.detected_colours || value.detected_colours || [];
    const palette = colours.map((colour) => colour.hex).filter(Boolean).join(", ");
    if (palette) details = `Detected palette: ${palette}${details ? `. ${details}` : ""}`;
  }

  return {
    result: `${friendlyStatus(status)}${score !== undefined && score !== null ? ` (${Number(score).toFixed(1)}%)` : ""}`,
    details,
  };
};*/

const UploadDetails = () => {
  const { id } = useParams();

  const [upload, setUpload] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const loadUpload = async () => {
    try {
      const res = await getUpload(id);
      setUpload(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load upload");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpload();
  }, [id]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await startVerification(id);
      window.location.href = `/dashboard/verification/${res.data.result_id}`;
    } catch (err) {
      alert(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <p>Loading upload...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!upload) return <p>Upload not found.</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upload Details</h1>
        <p>View packaging information and detected assets.</p>
      </div>

      <div className="details-grid">
        <div className="section-card">
          <h3>Packaging Preview</h3>

          {upload.file_type?.includes("image") ? (
            <img
              className="details-image"
              src={`http://localhost:5000${upload.file_path}`}
              alt={upload.product_name}
            />
          ) : (
            <p>PDF file uploaded.</p>
          )}
        </div>

        <div className="section-card">
          <h3>Product Information</h3>
          <p><strong>Product:</strong> {upload.product_name || "N/A"}</p>
          <p><strong>Category:</strong> {upload.category_name}</p>
          <p><strong>Market:</strong> {upload.market_name}</p>
          <p><strong>Status:</strong> {upload.status}</p>
          <p><strong>Uploaded By:</strong> {upload.user_name}</p>

          <button onClick={handleVerify} disabled={verifying} className="primary-btn">
            {verifying ? "Verifying..." : "Run Verification"}
          </button>

          <Link to="/dashboard/uploads" className="secondary-link">
            Back to uploads
          </Link>
        </div>
      </div>

      <div className="section-card">
        <h3>Detected Assets</h3>

        {!upload.detected_assets || upload.detected_assets.length === 0 ? (
          <p>No detected assets yet. Run verification first.</p>
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
                {upload.detected_assets.map((asset) => {
                  const formatted = formatAssetResult(asset);
                  return (
                    <tr key={asset.id}>
                      <td>{assetLabels[asset.asset_type] || asset.asset_type.replaceAll("_", " ")}</td>
                      <td><strong>{formatted.result}</strong>{formatted.details && <div className="asset-details-text">{formatted.details}</div>}</td>
                      <td>{asset.confidence !== null && asset.confidence !== undefined ? `${Number(asset.confidence).toFixed(1)}%` : "—"}</td>
                      <td><span className={`mini-badge ${asset.status}`}>{friendlyStatus(asset.status)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadDetails;
