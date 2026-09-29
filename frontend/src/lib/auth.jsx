import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { safeStorage } from "./storage";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = safeStorage.getItem("df_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => safeStorage.removeItem("df_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    safeStorage.setItem("df_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    safeStorage.removeItem("df_token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{
      user, loading, login, logout,
      // Administrators have all doctor-level clinic permissions.
      isDoctor: ["doctor", "admin"].includes(user?.role),
      isAdmin: user?.role === "admin",
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
