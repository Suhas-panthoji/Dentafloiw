import React, { useEffect, useState } from "react";
import { Users, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";

export default function SettingsPage() {
  const { user, isDoctor } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (isDoctor) api.get("/auth/active-sessions").then((r) => setSessions(r.data)).catch(() => {});
  }, [isDoctor]);

  return (
    <div className="space-y-5 df-anim-in" data-testid="settings-page">
      <div>
        <h1>Settings</h1>
        <p className="text-[var(--text-2)] mt-1">Account and clinic configuration.</p>
      </div>

      <div className="df-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Shield size={18} className="text-[var(--teal)]"/>
          <h3>Account</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div><div className="df-label">Name</div>{user?.name}</div>
          <div><div className="df-label">Email</div>{user?.email}</div>
          <div><div className="df-label">Role</div><span className={`df-badge ${isDoctor ? "df-badge-teal" : "df-badge-grey"}`}>{user?.role}</span></div>
        </div>
      </div>

      {isDoctor && (
        <div className="df-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Users size={18} className="text-[var(--teal)]"/>
            <h3>Active Sessions</h3>
            <span className="df-badge df-badge-teal">{sessions.length}</span>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">No active users.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {sessions.map((s, i) => (
                <li key={i} className="py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium text-sm">{s.name} <span className="df-badge df-badge-grey ml-2">{s.role}</span></div>
                    <div className="text-[12px] text-[var(--text-2)]">{s.email} · {s.ip}</div>
                  </div>
                  <div className="text-[12px] text-[var(--text-2)]">
                    Logged in: {fmtDate(s.login_time)} · Last seen: {fmtDate(s.last_seen)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
