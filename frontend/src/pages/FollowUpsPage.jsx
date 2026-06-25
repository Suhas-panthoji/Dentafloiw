import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, FileText, Phone, Stethoscope, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { calcAge, fmtDate, inr } from "@/lib/format";

export default function FollowUpsPage() {
  const [d, setD] = useState({ today: [], upcoming: [] });
  const [openKey, setOpenKey] = useState("");

  useEffect(() => {
    api.get("/followups").then((r) => setD(r.data));
  }, []);

  const rowKey = (r) => `${r.patient_id}-${r.visit_id || r.followup_date}`;

  const Detail = ({ r }) => {
    const alerts = [...(r.medical_alerts || []), r.medical_notes].filter(Boolean);
    const age = calcAge(r.age);

    return (
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card-2)] p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-[rgba(20,184,184,0.28)] bg-[var(--teal-light)] p-3 md:col-span-2">
            <div className="df-label flex items-center gap-2"><Stethoscope size={13}/> Scheduled Treatment</div>
            <div className="mt-2 text-sm font-semibold text-[var(--text)]">
              {r.scheduled_treatment || "No planned treatment written for this follow-up."}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3">
            <div className="df-label">Patient Snapshot</div>
            <div className="mt-2 text-sm font-semibold">{r.patient_name}</div>
            <div className="text-[12px] text-[var(--text-2)] flex items-center gap-1 mt-1"><Phone size={12}/>{r.mobile || "No mobile"}</div>
            {age !== "" && <div className="text-[12px] text-[var(--text-2)] mt-1">Age: {age} years</div>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--border)] p-3">
            <div className="df-label flex items-center gap-2"><FileText size={13}/> Previous Visit</div>
            <div className="mt-2 text-sm font-semibold">{r.previous_treatment || "Treatment not recorded"}</div>
            <div className="text-[12px] text-[var(--text-2)]">{fmtDate(r.visit_date)}{r.teeth ? ` - Teeth: ${r.teeth}` : ""}</div>
            {r.previous_diagnosis && <div className="text-sm mt-2">Diagnosis: {r.previous_diagnosis}</div>}
            {r.previous_notes && <div className="text-sm mt-2 text-[var(--text-2)]">{r.previous_notes}</div>}
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3 space-y-3">
            <div>
              <div className="df-label flex items-center gap-2"><AlertTriangle size={13}/> Medical Cautions</div>
              {alerts.length === 0 ? (
                <div className="text-sm text-[var(--text-2)] mt-2">No medical cautions recorded.</div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {alerts.map((a, i) => <span key={`${a}-${i}`} className="df-badge df-badge-amber">{a}</span>)}
                </div>
              )}
            </div>
            {(r.medications || []).length > 0 && (
              <div>
                <div className="df-label">Current Medications</div>
                <div className="text-sm text-[var(--text-2)] mt-1">{r.medications.join(", ")}</div>
              </div>
            )}
            <div>
              <div className="df-label flex items-center gap-2"><Wallet size={13}/> Pending Due</div>
              <div className={`text-sm font-semibold mt-1 ${r.amount_due > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{inr(r.amount_due)}</div>
            </div>
          </div>
        </div>

        {(r.recent_visits || []).length > 0 && (
          <div>
            <div className="df-label mb-2">Other Recent Treatment History</div>
            <div className="grid md:grid-cols-3 gap-2">
              {r.recent_visits.map((v, i) => (
                <div key={`${v.date}-${i}`} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-[12px] text-[var(--text-2)]">{fmtDate(v.date)}</div>
                  <div className="text-sm font-medium mt-1">{v.treatment || "Visit"}</div>
                  {v.teeth && <div className="text-[12px] text-[var(--text-2)]">Teeth: {v.teeth}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Link to={`/patients/${r.patient_id}`} className="df-btn df-btn-ghost py-1 px-3 text-[13px]">Full Patient Profile</Link>
        </div>
      </div>
    );
  };

  const Section = ({ title, rows, badgeClass = "df-badge-teal" }) => (
    <div className="df-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3>{title}</h3>
        <span className={`df-badge ${badgeClass}`}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Nothing scheduled.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <li key={rowKey(r)} className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{r.patient_name}</div>
                  <div className="text-[12px] text-[var(--text-2)]">{r.mobile || "No mobile"} - {r.scheduled_treatment || r.treatment || "Follow-up"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{fmtDate(r.followup_date)}</span>
                  <button
                    type="button"
                    className="df-btn df-btn-ghost py-1 px-3 text-[13px]"
                    onClick={() => setOpenKey(openKey === rowKey(r) ? "" : rowKey(r))}
                  >
                    {openKey === rowKey(r) ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Open
                  </button>
                </div>
              </div>
              {openKey === rowKey(r) && <Detail r={r}/>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-5 df-anim-in" data-testid="followups-page">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--teal-light)] text-[var(--teal)] flex items-center justify-center"><CalendarClock size={18}/></div>
        <div>
          <h1>Follow-ups</h1>
          <p className="text-[var(--text-2)] mt-1 text-sm">Treatment schedule, patient cautions and overdue reminders.</p>
        </div>
      </div>
      <Section title="Today & Overdue" rows={d.today} badgeClass="df-badge-red"/>
      <Section title="Upcoming (next 30 days)" rows={d.upcoming} badgeClass="df-badge-teal"/>
    </div>
  );
}
