import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/DashboardPage";
import PatientsListPage from "@/pages/PatientsListPage";
import PatientFormPage from "@/pages/PatientFormPage";
import FinancesPage from "@/pages/FinancesPage";
import PriceCatalogPage from "@/pages/PriceCatalogPage";
import FollowUpsPage from "@/pages/FollowUpsPage";
import SettingsPage from "@/pages/SettingsPage";
import "@/App.css";

function Protected({ children, doctorOnly = false }) {
  const { user, loading, isDoctor } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center h-screen text-[var(--text-2)]">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (doctorOnly && !isDoctor) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientsListPage />} />
            <Route path="patients/new" element={<PatientFormPage mode="new" />} />
            <Route path="patients/:id" element={<PatientFormPage mode="edit" />} />
            <Route path="finances" element={<Protected doctorOnly><FinancesPage /></Protected>} />
            <Route path="catalog" element={<Protected doctorOnly><PriceCatalogPage /></Protected>} />
            <Route path="followups" element={<FollowUpsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
