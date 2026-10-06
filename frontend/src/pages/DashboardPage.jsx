import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Calendar, TrendingUp, AlertCircle, UserPlus, Wallet, Plus, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr, fmtDate } from "@/lib/format";
import PatientViewModal from "@/components/PatientViewModal";

function StatCard({ icon: Icon, label, value, hint, color = "teal", testid }) {
  const colors = {
    teal: "bg-[var(--teal-light)] text-[var(--teal-accent)] border border-[rgba(20,184,184,0.30)]",
    amber: "bg-[rgba(251,191,36,0.14)] text-[var(--warning)] border border-[rgba(251,191,36,0.30)]",
    red: "bg-[rgba(248,113,113,0.14)] text-[var(--danger)] border border-[rgba(248,113,113,0.30)]",
    green: "bg-[rgba(52,211,153,0.14)] text-[var(--success)] border border-[rgba(52,211,153,0.30)]",
  };
  return (
    <div className="df-card df-stat p-5" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18}/>
        </div>
        {hint && <span className="df-badge df-badge-teal">{hint}</span>}
      </div>
      <div className="mt-4 text-[26px] font-semibold leading-none">{value}</div>
      <div className="mt-1 df-label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { isDoctor, user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [viewPatientId, setViewPatientId] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => setData({}));
  }, []);

  const d = data || {};
  const getGreetingName = (name) => {
    if (!name) return "Doctor";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1 && /^dr\.?$/i.test(parts[0])) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  return (
    <div className="space-y-6 df-anim-in" data-testid="dashboard-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1>Hello, {getGreetingName(user?.name)}</h1>
          <p className="text-[var(--text-2)] mt-1">Here's what's happening at your clinic today.</p>
        </div>
        <div className="text-sm text-[var(--text-2)]">{fmtDate(new Date())}</div>
      </div>

      <div className={`grid gap-4 ${isDoctor ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
        <StatCard testid="stat-patients" icon={Users} label="Total Patients" value={d.total_patients ?? "—"}
                  hint={d.new_this_month ? `+${d.new_this_month} this month` : null}/>
        <StatCard testid="stat-today-visits" icon={Calendar} label="Today's Visits" value={d.todays_visits ?? "—"} color="amber"/>
        {isDoctor && <StatCard testid="stat-revenue" icon={TrendingUp} label="Revenue This Month" value={inr(d.total_revenue_month)} color="green"/>}
        {isDoctor && <StatCard testid="stat-dues" icon={AlertCircle} label="Total Pending Dues" value={inr(d.total_due)} color="red"/>}
      </div>

      <div className={`grid gap-4 ${isDoctor ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <button className="df-action primary" onClick={() => nav("/patients/new")} data-testid="action-new-patient">
          <div className="w-10 h-10 rounded-lg bg-[var(--teal)] text-white flex items-center justify-center mb-3">
            <UserPlus size={18}/>
          </div>
          <div className="text-[15px] font-semibold">New Patient</div>
          <div className="text-sm text-[var(--text-2)] mt-1">Register a new patient with full profile.</div>
        </button>
        <button className="df-action" onClick={() => nav("/patients")} data-testid="action-patients">
          <div className="w-10 h-10 rounded-lg bg-[var(--teal-light)] text-[var(--teal)] flex items-center justify-center mb-3">
            <Users size={18}/>
          </div>
          <div className="text-[15px] font-semibold">Patients</div>
          <div className="text-sm text-[var(--text-2)] mt-1">Browse, search and manage all records.</div>
        </button>
        {isDoctor && (
          <button className="df-action" onClick={() => nav("/finances")} data-testid="action-finances">
            <div className="w-10 h-10 rounded-lg bg-[var(--teal-light)] text-[var(--teal)] flex items-center justify-center mb-3">
              <Wallet size={18}/>
            </div>
            <div className="text-[15px] font-semibold">Finances</div>
            <div className="text-sm text-[var(--text-2)] mt-1">Revenue, dues and treatment analytics.</div>
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="df-card p-5" data-testid="recent-patients">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h3>Recent Patients</h3>
            <Link to="/patients" className="text-sm text-[var(--teal)] hover:underline">View all →</Link>
          </div>
          {(d.recent_patients || []).length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">No patients yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {d.recent_patients.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{p.first_name} {p.last_name}</div>
                    <div className="text-[12px] text-[var(--text-2)] flex items-center gap-1"><Phone size={12}/>{p.mobile}</div>
                  </div>
                  <button onClick={() => setViewPatientId(p.id)} className="df-btn df-btn-ghost py-1 px-3 text-[13px]">View</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="df-card p-5" data-testid="today-followups">
          <h3 className="mb-3">Today's Follow-ups</h3>
          {(d.today_followups || []).length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">No follow-ups scheduled today.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {d.today_followups.map((f) => (
                <li key={f.patient_id + f.followup_date} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{f.patient_name}</div>
                    <div className="text-[12px] text-[var(--text-2)]">{f.mobile} - {fmtDate(f.followup_date)}</div>
                    {f.scheduled_treatment && <div className="text-[12px] text-[var(--teal)] mt-1">{f.scheduled_treatment}</div>}
                  </div>
                  <Link to="/followups" className="df-btn df-btn-ghost py-1 px-3 text-[13px]">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {viewPatientId && (
        <PatientViewModal
          patientId={viewPatientId}
          onClose={() => setViewPatientId(null)}
          onEdit={(id) => { setViewPatientId(null); nav(`/patients/${id}`); }}
        />
      )}
    </div>
  );
}
