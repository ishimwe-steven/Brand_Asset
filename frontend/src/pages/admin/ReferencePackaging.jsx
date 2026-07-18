import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";
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
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

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

  const filteredReferences = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return references;
    return references.filter((item) => [item.title, item.description, item.category_name, item.market_name].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [references, search]);

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
    setShowForm(false);
    await load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reference Packaging</h1>
        <p>Upload approved sample packaging for designers to use as guidance.</p>
      </div>

      {showForm && <AdminModal title="Add Reference Packaging" onClose={() => setShowForm(false)}><form className="form-card admin-form admin-modal-form" onSubmit={submit}>
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

        <div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit">Add Reference Packaging</button></div>
      </form></AdminModal>}

      <div className="section-card list-card-with-toolbar">
        <div className="admin-table-toolbar"><div><h2>Approved References</h2><p>{filteredReferences.length} reference{filteredReferences.length === 1 ? "" : "s"}</p></div><div className="admin-toolbar-actions"><label className="admin-search"><span>Search references</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, category or market" /></label><button className="admin-add-button" type="button" onClick={() => setShowForm(true)}>+ Add Reference</button></div></div>
        <div className="reference-grid">
          {filteredReferences.map((item) => (
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
        {filteredReferences.length === 0 && <div className="admin-empty-row">{search ? "No references match your search." : "No reference packaging uploaded yet."}</div>}
      </div>
    </div>
  );
};

export default ReferencePackaging;
