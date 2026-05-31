import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Upload, Plus, Trash2, Save, ArrowLeft, FileText, Image as ImgIcon, X, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  INDIAN_STATES, DISEASES, ORAL_CONDITIONS, SOFT_TISSUES, HYGIENE_LEVELS, OCCLUSION_CLASSES,
  REFERRAL_SOURCES, COMMON_DRUGS, FREQUENCIES, calcAge, fmtDate, inr,
} from "@/lib/format";
import VisitForm from "@/components/VisitForm";
import Odontogram from "@/components/Odontogram";
import SignaturePad from "@/components/SignaturePad";
import PrescriptionWriter from "@/components/PrescriptionWriter";

const DOC_CATS = ["Aadhar Card","PAN Card","Insurance","Medical Report","Consent Form","Lab Report","Other"];
const TABS = ["General Info","Medical Info","Oral Examination","Visits & Payments","Images","Documents","Tooth Chart"];

const emptyPatient = () => ({
  general: { first_name: "", last_name: "", dob: "", mobile: "", email: "", gender: "Male", marital: "Single",
             referred_by: "Walk-in", occupation: "", address: "", area: "", city: "", state: "Karnataka", pincode: "" },
  medical: { diseases: [], other_disease: "", medications: [], notes: "" },
  oral_exam: { tissues: {}, conditions: [], other_condition: "", hygiene: "Good", occlusion: "Class I", complaint: "", notes: "" },
  photo: null, signature: null,
  odontogram: { teeth: {}, history: [] },
  visits: [], clinical_photos: [], radiographs: [], documents: [],
});

