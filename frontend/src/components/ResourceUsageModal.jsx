import React, { useCallback, useEffect, useState } from "react";
import { Cloud, Database, Gauge, RefreshCw, Server, X } from "lucide-react";
import { api, formatErr } from "@/lib/api";
import { RESOURCE_LIMITS } from "@/config/resourceUsage";

function percentage(used, limit) {
  return Math.min(100, Math.round((used / limit) * 100));
}

function barColor(value) {
  if (value > 90) return "bg-rose-500";
  if (value >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

function display(value, digits = 2) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function Metric({ label, used, limit, unit }) {
  const value = percentage(used, limit);
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--text-2)]">{label}</span>
      <span className="whitespace-nowrap font-semibold text-[var(--text)]">{display(used)} / {display(limit)} {unit}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`} style={{ width: `${value}%` }} role="progressbar" aria-label={`${label}: ${value}% used`} aria-valuemin="0" aria-valuemax={limit} aria-valuenow={used} />
    </div>
    <div className={`text-right text-xs font-medium ${value > 90 ? "text-rose-500" : value >= 70 ? "text-amber-500" : "text-emerald-500"}`}>{value}% used</div>
  </div>;
}

function LoadingCard() {
  return <div className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
    <div className="mb-6 h-10 w-40 rounded bg-slate-500/15" />
    <div className="space-y-5"><div className="h-12 rounded bg-slate-500/10" /><div className="h-12 rounded bg-slate-500/10" /></div>
  </div>;
}

function UsageCard({ icon: Icon, title, subtitle, source, children }) {
  return <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-4 shadow-sm">
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-500/15 text-teal-500"><Icon size={19} /></span>
      <div className="min-w-0">
        <div className="flex items-center gap-2"><h3 className="font-semibold text-[var(--text)]">{title}</h3>{source?.status === "estimated" && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">Estimated</span>}</div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </div>
    {source?.status === "error" ? <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-500">{source.message || "Usage data is unavailable."}</p> : <div className="space-y-5">{children}</div>}
    {source?.message && source.status !== "error" && <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">{source.message}</p>}
  </article>;
}

export default function ResourceUsageModal({ onClose }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsage = useCallback(async (refresh = false) => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/admin/usage", { params: refresh ? { refresh: true } : undefined });
      if (!data || typeof data !== "object" || !data.render || !data.cloudinary || !data.mongo) {
        throw new Error("The backend returned an outdated usage response. Restart and redeploy the backend, then try again.");
      }
      setUsage(data);
    } catch (err) {
      setError(formatErr(err));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsage(); }, [loadUsage]);
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="resource-usage-title" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-[var(--border)] p-5 sm:p-6">
        <div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-500"><Gauge size={21} /></span><div><h2 id="resource-usage-title" className="text-lg font-semibold text-[var(--text)]">Resource Usage</h2><p className="mt-0.5 text-sm text-[var(--text-2)]">Current monthly infrastructure consumption</p></div></div>
        <div className="flex items-center gap-1"><button type="button" className="rounded-lg p-2 text-[var(--text-2)] hover:bg-slate-500/10 hover:text-[var(--text)] disabled:opacity-50" onClick={() => loadUsage(true)} disabled={loading} aria-label="Refresh usage"><RefreshCw size={19} className={loading ? "animate-spin" : ""} /></button><button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--text-2)] hover:bg-slate-500/10 hover:text-[var(--text)]" aria-label="Close resource usage"><X size={20} /></button></div>
      </div>
      <div className="p-5 sm:p-6">
        {error ? <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-500"><p>{error}</p><button className="mt-3 font-semibold underline" onClick={() => loadUsage(true)}>Try again</button></div> : loading ? <div className="grid gap-4 sm:grid-cols-3"><LoadingCard /><LoadingCard /><LoadingCard /></div> : usage ? <div className="grid gap-4 sm:grid-cols-3">
          <UsageCard icon={Server} title="Render Server" subtitle="Monthly service allocation" source={usage.render}><Metric label="Running hours" used={usage.render.running_hours} limit={RESOURCE_LIMITS.renderHours} unit="hrs" /><Metric label="Outbound bandwidth" used={usage.render.bandwidth_gb} limit={RESOURCE_LIMITS.renderBandwidthGb} unit="GB" /></UsageCard>
          <UsageCard icon={Cloud} title="Cloudinary" subtitle="Media storage" source={usage.cloudinary}><Metric label="Storage used" used={usage.cloudinary.storage_gb} limit={RESOURCE_LIMITS.cloudinaryStorageGb} unit="GB" /></UsageCard>
          <UsageCard icon={Database} title="MongoDB Atlas" subtitle="Database cluster capacity" source={usage.mongo}><Metric label="Database storage" used={usage.mongo.storage_mb} limit={RESOURCE_LIMITS.mongoStorageMb} unit="MB" /></UsageCard>
        </div> : <p className="text-sm text-[var(--text-2)]">No usage data is available yet.</p>}
      </div>
      {usage?.updated_at && <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-muted)] sm:px-6">Last updated {new Date(usage.updated_at).toLocaleString()}</div>}
    </section>
  </div>;
}
