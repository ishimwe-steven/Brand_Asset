import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";
import { changeAdminUserStatus, createAdminUser, getAdminUsers, resetAdminUserPassword, updateAdminUser } from "../../services/user.service";

const emptyForm = { name: "", email: "", phone: "", role: "exporter", password: "", company_name: "", company_id: "" };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const response = await getAdminUsers();
      setUsers(response.data?.users || []);
      setCompanies(response.data?.companies || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => (roleFilter === "all" || user.role === roleFilter) && (!term || [user.name, user.email, user.phone, user.role, user.associated_company, user.status].some((value) => String(value || "").toLowerCase().includes(term))));
  }, [users, search, roleFilter]);

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };
  const startEdit = (user) => {
    setEditing(user);
    setForm({ name: user.name || "", email: user.email || "", phone: user.phone || "", role: user.role, password: "", company_name: user.company_name || user.associated_company || "", company_id: user.company_id || "" });
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      setSubmitting(true);
      if (editing) await updateAdminUser(editing.id, form);
      else await createAdminUser(form);
      setMessage(editing ? "User updated successfully." : "User created successfully.");
      closeForm(); await load();
    } catch (err) { setError(err.response?.data?.message || "Failed to save user"); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (user) => {
    try {
      setError("");
      await changeAdminUserStatus(user.id, user.status === "active" ? "inactive" : "active");
      await load();
    } catch (err) { setError(err.response?.data?.message || "Failed to update user status"); }
  };

  const resetPassword = async (user) => {
    if (!window.confirm(`Reset the password for ${user.name}?`)) return;
    try {
      const response = await resetAdminUserPassword(user.id);
      setMessage(`Temporary password for ${user.name}: ${response.data?.temporary_password}`);
    } catch (err) { setError(err.response?.data?.message || "Failed to reset password"); }
  };

  return <div className="page-container admin-management-page">
    <div className="page-header"><h1>User Management</h1><p>Manage administrators, SME exporters and designers.</p></div>
    {message && <div className="workspace-alert success">{message}</div>}
    {error && <div className="alert-error">{error}</div>}

    <div className="section-card admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>System Users</h2><p>{filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"}</p></div>
        <div className="admin-toolbar-actions">
          <label className="admin-search"><span>Role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option><option value="admin">Administrators</option><option value="exporter">Exporters</option><option value="designer">Designers</option></select></label>
          <label className="admin-search"><span>Search users</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or company" /></label>
          <button className="admin-add-button" type="button" onClick={() => setShowForm(true)}>+ Add User</button>
        </div>
      </div>
      {loading ? <div className="admin-empty-row">Loading users...</div> : filteredUsers.length === 0 ? <div className="admin-empty-row">{search || roleFilter !== "all" ? "No users match your filters." : "No users have been created."}</div> : <div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Company</th><th>Phone</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}>
        <td><strong>{user.name}</strong><div className="table-subtext">{user.email}</div></td><td><span className={`user-role-badge ${user.role}`}>{user.role}</span></td><td>{user.associated_company || "—"}</td><td>{user.phone || "—"}</td><td><span className={`status-badge ${user.status}`}>{user.status}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td><div className="table-actions user-table-actions"><button onClick={() => startEdit(user)}>Edit</button><button className="reset-button" onClick={() => resetPassword(user)}>Reset Password</button><button className={user.status === "active" ? "disable-button" : "activate-button"} onClick={() => toggleStatus(user)}>{user.status === "active" ? "Disable" : "Activate"}</button></div></td>
      </tr>)}</tbody></table></div>}
    </div>

    {showForm && <AdminModal title={editing ? "Edit User" : "Add User"} onClose={closeForm}><form className="form-card admin-form admin-modal-form" onSubmit={submit}>
      <label>Full name<input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></label>
      <label>Email address<input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></label>
      <label>Phone number<input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></label>
      <label>Role<select value={form.role} onChange={(e) => setForm({...form, role: e.target.value, company_name: "", company_id: ""})} disabled={Boolean(editing)}><option value="admin">Administrator</option><option value="exporter">SME Exporter</option><option value="designer">Designer</option></select></label>
      {!editing && form.role === "exporter" && <label>Company name<input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} required /></label>}
      {!editing && form.role === "designer" && <label>Assign to company<select value={form.company_id} onChange={(e) => setForm({...form, company_id: e.target.value})} required><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}</select></label>}
      {editing?.role === "exporter" && <label>Company name<input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} required /></label>}
      {!editing && <label>Initial password<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Minimum 8 characters" required /></label>}
      <div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={closeForm}>Cancel</button><button type="submit" disabled={submitting}>{submitting ? "Saving..." : editing ? "Update User" : "Create User"}</button></div>
    </form></AdminModal>}
  </div>;
}
