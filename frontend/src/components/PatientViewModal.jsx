import React, { useEffect, useState } from "react";
import { X, Edit3, Phone, Mail, MapPin, Briefcase, Heart, Calendar, User, FileText, Image as ImgIcon } from "lucide-react";
import { api, formatErr } from "@/lib/api";
import { calcAge, fmtDate, fullName, inr } from "@/lib/format";
import { conditionLabel, normalizeTeethRecords } from "@/components/odontogram/toothConfig";
import { toast } from "sonner";
import SecureImage from "@/components/SecureImage";

function InfoRow({ label, value, icon: Icon }) {
  if (!value && value !== 0) return null;
  return (
    <div className="pvm-info-row">
      {Icon && <Icon size={15} className="pvm-info-icon" />}
      <span className="pvm-info-label">{label} :</span>
      <span className="pvm-info-value">{value}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="pvm-section-title">
      <h2>{children}</h2>
      <div className="pvm-section-underline" />
    </div>
  );
}

function SubInfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="pvm-sub-info-row">
      <span className="pvm-info-label">{label} :</span>
      <span className="pvm-info-value">{value}</span>
    </div>
  );
}

function ImageGallery({ images, title, patientId }) {
  const [lightbox, setLightbox] = useState(null);

  if (!images || images.length === 0) return null;

  return (
    <div className="pvm-gallery">
      <h3 className="pvm-gallery-title">{title}</h3>
      <div className="pvm-gallery-grid">
        {images.map((img) => (
          <div key={img.id} className="pvm-gallery-item" onClick={() => setLightbox(img)}>
            <SecureImage patientId={patientId} file={img.file || img.data} variant="thumb" alt={img.name || title} />
            <div className="pvm-gallery-name">{img.name}</div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="pvm-lightbox" onClick={() => setLightbox(null)}>
          <button className="pvm-lightbox-close" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
          <SecureImage patientId={patientId} file={lightbox.file || lightbox.data} variant="display" alt={lightbox.name || ""} onClick={(e) => e.stopPropagation()} />
          {lightbox.name && <div className="pvm-lightbox-caption">{lightbox.name}</div>}
        </div>
      )}
    </div>
  );
}

export default function PatientViewModal({ patientId, onClose, onEdit }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    api.get(`/patients/${patientId}`)
      .then((r) => setPatient(r.data))
      .catch((e) => { toast.error(formatErr(e)); onClose(); })
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (loading || !patient) {
    return (
      <div className="pvm-overlay" onClick={onClose}>
        <div className="pvm-container" onClick={(e) => e.stopPropagation()}>
          <div className="pvm-loading">
            <div className="pvm-loading-spinner" />
            <span>Loading patient details…</span>
          </div>
        </div>
      </div>
    );
  }

  const g = patient.general || {};
  const m = patient.medical || {};
  const o = patient.oral_exam || {};
  const name = fullName(patient);
  const age = calcAge(g.dob);
  const visits = patient.visits || [];
  const clinicalPhotos = patient.clinical_photos || [];
  const radiographs = patient.radiographs || [];
  const documents = patient.documents || [];
  const odontogram = patient.odontogram || {};
  const teethEntries = normalizeTeethRecords(odontogram).filter((record) => record.condition !== "HEALTHY");

  const totals = visits.reduce(
    (acc, v) => ({
      count: acc.count + 1,
      charged: acc.charged + (+v.total || 0),
      paid: acc.paid + (+v.paid || 0),
    }),
    { count: 0, charged: 0, paid: 0 }
  );
  totals.due = Math.max(totals.charged - totals.paid, 0);

  return (
    <div className="pvm-overlay" onClick={onClose} data-testid="patient-view-modal">
      <div className="pvm-container" onClick={(e) => e.stopPropagation()}>
        {/* Watermark Background */}
        <div className="pvm-watermark" />

        {/* Fixed header with patient name and close button */}
        <div className="pvm-header">
          <h1 className="pvm-patient-name">{name}</h1>
          <button className="pvm-close-btn" onClick={onClose} data-testid="pvm-close-btn" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="pvm-scroll">

          {/* General Info + Photo */}
          <div className="pvm-general-section">
            <div className="pvm-general-info">
              <SectionTitle>General Info:</SectionTitle>

              <InfoRow label="Full Name" value={name} icon={User} />
              <InfoRow label="Last Name" value={g.last_name} />
              <InfoRow label="Age" value={age !== "" ? `${age}` : null} />
              <InfoRow label="Date of Birth" value={fmtDate(g.dob)} icon={Calendar} />
              <InfoRow label="Gender" value={g.gender} icon={User} />
              <InfoRow label="Mobile Number" value={g.mobile} icon={Phone} />
              <InfoRow label="Email" value={g.email} icon={Mail} />
              <InfoRow label="Occupation" value={g.occupation} icon={Briefcase} />
              <InfoRow label="Marital Status" value={g.marital} icon={Heart} />
              <InfoRow label="Referred By" value={g.referred_by} />

              {(g.address || g.area || g.city || g.state || g.pincode) && (
                <div className="pvm-address-block">
                  <div className="pvm-info-row" style={{ marginBottom: 6 }}>
                    <MapPin size={15} className="pvm-info-icon" />
                    <span className="pvm-info-label">Address :</span>
                  </div>
                  <div className="pvm-address-details">
                    <SubInfoRow label="Full Address" value={g.address} />
                    <SubInfoRow label="Area/Street" value={g.area} />
                    <SubInfoRow label="City" value={g.city} />
                    <SubInfoRow label="State" value={g.state} />
                    <SubInfoRow label="Pin Code" value={g.pincode} />
                  </div>
                </div>
              )}
            </div>

            {/* Patient Photo */}
            <div className="pvm-photo-section">
              {patient.photo ? (
                <SecureImage patientId={patient.id} file={patient.photo} variant="display" alt={name} className="pvm-patient-photo" />
              ) : (
                <div className="pvm-photo-placeholder flex items-center justify-center bg-[var(--teal-light)] rounded-md border border-[var(--border)] w-full h-full">
                  <User size={64} className="text-[var(--teal)] opacity-60" />
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="pvm-divider" />

          {/* Medical Info */}
          <div className="pvm-section">
            <SectionTitle>Medical Info:</SectionTitle>

            {m.diseases && m.diseases.length > 0 && (
              <div className="pvm-subsection">
                <h3 className="pvm-subsection-title">Pre-existing Diseases</h3>
                <div className="pvm-chip-list">
                  {m.diseases.map((d) => (
                    <span key={d} className="pvm-chip">{d}</span>
                  ))}
                </div>
                {m.diseases.includes("Other") && m.other_disease && (
                  <InfoRow label="Other Disease" value={m.other_disease} />
                )}
              </div>
            )}

            {m.medications && m.medications.length > 0 && (
              <div className="pvm-subsection">
                <h3 className="pvm-subsection-title">Current Medications</h3>
                <div className="pvm-table-wrapper">
                  <table className="pvm-table">
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.medications.map((med, i) => (
                        <tr key={i}>
                          <td>{med.name || "—"}</td>
                          <td>{med.dosage || "—"}</td>
                          <td>{med.frequency || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {m.notes && <InfoRow label="Important Notes" value={m.notes} />}

            {(!m.diseases?.length && !m.medications?.length && !m.notes) && (
              <p className="pvm-empty-text">No medical information recorded.</p>
            )}
          </div>

          {/* Divider */}
          <div className="pvm-divider" />

          {/* Oral Examination */}
          <div className="pvm-section">
            <SectionTitle>Oral Examination:</SectionTitle>

            {o.complaint && <InfoRow label="Chief Complaint" value={o.complaint} />}

            {Object.keys(o.tissues || {}).length > 0 && (
              <div className="pvm-subsection">
                <h3 className="pvm-subsection-title">Soft Tissue Examination</h3>
                <div className="pvm-tissue-list">
                  {Object.entries(o.tissues).map(([tissue, status]) => (
                    <div key={tissue} className="pvm-tissue-row">
                      <span className="pvm-tissue-name">{tissue}</span>
                      <span className={`pvm-tissue-status pvm-tissue-${status}`}>
                        {status === "healthy" ? "Healthy" : status === "attention" ? "Needs Attention" : "Severe"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {o.conditions && o.conditions.length > 0 && (
              <div className="pvm-subsection">
                <h3 className="pvm-subsection-title">Oral Conditions & Diseases</h3>
                <div className="pvm-chip-list">
                  {o.conditions.map((c) => (
                    <span key={c} className="pvm-chip">{c}</span>
                  ))}
                </div>
                {o.conditions.includes("Other") && o.other_condition && (
                  <InfoRow label="Other Condition" value={o.other_condition} />
                )}
              </div>
            )}

            <InfoRow label="Oral Hygiene" value={o.hygiene} />
            <InfoRow label="Occlusion Class" value={o.occlusion} />
            {o.notes && <InfoRow label="Clinical Notes" value={o.notes} />}

            {(!o.complaint && !Object.keys(o.tissues || {}).length && !o.conditions?.length && !o.notes) && (
              <p className="pvm-empty-text">No oral examination recorded.</p>
            )}
          </div>

          {/* Divider */}
          <div className="pvm-divider" />

          {/* Visits & Payments */}
          <div className="pvm-section">
            <SectionTitle>Visits & Payments:</SectionTitle>

            {visits.length > 0 ? (
              <>
                <div className="pvm-totals-grid">
                  <div className="pvm-total-item">
                    <div className="pvm-total-label">Total Visits</div>
                    <div className="pvm-total-value">{totals.count}</div>
                  </div>
                  <div className="pvm-total-item">
                    <div className="pvm-total-label">Total Charged</div>
                    <div className="pvm-total-value">{inr(totals.charged)}</div>
                  </div>
                  <div className="pvm-total-item">
                    <div className="pvm-total-label">Total Paid</div>
                    <div className="pvm-total-value pvm-text-success">{inr(totals.paid)}</div>
                  </div>
                  <div className="pvm-total-item">
                    <div className="pvm-total-label">Total Due</div>
                    <div className={`pvm-total-value ${totals.due > 0 ? "pvm-text-danger" : ""}`}>
                      {inr(totals.due)}
                    </div>
                  </div>
                </div>

                <div className="pvm-visits-list">
                  {visits.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((v) => {
                    const due = Math.max((+v.total || 0) - (+v.paid || 0), 0);
                    return (
                      <div key={v.id} className="pvm-visit-card">
                        <div className="pvm-visit-header">
                          <div>
                            <div className="pvm-visit-date">{fmtDate(v.date)}</div>
                            <div className="pvm-visit-treatment">{v.treatment}</div>
                            {v.teeth && <div className="pvm-visit-teeth">Teeth: {v.teeth}</div>}
                          </div>
                          <div className="pvm-visit-amounts">
                            <div>Charged: <strong>{inr(v.total)}</strong></div>
                            <div className="pvm-text-success">Paid: {inr(v.paid)}</div>
                            {due > 0 && <div className="pvm-text-danger">Due: {inr(due)}</div>}
                          </div>
                        </div>
                        {v.complaint && <div className="pvm-visit-note">{v.complaint}</div>}
                        {v.notes && <div className="pvm-visit-note">{v.notes}</div>}
                        {v.followup_date && (
                          <div className="pvm-visit-followup">
                            Follow-up: {fmtDate(v.followup_date)}
                            {v.followup_treatment_plan && ` — ${v.followup_treatment_plan}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="pvm-empty-text">No visits recorded yet.</p>
            )}
          </div>

          {/* Divider */}
          <div className="pvm-divider" />

          {/* Clinical Photos & Radiographs */}
          <div className="pvm-section">
            <SectionTitle>Images & Radiographs:</SectionTitle>
            <ImageGallery images={clinicalPhotos} title="Clinical Photos" patientId={patient.id} />
            <ImageGallery images={radiographs} title="Radiographs" patientId={patient.id} />
            {clinicalPhotos.length === 0 && radiographs.length === 0 && (
              <p className="pvm-empty-text">No images or radiographs uploaded.</p>
            )}
          </div>

          {/* Divider */}
          <div className="pvm-divider" />

          {/* Documents */}
          <div className="pvm-section">
            <SectionTitle>Documents:</SectionTitle>
            {documents.length > 0 ? (
              <div className="pvm-docs-list">
                {documents.map((d) => (
                  <div key={d.id} className="pvm-doc-item">
                    <FileText size={16} className="pvm-doc-icon" />
                    <div className="pvm-doc-info">
                      <div className="pvm-doc-name">{d.name}</div>
                      <div className="pvm-doc-meta">{d.category} · {fmtDate(d.uploaded_at)}</div>
                    </div>
                    <span className="pvm-doc-type-badge">
                      {(d.type || "").includes("pdf") ? "PDF" : (d.type || "").includes("image") ? "IMAGE" : "DOC"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pvm-empty-text">No documents uploaded.</p>
            )}

            {/* Signature */}
            {patient.signature && (
              <div className="pvm-subsection">
                <h3 className="pvm-subsection-title">Digital Signature</h3>
                <div className="pvm-signature-container">
                  <img src={patient.signature} alt="Patient Signature" className="pvm-signature-img" />
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="pvm-divider" />

          {/* Tooth Chart Summary */}
          <div className="pvm-section">
            <SectionTitle>Tooth Chart:</SectionTitle>
            {teethEntries.length > 0 ? (
              <div className="pvm-tooth-summary">
                {teethEntries.map(({ tooth, condition }) => {
                  return (
                    <div key={tooth} className="pvm-tooth-item">
                      <span className="pvm-tooth-number">Tooth #{tooth}</span>
                      <div className="pvm-tooth-conditions">
                        <span className="pvm-tooth-condition-chip capitalize">
                          {conditionLabel(condition)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="pvm-empty-text">No tooth chart data recorded.</p>
            )}
          </div>

          {/* Bottom spacer for the fixed edit button */}
          <div style={{ height: 80 }} />
        </div>

        {/* Fixed Edit Info button at bottom-right */}
        <button
          className="pvm-edit-btn"
          onClick={() => onEdit(patientId)}
          data-testid="pvm-edit-info-btn"
        >
          <Edit3 size={16} />
          Edit Info
        </button>
      </div>
    </div>
  );
}
