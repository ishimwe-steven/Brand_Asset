import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../../services/category.service";
import { getMarkets } from "../../services/market.service";
import { startVerification, uploadPackaging } from "../../services/upload.service";

const UploadPackaging = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);

  const [form, setForm] = useState({
    product_name: "",
    category_id: "",
    market_id: "",
    packaging: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const catRes = await getCategories();
      const marketRes = await getMarkets();

      setCategories(catRes.data || []);
      setMarkets(marketRes.data || []);
    } catch {
      setError("Failed to load categories or markets");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    setForm({
      ...form,
      packaging: file,
    });

    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.product_name || !form.category_id || !form.market_id || !form.packaging) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("product_name", form.product_name);
      data.append("category_id", form.category_id);
      data.append("market_id", form.market_id);
      data.append("packaging", form.packaging);

      const uploadRes = await uploadPackaging(data);
      const uploadId = uploadRes.data.upload_id;

      const verificationRes = await startVerification(uploadId);
      const resultId = verificationRes.data.result_id;

      navigate(`/dashboard/verification/${resultId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Upload or verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upload Packaging</h1>
        <p>Upload packaging design and verify compliance automatically.</p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="upload-grid">
        <form className="form-card" onSubmit={handleSubmit}>
          <label>Product Name</label>
          <input
            type="text"
            name="product_name"
            placeholder="Example: Rwanda Coffee"
            value={form.product_name}
            onChange={handleChange}
          />

          <label>Product Category</label>
          <select name="category_id" value={form.category_id} onChange={handleChange}>
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <label>Export Market</label>
          <select name="market_id" value={form.market_id} onChange={handleChange}>
            <option value="">Select market</option>
            {markets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <label>Packaging File</label>
          <input type="file" accept="image/*,.pdf" onChange={handleFileChange} />

          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : "Upload & Verify"}
          </button>
        </form>

        <div className="preview-card">
          <h3>Preview</h3>

          {preview ? (
            <img src={preview} alt="Packaging Preview" />
          ) : (
            <p>No packaging selected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPackaging;