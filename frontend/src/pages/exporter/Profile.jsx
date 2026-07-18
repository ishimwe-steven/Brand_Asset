import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import "./ExporterPages.css";

export default function Profile() {
  const { user } = useAuth();
  return <section className="exporter-page"><header><span>Account</span><h1>Profile</h1><p>Your personal account and access information.</p></header><div className="workspace-card profile-card"><div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div><div><h2>{user?.name}</h2><p>{user?.email}</p><dl><div><dt>Role</dt><dd>{user?.role === "exporter" ? "SME Exporter" : "Designer"}</dd></div><div><dt>Company</dt><dd>{user?.company_name || "Not assigned"}</dd></div><div><dt>Phone</dt><dd>{user?.phone || "Not provided"}</dd></div><div><dt>Status</dt><dd>{user?.status || "active"}</dd></div></dl><Link className="workspace-link" to="/dashboard/change-password">Change password</Link></div></div></section>;
}
