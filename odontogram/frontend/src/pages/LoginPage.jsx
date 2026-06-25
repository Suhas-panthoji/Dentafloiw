import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { formatErr } from "@/lib/api";
import { toast } from "sonner";

function ToothLogo({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C8 2 5 4 5 8c0 3 1 5 2 8 .5 1.5 1 4 2 4s1.5-2 2-4c.3-1 .5-2 1-2s.7 1 1 2c.5 2 1 4 2 4s1.5-2.5 2-4c1-3 2-5 2-8 0-4-3-6-7-6Z" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      nav("/");
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div
        className="df-card df-anim-in"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px 36px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--teal-light)",
              border: "2px solid rgba(20,184,184,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--teal-accent)",
            }}
          >
            <ToothLogo size={36} />
          </div>
          <h1 style={{ fontSize: 24, margin: 0, color: "var(--text)" }}>
            Odontogram
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            Sign in to access the tooth chart
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="df-label" style={{ display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="df-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="df-label" style={{ display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="df-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="df-btn"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: 24,
          }}
        >
          DentaFlow · Odontogram Module
        </p>
      </div>
    </div>
  );
}
