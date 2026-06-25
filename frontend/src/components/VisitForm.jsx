import React, { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import ToothSelector from "@/components/ToothSelector";
import { TREATMENT_TYPES, inr, todayISO } from "@/lib/format";

const blank = () => ({
  id: crypto.randomUUID(),
  date: todayISO(),
  complaint: "", diagnosis: "", treatment: "Consultation", notes: "",
  teeth: "", fee: 0, lab_cost: 0, radio_cost: 0, other_cost: 0,
  paid: 0, followup_date: "", followup_treatment_plan: "",
});

export default function VisitForm({ visit, treatments = [], onSave, onCancel }) {
  const [v, setV] = useState(visit || blank());
  const total = (+v.fee || 0) + (+v.lab_cost || 0) + (+v.radio_cost || 0) + (+v.other_cost || 0);
  const due = Math.max(total - (+v.paid || 0), 0);

  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));

  const onTreatmentChange = (val) => {
    setV((p) => {
      const cat = treatments.find((t) => t.name === val);
      return { ...p, treatment: val, fee: cat ? cat.fee : p.fee, lab_cost: cat ? cat.lab_cost : p.lab_cost };
    });
  };

  const save = () => onSave?.({ ...v, total, due });

  return (
    <div className="df-card p-5 space-y-4 df-anim-in" data-testid="visit-form">
      <div className="flex items-center justify-between gap-3">
        <h3>{visit ? "Edit Visit" : "New Visit"}</h3>
        <button onClick={onCancel} className="text-[var(--text-2)] hover:text-[var(--text)]"><X size={18}/></button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div><label className="df-label">Visit Date</label>
          <input type="date" className="df-input" value={v.date} onChange={(e) => set("date", e.target.value)} data-testid="visit-date"/></div>
        <div className="md:col-span-2"><label className="df-label">Chief Complaint</label>
          <input className="df-input" value={v.complaint} onChange={(e) => set("complaint", e.target.value)} placeholder="Pain in lower right molar" data-testid="visit-complaint"/></div>
      </div>

      <div><label className="df-label">Diagnosis</label>
        <textarea className="df-input" rows={2} value={v.diagnosis} onChange={(e) => set("diagnosis", e.target.value)}/></div>

      <div className="grid md:grid-cols-2 gap-3">
        <div><label className="df-label">Treatment Performed</label>
          <select className="df-input" value={v.treatment} onChange={(e) => onTreatmentChange(e.target.value)} data-testid="treatment-select">
            {Array.from(new Set([...TREATMENT_TYPES, ...treatments.map((t) => t.name)])).map((t) => <option key={t}>{t}</option>)}
          </select></div>
        <div><label className="df-label">Schedule Follow-up?</label>
          <input type="date" className="df-input" value={v.followup_date || ""} onChange={(e) => set("followup_date", e.target.value)} data-testid="followup-date"/></div>
      </div>

      {v.followup_date && (
        <div><label className="df-label">Planned Follow-up Treatment</label>
          <textarea
            className="df-input"
            rows={2}
            value={v.followup_treatment_plan || ""}
            onChange={(e) => set("followup_treatment_plan", e.target.value)}
            placeholder="Example: RCT second sitting, crown trial, suture removal, review healing"
            data-testid="followup-treatment-plan"
          /></div>
      )}

      <div><label className="df-label">Treatment Notes</label>
        <textarea className="df-input" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)}/></div>

      <div>
        <div className="df-label mb-2">Treated Teeth</div>
        <ToothSelector value={v.teeth || ""} onChange={(val) => set("teeth", val)}/>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h3 className="mb-3">Payments</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="df-label">Consultation / Treatment Fee (₹)</label>
            <input type="number" min="0" className="df-input" value={v.fee} onChange={(e) => set("fee", e.target.value)} data-testid="fee-input"/></div>
          <div><label className="df-label">Lab Expenses (₹)</label>
            <input type="number" min="0" className="df-input" value={v.lab_cost} onChange={(e) => set("lab_cost", e.target.value)}/></div>
          <div><label className="df-label">Radiology Expenses (₹)</label>
            <input type="number" min="0" className="df-input" value={v.radio_cost} onChange={(e) => set("radio_cost", e.target.value)}/></div>
          <div><label className="df-label">Other Expenses (₹)</label>
            <input type="number" min="0" className="df-input" value={v.other_cost} onChange={(e) => set("other_cost", e.target.value)}/></div>
          <div><label className="df-label">Total Amount</label>
            <div className="df-input font-semibold" style={{ background: "var(--teal-light)", color: "var(--teal-accent)", borderColor: "rgba(20,184,184,0.30)" }} data-testid="visit-total">{inr(total)}</div></div>
          <div><label className="df-label">Amount Paid (₹)</label>
            <input type="number" min="0" className="df-input" value={v.paid} onChange={(e) => set("paid", e.target.value)} data-testid="paid-input"/></div>
          <div className="md:col-span-2"><label className="df-label">Amount Due</label>
            <div className="df-input font-semibold" style={due > 0
              ? { color: "var(--danger)", background: "rgba(248,113,113,0.10)", borderColor: "rgba(248,113,113,0.30)" }
              : { color: "var(--success)", background: "rgba(52,211,153,0.10)", borderColor: "rgba(52,211,153,0.30)" }} data-testid="visit-due">
              {inr(due)}
            </div></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 flex-wrap">
        <button className="df-btn df-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="df-btn" onClick={save} data-testid="save-visit-btn">Save Visit</button>
      </div>
    </div>
  );
}
