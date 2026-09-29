from dotenv import load_dotenv
from pathlib import Path
import asyncio
import urllib.request
import sys

ROOT_DIR = Path(__file__).parent
# In Docker/HF Spaces, env vars come from the container environment (HF Secrets).
# The .env file only exists for local development.
env_path = ROOT_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path, override=False)

import os
import uuid
import logging
import bcrypt
import jwt
import certifi
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import cloudinary
import cloudinary.uploader

# ─── Setup ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dentaflow")

mongo_url = os.environ["MONGO_URL"]
if "mongodb+srv" in mongo_url or "ssl=true" in mongo_url.lower() or "tls=true" in mongo_url.lower():
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL_HOURS = 24

# Configure Cloudinary
cloudinary_cloud = os.environ.get("CLOUDINARY_CLOUD_NAME")
cloudinary_key = os.environ.get("CLOUDINARY_API_KEY")
cloudinary_secret = os.environ.get("CLOUDINARY_API_SECRET")

if (not cloudinary_cloud or not cloudinary_key or not cloudinary_secret or
    "<your_api_key>" in cloudinary_key or "your_api_key" in cloudinary_key):
    logger.warning("Cloudinary credentials are not fully configured in backend/.env. Uploads will fail until you configure them.")
else:
    cloudinary.config(
        cloud_name=cloudinary_cloud,
        api_key=cloudinary_key,
        api_secret=cloudinary_secret,
        secure=True
    )

app = FastAPI(title="DentaFlow API")
api = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

# ─── Helpers ────────────────────────────────────────────────────────────────
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(
    request: Request,
    cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    token = cred.credentials if cred else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    # update session last_seen
    await db.sessions.update_one(
        {"token": token},
        {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
    )
    user["_token"] = token
    return user

def require_doctor(user=Depends(get_current_user)):
    if user.get("role") not in {"doctor", "admin"}:
        raise HTTPException(403, "Doctor or administrator access required")
    return user

def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Administrator access required")
    return user

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ─── Models ─────────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str

class ManagedUserIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role: Literal["doctor", "staff", "admin"]
    password: str = Field(min_length=8, max_length=128)

class ManagedUserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[Literal["doctor", "staff", "admin"]] = None
    # Passwords are write-only and are never returned by the API.
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)

class LoginOut(BaseModel):
    token: str
    user: UserOut

class PatientIn(BaseModel):
    general: Dict[str, Any] = Field(default_factory=dict)
    medical: Dict[str, Any] = Field(default_factory=dict)
    oral_exam: Dict[str, Any] = Field(default_factory=dict)
    photo: Optional[str] = None  # base64
    signature: Optional[str] = None
    odontogram: Dict[str, Any] = Field(default_factory=dict)
    visits: List[Dict[str, Any]] = Field(default_factory=list)
    clinical_photos: List[Dict[str, Any]] = Field(default_factory=list)
    radiographs: List[Dict[str, Any]] = Field(default_factory=list)
    documents: List[Dict[str, Any]] = Field(default_factory=list)

class TreatmentIn(BaseModel):
    name: str
    fee: float = 0
    lab_cost: float = 0
    category: str = "Restorative"

# ─── Auth Endpoints ─────────────────────────────────────────────────────────
@api.post("/auth/login", response_model=LoginOut)
async def login(body: LoginIn, request: Request):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"], user["email"], user["role"])
    await db.sessions.insert_one({
        "token": token,
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", ""),
        "login_time": now_iso(),
        "last_seen": now_iso(),
    })
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
    }

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}

@api.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    await db.sessions.delete_one({"token": user["_token"]})
    return {"ok": True}

@api.get("/auth/active-sessions")
async def active_sessions(user=Depends(require_doctor)):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    sessions = await db.sessions.find(
        {"last_seen": {"$gte": cutoff}}, {"_id": 0, "token": 0}
    ).to_list(100)
    return sessions

# ─── Administrator account management ──────────────────────────────────────
@api.get("/admin/users")
async def list_users(user=Depends(require_admin)):
    """Return account metadata only; password hashes are intentionally excluded."""
    return await db.users.find(
        {}, {"_id": 0, "password_hash": 0}
    ).sort("created_at", 1).to_list(1000)