function fileToB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export default function PatientFormPage({ mode }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { isDoctor } = useAuth();
  const isEdit = mode === "edit";
  const [tab, setTab] = useState(0);
  const [p, setP] = useState(emptyPatient());
  const [treatments, setTreatments] = useState([]);
  const [editingVisit, setEditingVisit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const fileRefs = useRef({});
  const cameraInputRef = useRef(null);

  useEffect(() => {
    api.get("/treatments").then((r) => setTreatments(r.data)).catch(() => {});
    if (isEdit && id) {
      api.get(`/patients/${id}`).then((r) => setP({ ...emptyPatient(), ...r.data })).catch((e) => toast.error(formatErr(e)));
    }
  }, [isEdit, id]);

  const ageBadge = useMemo(() => {
    const a = calcAge(p.general.dob);
    return a !== "" ? `${a} years` : null;
  }, [p.general.dob]);

  const setG = (k, v) => setP((x) => ({ ...x, general: { ...x.general, [k]: v } }));
  const setM = (k, v) => setP((x) => ({ ...x, medical: { ...x.medical, [k]: v } }));
  const setO = (k, v) => setP((x) => ({ ...x, oral_exam: { ...x.oral_exam, [k]: v } }));

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const save = async () => {
    if (!p.general.first_name || !p.general.last_name || !p.general.mobile) {
      toast.error("First name, last name and mobile are required");
      setTab(0); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const r = await api.put(`/patients/${id}`, p);
        setP(r.data);
        toast.success("Patient updated");
      } else {
        const r = await api.post("/patients", p);
        toast.success("Patient created");
        nav(`/patients/${r.data.id}`);
      }
    } catch (e) { toast.error(formatErr(e)); }
    finally { setSaving(false); }
  };

  // Visits
  const totals = useMemo(() => {
    const charged = p.visits.reduce((s, v) => s + (+v.total || 0), 0);
    const paid    = p.visits.reduce((s, v) => s + (+v.paid || 0), 0);
    return { count: p.visits.length, charged, paid, due: Math.max(charged - paid, 0) };
  }, [p.visits]);

  const onSaveVisit = (v) => {
    setP((x) => {
      const exists = x.visits.find((y) => y.id === v.id);
      const visits = exists ? x.visits.map((y) => y.id === v.id ? v : y) : [...x.visits, v];
      return { ...x, visits };
    });
    setShowVisitForm(false); setEditingVisit(null);
    toast.success("Visit saved (don't forget to save patient)");
  };
  const onDeleteVisit = (vid) => {
    if (!isDoctor) return;
    setP((x) => ({ ...x, visits: x.visits.filter((v) => v.id !== vid) }));
  };

  // Photo capture
  const startCamera = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream; await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = 320; canvas.height = 240;
      // give camera time
      await new Promise((r) => setTimeout(r, 500));
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      stream.getTracks().forEach((t) => t.stop());
      setP((x) => ({ ...x, photo: data }));
      toast.success("Photo captured");
    } catch (e) {
      cameraInputRef.current?.click();
      toast.info("Choose camera to take a photo");
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const data = await fileToB64(file);
    setP((x) => ({ ...x, photo: data }));
  };

  const uploadAlbum = async (album, files) => {
    const arr = await Promise.all([...files].map(async (f) => ({
      id: crypto.randomUUID(), name: f.name, type: f.type, data: await fileToB64(f), uploaded_at: new Date().toISOString(),
    })));
    setP((x) => ({ ...x, [album]: [...(x[album] || []), ...arr] }));
  };

  const removeFromAlbum = (album, fid) => {
    if (!isDoctor && album === "documents") return;
    setP((x) => ({ ...x, [album]: x[album].filter((y) => y.id !== fid) }));
  };

  const openImageInNewPage = (img) => {
    const imagePage = window.open("", "_blank");
    if (!imagePage) {
      window.open(img.data, "_blank");
      return;
    }

    const title = escapeHtml(img.name || "Image");
    imagePage.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              background: #0b1117;
              color: #e6eaf0;
              font-family: Inter, Arial, sans-serif;
              display: flex;
              flex-direction: column;
            }
            header {
              padding: 12px 16px;
              background: #0f1620;
              border-bottom: 1px solid #1e2a38;
              font-size: 14px;
              font-weight: 600;
            }
            main {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
            }
            img {
              max-width: 100%;
              max-height: calc(100vh - 82px);
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <header>${title}</header>
          <main><img src="${img.data}" alt="${title}" /></main>
        </body>
      </html>
    `);
    imagePage.document.close();
  };

  const addDoc = async (file, category) => {
    if (!file) return;
    const doc = {
      id: crypto.randomUUID(), name: file.name, type: file.type, category,
      data: await fileToB64(file), uploaded_at: new Date().toISOString(),
    };
    setP((x) => ({ ...x, documents: [...(x.documents || []), doc] }));
  };

  const completion = (i) => {
    if (i === 0) return p.general.first_name && p.general.mobile;
    if (i === 1) return p.medical.diseases.length > 0 || p.medical.notes;
    if (i === 2) return Object.keys(p.oral_exam.tissues || {}).length > 0 || p.oral_exam.complaint;
    if (i === 3) return p.visits.length > 0;
    if (i === 4) return (p.clinical_photos || []).length > 0 || (p.radiographs || []).length > 0;
    if (i === 5) return p.signature || (p.documents || []).length > 0;
    if (i === 6) return Object.keys(p.odontogram?.teeth || {}).length > 0;
    return false;
  };

  return (
    <div className="space-y-5 df-anim-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button className="df-btn df-btn-ghost" onClick={() => nav(-1)}><ArrowLeft size={16}/> Back</button>
          <div>
            <h1>{isEdit ? `${p.general.first_name || ""} ${p.general.last_name || ""}` : "New Patient"}</h1>
            <p className="text-[var(--text-2)] mt-1 text-sm">
              {isEdit ? "View and edit patient details" : "Register a new patient with full medical & dental profile"}
            </p>
          </div>
        </div>
        <button className="df-btn" onClick={save} disabled={saving} data-testid="save-patient-btn">
          <Save size={16}/> {saving ? "Saving…" : "Save Patient"}
        </button>
      </div>

      <div className="df-tabs">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`df-tab ${tab === i ? "active" : ""}`} data-testid={`tab-${i}`}>
            {t}
            {completion(i) && <span className="w-2 h-2 rounded-full bg-[var(--success)]"/>}
          </button>
        ))}
      </div>

      {/* TAB 1: GENERAL INFO */}
      {tab === 0 && (
        <div className="df-card p-6 space-y-5">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-28 h-28 rounded-full bg-[var(--teal-light)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
              {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover"/>
                : <div className="text-[var(--teal-accent)] text-3xl font-semibold">
                  {(p.general.first_name?.[0] || "?") + (p.general.last_name?.[0] || "")}
                </div>}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" className="df-btn df-btn-ghost" onClick={startCamera} data-testid="take-photo-btn"><Camera size={14}/> Take Photo</button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => uploadPhoto(e.target.files[0])}
              />
              <label className="df-btn df-btn-ghost cursor-pointer" data-testid="upload-photo-btn">
                <Upload size={14}/> Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files[0])}/>
              </label>
              {ageBadge && <span className="df-badge df-badge-teal">{ageBadge}</span>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["First Name *","first_name","text"],["Last Name *","last_name","text"],
            ].map(([l,k,t]) => (
              <div key={k}><label className="df-label">{l}</label>
                <input className="df-input" type={t} value={p.general[k]} onChange={(e) => setG(k, e.target.value)} data-testid={`field-${k}`}/></div>
            ))}
            <div><label className="df-label">Date of Birth *</label>
              <input type="date" className="df-input" value={p.general.dob} onChange={(e) => setG("dob", e.target.value)} data-testid="field-dob"/></div>
            <div><label className="df-label">Mobile Number *</label>
              <input type="tel" className="df-input" value={p.general.mobile} onChange={(e) => setG("mobile", e.target.value)} placeholder="+91 98xxxxxxxx" data-testid="field-mobile"/></div>
            <div><label className="df-label">Email</label>
              <input type="email" className="df-input" value={p.general.email} onChange={(e) => setG("email", e.target.value)}/></div>
            <div><label className="df-label">Gender *</label>
              <select className="df-input" value={p.general.gender} onChange={(e) => setG("gender", e.target.value)}>
                <option>Male</option><option>Female</option><option>Other</option></select></div>
            <div><label className="df-label">Marital Status</label>
              <select className="df-input" value={p.general.marital} onChange={(e) => setG("marital", e.target.value)}>
                <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></div>
            <div><label className="df-label">Referred By</label>
              <select className="df-input" value={p.general.referred_by} onChange={(e) => setG("referred_by", e.target.value)}>
                {REFERRAL_SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="md:col-span-2"><label className="df-label">Occupation</label>
              <input className="df-input" value={p.general.occupation} onChange={(e) => setG("occupation", e.target.value)}/></div>
          </div>

          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <h3>Address</h3>
            <div><label className="df-label">Full Address</label>
              <textarea className="df-input" rows={2} value={p.general.address} onChange={(e) => setG("address", e.target.value)}/></div>
            <div className="grid md:grid-cols-4 gap-3">
              <div><label className="df-label">Area / Street</label><input className="df-input" value={p.general.area} onChange={(e) => setG("area", e.target.value)}/></div>
              <div><label className="df-label">City</label><input className="df-input" value={p.general.city} onChange={(e) => setG("city", e.target.value)}/></div>
              <div><label className="df-label">State</label>
                <select className="df-input" value={p.general.state} onChange={(e) => setG("state", e.target.value)}>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="df-label">Pincode</label><input className="df-input" value={p.general.pincode} onChange={(e) => setG("pincode", e.target.value)}/></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDICAL */}
      {tab === 1 && (
        <div className="df-card p-6 space-y-6">
          <div>
            <h3 className="mb-2">Pre-existing Diseases</h3>
            <div className="flex flex-wrap gap-2">
              {DISEASES.map((d) => (
                <button key={d} type="button" onClick={() => setM("diseases", toggleArr(p.medical.diseases, d))}
                        className={`df-chip ${p.medical.diseases.includes(d) ? "active" : ""}`} data-testid={`disease-${d}`}>{d}</button>
              ))}
            </div>
            {p.medical.diseases.includes("Other") && (
              <input className="df-input mt-2 max-w-md" placeholder="Specify condition…"
                     value={p.medical.other_disease} onChange={(e) => setM("other_disease", e.target.value)}/>
            )}
          </div>

          <div>
            <h3 className="mb-2">Current Medications</h3>
            <div className="space-y-2">
              {(p.medical.medications || []).map((m, i) => (
                <div key={i} className="grid md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-5"><label className="df-label">Drug</label>
                    <input list="med-drugs" className="df-input" value={m.name} onChange={(e) => setM("medications", p.medical.medications.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}/>
                    <datalist id="med-drugs">{COMMON_DRUGS.map((d) => <option key={d} value={d}/>)}</datalist></div>
                  <div className="md:col-span-3"><label className="df-label">Dosage</label>
                    <input className="df-input" value={m.dosage} onChange={(e) => setM("medications", p.medical.medications.map((x, idx) => idx === i ? { ...x, dosage: e.target.value } : x))}/></div>
                  <div className="md:col-span-3"><label className="df-label">Frequency</label>
                    {m.is_custom_frequency || (!FREQUENCIES.includes(m.frequency) && m.frequency !== "") ? (
                      <input className="df-input" autoFocus value={m.frequency || ""} placeholder="Enter frequency"
                             onChange={(e) => setM("medications", p.medical.medications.map((x, idx) => idx === i ? { ...x, frequency: e.target.value, is_custom_frequency: true } : x))}/>
                    ) : (
                      <select className="df-input" value={m.frequency}
                              onChange={(e) => setM("medications", p.medical.medications.map((x, idx) => idx === i ? { ...x, frequency: e.target.value === "Custom" ? "" : e.target.value, is_custom_frequency: e.target.value === "Custom" } : x))}>
                        {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                        <option>Custom</option>
                      </select>
                    )}</div>
                  <button type="button" className="df-btn df-btn-ghost text-[var(--danger)] md:col-span-1"
                          onClick={() => setM("medications", p.medical.medications.filter((_, idx) => idx !== i))}><Trash2 size={14}/></button>
                </div>
              ))}
              <button type="button" className="df-btn df-btn-ghost" data-testid="add-medication"
                      onClick={() => setM("medications", [...(p.medical.medications || []), { name: "", dosage: "", frequency: "Once daily" }])}>
                <Plus size={14}/> Add Medication
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2">Important Notes</h3>
            <textarea className="df-input" rows={4} placeholder="Allergies, special precautions, doctor observations…"
                      value={p.medical.notes} onChange={(e) => setM("notes", e.target.value)}/>
          </div>
        </div>
      )}

      {/* TAB 3: ORAL EXAM */}
      {tab === 2 && (
        <div className="df-card p-6 space-y-6">
          <div>
            <h3 className="mb-3">Soft Tissue Examination</h3>
            <div className="space-y-2">
              {SOFT_TISSUES.map((t) => (
                <div key={t} className="flex items-center justify-between border border-[var(--border)] rounded-lg px-4 py-2 flex-wrap gap-3">
                  <div className="text-sm font-medium">{t}</div>
                  <div className="flex gap-2 flex-wrap">
                    {[["healthy","Healthy","df-badge-green"],["attention","Needs Attention","df-badge-amber"],["severe","Severe","df-badge-red"]].map(([k,l,cls]) => {
                      const sel = p.oral_exam.tissues?.[t] === k;
                      return (
                        <button key={k} type="button" onClick={() => setO("tissues", { ...p.oral_exam.tissues, [t]: k })}
                                className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${sel ? `df-badge ${cls} font-medium` : "border-[var(--border)] text-[var(--text-2)] bg-transparent hover:border-[var(--teal)]"}`}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2">Oral Conditions & Diseases</h3>
            <div className="flex flex-wrap gap-2">
              {ORAL_CONDITIONS.map((c) => (
                <button key={c} type="button" onClick={() => setO("conditions", toggleArr(p.oral_exam.conditions, c))}
                        className={`df-chip ${p.oral_exam.conditions.includes(c) ? "active" : ""}`}>{c}</button>
              ))}
            </div>
            {p.oral_exam.conditions.includes("Other") && (
              <input className="df-input mt-2 max-w-md" placeholder="Specify…"
                     value={p.oral_exam.other_condition} onChange={(e) => setO("other_condition", e.target.value)}/>
            )}
          </div>

          <div>
            <h3 className="mb-2">Oral Hygiene Status</h3>
            <div className="flex gap-2 flex-wrap">
              {HYGIENE_LEVELS.map((h) => (
                <button key={h} type="button" onClick={() => setO("hygiene", h)} className={`df-chip ${p.oral_exam.hygiene === h ? "active" : ""}`}>{h}</button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2">Occlusion Class</h3>
            <div className="flex gap-2 flex-wrap">
              {OCCLUSION_CLASSES.map((c) => (
                <button key={c} type="button" onClick={() => setO("occlusion", c)} className={`df-chip ${p.oral_exam.occlusion === c ? "active" : ""}`}>{c}</button>
              ))}
            </div>
          </div>

          <div><label className="df-label">Chief Complaint</label>
            <textarea className="df-input" rows={2} value={p.oral_exam.complaint} onChange={(e) => setO("complaint", e.target.value)}/></div>
          <div><label className="df-label">Clinical Notes</label>
            <textarea className="df-input" rows={3} value={p.oral_exam.notes} onChange={(e) => setO("notes", e.target.value)}/></div>
        </div>
      )}

      {/* TAB 4: VISITS & PAYMENTS */}
      {tab === 3 && (
        <div className="space-y-4">
          <div className="df-card p-4 grid md:grid-cols-4 gap-3">
            <div><div className="df-label">Total Visits</div><div className="text-xl font-semibold">{totals.count}</div></div>
            <div><div className="df-label">Total Charged</div><div className="text-xl font-semibold">{inr(totals.charged)}</div></div>
            <div><div className="df-label">Total Paid</div><div className="text-xl font-semibold text-[var(--success)]">{inr(totals.paid)}</div></div>
            <div><div className="df-label">Total Due</div><div className={`text-xl font-semibold ${totals.due > 0 ? "text-[var(--danger)]" : ""}`}>{inr(totals.due)}</div></div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="df-btn" onClick={() => { setEditingVisit(null); setShowVisitForm(true); }} data-testid="new-visit-btn">
              <Plus size={14}/> New Visit
            </button>
            {p.visits.length > 0 && <PrescriptionWriter patient={p}/>}
          </div>

          {showVisitForm && (
            <VisitForm visit={editingVisit} treatments={treatments}
              onSave={onSaveVisit} onCancel={() => { setShowVisitForm(false); setEditingVisit(null); }}/>
          )}

          <div className="space-y-3">
            {p.visits.length === 0 ? (
              <div className="df-card p-8 text-center text-[var(--text-2)]">
                No visits yet. Click "+ New Visit" to add the first one.
              </div>
            ) : (
              p.visits.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((v) => {
                const due = Math.max((+v.total || 0) - (+v.paid || 0), 0);
                return (
                  <div key={v.id} className="df-card p-4" data-testid={`visit-card-${v.id}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm text-[var(--text-2)]">{fmtDate(v.date)}</div>
                        <div className="font-semibold mt-0.5">{v.treatment}</div>
                        {v.teeth && <div className="text-[12px] text-[var(--text-2)]">Teeth: {v.teeth}</div>}
                        {v.complaint && <div className="text-sm mt-1">{v.complaint}</div>}
                      </div>
                    <div className="text-left sm:text-right">
                        <div className="text-sm">Charged: <b>{inr(v.total)}</b></div>
                        <div className="text-sm text-[var(--success)]">Paid: {inr(v.paid)}</div>
                        {due > 0 && <div className="text-sm text-[var(--danger)]">Due: {inr(due)}</div>}
                        {v.followup_date && <div className="text-[12px] text-[var(--teal)] mt-1">Follow-up: {fmtDate(v.followup_date)}</div>}
                      </div>
                    </div>
                    {v.notes && <div className="text-sm mt-2 text-[var(--text-2)]">{v.notes}</div>}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button className="df-btn df-btn-ghost py-1 px-3 text-[13px]"
                              onClick={() => { setEditingVisit(v); setShowVisitForm(true); }}><Edit3 size={12}/> Edit</button>
                      {isDoctor && <button className="df-btn df-btn-ghost py-1 px-3 text-[13px] text-[var(--danger)]"
                                           onClick={() => onDeleteVisit(v.id)}><Trash2 size={12}/> Delete</button>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: IMAGES */}
      {tab === 4 && (
        <div className="space-y-5">
          {[
            { key: "clinical_photos", title: "Clinical Photos", icon: ImgIcon, sub: "Patient face, intraoral images, treatment progress photos", accept: "image/*" },
            { key: "radiographs", title: "Radiographs", icon: ImgIcon, sub: "X-rays, OPG, CBCT, Periapical radiographs", accept: "image/*,.dcm" },
          ].map((album) => (
            <div className="df-card p-5" key={album.key}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div>
                  <h3 className="flex items-center gap-2"><album.icon size={16}/> {album.title}</h3>
                  <p className="text-sm text-[var(--text-2)]">{album.sub}</p>
                </div>
                <label className="df-btn cursor-pointer">
                  <Upload size={14}/> Upload
                  <input type="file" accept={album.accept} multiple className="hidden" onChange={(e) => uploadAlbum(album.key, e.target.files)}/>
                </label>
              </div>
              {p[album.key]?.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-2)] text-sm">No images uploaded yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {p[album.key].map((img) => (
                    <div key={img.id} className="relative group">
                      <img src={img.data} alt={img.name} className="w-full h-28 object-cover rounded-md border border-[var(--border)] cursor-pointer"
                           onClick={() => openImageInNewPage(img)}/>
                      <div className="text-[11px] truncate mt-1">{img.name}</div>
                      {isDoctor && (
                        <button onClick={() => removeFromAlbum(album.key, img.id)}
                          className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-[var(--danger)] opacity-0 group-hover:opacity-100">
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: DOCUMENTS */}
      {tab === 5 && (
        <div className="space-y-5">
          <div className="df-card p-5">
            <h3 className="mb-3">Digital Signature</h3>
            <p className="text-sm text-[var(--text-2)] mb-3">Patient signs below using mouse or touch.</p>
            <SignaturePad value={p.signature} onChange={(v) => setP((x) => ({ ...x, signature: v }))}/>
          </div>

          <div className="df-card p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <h3>Documents</h3>
              <label className="df-btn cursor-pointer">
                <Upload size={14}/> Upload Document
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                       onChange={async (e) => {
                         const f = e.target.files[0];
                         const cat = window.prompt(`Category (${DOC_CATS.join(", ")})`, "Other") || "Other";
                         await addDoc(f, cat);
                       }}/>
              </label>
            </div>
            {p.documents.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-2)] text-sm">No documents uploaded yet.</div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {p.documents.map((d) => (
                  <li key={d.id} className="py-3 flex items-center gap-3 flex-wrap">
                    <FileText size={16} className="text-[var(--teal)]"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-[12px] text-[var(--text-2)]">{d.category} · {fmtDate(d.uploaded_at)}</div>
                    </div>
                    <span className="df-badge df-badge-grey">{(d.type || "").includes("pdf") ? "PDF" : (d.type || "").includes("image") ? "IMAGE" : "DOC"}</span>
                    <a className="df-btn df-btn-ghost py-1 px-3 text-[13px]" href={d.data} download={d.name}>Download</a>
                    {isDoctor && (
                      <button className="df-btn df-btn-ghost py-1 px-3 text-[13px] text-[var(--danger)]"
                              onClick={() => removeFromAlbum("documents", d.id)}><Trash2 size={12}/></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: ODONTOGRAM */}
      {tab === 6 && (
        <div className="space-y-3">
          <Odontogram value={p.odontogram} onChange={(o) => setP((x) => ({ ...x, odontogram: o }))}/>
          <p className="text-[12px] text-[var(--text-2)]">Tip: click surfaces to select, choose a condition and Apply. Save patient to persist changes.</p>
        </div>
      )}
    </div>
  );
}
