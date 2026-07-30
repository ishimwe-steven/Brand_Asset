import { useEffect, useMemo, useState } from "react";
import AdminModal from "../../components/admin/AdminModal";
import { getVerification, getVerificationHistory } from "../../services/verification.service";
import "./VerificationOversight.css";

const LABELS = {
  ready: "Ready",
  needs_correction: "Needs Correction",
  not_ready: "Not Ready",
};

export default function VerificationOversight() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getVerificationHistory()
      .then((response) => setItems(Array.isArray(response.data) ? response.data : []))
      .catch((err) => setError(err.response?.data?.message || "Failed to load verification history"))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => ({
    total: items.length,
    average: items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.compliance_score || 0), 0) / items.length) : 0,
    ready: items.filter((item) => item.export_status === "ready").length,
    attention: items.filter((item) => item.export_status !== "ready").length,
  }), [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) =>
      (status === "all" || item.export_status === status) &&
      (!term || [item.id, item.product_name, item.user_name, item.category_name, item.market_name, item.export_status]
        .some((value) => String(value || "").toLowerCase().includes(term)))
    );
  }, [items, search, status]);

  const openDetails = async (id) => {
    try {
      setDetailLoading(true);
      setError("");
      const response = await getVerification(id);
      setSelected(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load verification details");
    } finally {
      setDetailLoading(false);
    }
  };

  return <section className="oversight-page">
    <div className="oversight-heading">
      <div><h1>Verification Oversight</h1><p>Monitor packaging verification activities and compliance results.</p></div>
    </div>
    {error && <div className="alert-error">{error}</div>}

    <div className="oversight-stats">
      <article><span>Total Verifications</span><strong>{metrics.total}</strong></article>
      <article><span>Average Compliance</span><strong>{metrics.average}%</strong></article>
      <article className="success"><span>Export Ready</span><strong>{metrics.ready}</strong></article>
      <article className="warning"><span>Need Attention</span><strong>{metrics.attention}</strong></article>
    </div>

    <div className="section-card admin-table-card">
      <div className="admin-table-toolbar">
        <div><h2>Verification Activity</h2><p>{filtered.length} result{filtered.length === 1 ? "" : "s"}</p></div>
        <div className="admin-toolbar-actions">
          <label className="admin-search"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option><option value="ready">Ready</option>
            <option value="needs_correction">Needs correction</option><option value="not_ready">Not ready</option>
          </select></label>
          <label className="admin-search"><span>Search verifications</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product, user, market or ID"/></label>
        </div>
      </div>

      {loading ? <div className="admin-empty-row">Loading verification activity...</div> :
      filtered.length === 0 ? <div className="admin-empty-row">{search || status !== "all" ? "No verifications match your filters." : "No verification activity recorded yet."}</div> :
      <div className="oversight-table-wrap"><table><thead><tr><th>ID</th><th>Product</th><th>Submitted By</th><th>Category</th><th>Market</th><th>Rules</th><th>Score</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id}>
        <td>#VRF-{item.id}</td><td><strong>{item.product_name || "Unnamed product"}</strong></td><td>{item.user_name || "—"}</td>
        <td>{item.category_name}</td><td>{item.market_name}</td><td>{item.passed_rules}/{item.total_rules}</td>
        <td><strong>{Number(item.compliance_score || 0).toFixed(1)}%</strong></td>
        <td><span className={`oversight-status ${item.export_status}`}>{LABELS[item.export_status] || item.export_status}</span></td>
        <td>{new Date(item.created_at).toLocaleString()}</td><td><button className="oversight-view" disabled={detailLoading} onClick={() => openDetails(item.id)}>Review</button></td>
      </tr>)}</tbody></table></div>}
    </div>

    {selected && <AdminModal title={`Verification #VRF-${selected.id}`} onClose={() => setSelected(null)}>
      <div className="oversight-detail">
        <div className="detail-score"><strong>{Number(selected.compliance_score || 0).toFixed(1)}%</strong><span className={`oversight-status ${selected.export_status}`}>{LABELS[selected.export_status] || selected.export_status}</span></div>
        <div className="detail-grid"><div><span>Product</span><strong>{selected.product_name}</strong></div><div><span>Category</span><strong>{selected.category_name}</strong></div><div><span>Market</span><strong>{selected.market_name}</strong></div><div><span>Rules Passed</span><strong>{selected.passed_rules}/{selected.total_rules}</strong></div></div>
        <section><h3>Summary</h3><p>{selected.summary || "No summary available."}</p></section>
        <section><h3>Compliance Issues ({selected.issues?.length || 0})</h3>
          {!selected.issues?.length ? <p className="detail-empty">No compliance issues detected.</p> : selected.issues.map((issue) => <article className="oversight-issue" key={issue.id}><div><strong>{issue.rule_name || issue.issue_type}</strong><span>{issue.severity}</span></div><p>{issue.issue_description}</p><small><b>Recommendation:</b> {issue.recommendation}</small></article>)}
        </section>
        <section><h3>Correction Suggestions ({selected.suggestions?.length || 0})</h3>
          {!selected.suggestions?.length ? <p className="detail-empty">No correction suggestions required.</p> : selected.suggestions.map((suggestion) => <article className="oversight-issue suggestion" key={suggestion.id}><strong>{suggestion.asset_type}</strong><p>{suggestion.suggestion}</p><small><b>Position:</b> {suggestion.recommended_position || "Not specified"}</small></article>)}
        </section>
      </div>
    </AdminModal>}
  </section>;
}
