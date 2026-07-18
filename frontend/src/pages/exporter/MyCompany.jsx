import { useEffect, useState } from "react";
import { getMyCompany, updateMyCompany } from "../../services/company.service";
import "./ExporterPages.css";

const emptyCompany = { company_name: "", registration_number: "", email: "", phone: "", address: "" };

export default function MyCompany() {
  const [form, setForm] = useState(emptyCompany);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getMyCompany()
      .then((res) => setForm({ ...emptyCompany, ...(res.data?.company || {}) }))
      .catch((err) => setError(err.response?.data?.message || "Failed to load company profile."))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const res = await updateMyCompany(form);
      setForm({ ...emptyCompany, ...res.data.company });
      setMessage("Company profile saved successfully.");
    } catch (err) { setError(err.response?.data?.message || "Failed to save company profile."); }
    finally { setSaving(false); }
  };

  if (loading) return <p>Loading company profile...</p>;
  return (
    <section className="exporter-page">
      <header><span>SME account</span><h1>My Company</h1><p>Maintain the exporter information used across brands, designers and compliance reports.</p></header>
      {message && <div className="workspace-alert success">{message}</div>}
      {error && <div className="workspace-alert error">{error}</div>}
      <form className="workspace-card workspace-form" onSubmit={submit}>
        <label>Company name<input required value={form.company_name} onChange={(e) => setForm({...form, company_name:e.target.value})}/></label>
        <label>Registration number<input value={form.registration_number || ""} onChange={(e) => setForm({...form, registration_number:e.target.value})}/></label>
        <label>Business email<input type="email" value={form.email || ""} onChange={(e) => setForm({...form, email:e.target.value})}/></label>
        <label>Phone number<input value={form.phone || ""} onChange={(e) => setForm({...form, phone:e.target.value})}/></label>
        <label className="full">Business address<textarea value={form.address || ""} onChange={(e) => setForm({...form, address:e.target.value})}/></label>
        <div className="full"><button disabled={saving}>{saving ? "Saving..." : "Save company profile"}</button></div>
      </form>
    </section>
  );
}
