import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const exporterLinks = [
  ["/dashboard", "Dashboard", "▦", true],
  ["/dashboard/company", "My Company", "▣"],
  ["/dashboard/brands", "My Brands", "◆"],
  ["/dashboard/designers", "My Designers", "♟"],
  ["/dashboard/upload", "Packaging Verification", "✓"],
  ["/dashboard/reports", "Reports", "▤"],
  ["/dashboard/profile", "Profile", "●"],
];

const designerLinks = [
  ["/dashboard/designer", "Dashboard", "▦", true],
  ["/dashboard/designer/verify-packaging", "Packaging Verification", "✓"],
  ["/dashboard/uploads", "My Uploads", "▣"],
  ["/dashboard/reports", "Reports", "▤"],
  ["/dashboard/profile", "Profile", "●"],
];

const Sidebar = () => {
  const { user } = useAuth();
  const links = user?.role === "designer" ? designerLinks : exporterLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Verify<span>AI</span></div>
      <p className="sidebar-role">
        {user?.role === "designer" ? "Designer workspace" : "SME Exporter workspace"}
      </p>
      <nav aria-label="Workspace navigation">
        {links.map(([to, label, icon, end]) => (
          <NavLink key={to} to={to} end={Boolean(end)}>
            <span className="sidebar-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-company">
        <span>Signed in as</span>
        <strong>{user?.company_name || user?.name}</strong>
      </div>
    </aside>
  );
};

export default Sidebar;