@api.post("/admin/users", response_model=UserOut, status_code=201)
async def create_user(body: ManagedUserIn, user=Depends(require_admin)):
    email = str(body.email).lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    account = {
        "id": str(uuid.uuid4()), "name": body.name.strip(), "email": email,
        "role": body.role, "password_hash": hash_pw(body.password),
        "created_at": now_iso(), "created_by": user["email"],
    }
    await db.users.insert_one(account)
    return {key: account[key] for key in ("id", "name", "email", "role")}

@api.put("/admin/users/{uid}", response_model=UserOut)
async def update_user(uid: str, body: ManagedUserUpdate, user=Depends(require_admin)):
    existing = await db.users.find_one({"id": uid})
    if not existing:
        raise HTTPException(404, "Account not found")
    changes = body.model_dump(exclude_none=True)
    if "email" in changes:
        changes["email"] = str(changes["email"]).lower().strip()
        duplicate = await db.users.find_one({"email": changes["email"], "id": {"$ne": uid}})
        if duplicate:
            raise HTTPException(409, "An account with this email already exists")
    if "name" in changes:
        changes["name"] = changes["name"].strip()
    if "password" in changes:
        changes["password_hash"] = hash_pw(changes.pop("password"))
    if not changes:
        raise HTTPException(400, "No account changes supplied")
    changes["updated_at"] = now_iso()
    await db.users.update_one({"id": uid}, {"$set": changes})
    # A password or role change invalidates all existing sessions for this account.
    if "password_hash" in changes or "role" in changes:
        await db.sessions.delete_many({"user_id": uid})
    updated = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return updated

# ─── Patients ───────────────────────────────────────────────────────────────
@api.post("/patients")
async def create_patient(body: PatientIn, user=Depends(get_current_user)):
    pid = str(uuid.uuid4())
    doc = body.model_dump()
    doc["id"] = pid
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["created_by"] = user["email"]
    await db.patients.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/patients")
async def list_patients(user=Depends(get_current_user)):
    patients = await db.patients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # strip heavy fields for list view
    for p in patients:
        p.pop("clinical_photos", None)
        p.pop("radiographs", None)
        p.pop("documents", None)
    return patients

@api.get("/patients/{pid}")
async def get_patient(pid: str, user=Depends(get_current_user)):
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Patient not found")
    return p

@api.put("/patients/{pid}")
async def update_patient(pid: str, body: PatientIn, user=Depends(get_current_user)):
    existing = await db.patients.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Patient not found")
    update = body.model_dump()
    update["updated_at"] = now_iso()
    await db.patients.update_one({"id": pid}, {"$set": update})
    p = await db.patients.find_one({"id": pid}, {"_id": 0})
    return p

@api.delete("/patients/{pid}")
async def delete_patient(pid: str, user=Depends(require_doctor)):
    res = await db.patients.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Patient not found")
    return {"ok": True}

# ─── File Uploads (Cloudinary) ──────────────────────────────────────────────
@api.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    try:
        # Check if configured
        if not cloudinary.config().cloud_name:
            raise HTTPException(status_code=500, detail="Cloudinary is not configured in backend/.env")
        
        # Upload using the file.file stream
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="dentaflow",
            resource_type="auto"
        )
        return {
            "url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id"),
            "type": file.content_type or upload_result.get("resource_type")
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to Cloudinary: {str(e)}")

@api.delete("/upload/{public_id:path}")
async def delete_file(
    public_id: str,
    user=Depends(get_current_user)
):
    try:
        if not cloudinary.config().cloud_name:
            raise HTTPException(status_code=500, detail="Cloudinary is not configured")
        
        # Try to delete as image first (default resource_type="image")
        res = cloudinary.uploader.destroy(public_id, invalidate=True)
        if res.get("result") != "ok":
            # If not found or failed, try as raw file (e.g. PDF/Doc)
            res = cloudinary.uploader.destroy(public_id, resource_type="raw", invalidate=True)
            
        return {"ok": True, "result": res.get("result")}
    except Exception as e:
        logger.error(f"Cloudinary destroy error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete from Cloudinary: {str(e)}")

# ─── Treatments / Price Catalog ─────────────────────────────────────────────
@api.get("/treatments")
async def list_treatments(user=Depends(get_current_user)):
    return await db.treatments.find({}, {"_id": 0}).sort("name", 1).to_list(500)

@api.post("/treatments")
async def create_treatment(body: TreatmentIn, user=Depends(require_doctor)):
    tid = str(uuid.uuid4())
    doc = body.model_dump()
    doc["id"] = tid
    doc["created_at"] = now_iso()
    await db.treatments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/treatments/{tid}")
