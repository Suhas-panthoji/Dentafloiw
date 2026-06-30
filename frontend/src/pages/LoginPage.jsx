import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatErr } from "@/lib/api";
import { toast } from "sonner";

function ToothLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2DD4D4"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 2 5 4 5 8c0 3 1 5 2 8 .5 1.5 1 4 2 4s1.5-2 2-4c.3-1 .5-2 1-2s.7 1 1 2c.5 2 1 4 2 4s1.5-2.5 2-4c1-3 2-5 2-8 0-4-3-6-7-6Z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome, ${u.name}`);
      nav("/");
    } catch (e2) {
      setErr(formatErr(e2));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "radial-gradient(circle at 20% 0%, rgba(20,184,184,0.18) 0%, #0B1117 45%, #07101A 100%)" }}>
      <div className="df-card w-full max-w-[420px] p-8 df-anim-in" data-testid="login-card">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--teal-light)] border border-[var(--border)] flex items-center justify-center mb-3">
            <ToothLogo />
          </div>
          <h1 className="text-[22px] font-semibold">DentaFlow</h1>
          <p className="text-sm text-[var(--text-2)] mt-1">Sign in to your clinic dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="df-label block mb-1">Email</label>
            <input type="email" className="df-input" value={email} required
                   onChange={(e) => setEmail(e.target.value)} data-testid="login-email"/>
          </div>
          <div>
            <label className="df-label block mb-1">Password</label>
            <input type="password" className="df-input" value={password} required
                   onChange={(e) => setPassword(e.target.value)} data-testid="login-password"/>
          </div>
          {err && <div className="text-sm text-[var(--danger)]" data-testid="login-error">{err}</div>}
          <button type="submit" className="df-btn w-full" disabled={busy} data-testid="login-submit">
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>


      </div>
    </div>
  );
}
