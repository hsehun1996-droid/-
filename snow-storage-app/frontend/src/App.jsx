import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Stock from "./pages/Stock.jsx";
import EntryForm from "./pages/EntryForm.jsx";
import History from "./pages/History.jsx";
import AdminWarehouses from "./pages/admin/Warehouses.jsx";
import AdminItems from "./pages/admin/Items.jsx";
import AdminUsers from "./pages/admin/Users.jsx";

function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/entry" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <RequireAuth roles={["admin", "office"]}>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="entry" element={<EntryForm />} />
        <Route path="stock" element={<Stock />} />
        <Route path="history" element={<History />} />
        <Route
          path="admin/warehouses"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminWarehouses />
            </RequireAuth>
          }
        />
        <Route
          path="admin/items"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminItems />
            </RequireAuth>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminUsers />
            </RequireAuth>
          }
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={user?.role === "field" ? "/entry" : "/"} replace />}
      />
    </Routes>
  );
}
