import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AdminSidebar from "../admin/AdminSidebar";
import useAuth from "../../hooks/useAuth";

const DashboardLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="dashboard-layout">
      {isAdmin ? <AdminSidebar /> : <Sidebar />}

      <div className="dashboard-main">
        <Navbar />

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;