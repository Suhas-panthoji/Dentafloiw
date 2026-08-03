import React, { useState } from "react";
import ReactDOM from "react-dom";
import jsPDF from "jspdf";
import { Plus, Trash2, FileText, AlertCircle } from "lucide-react";
import { COMMON_DRUGS, PRX_FREQ, DURATIONS, SPECIAL_INSTR, fmtDate, calcAge, fullName } from "@/lib/format";

const blankRx = () => ({ name: "", dosage: "", frequency: "Twice daily", duration: "5 days", instr: "After food" });

export default function PrescriptionWriter({ patient, doctorName = "Dr. Naveen Shamanur" }) {
  const [open, setOpen] = useState(false);
  const [rx, setRx] = useState([blankRx()]);
  const [errors, setErrors] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const openModal = () => {
    setRx([blankRx()]);
    setErrors([]);
    setSubmitAttempted(false);
    setOpen(true);
  };

  const update = (i, k, v) => {
    setRx((arr) => arr.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
    if (submitAttempted) {
      setErrors((prev) => {
        const next = [...prev];
        if (next[i]) next[i] = { ...next[i], [k]: false };
        return next;
      });
    }
  };

  const add = () => setRx((a) => [...a, blankRx()]);
  const remove = (i) => {
    setRx((a) => a.filter((_, idx) => idx !== i));
    setErrors((e) => e.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    const errs = rx.map((r) => ({
      name: !r.name.trim(),
      dosage: !r.dosage.trim(),
    }));
    setErrors(errs);
    return errs.every((e) => !e.name && !e.dosage);
  };

  const generate = () => {
    setSubmitAttempted(true);
    if (!validate()) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Primary Colors
    const primaryColor = [0, 79, 149]; // #004F95
    const secondaryColor = [0, 130, 202]; // #0082CA
    const borderColor = [203, 231, 245]; // #CBE7F5
    const bgBoxColor = [250, 253, 255]; // #FAFDFF
    const darkTextColor = [51, 51, 51]; // #333333

    // ==========================================
    // 1. TOP HEADER SECTION (Y: 28 to 115)
    // ==========================================

    // Draw Vector Logo (Top Left)
    // Green Left Arm
    doc.setFillColor(76, 175, 80);
    doc.roundedRect(30, 43, 13, 13, 2, 2, "F");
    // Blue Top Arm
    doc.setFillColor(33, 150, 243);
    doc.roundedRect(44, 29, 13, 13, 2, 2, "F");
    // Purple/Magenta Right Arm
    doc.setFillColor(156, 39, 176);
    doc.roundedRect(58, 43, 13, 13, 2, 2, "F");
    // Orange/Red Bottom Arm
    doc.setFillColor(255, 112, 67);
    doc.roundedRect(44, 57, 13, 13, 2, 2, "F");
    // White center circle containing a tiny tooth representation
    doc.setFillColor(255, 255, 255);
    doc.circle(50.5, 49.5, 7, "F");
    doc.setFillColor(0, 130, 202);
    doc.circle(50.5, 49.5, 3.5, "F");

    // Clinic Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("S.S. DENTAL CARE", 80, 44);

    // Tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("• COMPASSIONATE CARE. HEALTHY SMILES. •", 80, 55);

    // Doctor 1 Box (Orthodontics & Dentofacial Orthopedics)
    doc.setFillColor(234, 246, 252);
    doc.circle(90, 80, 10, "F");
    doc.setDrawColor(0, 130, 202);
    doc.setLineWidth(0.8);
    doc.circle(90, 80, 10, "D");

    // Draw Detailed Orthodontic Tooth with Braces outline matching image_0.png
    doc.lines([
      [1.5, -0.5, 3, 0, 3, 2],
      [0, 1.5, -0.5, 3, -1, 4.5],
      [-0.5, -1.5, -1, -2.5, -2, -2.5],
      [-1, 1, -1.5, 2.5, -1.5, 2.5],
      [-0.5, -1, -1, -2, -1.5, -4.5],
      [0.5, -1, 1.5, -1.5, 3, -1]
    ], 88, 77.5, [0.9, 0.9], "D");

    // Bracket & wire attachment detail on the side of the tooth
    doc.setLineWidth(0.6);
    doc.rect(91, 78.5, 2.5, 3, "D"); // bracket
    doc.line(90, 80, 93.5, 80); // small band detail

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Dr. Naveen Shamnur, M.D.S.", 108, 77);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text("Orthodontics & Dentofacial Orthopedics", 108, 87);

    // Doctor 2 Box (Maxillofacial Prosthodontist & Implantologist)
    doc.setFillColor(234, 246, 252);
    doc.circle(260, 80, 10, "F");
    doc.setDrawColor(0, 130, 202);
    doc.setLineWidth(0.8);
    doc.circle(260, 80, 10, "D");

    // Draw Detailed Dental Implant
    // Crown
    doc.roundedRect(256.5, 73.5, 7, 4, 1.2, 1.2, "D");
    // Abutment connector
    doc.rect(258, 77.5, 4, 1.5, "D");
    // Screw threads
    doc.line(257, 79, 263, 79); // collar
    doc.line(260, 79, 260, 85.5); // post
    doc.line(258, 80.5, 262, 80.5); // thread 1
    doc.line(258.5, 82, 261.5, 82); // thread 2
    doc.line(259, 83.5, 261, 83.5); // thread 3
    doc.line(259.5, 85, 260.5, 85); // thread 4

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Dr. Sunitha N. Shamnur, M.D.S.", 278, 77);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text("Maxillofacial Prosthodontist & Implantologist", 278, 87);

    // Contact Details Column (Right Sidebar, X: 430)
    const renderContactRow = (label, value, yVal) => {
      doc.setFillColor(234, 246, 252);
      doc.circle(440, yVal - 3, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(label + ":", 452, yVal - 1.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(value, 485, yVal - 1.5);
    };

    renderContactRow("Landline", "9090290692", 36);
    renderContactRow("Phone", "+91 94484 55699", 48);
    renderContactRow("Email", "SSDentalCare.In@Gmail.Com", 60);
    renderContactRow("Website", "www.ssdentalcare.in", 72);

    // Address
    doc.setFillColor(234, 246, 252);
    doc.circle(440, 84, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Address:", 452, 85.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text("2873, 1st Floor, S.S. Plaza, 4th Main,", 485, 85.5);
    doc.text("4th Cross, MCC 'B' Block, Davangere - 577004,", 485, 93.5);
    doc.text("Karnataka, India", 485, 101.5);

    // ==========================================
    // 2. SECTION HEADER (PRESCRIPTION)
    // ==========================================
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.line(30, 128, 220, 128);
    doc.line(375, 128, 565, 128);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(235, 120, 14, 14, 2, 2, "F");
    // Draw line inside clipboard
    doc.setDrawColor(255, 255, 255);
    doc.line(239, 125, 245, 125);
    doc.line(239, 128, 245, 128);
    doc.line(239, 131, 243, 131);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PRESCRIPTION", 258, 131);

    // ==========================================
    // 3. PATIENT DETAILS BOX (Y: 145 to 215)
    // ==========================================
    doc.setFillColor(bgBoxColor[0], bgBoxColor[1], bgBoxColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(30, 145, 535, 70, 5, 5, "FD");

    const pGender = patient?.general?.gender || "—";
    const pAge = calcAge(patient?.general?.dob);

    const renderPatientField = (label, value, xLabel, xVal, yVal, lineW = 150) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(label, xLabel, yVal);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(String(value || "—"), xVal, yVal);
      doc.setDrawColor(220, 235, 245);
      doc.line(xVal, yVal + 2, xVal + lineW, yVal + 2);
    };

    renderPatientField("Patient Name :", fullName(patient), 42, 110, 162, 160);
    renderPatientField("Age / Gender :", `${pAge ? pAge + " yrs" : "—"}  /  ${pGender}`, 42, 110, 178, 160);
    renderPatientField("Mobile Number :", patient?.general?.phone || "—", 42, 110, 194, 160);
    renderPatientField("Patient ID :", patient?.id ? String(patient.id).substring(0, 12) : "—", 42, 110, 210, 160);

    renderPatientField("Date :", fmtDate(new Date()), 320, 395, 162, 155);
    renderPatientField("Referring Doctor :", "—", 320, 395, 178, 155);
    renderPatientField("Address :", patient?.general?.city || "—", 320, 395, 194, 155);

    // ==========================================
    // 4. MEDICATION BOX (Y: 225 to 640)
    // ==========================================
    // Blue banner tab
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.roundedRect(30, 225, 120, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("MEDICATION / PRESCRIPTION", 38, 237);

    // Outer light blue border box
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(1);
    doc.roundedRect(30, 243, 535, 397, 5, 5, "D");

    // Subtle Lined Paper Background (writing lines)
    doc.setDrawColor(240, 246, 250);
    doc.setLineWidth(0.8);
    for (let lineY = 270; lineY <= 620; lineY += 22) {
      doc.line(32, lineY, 563, lineY);
    }

    // Tooth watermark outline in center
    doc.setDrawColor(242, 247, 252);
    doc.setLineWidth(1.5);
    // Draw stylized watermark tooth using control points
    doc.lines(
      [
        [20, -10, 40, 0, 40, 15],      // Top right curve
        [0, 20, -10, 40, -15, 60],     // Right upper side
        [-10, 30, -5, 60, -5, 90],     // Right root outer
        [5, -20, 5, -40, -10, -50],    // Center crotch of roots
        [-10, 20, -5, 40, -5, 50],     // Left root outer
        [-5, -30, -10, -50, -15, -70], // Left upper side
        [0, -15, 20, -25, 40, -15]     // Top left lobe
      ],
      270, 350, [1, 1], "D"
    );

    // Write Rx medications
    // Rx Symbol
    doc.setFont("times", "bolditalic");
    doc.setFontSize(24);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("Rx", 42, 266);

    let rxY = 288;
    rx.forEach((r, idx) => {
      if (rxY > 600) return; // Prevent overflow

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(`${idx + 1}. ${r.name} ${r.dosage}`, 55, rxY);
      rxY += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`   ${r.frequency}   •   ${r.duration}   •   ${r.instr}`, 55, rxY);
      rxY += 24;
    });

    // ==========================================
    // 5. ADVICE & SIGNATURE BOX (Y: 650 to 740)
    // ==========================================
    doc.setFillColor(bgBoxColor[0], bgBoxColor[1], bgBoxColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(30, 650, 535, 90, 5, 5, "FD");

    // Divider line at X: 375
    doc.line(375, 650, 375, 740);

    // Advice / Instructions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Advice / Instructions:", 42, 666);

    // Render dotted advice lines
    doc.setDrawColor(220, 232, 242);
    doc.line(42, 690, 355, 690);
    doc.line(42, 712, 355, 712);
    doc.line(42, 730, 355, 730);

    // Signature Area
    // Draw circle tooth icon on right
    doc.setFillColor(234, 246, 252);
    doc.circle(470, 672, 11, "F");
    doc.setDrawColor(0, 130, 202);
    doc.circle(470, 672, 6, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text("Dr. ___________________________", 395, 706);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("(Signature)", 445, 722);

    // ==========================================
    // 6. FOOTER SECTION (Y: 745 to 842)
    // ==========================================
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text("Note: Please follow the instructions and report for review as advised.", 297, 756, { align: "center" });

    // Draw bottom footer icons and text
    const drawFooterIcon = (xCenter, type) => {
      doc.setFillColor(240, 248, 252);
      doc.circle(xCenter, 775, 9, "F");
      doc.setDrawColor(0, 130, 202);
      doc.circle(xCenter, 775, 5, "D");
    };

    drawFooterIcon(235, "tooth");
    drawFooterIcon(275, "chair");
    drawFooterIcon(315, "shield");
    drawFooterIcon(355, "implant");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("S.S. Dental Care – Creating Healthy Smiles with Excellence", 297, 796, { align: "center" });

    // Solid blue bottom bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 808, 595, 34, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("www.ssdentalcare.in    |    +91 94484 55699    |    9090290692    |    SSDentalCare.In@Gmail.Com", 297, 828, { align: "center" });

    doc.save(`Prescription-${fullName(patient).replace(/\s+/g, "_")}.pdf`);
  };

  const hasErrors = errors.some((e) => e?.name || e?.dosage);

  const inputStyle = (hasError) => ({
    display: "block",
    width: "100%",
    border: `1px solid ${hasError ? "var(--danger)" : "var(--border)"}`,
    borderRadius: "8px",
    padding: "9px 12px",
    background: "var(--card-2)",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    boxShadow: hasError ? "0 0 0 3px rgba(248,113,113,0.18)" : "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    fontFamily: "inherit",
    boxSizing: "border-box",
  });

  return (
    <>
      <button type="button" className="df-btn df-btn-ghost" onClick={openModal} data-testid="write-rx-btn">
        <FileText size={14} /> Write Prescription
      </button>

      {open && ReactDOM.createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            data-testid="rx-modal"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
              width: "100%",
              maxWidth: "700px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px" }}>
              <h2 style={{ margin: 0 }}>Prescription</h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-2)", fontSize: "18px", lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Drug rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {rx.map((r, i) => {
                const err = errors[i] || {};
                const rowHasError = err.name || err.dosage;
                return (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${rowHasError ? "var(--danger)" : "var(--border)"}`,
                      borderRadius: "10px",
                      padding: "14px",
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
                      gap: "10px",
                      alignItems: "start",
                      transition: "border-color 150ms ease",
                    }}
                  >
                    {/* Drug */}
                    <div>
                      <label
                        className="df-label"
                        style={{ color: err.name ? "var(--danger)" : undefined }}
                      >
                        Drug&nbsp;<span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <input
                        list="rx-drugs"
                        style={inputStyle(err.name)}
                        value={r.name}
                        onChange={(e) => update(i, "name", e.target.value)}
                        placeholder="e.g. Amoxicillin"
                        data-testid={`rx-name-${i}`}
                      />
                      <datalist id="rx-drugs">
                        {COMMON_DRUGS.map((d) => <option key={d} value={d} />)}
                      </datalist>
                      {err.name && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--danger)", fontSize: "11px", marginTop: "4px" }}>
                          <AlertCircle size={11} /> Drug name is required
                        </div>
                      )}
                    </div>

                    {/* Dosage */}
                    <div>
                      <label
                        className="df-label"
                        style={{ color: err.dosage ? "var(--danger)" : undefined }}
                      >
                        Dosage&nbsp;<span style={{ color: "var(--danger)" }}>*</span>
                      </label>
                      <input
                        style={inputStyle(err.dosage)}
                        value={r.dosage}
                        onChange={(e) => update(i, "dosage", e.target.value)}
                        placeholder="500mg"
                      />
                      {err.dosage && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--danger)", fontSize: "11px", marginTop: "4px" }}>
                          <AlertCircle size={11} /> Required
                        </div>
                      )}
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="df-label">Frequency</label>
                      <select className="df-input" value={r.frequency} onChange={(e) => update(i, "frequency", e.target.value)}>
                        {PRX_FREQ.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="df-label">Duration</label>
                      {!["3 days", "5 days", "7 days", "10 days"].includes(r.duration) ? (
                        <input
                          className="df-input"
                          autoFocus
                          placeholder="e.g. 2 weeks"
                          value={r.duration === "Custom" ? "" : r.duration}
                          onChange={(e) => update(i, "duration", e.target.value || "Custom")}
                          onBlur={(e) => { if (!e.target.value || e.target.value === "Custom") update(i, "duration", "5 days"); }}
                        />
                      ) : (
                        <select className="df-input" value={r.duration} onChange={(e) => update(i, "duration", e.target.value)}>
                          {DURATIONS.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="df-label">Instructions</label>
                      <select className="df-input" value={r.instr} onChange={(e) => update(i, "instr", e.target.value)}>
                        {SPECIAL_INSTR.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </div>

                    {/* Remove */}
                    <div style={{ paddingTop: "20px" }}>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        title="Remove"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "4px 0" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button type="button" className="df-btn df-btn-ghost" style={{ width: "100%" }} onClick={add}>
                <Plus size={14} /> Add another drug
              </button>
            </div>

            {/* Validation summary banner */}
            {submitAttempted && hasErrors && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginTop: "14px", padding: "10px 14px",
                background: "rgba(248,113,113,0.10)",
                border: "1px solid rgba(248,113,113,0.35)",
                borderRadius: "8px", color: "var(--danger)", fontSize: "13px",
              }}>
                <AlertCircle size={15} />
                Please fill in all required fields — <strong>Drug name</strong> and <strong>Dosage</strong> are mandatory.
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px", flexWrap: "wrap" }}>
              <button className="df-btn df-btn-ghost" onClick={() => setOpen(false)}>Close</button>
              <button className="df-btn" onClick={generate} data-testid="generate-rx-pdf">
                Generate Prescription PDF
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
