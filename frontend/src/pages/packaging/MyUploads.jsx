import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteUpload, getUploads, startVerification } from "../../services/upload.service";
import { backendFileUrl } from "../../utils/helpers";

const MyUploads = () => {
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  const filteredUploads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return uploads;
    return uploads.filter((upload) => [upload.product_name, upload.category_name, upload.market_name, upload.status].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [uploads, search]);

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

  const handleDelete = async (upload) => {
    const confirmed = window.confirm(`Delete the uploaded package "${upload.product_name || "Unnamed Product"}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(upload.id);
      setError("");
      await deleteUpload(upload.id);
      setUploads((current) => current.filter((item) => item.id !== upload.id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete uploaded package");
    } finally {
      setDeletingId(null);
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

      <div className="section-card list-card-with-toolbar">
        <div className="admin-table-toolbar"><div><h2>Packaging Uploads</h2><p>{filteredUploads.length} upload{filteredUploads.length === 1 ? "" : "s"}</p></div><label className="admin-search"><span>Search uploads</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product, category or market" /></label></div>
        {filteredUploads.length === 0 ? (
          <div className="admin-empty-row">{search ? "No uploads match your search." : "No uploads found."}</div>
        ) : (
          <div className="upload-list">
            {filteredUploads.map((item) => (
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

                  <button
                    type="button"
                    className="upload-delete-button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id || verifyingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
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
