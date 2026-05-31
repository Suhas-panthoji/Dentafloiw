import React, { useState } from "react";
import jsPDF from "jspdf";
import { Plus, Trash2, FileText } from "lucide-react";
import { COMMON_DRUGS, PRX_FREQ, DURATIONS, SPECIAL_INSTR, fmtDate, calcAge, fullName } from "@/lib/format";

const blankRx = () => ({ name: "", dosage: "", frequency: "Twice daily", duration: "5 days", instr: "After food" });

export default function PrescriptionWriter({ patient, doctorName = "Dr. Asha Menon" }) {
  const [open, setOpen] = useState(false);
  const [rx, setRx] = useState([blankRx()]);

  const update = (i, k, v) => setRx((arr) => arr.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const add = () => setRx((a) => [...a, blankRx()]);
  const remove = (i) => setRx((a) => a.filter((_, idx) => idx !== i));

  const generate = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 50;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(10, 110, 110);
    doc.text("DentaFlow Dental Clinic", 40, y); y += 20;
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text(`${doctorName} — BDS, MDS`, 40, y); y += 26;

    doc.setDrawColor(10, 110, 110); doc.line(40, y, 555, y); y += 22;

    doc.setTextColor(20); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Patient: `, 40, y); doc.setFont("helvetica", "normal"); doc.text(fullName(patient), 95, y);
    doc.setFont("helvetica", "bold"); doc.text(`Age: `, 300, y); doc.setFont("helvetica", "normal"); doc.text(`${calcAge(patient?.general?.dob) || "—"} yrs`, 335, y);
    doc.setFont("helvetica", "bold"); doc.text(`Date: `, 430, y); doc.setFont("helvetica", "normal"); doc.text(fmtDate(new Date()), 470, y);
    y += 30;

    doc.setFont("times", "bolditalic"); doc.setFontSize(28); doc.setTextColor(10, 110, 110);
    doc.text("Rx", 40, y); y += 18;

    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(20);
    rx.filter((r) => r.name).forEach((r, idx) => {
      doc.setFont("helvetica", "bold"); doc.text(`${idx + 1}. ${r.name} ${r.dosage}`, 60, y); y += 14;
      doc.setFont("helvetica", "normal");
      doc.text(`   ${r.frequency}  ·  ${r.duration}  ·  ${r.instr}`, 60, y); y += 22;
    });

    y = Math.max(y, 700);
    doc.line(380, y, 555, y); y += 14;
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text("Doctor's Signature", 430, y);

    doc.save(`Prescription-${fullName(patient).replace(/\s+/g,"_")}.pdf`);
  };

  return (
    <>
      <button type="button" className="df-btn df-btn-ghost" onClick={() => setOpen(true)} data-testid="write-rx-btn">
        <FileText size={14}/> Write Prescription
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div className="df-card p-6 w-full max-w-[680px] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()} data-testid="rx-modal">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2>Prescription</h2>
              <button onClick={() => setOpen(false)} className="text-[var(--text-2)] hover:text-[var(--text)]">✕</button>
            </div>
            <div className="space-y-3">
              {rx.map((r, i) => (
                <div key={i} className="grid md:grid-cols-12 gap-2 items-start border border-[var(--border)] rounded-lg p-3">
                  <div className="md:col-span-4">
                    <label className="df-label">Drug</label>
                    <input list="rx-drugs" className="df-input" value={r.name}
                           onChange={(e) => update(i, "name", e.target.value)} placeholder="e.g. Amoxicillin"
                           data-testid={`rx-name-${i}`}/>
                    <datalist id="rx-drugs">{COMMON_DRUGS.map((d) => <option key={d} value={d}/>)}</datalist>
                  </div>
                  <div className="md:col-span-2">
                    <label className="df-label">Dosage</label>
                    <input className="df-input" value={r.dosage} onChange={(e) => update(i, "dosage", e.target.value)} placeholder="500mg"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="df-label">Frequency</label>
                    <select className="df-input" value={r.frequency} onChange={(e) => update(i, "frequency", e.target.value)}>
                      {PRX_FREQ.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="df-label">Duration</label>
                    <select className="df-input" value={r.duration} onChange={(e) => update(i, "duration", e.target.value)}>
                      {DURATIONS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="df-label">Instructions</label>
                    <select className="df-input" value={r.instr} onChange={(e) => update(i, "instr", e.target.value)}>
                      {SPECIAL_INSTR.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => remove(i)} className="md:col-span-12 text-[12px] text-[var(--danger)] flex items-center gap-1 mt-1">
                    <Trash2 size={12}/> Remove
                  </button>
                </div>
              ))}
              <button type="button" className="df-btn df-btn-ghost w-full" onClick={add}><Plus size={14}/> Add another drug</button>
            </div>
            <div className="flex justify-end gap-2 mt-5 flex-wrap">
              <button className="df-btn df-btn-ghost" onClick={() => setOpen(false)}>Close</button>
              <button className="df-btn" onClick={generate} data-testid="generate-rx-pdf">Generate Prescription PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