async def update_treatment(tid: str, body: TreatmentIn, user=Depends(require_doctor)):
    await db.treatments.update_one({"id": tid}, {"$set": body.model_dump()})
    t = await db.treatments.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404)
    return t

@api.delete("/treatments/{tid}")
async def delete_treatment(tid: str, user=Depends(require_doctor)):
    await db.treatments.delete_one({"id": tid})
    return {"ok": True}

# ─── Finances ───────────────────────────────────────────────────────────────
@api.get("/finances/summary")
async def finances(user=Depends(require_doctor)):
    patients = await db.patients.find({}, {"_id": 0}).to_list(2000)
    total_rev = total_paid = total_due = lab = radio = other = 0.0
    monthly = {}  # YYYY-MM -> revenue
    visit_rows = []
    pending = []
    for p in patients:
        full_name = f"{p.get('general',{}).get('first_name','')} {p.get('general',{}).get('last_name','')}".strip()
        mobile = p.get("general", {}).get("mobile", "")
        p_due = 0.0
        last_visit = ""
        for v in p.get("visits", []):
            charged = float(v.get("total", 0) or 0)
            paid = float(v.get("paid", 0) or 0)
            due = max(charged - paid, 0)
            total_rev += charged
            total_paid += paid
            p_due += due
            lab += float(v.get("lab_cost", 0) or 0)
            radio += float(v.get("radio_cost", 0) or 0)
            other += float(v.get("other_cost", 0) or 0)
            d = v.get("date", "")[:10]
            ym = d[:7] if len(d) >= 7 else ""
            if ym:
                monthly[ym] = monthly.get(ym, 0) + charged
            if d > last_visit:
                last_visit = d
            visit_rows.append({
                "date": d,
                "patient_id": p["id"],
                "patient_name": full_name,
                "treatment": v.get("treatment", ""),
                "charged": charged,
                "paid": paid,
                "due": due,
                "lab": float(v.get("lab_cost", 0) or 0),
                "radio": float(v.get("radio_cost", 0) or 0),
            })
        total_due += p_due
        if p_due > 0:
            pending.append({
                "patient_id": p["id"],
                "patient_name": full_name,
                "mobile": mobile,
                "last_visit": last_visit,
                "amount_due": p_due,
            })
    # last 12 months
    today = datetime.now(timezone.utc)
    months = []
    for i in range(11, -1, -1):
        m = (today.replace(day=1) - timedelta(days=30 * i))
        ym = m.strftime("%Y-%m")
        months.append({"month": ym, "revenue": monthly.get(ym, 0)})
    this_month = today.strftime("%Y-%m")
    return {
        "total_revenue": total_rev,
        "total_paid": total_paid,
        "total_due": total_due,
        "this_month_revenue": monthly.get(this_month, 0),
        "lab_expenses": lab,
        "radio_expenses": radio,
        "other_expenses": other,
        "monthly": months,
        "pending": sorted(pending, key=lambda x: -x["amount_due"]),
        "visits": sorted(visit_rows, key=lambda x: x["date"], reverse=True),
    }

