import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";
import { getCategories } from "../../services/category.service";
import { getMarkets } from "../../services/market.service";
import {
  createRegulation,
  deleteRegulation,
  getRegulations,
} from "../../services/regulation.service";

const Regulations = () => {
  const [regulations, setRegulations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    market_id: "",
    category_id: "",
    section: "packaging_compliance",
    rule_name: "",
    requirement: "",
    mandatory: "1",
    recommendation: "",
  });

  const load = async () => {
    const regRes = await getRegulations();
    const catRes = await getCategories();
    const marketRes = await getMarkets();

    setRegulations(regRes.data || []);
    setCategories(catRes.data || []);
    setMarkets(marketRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRegulations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return regulations;
    return regulations.filter((item) => [item.rule_name, item.market_name, item.category_name, item.section, item.requirement].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [regulations, search]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();

    await createRegulation({
      ...form,
      mandatory: form.mandatory === "1",
    });

    setForm({
      market_id: "",
      category_id: "",
      section: "packaging_compliance",
      rule_name: "",
      requirement: "",
      mandatory: "1",
      recommendation: "",
    });
    setShowForm(false);
    await load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Regulations</h1>
        <p>Manage regulatory knowledge base rules.</p>
      </div>

      {showForm && <AdminModal title="Add Compliance Rule" onClose={() => setShowForm(false)}><form className="form-card admin-form admin-modal-form" onSubmit={submit}>
        <select name="market_id" value={form.market_id} onChange={handleChange} required>
          <option value="">Select market</option>
          {markets.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select name="category_id" value={form.category_id} onChange={handleChange} required>
          <option value="">Select category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select name="section" value={form.section} onChange={handleChange}>
          <option value="packaging_compliance">Packaging Compliance</option>
          <option value="brand_asset">Brand Asset</option>
        </select>

        <input
          name="rule_name"
          placeholder="Rule name e.g expiry_date"
          value={form.rule_name}
          onChange={handleChange}
          required
        />

        <textarea
          name="requirement"
          placeholder="Requirement"
          value={form.requirement}
          onChange={handleChange}
          required
        />

        <select name="mandatory" value={form.mandatory} onChange={handleChange}>
          <option value="1">Mandatory</option>
          <option value="0">Optional</option>
        </select>

        <textarea
          name="recommendation"
          placeholder="Recommendation"
          value={form.recommendation}
          onChange={handleChange}
        />

        <div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit">Add Regulation</button></div>
      </form></AdminModal>}

      <div className="section-card admin-table-card">
        <div className="admin-table-toolbar">
          <div><h2>Compliance Rules</h2><p>{filteredRegulations.length} rule{filteredRegulations.length === 1 ? "" : "s"}</p></div>
          <div className="admin-toolbar-actions">
            <label className="admin-search"><span>Search rules</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rule, market or category" /></label>
            <button className="admin-add-button" type="button" onClick={() => setShowForm(true)}>+ Add Rule</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Market</th>
                <th>Category</th>
                <th>Section</th>
                <th>Mandatory</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegulations.map((item) => (
                <tr key={item.id}>
                  <td>{item.rule_name}</td>
                  <td>{item.market_name}</td>
                  <td>{item.category_name}</td>
                  <td>{item.section}</td>
                  <td>{item.mandatory ? "Yes" : "No"}</td>
                  <td>
                    <button
                      className="danger-btn"
                      onClick={() => deleteRegulation(item.id).then(load)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRegulations.length === 0 && <div className="admin-empty-row">No compliance rules match your search.</div>}
      </div>
    </div>
  );
};

export default Regulations;
