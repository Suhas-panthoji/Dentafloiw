import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";
import Layout from "@/components/Layout";
import OdontogramPage from "@/pages/OdontogramPage";
import "@/App.css";

const getInitialTheme = () => {
  try {
    return localStorage.getItem("odontogram-theme") || "dark";
  } catch {
    return "dark";
  }
};

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-[var(--text-2)]">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("odontogram-theme", theme);
    } catch {
      // keep in-memory theme
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((cur) => (cur === "dark" ? "light" : "dark"));

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <Protected>
                <Layout theme={theme} onToggleTheme={toggleTheme} />
              </Protected>
            }
          >
            <Route index element={<OdontogramPage />} />
            <Route path="odontogram/:id" element={<OdontogramPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
