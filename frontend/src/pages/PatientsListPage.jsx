import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Trash2, Phone, Eye, MapPin } from "lucide-react";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate, fullName, inr } from "@/lib/format";
import { toast } from "sonner";
import PatientViewModal from "@/components/PatientViewModal";

function patientDue(p) {
  if (p.due !== undefined) return p.due;
  return (p.visits || []).reduce((s, v) => s + Math.max((+v.total || 0) - (+v.paid || 0), 0), 0);
}

function lastVisit(p) {
  if (p.last_visit) return p.last_visit;
  const dates = (p.visits || []).map((v) => v.date).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

export default function PatientsListPage() {
  const { isDoctor } = useAuth();
  const [patients, setPatients] = useState([]);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [viewPatientId, setViewPatientId] = useState(null);
  const nav = useNavigate();
  const PAGE_SIZE = 20;

  const load = () => {
    setLoading(true);
    return api.get("/patients", { params: { page, page_size: PAGE_SIZE, q, filter } })
      .then((r) => {
        const data = r.data;
        if (Array.isArray(data)) {
          setPatients(data);
          setIsServerPaginated(false);
        } else {
          setPatients(data?.items || []);
          setTotal(data?.total || 0);
          setIsServerPaginated(true);
        }
      })
      .catch((e) => toast.error(formatErr(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isServerPaginated) {
      const timer = window.setTimeout(load, 250);
      return () => window.clearTimeout(timer);
    }
  }, [page, q, filter, isServerPaginated]);

  const filtered = useMemo(() => {
    if (isServerPaginated) return patients;
    const ql = q.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    return patients.filter((p) => {
      const name = fullName(p).toLowerCase();
      const mobile = (p.general?.mobile || "").toLowerCase();
      const email = (p.general?.email || "").toLowerCase();
      if (ql && !(name.includes(ql) || mobile.includes(ql) || email.includes(ql))) return false;
      if (filter === "today") {
        const has = (p.visits || []).some((v) => (v.date || "").startsWith(today));
        if (!has) return false;
      } else if (filter === "week") {
        const has = (p.visits || []).some((v) => v.date && v.date >= weekAgo);
        if (!has) return false;
      } else if (filter === "dues") {
        if (patientDue(p) <= 0) return false;
      }
      return true;
    });
  }, [patients, q, filter, isServerPaginated]);

  const displayTotal = isServerPaginated ? total : filtered.length;
  const pageCount = Math.max(1, Math.ceil(displayTotal / PAGE_SIZE));
  const slice = isServerPaginated ? patients : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onDelete = async () => {
    try {
      await api.delete(`/patients/${confirmId}`);
      toast.success("Patient deleted");
      setConfirmId(null);
      load();
    } catch (e) { toast.error(formatErr(e)); }
  };

  return (
    <div className="space-y-5 df-anim-in" data-testid="patients-list-page">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1>Patients</h1>
          <p className="text-[var(--text-2)] mt-1">Search, filter and manage all patient records.</p>
        </div>
        <button className="df-btn" onClick={() => nav("/patients/new")} data-testid="new-patient-btn">
          <UserPlus size={16}/> New Patient
        </button>
      </div>

      <div className="df-card p-4 space-y-3">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
            <input className="df-input pl-9" placeholder="Search by name, mobile or email"
                   value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} data-testid="patient-search"/>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[["all","All"],["today","Today"],["week","This Week"],["dues","With Dues"]].map(([k,l]) => (
              <button key={k}
                onClick={() => { setFilter(k); setPage(1); }}
                className={`df-chip ${filter === k ? "active" : ""}`}
                data-testid={`filter-${k}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="text-[12px] text-[var(--text-2)]">
          Showing {displayTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayTotal)} of {displayTotal} patients
        </div>
      </div>

      <div className="df-card overflow-hidden">
        {!loading && slice.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-2)]">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--teal-light)] flex items-center justify-center mb-3">
              <UserPlus className="text-[var(--teal)]" size={20}/>
            </div>
            <div className="font-medium text-[var(--text)]">No patients found</div>
            <div className="text-sm mt-1">Try adjusting your filters or add a new patient.</div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {slice.map((p) => {
              const due = patientDue(p);
              const initials = ((p.general?.first_name?.[0] || "") + (p.general?.last_name?.[0] || "")).toUpperCase() || "?";
              return (
                <li key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[var(--teal-light)] transition-colors" data-testid={`patient-row-${p.id}`}>
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
                    onClick={() => setViewPatientId(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewPatientId(p.id); } }}
                    title={`View profile of ${fullName(p)}`}
                    data-testid={`patient-profile-link-${p.id}`}
                  >
                    <div className="w-11 h-11 shrink-0 rounded-full bg-[var(--teal-light)] flex items-center justify-center font-semibold text-[var(--teal)] select-none group-hover:ring-2 group-hover:ring-[var(--teal)] transition-all">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm sm:text-base text-[var(--text)] break-words group-hover:text-[var(--teal)] transition-colors">{fullName(p)}</div>
                      <div className="text-[12px] text-[var(--text-2)] flex items-center gap-3 flex-wrap mt-1">
                        <span className="flex items-center gap-1 shrink-0"><Phone size={11}/>{p.general?.mobile || "—"}</span>
                        <span className="flex items-center gap-1 shrink-0"><MapPin size={11}/>{p.general?.city || "—"}</span>
                        <span className="shrink-0">Last visit: {fmtDate(lastVisit(p)) || "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
                    {due > 0 && <span className="df-badge df-badge-red shrink-0" data-testid={`due-badge-${p.id}`}>Due {inr(due)}</span>}
                    <button onClick={() => setViewPatientId(p.id)} className="df-btn df-btn-ghost py-1.5 px-3 text-[13px]" data-testid={`view-patient-${p.id}`}>
                      <Eye size={14}/> View
                    </button>
                    {isDoctor && (
                      <button className="df-btn df-btn-ghost py-1.5 px-3 text-[13px]"
                              style={{ color: "var(--danger)", borderColor: "rgba(248,113,113,0.30)" }}
                              onClick={() => setConfirmId(p.id)}
                              aria-label={`Delete patient ${fullName(p)}`}
                              title={`Delete patient ${fullName(p)}`}
                              data-testid={`delete-patient-${p.id}`}>
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              aria-label={`Go to page ${i + 1}`}
              className={`df-chip ${page === i + 1 ? "active" : ""}`}>{i + 1}</button>
          ))}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmId(null)}>
          <div className="df-card df-confirm-dialog p-6 max-w-sm w-[90%]" onClick={(e) => e.stopPropagation()} data-testid="delete-confirm">
            <h3>Delete patient?</h3>
            <p className="text-sm text-[var(--text-2)] mt-1">This permanently removes the patient and all visits. This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button className="df-btn df-btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="df-btn df-btn-danger" onClick={onDelete} data-testid="confirm-delete">Delete</button>
            </div>
          </div>
        </div>
      )}

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
