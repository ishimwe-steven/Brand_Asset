import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAdminDashboardAnalytics } from "../../services/dashboard.service";
import "./AdminDashboard.css";

const STATUS = {
  ready: { label: "Ready", color: "#18a66a" },
  needs_correction: { label: "Needs Correction", color: "#f59e0b" },
  not_ready: { label: "Not Ready", color: "#ef4444" },
};
const empty = {
  totals: { users: 0, companies: 0, verifications: 0, active_regulation_sets: 0 },
  changes: {}, verification_trend: [], verification_status: [],
  compliance_by_market: [], uploads_by_category: [], recent_verifications: [],
};
const number = (value) => Number(value || 0).toLocaleString();

export default function AdminDashboard() {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDashboardAnalytics()
      .then((response) => setData({ ...empty, ...(response.data || {}) }))
      .catch((err) => setError(err.response?.data?.message || "Failed to load dashboard analytics"))
      .finally(() => setLoading(false));
  }, []);

  const statusData = useMemo(() => data.verification_status.map((item) => ({
    ...item, name: STATUS[item.status]?.label || item.status,
    color: STATUS[item.status]?.color || "#64748b",
  })), [data.verification_status]);
  const statusTotal = statusData.reduce((sum, item) => sum + item.total, 0);
  const cards = [
    { key: "users", title: "Total Users", icon: "♟", tone: "blue" },
    { key: "companies", title: "Total Companies", icon: "▦", tone: "green" },
    { key: "verifications", title: "Total Verifications", icon: "✓", tone: "purple" },
    { key: "active_regulation_sets", title: "Active Regulation Sets", icon: "▤", tone: "orange" },
  ];

  if (loading) return <div className="analytics-loading">Loading live dashboard analytics...</div>;
  return <section className="analytics-dashboard">
    <div className="analytics-heading"><div><h1>Dashboard Overview</h1><p>Live packaging compliance and platform activity.</p></div><span>Last updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
    {error && <div className="alert-error">{error}</div>}

    <div className="analytics-kpi-grid">{cards.map((card) => {
      const change = Number(data.changes[card.key] || 0);
      return <article className={`analytics-kpi ${card.tone}`} key={card.key}>
        <div className="kpi-icon">{card.icon}</div><div><span>{card.title}</span><strong>{number(data.totals[card.key])}</strong>
          <small className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "↑" : "↓"} {Math.abs(change)}% <em>from previous 30 days</em></small>
        </div>
      </article>;
    })}</div>

    <div className="analytics-chart-grid">
      <article className="analytics-panel"><PanelTitle title="Verification Trend" label="Last 6 Months"/><div className="chart-area"><ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.verification_trend} margin={{ top: 15, right: 20, left: -15 }}>
          <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1769e0" stopOpacity={0.3}/><stop offset="95%" stopColor="#1769e0" stopOpacity={0.02}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf6"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/>
          <Tooltip/><Area type="monotone" dataKey="total" name="Verifications" stroke="#1769e0" strokeWidth={3} fill="url(#trendFill)" dot={{ r: 4, fill: "#1769e0" }}/>
        </AreaChart>
      </ResponsiveContainer></div></article>

      <article className="analytics-panel"><PanelTitle title="Verification Status" label="All Results"/>
        <div className="status-chart-layout"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart>
          <Pie data={statusData} dataKey="total" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={1}>{statusData.map((item) => <Cell key={item.status} fill={item.color}/>)}</Pie><Tooltip/>
        </PieChart></ResponsiveContainer><div className="donut-total"><strong>{number(statusTotal)}</strong><span>Total</span></div></div>
        <div className="status-legend">{statusData.map((item) => <div key={item.status}><i style={{ background: item.color }}/><span>{item.name}</span><strong>{number(item.total)}</strong><em>{statusTotal ? Math.round(item.total / statusTotal * 100) : 0}%</em></div>)}</div></div>
      </article>

      <ChartPanel title="Average Compliance Score by Market" data={data.compliance_by_market} xKey="market" dataKey="average_score" color="#7447d8" percent/>
      <ChartPanel title="Uploads by Product Category" data={data.uploads_by_category} xKey="category" dataKey="total" color="#3478e5"/>
    </div>

    <article className="analytics-panel recent-panel">
      <div className="panel-heading"><div><h2>Recent Verifications</h2><p>Latest compliance activity across all companies.</p></div><Link to="/admin/verifications">View All Verifications</Link></div>
      {data.recent_verifications.length === 0 ? <div className="analytics-empty">No verification activity has been recorded.</div> :
      <div className="analytics-table-wrap"><table><thead><tr><th>ID</th><th>Brand / Product</th><th>Company</th><th>Market</th><th>Submitted By</th><th>Score</th><th>Status</th><th>Date</th></tr></thead><tbody>
        {data.recent_verifications.map((item) => <tr key={item.id}><td>#VRF-{item.id}</td><td><strong>{item.brand_name || "No brand"}</strong><small>{item.product_name || "Unnamed product"}</small></td><td>{item.company_name || "—"}</td><td>{item.market_name}</td><td>{item.submitted_by}</td><td><strong>{Number(item.compliance_score || 0).toFixed(1)}%</strong></td><td><span className={`analytics-status ${item.export_status}`}>{STATUS[item.export_status]?.label || item.export_status}</span></td><td>{new Date(item.created_at).toLocaleString()}</td></tr>)}
      </tbody></table></div>}
    </article>
  </section>;
}

function PanelTitle({ title, label }) {
  return <div className="panel-heading"><h2>{title}</h2><span>{label}</span></div>;
}

function ChartPanel({ title, data, xKey, dataKey, color, percent = false }) {
  return <article className="analytics-panel"><PanelTitle title={title} label="All Time"/><div className="chart-area"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 20, right: 15, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf6"/><XAxis dataKey={xKey} axisLine={false} tickLine={false}/><YAxis domain={percent ? [0,100] : undefined} unit={percent ? "%" : undefined} allowDecimals={percent} axisLine={false} tickLine={false}/><Tooltip formatter={percent ? (value) => [`${value}%`, "Average score"] : undefined}/><Bar dataKey={dataKey} fill={color} radius={[5,5,0,0]} maxBarSize={48}/></BarChart>
  </ResponsiveContainer></div></article>;
}
