import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { fmtDate, TOOTH_CONDITIONS, CONDITION_COLOR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import Odontogram from "@/components/Odontogram";
import {
  Plus,
  Trash2,
  Save,
  ChevronRight,
  Activity,
  FileText,
  Search,
  X,
  ClipboardList,
  Stethoscope,
} from "lucide-react";

// ─── Small helpers ───────────────────────────────────────────────────────────

function EmptyState({ onNew }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
        color: "var(--text-2)",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "var(--teal-light)",
          border: "2px solid rgba(20,184,184,0.20)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--teal-accent)",
          fontSize: 36,
          marginBottom: 8,
        }}
      >
        <Stethoscope size={38} />
      </div>
      <h2 style={{ margin: 0, color: "var(--text)" }}>Select a Record</h2>
      <p style={{ margin: 0, fontSize: 14, maxWidth: 300 }}>
        Choose a record from the left panel, or create a new odontogram to get started.
      </p>
      <button className="df-btn" onClick={onNew} style={{ marginTop: 8 }}>
        <Plus size={16} /> New Odontogram
      </button>
    </div>
  );
}

function ConditionBadge({ condition }) {
  const color = CONDITION_COLOR[condition] || "#fff";
  const label = TOOTH_CONDITIONS.find((c) => c.key === condition)?.label || condition;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        background: color + "30",
        border: `1px solid ${color}60`,
        color: "var(--text)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// ─── New Record Modal ─────────────────────────────────────────────────────────

function NewRecordModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [dentition, setDentition] = useState("permanent");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Patient name is required"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/odontograms", {
        patient_name: name.trim(),
        notes: notes.trim(),
        dentition,
        teeth: {},
        history: [],
      });
      toast.success("Odontogram created");
      onCreated(data);
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="df-card df-anim-in"
        style={{ width: "100%", maxWidth: 460, padding: "32px 28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>New Odontogram Record</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-2)",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="df-label" style={{ display: "block", marginBottom: 6 }}>
              Patient Name *
            </label>
            <input
              className="df-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ananya Sharma"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="df-label" style={{ display: "block", marginBottom: 6 }}>
              Dentition
            </label>
            <select
              className="df-input"
              value={dentition}
              onChange={(e) => setDentition(e.target.value)}
            >
              <option value="permanent">Permanent</option>
              <option value="deciduous">Deciduous (Primary)</option>
            </select>
          </div>

          <div>
            <label className="df-label" style={{ display: "block", marginBottom: 6 }}>
              Notes
            </label>
            <textarea
              className="df-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Clinical notes, chief complaint…"
              rows={3}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" className="df-btn df-btn-ghost" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="df-btn" disabled={loading} style={{ flex: 2 }}>
              {loading ? "Creating…" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OdontogramPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isDoctor } = useAuth();

  // List state
  const [records, setRecords] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Active record state
  const [active, setActive] = useState(null);   // full record with teeth
  const [recLoading, setRecLoading] = useState(false);
  const [odontData, setOdontData] = useState({ teeth: {}, history: [] });
  const [notes, setNotes] = useState("");
  const [patientName, setPatientName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal
  const [showNewModal, setShowNewModal] = useState(false);

  // ── Load list ──────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await api.get("/odontograms");
      setRecords(data);
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Load active record whenever URL id changes ─────────────────────────────
  useEffect(() => {
    if (!id) {
      setActive(null);
      setOdontData({ teeth: {}, history: [] });
      setNotes("");
      setPatientName("");
      setDirty(false);
      return;
    }
    setRecLoading(true);
    api
      .get(`/odontograms/${id}`)
      .then(({ data }) => {
        setActive(data);
        setOdontData({ teeth: data.teeth || {}, history: data.history || [] });
        setNotes(data.notes || "");
        setPatientName(data.patient_name || "");
        setDirty(false);
      })
      .catch((err) => toast.error(formatErr(err)))
      .finally(() => setRecLoading(false));
  }, [id]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelect = (rec) => {
    nav(`/odontogram/${rec.id}`);
  };

  const handleOdontChange = (newData) => {
    setOdontData(newData);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await api.put(`/odontograms/${active.id}`, {
        patient_name: patientName,
        notes,
        teeth: odontData.teeth,
        history: odontData.history,
      });
      toast.success("Saved successfully");
      setDirty(false);
      // Refresh list to update counts
      loadList();
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!window.confirm(`Delete odontogram for "${active.patient_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/odontograms/${active.id}`);
      toast.success("Record deleted");
      setRecords((prev) => prev.filter((r) => r.id !== active.id));
      nav("/");
    } catch (err) {
      toast.error(formatErr(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreated = (rec) => {
    setShowNewModal(false);
    setRecords((prev) => [rec, ...prev]);
    nav(`/odontogram/${rec.id}`);
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = records.filter((r) =>
    r.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Condition summary ──────────────────────────────────────────────────────
  const conditionSummary = (() => {
    const counts = {};
    for (const toothData of Object.values(odontData.teeth || {})) {
      let cond = "";
      if (typeof toothData === "string") {
        cond = toothData;
      } else if (toothData && typeof toothData === "object") {
        cond = toothData.condition || Object.values(toothData).find((v) => v && v !== "healthy") || "healthy";
      }
      if (cond && cond !== "healthy") {
        const resolved = cond === "rct" ? "root-canal" : cond;
        counts[resolved] = (counts[resolved] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: 24, minHeight: "calc(100vh - 120px)" }}>

      {/* ── Left panel — Record list ── */}
      <aside
        className="df-card"
        style={{
          width: 280,
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
          alignSelf: "flex-start",
          position: "sticky",
          top: 80,
          maxHeight: "calc(100vh - 110px)",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
            <ClipboardList size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            Records ({records.length})
          </span>
          <button
            className="df-btn"
            style={{ padding: "6px 12px", fontSize: 13, minHeight: 32 }}
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              className="df-input"
              style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {listLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <div className="df-spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              {search ? "No records match." : "No records yet."}
            </div>
          ) : (
            filtered.map((rec) => (
              <div
                key={rec.id}
                className={`rec-row ${id === rec.id ? "active" : ""}`}
                onClick={() => handleSelect(rec)}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--teal-light)",
                    border: "1.5px solid rgba(20,184,184,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--teal-accent)",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {rec.patient_name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {rec.patient_name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {rec.tooth_count} teeth · {fmtDate(rec.updated_at)}
                  </div>
                </div>

                <ChevronRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Right panel — Odontogram editor ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!id ? (
          <EmptyState onNew={() => setShowNewModal(true)} />
        ) : recLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <div className="df-spinner" />
          </div>
        ) : active ? (
          <div className="df-anim-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Record header ── */}
            <div
              className="df-card"
              style={{
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="df-label" style={{ display: "block", marginBottom: 6 }}>
                  Patient Name
                </label>
                <input
                  className="df-input"
                  style={{ fontSize: 18, fontWeight: 600, maxWidth: 340 }}
                  value={patientName}
                  onChange={(e) => { setPatientName(e.target.value); setDirty(true); }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
                {dirty && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--warning)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Activity size={12} /> Unsaved changes
                  </span>
                )}
                {isDoctor && (
                  <button
                    className="df-btn df-btn-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ minHeight: 38, padding: "8px 14px" }}
                    title="Delete this record"
                  >
                    <Trash2 size={15} />
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                )}
                <button
                  className="df-btn"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  style={{ minHeight: 38 }}
                >
                  <Save size={15} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {/* ── Stats row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[
                {
                  label: "Teeth Marked",
                  value: Object.keys(odontData.teeth || {}).length,
                  icon: <Stethoscope size={16} />,
                  color: "var(--teal-accent)",
                },
                {
                  label: "Changes Made",
                  value: (odontData.history || []).length,
                  icon: <Activity size={16} />,
                  color: "var(--warning)",
                },
                {
                  label: "Last Updated",
                  value: fmtDate(active.updated_at),
                  icon: <FileText size={16} />,
                  color: "var(--text-2)",
                  small: true,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="df-card"
                  style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: s.color }}>
                    {s.icon}
                    <span className="df-label">{s.label}</span>
                  </div>
                  <div style={{ fontSize: s.small ? 14 : 22, fontWeight: 700, color: "var(--text)" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Notes ── */}
            <div className="df-card" style={{ padding: "18px 20px" }}>
              <label className="df-label" style={{ display: "block", marginBottom: 8 }}>
                <FileText size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                Clinical Notes
              </label>
              <textarea
                className="df-input"
                rows={3}
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                placeholder="Chief complaint, diagnosis, treatment plan…"
              />
            </div>

            {/* ── Condition summary ── */}
            {conditionSummary.length > 0 && (
              <div className="df-card" style={{ padding: "16px 20px" }}>
                <div className="df-label" style={{ marginBottom: 10 }}>Condition Summary</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {conditionSummary.map(([cond, count]) => (
                    <div key={cond} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ConditionBadge condition={cond} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>×{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tooth Chart ── */}
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Stethoscope size={16} style={{ color: "var(--teal-accent)" }} />
                Tooth Chart
              </h2>
              <Odontogram
                value={odontData}
                onChange={handleOdontChange}
                readOnly={false}
              />
            </div>

            {/* ── History ── */}
            {(odontData.history || []).length > 0 && (
              <div className="df-card" style={{ padding: "16px 20px" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>
                  <Activity size={14} style={{ display: "inline", marginRight: 6, color: "var(--teal-accent)", verticalAlign: "middle" }} />
                  Change History
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...(odontData.history || [])].reverse().slice(0, 20).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "var(--card-2)",
                        fontSize: 12,
                      }}
                    >
                      <ConditionBadge condition={h.condition} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: "var(--text-2)" }}>
                          Teeth: {Object.keys(h.changes || {}).join(", ")}
                        </span>
                      </div>
                      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                        {fmtDate(h.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : null}
      </div>

      {/* New record modal */}
      {showNewModal && (
        <NewRecordModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
