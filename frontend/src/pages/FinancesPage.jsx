import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, AlertCircle, FlaskConical, ScanLine, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { inr, fmtDate } from "@/lib/format";

const COLORS = ["#0A6E6E", "#0D8C8C", "#34D399", "#F59E0B", "#A78BFA"];

function Stat({ icon: Icon, label, value, color = "teal" }) {
  return (
    <div className="df-card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-[var(--teal-light)] text-[var(--teal)]`}><Icon size={18}/></div>
      <div className="text-[22px] font-semibold">{value}</div>
      <div className="df-label mt-1">{label}</div>
    </div>
  );
}

export default function FinancesPage() {
  const [d, setD] = useState(null);
  const [tFilter, setTFilter] = useState("all");
  useEffect(() => { api.get("/finances/summary").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="df-card p-8 text-center text-[var(--text-2)]">Loading…</div>;

  const treatmentBreakdown = (d.visits || []).reduce((acc, v) => { acc[v.treatment] = (acc[v.treatment] || 0) + v.charged; return acc; }, {});
  const expenseData = [
    { name: "Treatments", value: d.total_revenue - d.lab_expenses - d.radio_expenses - d.other_expenses },
    { name: "Lab", value: d.lab_expenses },
    { name: "Radiology", value: d.radio_expenses },
    { name: "Other", value: d.other_expenses },
  ].filter((x) => x.value > 0);

  const treatments = Array.from(new Set((d.visits || []).map((v) => v.treatment).filter(Boolean)));
  const visitRows = (d.visits || []).filter((v) => tFilter === "all" || v.treatment === tFilter);

  return (
    <div className="space-y-6 df-anim-in" data-testid="finances-page">
      <div>
        <h1>Finances</h1>
        <p className="text-[var(--text-2)] mt-1">Revenue, expenses and outstanding dues at a glance.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <Stat icon={TrendingUp} label="Total Revenue" value={inr(d.total_revenue)}/>
        <Stat icon={Wallet} label="This Month" value={inr(d.this_month_revenue)}/>
        <Stat icon={AlertCircle} label="Pending Dues" value={inr(d.total_due)}/>
        <Stat icon={FlaskConical} label="Lab Expenses" value={inr(d.lab_expenses)}/>
        <Stat icon={ScanLine} label="Radiology" value={inr(d.radio_expenses)}/>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="df-card p-5">
          <h3 className="mb-3">Monthly Revenue (last 12 months)</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={d.monthly}>
                <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} fontSize={11}/>
                <YAxis fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v) => inr(v)}/>
                <Bar dataKey="revenue" fill="#0A6E6E" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="df-card p-5">
          <h3 className="mb-3">Expense Breakdown</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={expenseData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {expenseData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)}/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="df-card p-5">
        <h3 className="mb-3">Revenue Trend</h3>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={d.monthly}>
              <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} fontSize={11}/>
              <YAxis fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={(v) => inr(v)}/>
              <Line type="monotone" dataKey="revenue" stroke="#0D8C8C" strokeWidth={2} dot={{ r: 3 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="df-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3>Pending Dues</h3>
          <span className="df-badge df-badge-red">{d.pending.length} patients</span>
        </div>
        {d.pending.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">No pending dues — all clear!</p>
        ) : (
          <div className="df-table-scroll">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[var(--text-2)] text-[12px] uppercase tracking-wider">
                <th className="py-2">Patient</th><th>Mobile</th><th>Last Visit</th><th>Amount Due</th><th></th>
              </tr></thead>
              <tbody>
                {d.pending.map((p) => (
                  <tr key={p.patient_id} className="border-t border-[var(--border)]">
                    <td className="py-2">{p.patient_name}</td>
                    <td>{p.mobile}</td>
                    <td>{fmtDate(p.last_visit)}</td>
                    <td className="text-[var(--danger)] font-medium">{inr(p.amount_due)}</td>
                    <td className="text-right"><Link to={`/patients/${p.patient_id}`} className="df-btn df-btn-ghost py-1 px-3 text-[13px]">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="df-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h3>Visit History</h3>
          <select className="df-input max-w-[220px]" value={tFilter} onChange={(e) => setTFilter(e.target.value)}>
            <option value="all">All Treatments</option>
            {treatments.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="df-table-scroll">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--text-2)] text-[12px] uppercase tracking-wider">
              <th className="py-2">Date</th><th>Patient</th><th>Treatment</th><th>Charged</th><th>Paid</th><th>Due</th><th>Lab</th><th>Radio</th>
            </tr></thead>
            <tbody>
              {visitRows.slice(0, 100).map((v, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="py-2">{fmtDate(v.date)}</td>
                  <td><Link to={`/patients/${v.patient_id}`} className="text-[var(--teal)] hover:underline">{v.patient_name}</Link></td>
                  <td>{v.treatment}</td>
                  <td>{inr(v.charged)}</td>
                  <td className="text-[var(--success)]">{inr(v.paid)}</td>
                  <td className={v.due > 0 ? "text-[var(--danger)]" : ""}>{inr(v.due)}</td>
                  <td>{inr(v.lab)}</td>
                  <td>{inr(v.radio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
