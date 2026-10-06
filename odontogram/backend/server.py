from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
import certifi
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ─── Setup ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("odontogram")

mongo_url = os.environ["MONGO_URL"]
if "mongodb+srv" in mongo_url or "ssl=true" in mongo_url.lower() or "tls=true" in mongo_url.lower():
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
else:
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ["DB_NAME"]]  # odontogram_db

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL_HOURS = 24

app = FastAPI(title="Odontogram API")
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
    await db.sessions.update_one(
        {"token": token},
        {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
    )
    user["_token"] = token
    return user

def require_doctor(user=Depends(get_current_user)):
    if user.get("role") != "doctor":
        raise HTTPException(403, "Doctor access required")
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

class LoginOut(BaseModel):
    token: str
    user: UserOut

class OdontogramIn(BaseModel):
    patient_name: str = ""
    patient_ref: Optional[str] = None          # optional external patient ID
    dentition: str = "permanent"               # permanent | deciduous | mixed
    teeth: Dict[str, Any] = Field(default_factory=dict)
    history: List[Dict[str, Any]] = Field(default_factory=list)
    notes: str = ""

class OdontogramUpdateIn(BaseModel):
    patient_name: Optional[str] = None
    dentition: Optional[str] = None
    teeth: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

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

# ─── Odontogram CRUD ────────────────────────────────────────────────────────
@api.get("/odontograms")
async def list_odontograms(user=Depends(get_current_user)):
    """List all odontogram records (strips heavy teeth data for the list view)."""
    records = await db.odontograms.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    # Return summary — strip the full history for the list
    summary = []
    for r in records:
        summary.append({
            "id": r["id"],
            "patient_name": r.get("patient_name", ""),
            "patient_ref": r.get("patient_ref"),
            "dentition": r.get("dentition", "permanent"),
            "notes": r.get("notes", ""),
            "tooth_count": len(r.get("teeth", {})),
            "history_count": len(r.get("history", [])),
            "created_at": r.get("created_at", ""),
            "updated_at": r.get("updated_at", ""),
            "created_by": r.get("created_by", ""),
        })
    return summary

@api.post("/odontograms")
async def create_odontogram(body: OdontogramIn, user=Depends(get_current_user)):
    """Create a new odontogram record."""
    oid = str(uuid.uuid4())
    doc = body.model_dump()
    doc["id"] = oid
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["created_by"] = user["email"]
    await db.odontograms.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/odontograms/{oid}")
async def get_odontogram(oid: str, user=Depends(get_current_user)):
    """Fetch a single odontogram record (full detail including teeth + history)."""
    rec = await db.odontograms.find_one({"id": oid}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Odontogram not found")
    return rec

@api.put("/odontograms/{oid}")
async def update_odontogram(oid: str, body: OdontogramUpdateIn, user=Depends(get_current_user)):
    """Update teeth data / history / notes for an odontogram record."""
    existing = await db.odontograms.find_one({"id": oid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Odontogram not found")
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = now_iso()
    await db.odontograms.update_one({"id": oid}, {"$set": update_data})
    rec = await db.odontograms.find_one({"id": oid}, {"_id": 0})
    return rec

@api.delete("/odontograms/{oid}")
async def delete_odontogram(oid: str, user=Depends(require_doctor)):
    """Delete an odontogram record (doctor only)."""
    res = await db.odontograms.delete_one({"id": oid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Odontogram not found")
    return {"ok": True}

@api.get("/")
async def root():
    return {"app": "Odontogram API", "status": "ok"}

# ─── Seeding ────────────────────────────────────────────────────────────────
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
        if not verify_pw(password, existing["password_hash"]):
            update_fields["password_hash"] = hash_pw(password)
        await db.users.update_one(
            {"email": email}, {"$set": update_fields}
        )

SAMPLE_ODONTOGRAMS = [
    {
        "patient_name": "Ananya Sharma",
        "dentition": "permanent",
        "notes": "Deep cavity on 46. RCT completed.",
        "teeth": {
            "46": {"buccal": "rct", "lingual": "rct", "mesial": "rct", "distal": "rct", "occlusal": "rct"},
            "16": {"occlusal": "filling", "buccal": "healthy", "lingual": "healthy", "mesial": "healthy", "distal": "healthy"},
            "36": {"occlusal": "cavity", "buccal": "healthy", "lingual": "healthy", "mesial": "healthy", "distal": "healthy"},
        },
        "history": [],
    },
    {
        "patient_name": "Rohan Verma",
        "dentition": "permanent",
        "notes": "Missing 36 — implant placed.",
        "teeth": {
            "36": {"occlusal": "missing", "buccal": "missing", "lingual": "missing", "mesial": "missing", "distal": "missing"},
            "37": {"occlusal": "crown", "buccal": "healthy", "lingual": "healthy", "mesial": "healthy", "distal": "healthy"},
        },
        "history": [],
    },
    {
        "patient_name": "Meera Nair",
        "dentition": "permanent",
        "notes": "Class IV fracture 11 — composite restored.",
        "teeth": {
            "11": {"buccal": "filling", "lingual": "healthy", "mesial": "filling", "distal": "healthy", "occlusal": "healthy"},
        },
        "history": [],
    },
]

async def seed():
    await db.users.create_index("email", unique=True)
    await db.odontograms.create_index("id", unique=True)
    await seed_user(os.environ["DOCTOR_EMAIL"], os.environ["DOCTOR_PASSWORD"], "Dr. Naveen Shamanur", "doctor")
    await seed_user(os.environ["STAFF_EMAIL"], os.environ["STAFF_PASSWORD"], "Staff", "staff")
    if await db.odontograms.count_documents({}) == 0:
        for sample in SAMPLE_ODONTOGRAMS:
            doc = {
                "id": str(uuid.uuid4()),
                "patient_ref": None,
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "created_by": "system",
                **sample,
            }
            await db.odontograms.insert_one(doc)
    logger.info("Odontogram seed complete — DB: %s", os.environ["DB_NAME"])

@app.on_event("startup")
async def startup():
    await seed()

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
