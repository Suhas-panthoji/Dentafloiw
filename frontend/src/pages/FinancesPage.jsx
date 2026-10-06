import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, AlertCircle, FlaskConical, ScanLine, Wallet, X } from "lucide-react";
import { api } from "@/lib/api";
import { inr, fmtDate } from "@/lib/format";

const EXPENSE_COLOR_MAP = {
  Treatments: "#2DD4BF",   // soft teal
  Lab:        "#FBBF24",   // warm amber
  Radiology:  "#60A5FA",   // sky blue
  Other:      "#A78BFA",   // muted violet
};

/* ── Modern SVG Donut Chart ─────────────────────────────────────── */
function DonutChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const R = 82;          // outer radius
  const r = 54;          // inner radius (donut hole)
  const gap = 3;         // gap between segments in degrees

  const total = data.reduce((s, d) => s + d.value, 0);

  // Build arc segments
  let cursor = -90; // start at top
  const segments = data.map((item) => {
    const pct  = item.value / total;
    const deg  = pct * 360 - gap;
    const start = cursor;
    const end   = cursor + deg;
    cursor += pct * 360;

    const toRad = (d) => (d * Math.PI) / 180;
    const x1 = cx + R * Math.cos(toRad(start));
    const y1 = cy + R * Math.sin(toRad(start));
    const x2 = cx + R * Math.cos(toRad(end));
    const y2 = cy + R * Math.sin(toRad(end));
    const ix1 = cx + r * Math.cos(toRad(end));
    const iy1 = cy + r * Math.sin(toRad(end));
    const ix2 = cx + r * Math.cos(toRad(start));
    const iy2 = cy + r * Math.sin(toRad(start));
    const large = deg > 180 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    return { ...item, d, pct };
  });

  const fmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${v}`;
  };

  const handleMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      {/* Donut SVG */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          onMouseMove={handleMove}
          onMouseLeave={() => { setHovered(null); setTooltip(null); }}
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="var(--border)" strokeWidth={R - r} opacity={0.35} />

          {segments.map((seg, i) => (
            <path
              key={i}
              d={seg.d}
              fill={seg.color}
              opacity={hovered === null ? 1 : hovered === i ? 1 : 0.35}
              style={{
                cursor: "pointer",
                transition: "opacity 0.2s ease, transform 0.2s ease",
                transformOrigin: `${cx}px ${cy}px`,
                transform: hovered === i ? "scale(1.04)" : "scale(1)",
                filter: hovered === i ? `drop-shadow(0 0 8px ${seg.color}88)` : "none",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* Centre label */}
          <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text)" fontSize={13} fontWeight={600} opacity={0.5}
            style={{ fontFamily: "inherit" }}>
            Total
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text)" fontSize={18} fontWeight={700}
            style={{ fontFamily: "inherit" }}>
            {fmt(total)}
          </text>
        </svg>

        {/* Hover tooltip */}
        {hovered !== null && tooltip && (
          <div style={{
            position: "absolute",
            left: tooltip.x + 12,
            top: tooltip.y - 36,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            zIndex: 10,
          }}>
            <span style={{ color: segments[hovered].color, fontWeight: 700, marginRight: 6 }}>
              {segments[hovered].name}
            </span>
            <span style={{ color: "var(--text)", fontSize: 13 }}>
              {fmt(segments[hovered].value)}
              <span style={{ color: "var(--text-2)", marginLeft: 6 }}>
                {(segments[hovered].pct * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 14 }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{ cursor: "default" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: hovered === i ? "var(--text)" : "var(--text-2)", fontWeight: hovered === i ? 600 : 400, transition: "color 0.2s" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, display: "inline-block", flexShrink: 0, boxShadow: hovered === i ? `0 0 6px ${seg.color}` : "none", transition: "box-shadow 0.2s" }} />
                {seg.name}
              </span>
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{fmt(seg.value)}</span>
            </div>
            {/* Mini progress bar */}
            <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(seg.pct * 100).toFixed(1)}%`,
                background: seg.color,
                borderRadius: 4,
                opacity: hovered === null || hovered === i ? 1 : 0.4,
                transition: "opacity 0.2s, width 0.6s ease",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color = "teal", onClick }) {
  const className = onClick ? "df-card p-5 cursor-pointer transition hover:shadow-lg" : "df-card p-5";
  return (
    <button type={onClick ? "button" : "button"} onClick={onClick} className={className} style={onClick ? { textAlign: "left" } : undefined}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-[var(--teal-light)] text-[var(--teal)]`}><Icon size={18}/></div>
      <div className="text-[22px] font-semibold">{value}</div>
      <div className="df-label mt-1">{label}</div>
    </button>
  );
}

export default function FinancesPage() {
  const [d, setD] = useState(null);
  const [tFilter, setTFilter] = useState("all");
  const [showLabModal, setShowLabModal] = useState(false);
  const [showRadioModal, setShowRadioModal] = useState(false);
  useEffect(() => { api.get("/finances/summary").then((r) => setD(r.data)); }, []);

  const labRows = useMemo(() => (d && d.visits) ? (d.visits || []).filter((v) => (+v.lab || 0) > 0) : [], [d]);
  const radioRows = useMemo(() => (d && d.visits) ? (d.visits || []).filter((v) => (+v.radio || 0) > 0) : [], [d]);
  if (!d) return <div className="df-card p-8 text-center text-[var(--text-2)]">Loading…</div>;

  const treatmentBreakdown = (d.visits || []).reduce((acc, v) => { acc[v.treatment] = (acc[v.treatment] || 0) + v.charged; return acc; }, {});
  const expenseData = [
    { name: "Treatments", value: d.total_revenue - d.lab_expenses - d.radio_expenses - d.other_expenses },
    { name: "Lab",        value: d.lab_expenses },
    { name: "Radiology", value: d.radio_expenses },
    { name: "Other",     value: d.other_expenses },
  ].filter((x) => x.value > 0).map((x) => ({ ...x, color: EXPENSE_COLOR_MAP[x.name] }));

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
        <Stat icon={FlaskConical} label="Lab Expenses" value={inr(d.lab_expenses)} onClick={() => setShowLabModal(true)}/>
        <Stat icon={ScanLine} label="Radiology" value={inr(d.radio_expenses)} onClick={() => setShowRadioModal(true)}/>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="df-card p-5">
          <h3 className="mb-3">Monthly Revenue (last 12 months)</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={d.monthly} margin={{ top: 10, right: 20, bottom: 30, left: 30 }}>
                <XAxis
                  dataKey="month"
                  tickFormatter={(m) => {
                    if (!m) return "";
                    const parts = m.split("-");
                    if (parts.length < 2) return m;
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const idx = parseInt(parts[1], 10) - 1;
                    return months[idx] ? `${months[idx]} '${parts[0].slice(2)}` : m;
                  }}
                  tick={{ fill: "var(--text)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(230,234,240,0.4)" }}
                  tickLine={{ stroke: "rgba(230,234,240,0.4)" }}
                  label={{ value: "Month", position: "insideBottom", offset: -20, fill: "var(--text)", fontSize: 13, fontWeight: 700 }}
                />
                <YAxis tick={{ fill: "var(--text)", fontSize: 12 }} axisLine={{ stroke: "rgba(230,234,240,0.4)" }} tickLine={{ stroke: "rgba(230,234,240,0.4)" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} label={{ value: "Revenue (₹)", angle: -90, position: "insideLeft", dx: -10, fill: "var(--text)", fontSize: 13, fontWeight: 700 }}/>
                <Tooltip formatter={(v) => inr(v)}/>
                <Bar dataKey="revenue" fill="#0A6E6E" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="df-card p-5" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="mb-4">Expense Breakdown</h3>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <DonutChart data={expenseData} />
          </div>
        </div>
      </div>

      <div className="df-card p-5">
        <h3 className="mb-3">Revenue Trend</h3>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={d.monthly} margin={{ top: 10, right: 20, bottom: 30, left: 30 }}>
              <XAxis dataKey="month" tickFormatter={(m) => m.slice(5)} tick={{ fill: "var(--text)", fontSize: 12 }} axisLine={{ stroke: "rgba(230,234,240,0.4)" }} tickLine={{ stroke: "rgba(230,234,240,0.4)" }} label={{ value: "Month", position: "insideBottom", offset: -20, fill: "var(--text)", fontSize: 13, fontWeight: 700 }}/>
              <YAxis tick={{ fill: "var(--text)", fontSize: 12 }} axisLine={{ stroke: "rgba(230,234,240,0.4)" }} tickLine={{ stroke: "rgba(230,234,240,0.4)" }} fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} label={{ value: "Revenue (₹)", angle: -90, position: "insideLeft", dx: -10, fill: "var(--text)", fontSize: 13, fontWeight: 700 }}/>
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

      {showLabModal && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-8 df-anim-in bg-[rgba(11,17,23,0.26)] backdrop-blur-2xl" onClick={() => setShowLabModal(false)}>
          <div className="bg-[var(--bg)] w-full max-w-[850px] max-h-[98vh] overflow-y-auto rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="df-card p-5 sticky top-0 bg-[var(--bg)] border-b border-[var(--border)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3>Lab Expense Visits</h3>
                  <p className="text-sm text-[var(--text-2)]">All patients with lab charges in their visits.</p>
                </div>
                <button onClick={() => setShowLabModal(false)} className="text-[var(--text-2)] hover:text-[var(--text)]"><X size={22}/></button>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-3"><span className="df-badge df-badge-teal">{labRows.length} visits</span></div>
              {labRows.length === 0 ? (
                <p className="text-sm text-[var(--text-2)]">No lab expense visits found.</p>
              ) : (
                <div className="df-table-scroll">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[var(--text-2)] text-[12px] uppercase tracking-wider">
                      <th className="py-2">Patient</th>
                      <th>Date</th>
                      <th>Treatment</th>
                      <th>Lab Amount</th>
                    </tr></thead>
                    <tbody>
                      {labRows.map((v, i) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          <td className="py-2"><Link to={`/patients/${v.patient_id}`} className="text-[var(--teal)] hover:underline">{v.patient_name}</Link></td>
                          <td>{fmtDate(v.date)}</td>
                          <td>{v.treatment}</td>
                          <td>{inr(v.lab)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRadioModal && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-8 df-anim-in bg-[rgba(11,17,23,0.26)] backdrop-blur-2xl" onClick={() => setShowRadioModal(false)}>
          <div className="bg-[var(--bg)] w-full max-w-[850px] max-h-[98vh] overflow-y-auto rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="df-card p-5 sticky top-0 bg-[var(--bg)] border-b border-[var(--border)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3>Radiology Expense Visits</h3>
                  <p className="text-sm text-[var(--text-2)]">All patients with radiology charges in their visits.</p>
                </div>
                <button onClick={() => setShowRadioModal(false)} className="text-[var(--text-2)] hover:text-[var(--text)]"><X size={22}/></button>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-3"><span className="df-badge df-badge-teal">{radioRows.length} visits</span></div>
              {radioRows.length === 0 ? (
                <p className="text-sm text-[var(--text-2)]">No radiology expense visits found.</p>
              ) : (
                <div className="df-table-scroll">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[var(--text-2)] text-[12px] uppercase tracking-wider">
                      <th className="py-2">Patient</th>
                      <th>Date</th>
                      <th>Treatment</th>
                      <th>Radiology Amount</th>
                    </tr></thead>
                    <tbody>
                      {radioRows.map((v, i) => (
                        <tr key={i} className="border-t border-[var(--border)]">
                          <td className="py-2"><Link to={`/patients/${v.patient_id}`} className="text-[var(--teal)] hover:underline">{v.patient_name}</Link></td>
                          <td>{fmtDate(v.date)}</td>
                          <td>{v.treatment}</td>
                          <td>{inr(v.radio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
