import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";
import { createDesigner, getMyDesigners, resetDesignerPassword, updateDesignerStatus } from "../../services/designer.service";
import "./ExporterPages.css";

export default function MyDesigners() {
  const [designers, setDesigners] = useState([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filteredDesigners = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return designers;
    return designers.filter((designer) => [designer.name, designer.email, designer.membership_status].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [designers, search]);

  const load = () => getMyDesigners().then((res) => setDesigners(res.data?.designers || [])).catch((e) => setError(e.response?.data?.message || "Failed to load designers.")).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const res = await createDesigner(form);
      const password = res.data?.temporary_password;
      setMessage(`Designer created.${password ? ` Temporary password: ${password}` : ""}`);
      setForm({ name: "", email: "" }); setShowForm(false); await load();
    } catch (e) { setError(e.response?.data?.message || "Failed to create designer."); }
  };

  const toggle = async (designer) => {
    const status = designer.membership_status === "active" ? "disabled" : "active";
    try { await updateDesignerStatus(designer.id, status); await load(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update designer."); }
  };

  const reset = async (designer) => {
    try { const res = await resetDesignerPassword(designer.id); setMessage(`New temporary password for ${designer.name}: ${res.data?.temporary_password}`); }
    catch (e) { setError(e.response?.data?.message || "Failed to reset password."); }
  };

  return (
    <section className="exporter-page">
      <header><span>Team access</span><h1>My Designers</h1><p>Create controlled designer accounts for preparing and verifying your company packaging.</p></header>
      {message && <div className="workspace-alert success">{message}</div>}{error && <div className="workspace-alert error">{error}</div>}
      {showForm && <AdminModal title="Add Designer" onClose={() => setShowForm(false)}><form className="workspace-card designer-create user-modal-form" onSubmit={submit}>
        <input required placeholder="Designer full name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/>
        <input required type="email" placeholder="Designer email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/>
        <div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={() => setShowForm(false)}>Cancel</button><button>Create designer</button></div>
      </form></AdminModal>}
      <div className="workspace-card list-card-with-toolbar">
        <div className="admin-table-toolbar"><div><h2>Company Designers</h2><p>{filteredDesigners.length} designer{filteredDesigners.length === 1 ? "" : "s"}</p></div><div className="admin-toolbar-actions"><label className="admin-search"><span>Search designers</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or status" /></label><button className="admin-add-button" type="button" onClick={() => setShowForm(true)}>+ Add Designer</button></div></div>
        {loading ? <p>Loading designers...</p> : filteredDesigners.length === 0 ? <div className="empty-workspace"><h3>{search ? "No matching designers" : "No designers yet"}</h3><p>{search ? "Try a different search term." : "Use Add Designer to create the first account."}</p></div> : (
          <div className="workspace-table"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredDesigners.map((d)=><tr key={d.id}><td>{d.name}</td><td>{d.email}</td><td><span className={`team-status ${d.membership_status}`}>{d.membership_status}</span></td><td><div className="row-actions"><button onClick={()=>toggle(d)}>{d.membership_status === "active" ? "Disable" : "Activate"}</button><button className="secondary" onClick={()=>reset(d)}>Reset password</button></div></td></tr>)}</tbody></table></div>
        )}
      </div>
    </section>
  );
}
