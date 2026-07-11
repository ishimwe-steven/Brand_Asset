import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <h2>VerifyAI</h2>

      <nav>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/dashboard/upload">Upload Packaging</NavLink>
        <NavLink to="/dashboard/uploads">My Uploads</NavLink>
        <NavLink to="/dashboard/reports">Reports</NavLink>

        {user?.role === "admin" && (
          <>
            <hr />
            <NavLink to="/dashboard/admin/categories">Categories</NavLink>
            <NavLink to="/dashboard/admin/markets">Markets</NavLink>
            <NavLink to="/dashboard/admin/regulations">Regulations</NavLink>
            <NavLink to="/dashboard/admin/references">Reference Packaging</NavLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;