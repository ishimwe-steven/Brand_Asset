import { useEffect, useState } from "react";
import { getCategories } from "../../services/category.service";
import { getMarkets } from "../../services/market.service";
import {
  createReference,
  deleteReference,
  getReferences,
} from "../../services/reference.service";
import { backendFileUrl } from "../../utils/helpers";

const ReferencePackaging = () => {
  const [references, setReferences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);

  const [form, setForm] = useState({
    category_id: "",
    market_id: "",
    title: "",
    description: "",
    reference: null,
  });

  const load = async () => {
    const refRes = await getReferences();
    const catRes = await getCategories();
    const marketRes = await getMarkets();

    setReferences(refRes.data || []);
    setCategories(catRes.data || []);
    setMarkets(marketRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    setForm({ ...form, reference: e.target.files[0] });
  };

  const submit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append("category_id", form.category_id);
    data.append("market_id", form.market_id);
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("reference", form.reference);

    await createReference(data);

    setForm({
      category_id: "",
      market_id: "",
      title: "",
      description: "",
      reference: null,
    });

    load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reference Packaging</h1>
        <p>Upload approved sample packaging for designers to use as guidance.</p>
      </div>

      <form className="form-card admin-form" onSubmit={submit}>
        <select name="category_id" value={form.category_id} onChange={handleChange} required>
          <option value="">Select category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select name="market_id" value={form.market_id} onChange={handleChange} required>
          <option value="">Select market</option>
          {markets.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <input
          name="title"
          placeholder="Reference title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />

        <input type="file" accept="image/*,.pdf" onChange={handleFile} required />

        <button>Add Reference Packaging</button>
      </form>

      <div className="section-card">
        <div className="reference-grid">
          {references.map((item) => (
            <div className="reference-card" key={item.id}>
              {item.file_path?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img
                   src={backendFileUrl(item.file_path)}
                  alt={item.title}
                />
              ) : (
                <div className="pdf-box">PDF</div>
              )}

              <h3>{item.title}</h3>
              <p><strong>Category:</strong> {item.category_name}</p>
              <p><strong>Market:</strong> {item.market_name}</p>
              <p>{item.description}</p>

              <button
                className="danger-btn"
                onClick={() => deleteReference(item.id).then(load)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReferencePackaging;