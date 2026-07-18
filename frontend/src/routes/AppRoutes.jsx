import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import RegulationSets from "../pages/admin/RegulationSets";

// ========================================
// AUTH PAGES
// ========================================
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ChangePassword from "../pages/auth/ChangePassword";

// ========================================
// NORMAL USER / EXPORTER LAYOUT
// ========================================
import DashboardLayout from "../components/layout/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";

// ========================================
// PACKAGING PAGES
// ========================================
import UploadPackaging from "../pages/packaging/UploadPackaging";
import MyUploads from "../pages/packaging/MyUploads";
import VerificationResult from "../pages/packaging/VerificationResult";
import UploadDetails from "../pages/packaging/UploadDetails";

// ========================================
// REPORT PAGES
// ========================================
import Reports from "../pages/reports/Reports";
import ReportDetails from "../pages/reports/ReportDetails";

// ========================================
// BRAND PAGES
// ========================================
import Brands from "../pages/brands/Brands";
import MyCompany from "../pages/exporter/MyCompany";
import MyDesigners from "../pages/exporter/MyDesigners";
import Profile from "../pages/exporter/Profile";

// ========================================
// DESIGNER PAGES
// ========================================
import DesignerDashboard from "../pages/designer/DesignerDashboard";
import VerifyPackaging from "../pages/designer/VerifyPackaging";

// ========================================
// ADMIN LAYOUT
// ========================================
import AdminLayout from "../layouts/AdminLayout";

// ========================================
// ADMIN PAGES
// ========================================
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminPlaceholderPage from "../pages/admin/AdminPlaceholderPage";
import Categories from "../pages/admin/Categories";
import Markets from "../pages/admin/Markets";
import Regulations from "../pages/admin/Regulations";
import ReferencePackaging from "../pages/admin/ReferencePackaging";
import UserManagement from "../pages/admin/UserManagement";
import SystemReports from "../pages/admin/SystemReports";

// ========================================
// ROUTE PROTECTION
// ========================================
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ======================================
            DEFAULT ROUTE
        ====================================== */}
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* ======================================
            PUBLIC AUTH ROUTES
        ====================================== */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* ======================================
            EXPORTER / DESIGNER DASHBOARD
        ====================================== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Exporter dashboard */}
          <Route
            index
            element={<Dashboard />}
          />

          {/* Packaging upload */}
          <Route
            path="upload"
            element={<UploadPackaging />}
          />

          {/* User uploads */}
          <Route
            path="uploads"
            element={<MyUploads />}
          />

          {/* Upload details */}
          <Route
            path="uploads/:id"
            element={<UploadDetails />}
          />

          {/* Verification result */}
          <Route
            path="verification/:id"
            element={<VerificationResult />}
          />

          {/* Reports */}
          <Route
            path="reports"
            element={<Reports />}
          />

          <Route
            path="reports/:id"
            element={<ReportDetails />}
          />

          {/* Exporter brands */}
          <Route
            path="brands"
            element={<ProtectedRoute allowedRoles={["exporter"]}><Brands /></ProtectedRoute>}
          />

          <Route path="company" element={<ProtectedRoute allowedRoles={["exporter"]}><MyCompany /></ProtectedRoute>} />
          <Route path="designers" element={<ProtectedRoute allowedRoles={["exporter"]}><MyDesigners /></ProtectedRoute>} />
          <Route path="profile" element={<Profile />} />

          {/* Password change */}
          <Route
            path="change-password"
            element={<ChangePassword />}
          />

          {/* Designer dashboard */}
          <Route
            path="designer"
            element={
              <ProtectedRoute
                allowedRoles={["designer"]}
              >
                <DesignerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Designer packaging verification */}
          <Route
            path="designer/verify-packaging"
            element={
              <ProtectedRoute
                allowedRoles={["designer"]}
              >
                <VerifyPackaging />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ======================================
            ADMIN DASHBOARD
        ====================================== */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          {/* Redirect /admin to /admin/dashboard */}
          <Route
            index
            element={
              <Navigate
                to="/admin/dashboard"
                replace
              />
            }
          />

          {/* Admin dashboard */}
          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          {/* User management */}
          <Route
            path="users"
            element={<UserManagement />}
          />

          {/* Destination markets */}
          <Route
            path="markets"
            element={<Markets />}
          />

          {/* Product categories */}
          <Route
            path="categories"
            element={<Categories />}
          />

          {/* Regulation sets */}
          <Route
          path="regulation-sets"
  element={<RegulationSets
              />
            }
          />

          {/* Existing Regulations page becomes Compliance Rules */}
          <Route
            path="compliance-rules"
            element={<Regulations />}
          />

          {/* Regulatory reference packaging */}
          <Route
            path="reference-packaging"
            element={<ReferencePackaging />}
          />

          {/* Verification oversight */}
          <Route
            path="verifications"
            element={
              <AdminPlaceholderPage
                title="Verification Oversight"
                description="Monitor packaging verification activities and compliance results."
              />
            }
          />

          {/* System reports */}
          <Route
            path="reports"
            element={<SystemReports />}
          />
          <Route path="reports/:id" element={<ReportDetails />} />
        </Route>

        {/* ======================================
            UNKNOWN ROUTES
        ====================================== */}
        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
