import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import DashboardLayout from "../components/layout/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";

import UploadPackaging from "../pages/packaging/UploadPackaging";
import MyUploads from "../pages/packaging/MyUploads";
import VerificationResult from "../pages/packaging/VerificationResult";

import Reports from "../pages/reports/Reports";
import ReportDetails from "../pages/reports/ReportDetails";

import Categories from "../pages/admin/Categories";
import Markets from "../pages/admin/Markets";
import Regulations from "../pages/admin/Regulations";
import ReferencePackaging from "../pages/admin/ReferencePackaging";
import UploadDetails from "../pages/packaging/UploadDetails";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadPackaging />} />
          <Route path="uploads" element={<MyUploads />} />
          <Route path="verification/:id" element={<VerificationResult />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetails />} />
          <Route path="uploads/:id" element={<UploadDetails />} />

          <Route
            path="admin/categories"
            element={
              <AdminRoute>
                <Categories />
              </AdminRoute>
            }
          />

          <Route
            path="admin/markets"
            element={
              <AdminRoute>
                <Markets />
              </AdminRoute>
            }
          />

          <Route
            path="admin/regulations"
            element={
              <AdminRoute>
                <Regulations />
              </AdminRoute>
            }
          />

          <Route
            path="admin/references"
            element={
              <AdminRoute>
                <ReferencePackaging />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;