# ─── Follow-ups ─────────────────────────────────────────────────────────────
@api.get("/followups")
async def followups(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    in_30 = (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()
    patients = await db.patients.find({}, {"_id": 0}).to_list(2000)
    today_list, upcoming = [], []
    for p in patients:
        general = p.get("general", {})
        medical = p.get("medical", {})
        full_name = f"{general.get('first_name','')} {general.get('last_name','')}".strip()
        visits = p.get("visits", [])
        patient_due = sum(
            max(float(visit.get("total", 0) or 0) - float(visit.get("paid", 0) or 0), 0)
            for visit in visits
        )
        conditions = list(medical.get("diseases", []) or [])
        if medical.get("other_disease"):
            conditions.append(medical.get("other_disease"))
        medications = [
            " ".join(str(part) for part in [m.get("name", ""), m.get("dosage", ""), m.get("frequency", "")] if part).strip()
            for m in (medical.get("medications", []) or [])
        ]
        sorted_visits = sorted(visits, key=lambda x: x.get("date", ""), reverse=True)
        for v in visits:
            f = v.get("followup_date")
            if not f:
                continue
            previous_visits = [
                {
                    "date": pv.get("date", ""),
                    "treatment": pv.get("treatment", ""),
                    "diagnosis": pv.get("diagnosis", ""),
                    "notes": pv.get("notes", ""),
                    "teeth": pv.get("teeth", ""),
                }
                for pv in sorted_visits
                if pv.get("id") != v.get("id")
            ][:3]
            row = {
                "patient_id": p["id"],
                "visit_id": v.get("id", ""),
                "patient_name": full_name,
                "mobile": general.get("mobile", ""),
                "age": general.get("dob", ""),
                "followup_date": f,
                "treatment": v.get("treatment", ""),
                "scheduled_treatment": v.get("followup_treatment_plan", ""),
                "previous_treatment": v.get("treatment", ""),
                "previous_diagnosis": v.get("diagnosis", ""),
                "previous_notes": v.get("notes", ""),
                "teeth": v.get("teeth", ""),
                "visit_date": v.get("date", ""),
                "amount_due": patient_due,
                "medical_alerts": conditions,
                "medications": [m for m in medications if m],
                "medical_notes": medical.get("notes", ""),
                "recent_visits": previous_visits,
            }
            if f <= today:
                today_list.append(row)
            elif f <= in_30:
                upcoming.append(row)
    return {
        "today": sorted(today_list, key=lambda x: x["followup_date"]),
        "upcoming": sorted(upcoming, key=lambda x: x["followup_date"]),
    }

# ─── Dashboard ──────────────────────────────────────────────────────────────
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    month_start = today[:7]
    patients = await db.patients.find({}, {"_id": 0}).to_list(2000)
    total_patients = len(patients)
    new_this_month = sum(1 for p in patients if p.get("created_at", "")[:7] == month_start)
    todays_visits = 0
    total_due = total_rev_month = 0.0
    today_followups = []
    for p in patients:
        for v in p.get("visits", []):
            charged = float(v.get("total", 0) or 0)
            paid = float(v.get("paid", 0) or 0)
            total_due += max(charged - paid, 0)
            d = v.get("date", "")[:10]
            if d == today:
                todays_visits += 1
            if d[:7] == month_start:
                total_rev_month += charged
            if v.get("followup_date") and v["followup_date"] <= today:
                today_followups.append({
                    "patient_id": p["id"],
                    "patient_name": f"{p.get('general',{}).get('first_name','')} {p.get('general',{}).get('last_name','')}".strip(),
                    "mobile": p.get("general", {}).get("mobile", ""),
                    "followup_date": v["followup_date"],
                    "scheduled_treatment": v.get("followup_treatment_plan", ""),
                })
    recent = sorted(patients, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    recent_out = [{
        "id": p["id"],
        "first_name": p.get("general", {}).get("first_name", ""),
        "last_name": p.get("general", {}).get("last_name", ""),
        "mobile": p.get("general", {}).get("mobile", ""),
        "created_at": p.get("created_at", ""),
    } for p in recent]
    return {
        "total_patients": total_patients,
        "new_this_month": new_this_month,
        "todays_visits": todays_visits,
        "total_revenue_month": total_rev_month,
        "total_due": total_due,
        "recent_patients": recent_out,
        "today_followups": today_followups,
    }

@api.get("/")
async def root():
    return {"app": "DentaFlow", "status": "ok"}

# ─── Seeding ────────────────────────────────────────────────────────────────
DEMO_TREATMENTS = [
    {"name": "Consultation", "fee": 500, "lab_cost": 0, "category": "Diagnostic"},
    {"name": "Scaling & Polishing", "fee": 1500, "lab_cost": 0, "category": "Restorative"},
    {"name": "Composite Filling", "fee": 2500, "lab_cost": 0, "category": "Restorative"},
    {"name": "Root Canal Treatment", "fee": 6500, "lab_cost": 0, "category": "Restorative"},
    {"name": "Tooth Extraction", "fee": 1800, "lab_cost": 0, "category": "Surgical"},
    {"name": "Crown - Zirconia", "fee": 12000, "lab_cost": 4500, "category": "Restorative"},
    {"name": "Implant", "fee": 38000, "lab_cost": 12000, "category": "Surgical"},
    {"name": "Whitening", "fee": 8000, "lab_cost": 0, "category": "Cosmetic"},
    {"name": "Orthodontic Adjustment", "fee": 1200, "lab_cost": 0, "category": "Orthodontic"},
    {"name": "Radiology / X-Ray", "fee": 400, "lab_cost": 0, "category": "Diagnostic"},
]

DEMO_PATIENTS = [
    {
        "general": {"first_name": "Ananya", "last_name": "Sharma", "dob": "1992-03-14", "mobile": "+919812345601",
                    "email": "ananya.sharma@example.com", "gender": "Female", "marital": "Married",
                    "referred_by": "Google", "occupation": "Software Engineer", "address": "Flat 4B, Lotus Apartments",
                    "area": "Indiranagar", "city": "Bangalore", "state": "Karnataka", "pincode": "560038"},
        "medical": {"diseases": ["Hypertension"], "medications": [{"name": "Amlodipine", "dosage": "5mg", "frequency": "Once daily"}],
                    "notes": "Allergic to Penicillin."},
        "visits": [
            {"id": str(uuid.uuid4()), "date": "2025-12-04", "complaint": "Tooth pain in lower right molar",
             "diagnosis": "Deep cavity in 46", "treatment": "Root Canal Treatment", "notes": "Anaesthesia given. RCT initiated.",
             "teeth": "46", "fee": 6500, "lab_cost": 0, "radio_cost": 400, "other_cost": 0,
             "total": 6900, "paid": 4000, "followup_date": "2026-02-15"},
        ],
    },
    {
        "general": {"first_name": "Rohan", "last_name": "Verma", "dob": "1985-07-22", "mobile": "+919876541234",
                    "email": "rohan.v@example.com", "gender": "Male", "marital": "Single",
                    "referred_by": "Friend or Family", "occupation": "Architect", "address": "12 Banjara Hills",
                    "area": "Road No 3", "city": "Hyderabad", "state": "Telangana", "pincode": "500034"},
        "medical": {"diseases": [], "medications": [], "notes": ""},
        "visits": [
            {"id": str(uuid.uuid4()), "date": "2026-01-10", "complaint": "Routine cleaning",
             "diagnosis": "Mild plaque buildup", "treatment": "Scaling & Polishing", "notes": "Recommended 6-month recall.",
             "teeth": "", "fee": 1500, "lab_cost": 0, "radio_cost": 0, "other_cost": 0,
             "total": 1500, "paid": 1500, "followup_date": "2026-07-10"},
        ],
    },
    {
        "general": {"first_name": "Priya", "last_name": "Iyer", "dob": "1998-11-02", "mobile": "+919900112233",
                    "email": "priya.iyer@example.com", "gender": "Female", "marital": "Single",
                    "referred_by": "Walk-in", "occupation": "Designer", "address": "22 Lavelle Road",
                    "area": "Lavelle Road", "city": "Bangalore", "state": "Karnataka", "pincode": "560001"},
        "medical": {"diseases": [], "medications": [], "notes": ""},
        "visits": [
            {"id": str(uuid.uuid4()), "date": "2026-02-01", "complaint": "Whitening consultation",
             "diagnosis": "Mild staining", "treatment": "Whitening", "notes": "In-office whitening completed.",
             "teeth": "", "fee": 8000, "lab_cost": 0, "radio_cost": 0, "other_cost": 200,
             "total": 8200, "paid": 5000, "followup_date": "2026-02-25"},
        ],
    },
    {
        "general": {"first_name": "Arjun", "last_name": "Kapoor", "dob": "1976-05-30", "mobile": "+919812000044",
                    "email": "arjun.k@example.com", "gender": "Male", "marital": "Married",
                    "referred_by": "Doctor Referral", "occupation": "Banker", "address": "Sector 14",
                    "area": "Sector 14", "city": "Gurgaon", "state": "Haryana", "pincode": "122001"},
        "medical": {"diseases": ["Diabetes"], "medications": [{"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"}],
                    "notes": "Diabetic — monitor healing carefully."},
        "visits": [
            {"id": str(uuid.uuid4()), "date": "2025-11-19", "complaint": "Missing tooth replacement",
             "diagnosis": "Missing 36", "treatment": "Implant", "notes": "Implant placed. Healing 3 months.",
             "teeth": "36", "fee": 38000, "lab_cost": 12000, "radio_cost": 800, "other_cost": 0,
             "total": 50800, "paid": 30000, "followup_date": "2026-02-10"},
        ],
    },
    {
        "general": {"first_name": "Meera", "last_name": "Nair", "dob": "2001-09-12", "mobile": "+919833445566",
                    "email": "meera.nair@example.com", "gender": "Female", "marital": "Single",
                    "referred_by": "Social Media", "occupation": "Student", "address": "Marine Drive",
                    "area": "Marine Drive", "city": "Mumbai", "state": "Maharashtra", "pincode": "400020"},
        "medical": {"diseases": [], "medications": [], "notes": ""},
        "visits": [
            {"id": str(uuid.uuid4()), "date": "2026-01-28", "complaint": "Front tooth chip",
             "diagnosis": "Class IV fracture on 11", "treatment": "Composite Filling", "notes": "Restored aesthetically.",
             "teeth": "11", "fee": 2500, "lab_cost": 0, "radio_cost": 0, "other_cost": 0,
             "total": 2500, "paid": 2500, "followup_date": None},
        ],
    },
]

async def seed_user(email: str, password: str, name: str, role: str):
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_pw(password),
            "name": name,
            "role": role,
            "created_at": now_iso(),
        })
    else:
        update_fields = {"name": name, "role": role}
        await db.users.update_one(
            {"email": email}, {"$set": update_fields}
        )

async def seed():
    await db.users.create_index("email", unique=True)
    await db.patients.create_index("id", unique=True)
    await seed_user(os.environ["DOCTOR_EMAIL"], os.environ["DOCTOR_PASSWORD"], "Dr. Naveen Shamanur", "doctor")
    await seed_user(os.environ["STAFF_EMAIL"], os.environ["STAFF_PASSWORD"], "Kavita Reddy", "staff")
    await seed_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "Clinic Administrator", "admin")
    if await db.treatments.count_documents({}) == 0:
        for t in DEMO_TREATMENTS:
            await db.treatments.insert_one({"id": str(uuid.uuid4()), "created_at": now_iso(), **t})
    if await db.patients.count_documents({}) == 0:
        for p in DEMO_PATIENTS:
            doc = {
                "id": str(uuid.uuid4()),
                "general": p["general"],
                "medical": p.get("medical", {}),
                "oral_exam": {},
                "photo": None,
                "signature": None,
                "odontogram": {"teeth": {}, "history": []},
                "visits": p.get("visits", []),
                "clinical_photos": [],
                "radiographs": [],
                "documents": [],
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "created_by": "system",
            }
            await db.patients.insert_one(doc)
    logger.info("Seed complete")

