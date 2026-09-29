import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, Wallet, Tags, CalendarClock, Settings, UserCog, LogOut, Menu, Moon, Sun, X,
} from "lucide-react";

function ToothLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 2 5 4 5 8c0 3 1 5 2 8 .5 1.5 1 4 2 4s1.5-2 2-4c.3-1 .5-2 1-2s.7 1 1 2c.5 2 1 4 2 4s1.5-2.5 2-4c1-3 2-5 2-8 0-4-3-6-7-6Z"/>
    </svg>
  );
}

const NAV = [
  { to: "/",          label: "Dashboard",     icon: LayoutDashboard, end: true },
  { to: "/patients",  label: "Patients",      icon: Users },
  { to: "/finances",  label: "Finances",      icon: Wallet, doctorOnly: true },
  { to: "/catalog",   label: "Price Catalog", icon: Tags, doctorOnly: true },
  { to: "/followups", label: "Follow-ups",    icon: CalendarClock },
  { to: "/settings",  label: "Settings",      icon: Settings },
  { to: "/accounts",  label: "Accounts",      icon: UserCog, adminOnly: true },
];

export default function Layout({ theme = "dark", onToggleTheme }) {
  const { user, logout, isDoctor, isAdmin } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`df-sidebar ${open ? "open" : ""}`} data-testid="app-sidebar">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
          <ToothLogo size={26} />
          <div className="leading-tight">
            <div className="font-semibold text-[15px] tracking-tight">DentaFlow</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60">Clinic Suite</div>
          </div>
        </div>
        <nav className="py-3 flex-1">
          {NAV.filter((n) => (!n.doctorOnly || isDoctor) && (!n.adminOnly || isAdmin)).map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to} to={n.to} end={n.end}
                onClick={() => setOpen(false)}
                data-testid={`nav-${n.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
                className={({ isActive }) => isActive ? "active" : ""}
              >
                <Icon size={18} /> <span>{n.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 text-[12px] text-white/70">
          v1.0 · {new Date().getFullYear()}
        </div>
      </aside>

      {/* Main column */}
      <div className="df-main flex-1" style={{ marginLeft: 240 }}>
        <header className="df-header">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="menu" data-testid="hamburger-btn">
              {open ? <X size={20}/> : <Menu size={20} />}
            </button>
            <div>
              <div className="text-[15px] font-semibold">DentaFlow</div>
              <div className="df-label">Dental Practice Management</div>
            </div>
          </div>
          <div className="df-header-user flex items-center gap-3 min-w-0" data-testid="header-user">
            <button
              type="button"
              className="df-btn df-btn-ghost df-theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
              data-testid="theme-toggle"
            >
              {isDark ? <Moon size={16}/> : <Sun size={16}/>}
              <span>{isDark ? "Dark" : "Light"}</span>
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-[11px] text-[var(--text-2)]">{user?.email}</div>
            </div>
            <span className={`df-badge ${isDoctor ? "df-badge-teal" : "df-badge-grey"}`} data-testid="role-badge">
              {isAdmin ? "Admin" : isDoctor ? "Doctor" : "Staff"}
            </span>
            <button
              className="df-btn df-btn-ghost df-logout"
              onClick={async () => { await logout(); nav("/login"); }}
              data-testid="logout-btn"
            >
              <LogOut size={16}/> <span>Logout</span>
            </button>
          </div>
        </header>
        <main className="df-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
