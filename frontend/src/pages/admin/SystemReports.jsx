import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadReportUrl, getReports } from "../../services/report.service";

export default function SystemReports() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getReports().then((response) => setReports(response.data || [])).catch((err) => setError(err.response?.data?.message || "Failed to load system reports")).finally(() => setLoading(false));
  }, []);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => (status === "all" || report.export_status === status) && (!term || [report.product_name, report.category_name, report.market_name, report.user_name, report.company_name, report.export_status].some((value) => String(value || "").toLowerCase().includes(term))));
  }, [reports, search, status]);

  const metrics = useMemo(() => ({
    total: reports.length,
    average: reports.length ? Math.round(reports.reduce((sum, report) => sum + Number(report.compliance_score || 0), 0) / reports.length) : 0,
    ready: reports.filter((report) => report.export_status === "ready").length,
    correction: reports.filter((report) => report.export_status !== "ready").length,
  }), [reports]);

  const downloadPdf = async (report) => {
    try {
      setError("");
      const response = await fetch(downloadReportUrl(report.result_id), { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!response.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `compliance-report-${report.result_id}.pdf`; link.click();
      URL.revokeObjectURL(url);
    } catch { setError("Failed to download report PDF"); }
  };

  return <div className="page-container admin-management-page">
    <div className="page-header"><h1>System Reports</h1><p>Review system-wide packaging compliance performance.</p></div>
    {error && <div className="alert-error">{error}</div>}
    <div className="stats-grid system-report-stats">
      <div className="stat-card"><h2>{metrics.total}</h2><p>Total Reports</p></div>
      <div className="stat-card"><h2>{metrics.average}%</h2><p>Average Compliance</p></div>
      <div className="stat-card success"><h2>{metrics.ready}</h2><p>Export Ready</p></div>
      <div className="stat-card danger"><h2>{metrics.correction}</h2><p>Need Correction</p></div>
    </div>
    <div className="section-card admin-table-card">
      <div className="admin-table-toolbar"><div><h2>Compliance Reports</h2><p>{filteredReports.length} result{filteredReports.length === 1 ? "" : "s"}</p></div><div className="admin-toolbar-actions">
        <label className="admin-search"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="ready">Ready</option><option value="needs_correction">Needs correction</option><option value="not_ready">Not ready</option></select></label>
        <label className="admin-search"><span>Search reports</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product, company or market" /></label>
      </div></div>
      {loading ? <div className="admin-empty-row">Loading system reports...</div> : filteredReports.length === 0 ? <div className="admin-empty-row">{search || status !== "all" ? "No reports match your filters." : "No compliance reports generated yet."}</div> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>Submitted By</th><th>Company</th><th>Category</th><th>Market</th><th>Score</th><th>Status</th><th>Generated</th><th>Actions</th></tr></thead><tbody>{filteredReports.map((report) => <tr key={report.id}>
        <td><strong>{report.product_name || "Unnamed product"}</strong></td><td>{report.user_name || "—"}</td><td>{report.company_name || "—"}</td><td>{report.category_name || "—"}</td><td>{report.market_name || "—"}</td><td><strong>{Number(report.compliance_score || 0).toFixed(1)}%</strong></td><td><span className={`status-badge ${report.export_status}`}>{String(report.export_status || "unknown").replaceAll("_", " ")}</span></td><td>{new Date(report.generated_at).toLocaleString()}</td><td><div className="table-actions"><Link className="small-link" to={`/admin/reports/${report.id}`}>View</Link><button onClick={() => downloadPdf(report)}>Download</button></div></td>
      </tr>)}</tbody></table></div>}
    </div>
  </div>;
}
