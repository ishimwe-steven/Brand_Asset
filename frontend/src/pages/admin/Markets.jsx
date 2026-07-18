import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";
import { createMarket, deleteMarket, getMarkets } from "../../services/market.service";

const emptyForm = { name: "", code: "", description: "" };

const Markets = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const load = async () => setItems((await getMarkets()).data || []);
  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.name, item.code, item.description].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [items, search]);

  const submit = async (event) => {
    event.preventDefault();
    await createMarket(form);
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  return <div className="page-container admin-management-page">
    <div className="page-header"><h1>Markets</h1><p>Manage export markets.</p></div>
    <div className="section-card admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>Destination Markets</h2><p>{filteredItems.length} market{filteredItems.length === 1 ? "" : "s"}</p></div>
        <div className="admin-toolbar-actions">
          <label className="admin-search"><span>Search markets</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or description" /></label>
          <button className="admin-add-button" type="button" onClick={() => setShowForm(true)}>+ Add Market</button>
        </div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Description</th><th>Action</th></tr></thead>
        <tbody>{filteredItems.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.code}</td><td>{item.description || "—"}</td><td><button className="danger-btn" onClick={() => deleteMarket(item.id).then(load)}>Delete</button></td></tr>)}</tbody>
      </table></div>
      {filteredItems.length === 0 && <div className="admin-empty-row">No markets match your search.</div>}
    </div>
    {showForm && <AdminModal title="Add Market" onClose={() => setShowForm(false)}>
      <form className="form-card admin-form admin-modal-form" onSubmit={submit}>
        <label>Market name<input placeholder="Example: United States" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></label>
        <label>Market code<input placeholder="Example: US" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} required /></label>
        <label>Description<input placeholder="Optional description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></label>
        <div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit">Add Market</button></div>
      </form>
    </AdminModal>}
  </div>;
};

export default Markets;
