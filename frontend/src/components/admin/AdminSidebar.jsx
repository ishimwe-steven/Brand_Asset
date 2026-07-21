import { NavLink } from "react-router-dom";
import "./AdminSidebar.css";

const AdminSidebar = () => {
  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
    },
    {
      label: "User Management",
      path: "/admin/users",
    },
    {
      label: "Markets",
      path: "/admin/markets",
    },
    {
      label: "Product Categories",
      path: "/admin/categories",
    },
    {
      label: "Regulation Sets",
      path: "/admin/regulation-sets",
    },
    
    {
      label: "Reference Packaging",
      path: "/admin/reference-packaging",
    },
    {
      label: "Verification Oversight",
      path: "/admin/verifications",
    },
    {
      label: "System Reports",
      path: "/admin/reports",
    },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        Export packaging <span>Verifier</span>
      </div>

      <nav className="admin-sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              isActive
                ? "admin-sidebar-link active"
                : "admin-sidebar-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;