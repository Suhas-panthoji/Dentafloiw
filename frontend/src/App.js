import React, { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Agentation } from "agentation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { safeStorage } from "@/lib/storage";
import LoginPage from "@/pages/LoginPage";
import Layout from "@/components/Layout";
import "@/App.css";

// Lazy-loaded routes for code splitting
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const PatientsListPage = lazy(() => import("@/pages/PatientsListPage"));
const PatientFormPage = lazy(() => import("@/pages/PatientFormPage"));
const FinancesPage = lazy(() => import("@/pages/FinancesPage"));
const PriceCatalogPage = lazy(() => import("@/pages/PriceCatalogPage"));
const FollowUpsPage = lazy(() => import("@/pages/FollowUpsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AccountManagementPage = lazy(() => import("@/pages/AccountManagementPage"));

const PageFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 text-[var(--text-2)] min-h-[300px]">
    <div className="w-8 h-8 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-sm">Loading page…</span>
  </div>
);

const getInitialTheme = () => {
  try {
    return safeStorage.getItem("dentaflow-theme") || "dark";
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
    return "dark";
  }
};

function Protected({ children, doctorOnly = false, adminOnly = false }) {
  const { user, loading, isDoctor, isAdmin } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center h-screen text-[var(--text-2)]">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (doctorOnly && !isDoctor) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      safeStorage.setItem("dentaflow-theme", theme);
    } catch {
      // Keep the in-memory theme even if persistence is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        {process.env.NODE_ENV === 'development' && <Agentation />}
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Protected><Layout theme={theme} onToggleTheme={toggleTheme} /></Protected>}>
              <Route index element={<DashboardPage />} />
              <Route path="patients" element={<PatientsListPage />} />
              <Route path="patients/new" element={<PatientFormPage mode="new" />} />
              <Route path="patients/:id" element={<PatientFormPage mode="edit" />} />
              <Route path="finances" element={<Protected doctorOnly><FinancesPage /></Protected>} />
              <Route path="catalog" element={<Protected doctorOnly><PriceCatalogPage /></Protected>} />
              <Route path="followups" element={<FollowUpsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="accounts" element={<Protected adminOnly><AccountManagementPage /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
