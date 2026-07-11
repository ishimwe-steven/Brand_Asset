import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUploads, startVerification } from "../../services/upload.service";
import { backendFileUrl } from "../../utils/helpers";

const MyUploads = () => {
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  const loadUploads = async () => {
    try {
      const res = await getUploads();
      setUploads(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const handleVerifyAgain = async (uploadId) => {
    try {
      setVerifyingId(uploadId);
      const res = await startVerification(uploadId);
      window.location.href = `/dashboard/verification/${res.data.result_id}`;
    } catch (err) {
      alert(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) return <p>Loading uploads...</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Uploads</h1>
        <p>View uploaded packaging designs and run verification again.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="section-card">
        {uploads.length === 0 ? (
          <p>No uploads found.</p>
        ) : (
          <div className="upload-list">
            {uploads.map((item) => (
              <div className="upload-item" key={item.id}>
                <div className="upload-thumb">
                  {item.file_type?.includes("image") ? (
                    <img
                       src={backendFileUrl(item.file_path)}
                      alt={item.product_name}
                    />
                  ) : (
                    <span>PDF</span>
                  )}
                </div>

                <div className="upload-info">
                  <h3>{item.product_name || "Unnamed Product"}</h3>
                  <p>
                    <strong>Category:</strong> {item.category_name}
                  </p>
                  <p>
                    <strong>Market:</strong> {item.market_name}
                  </p>
                  <p>
                    <strong>Status:</strong> {item.status}
                  </p>
                </div>

                <div className="upload-actions">
                  <Link to={`/dashboard/uploads/${item.id}`} className="link-btn">
                    View
                  </Link>

                  <button
                    onClick={() => handleVerifyAgain(item.id)}
                    disabled={verifyingId === item.id}
                  >
                    {verifyingId === item.id ? "Verifying..." : "Verify Again"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyUploads;