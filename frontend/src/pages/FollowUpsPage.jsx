import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

export default function FollowUpsPage() {
  const [d, setD] = useState({ today: [], upcoming: [] });
  useEffect(() => { api.get("/followups").then((r) => setD(r.data)); }, []);

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
            <li key={r.patient_id + r.followup_date} className="py-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-medium text-sm">{r.patient_name}</div>
                <div className="text-[12px] text-[var(--text-2)]">{r.mobile} · {r.treatment}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{fmtDate(r.followup_date)}</span>
                <Link to={`/patients/${r.patient_id}`} className="df-btn df-btn-ghost py-1 px-3 text-[13px]">Open</Link>
              </div>
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
          <p className="text-[var(--text-2)] mt-1 text-sm">Patient recall schedule and overdue reminders.</p>
        </div>
      </div>
      <Section title="Today & Overdue" rows={d.today} badgeClass="df-badge-red"/>
      <Section title="Upcoming (next 30 days)" rows={d.upcoming} badgeClass="df-badge-teal"/>
    </div>
  );
}