def ping_url(url: str):
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'DentaFlow-KeepAlive'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, None
    except Exception as e:
        return None, str(e)

async def keep_alive_loop():
    # Wait 30 seconds after startup to let the server fully initialize
    await asyncio.sleep(30)
    
    self_ping_url = os.environ.get("SELF_PING_URL")
    render_url = os.environ.get("RENDER_EXTERNAL_URL")
    railway_url = os.environ.get("RAILWAY_STATIC_URL")
    
    if self_ping_url:
        target = self_ping_url
    elif render_url:
        target = render_url if render_url.startswith("http") else f"https://{render_url}"
    elif railway_url:
        target = railway_url if railway_url.startswith("http") else f"https://{railway_url}"
    else:
        # Fallback: ping Google to generate outbound traffic
        target = "https://www.google.com"
        
    logger.info(f"Keep-alive system started. Target URL: {target}")
    
    while True:
        try:
            if sys.version_info >= (3, 9):
                status, err = await asyncio.to_thread(ping_url, target)
            else:
                loop = asyncio.get_running_loop()
                status, err = await loop.run_in_executor(None, ping_url, target)
                
            if status:
                logger.info(f"Keep-alive ping to {target} succeeded (status: {status})")
            else:
                logger.warning(f"Keep-alive ping to {target} failed: {err}")
        except Exception as e:
            logger.error(f"Keep-alive loop error: {e}")
            
        # Sleep for 9 minutes (540 seconds)
        await asyncio.sleep(540)

@app.on_event("startup")
async def startup():
    await seed()
    asyncio.create_task(keep_alive_loop())

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)
cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
cors_origins = [o.strip() for o in cors_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Frontend static files (HTML/JS/CSS) & Single Page App client routing
FRONTEND_BUILD = ROOT_DIR.parent / "frontend" / "build"

@app.get("/{catchall:path}")
async def serve_frontend(catchall: str):
    # Check if the requested path corresponds to a static file in the build directory
    file_path = FRONTEND_BUILD / catchall
    if catchall and file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    
    # Fallback to index.html for React router paths
    index_path = FRONTEND_BUILD / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    
    return {"message": "Frontend build not found. Please run 'npm run build' inside the frontend directory."}
