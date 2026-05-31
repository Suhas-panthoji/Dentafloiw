# DentaFlow — Dental Clinic Practice Management

## Original Problem Statement
Build a full-stack dental clinic practice management web app ("DentaFlow") — a modern, beautiful, feature-complete replacement for CUSP dental software. Two roles (doctor/staff), 7-tab patient profile, full FDI odontogram, finances, plus 3 bonus features (Price Catalog, Follow-ups, Prescription Writer). Indian ₹, FDI tooth numbering.

## User Choices (2026-02)
- Persistence: MongoDB + FastAPI backend
- Auth: Custom JWT (bcrypt, Bearer token in localStorage)
- File storage: base64 inline in MongoDB
- Scope: build core + bonus features in one pass
- Demo data: imaginary seed data (5 patients, 10 treatments)

## Theme Update (2026-05)
- Converted entire UI to a **dark theme** (deep slate background `#0B1117`, teal accent `#14B8B8`)
- Sidebar retains teal gradient as signature surface
- Shadcn HSL tokens updated for dark mode; recharts axes & tooltips themed

## Architecture
- **Backend** (`/app/backend/server.py`)
  - Endpoints under `/api`: `auth/{login,me,logout,active-sessions}`, `patients` CRUD, `treatments` CRUD, `dashboard`, `finances/summary`, `followups`
  - Collections: `users`, `sessions`, `patients` (visits/photos/docs embedded), `treatments`
  - Seed on startup: 2 users (doctor/staff), 10 treatments, 5 patients
- **Frontend** (`/app/frontend/src`)
  - `lib/{api,auth,format}` — axios + AuthContext + helpers
  - `components/{Layout,Odontogram,ToothSelector,VisitForm,SignaturePad,PrescriptionWriter}`
  - `pages/{LoginPage,DashboardPage,PatientsListPage,PatientFormPage,FinancesPage,PriceCatalogPage,FollowUpsPage,SettingsPage}`

## Implemented (✅)
- JWT auth with doctor/staff roles & active-sessions list (doctor only)
- Dashboard: stats, quick actions, recent patients, today's follow-ups
- Patients list: search, filters, pagination, delete (doctor only)
- 7-tab patient profile: General Info (photo capture/upload), Medical Info (chips + meds list), Oral Examination (tissue table + chips + hygiene/occlusion + notes), Visits & Payments (inline form, mini odontogram, auto-calc totals), Images (Clinical + Radiographs albums), Documents (signature pad + categorized files), full FDI Odontogram with 5 surfaces per tooth and 12 conditions
- Finances: bar/pie/line charts, pending dues table, visit history (doctor only)
- Price Catalog: CRUD (doctor only) — auto-fills visit fees
- Follow-up Calendar: today + upcoming 30 days
- Prescription Writer with jsPDF export
- Role badge in header, doctor-only routes protected
- Indian ₹, FDI numbering, age auto-calc, due auto-calc, confirmation modals, sonner toasts, empty states

## Credentials
- Doctor: `doctor@clinic.com` / `doctor123`
- Staff:  `staff@clinic.com`  / `staff123`

## Backlog / Next
- P1: Persist visits/odontogram changes incrementally rather than per-patient-save
- P1: Export Odontogram as PDF (button placeholder exists)
- P2: Camera capture polish (live preview modal vs auto-snap)
- P2: Recurring appointment slot booking + SMS reminders
- P2: Multi-clinic / multi-doctor support
