"""DentaFlow backend API regression tests."""
import os
import pytest
import requests

from pathlib import Path

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api" if "REACT_APP_BACKEND_URL" in os.environ else None
if not BASE:
    # fall back to frontend .env
    env_path = Path("/app/frontend/.env")
    if not env_path.exists():
        env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE = line.split("=", 1)[1].strip().rstrip("/") + "/api"

DOCTOR = {"email": "doctor@clinic.com", "password": "doctor123"}
STAFF = {"email": "staff@clinic.com", "password": "staff123"}


@pytest.fixture(scope="session")
def doctor_token():
    r = requests.post(f"{BASE}/auth/login", json=DOCTOR, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def staff_token():
    r = requests.post(f"{BASE}/auth/login", json=STAFF, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ── Auth ───────────────────────────────────────────────────────────────────
def test_login_doctor():
    r = requests.post(f"{BASE}/auth/login", json=DOCTOR, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["user"]["role"] == "doctor"
    assert d["token"]


def test_login_staff():
    r = requests.post(f"{BASE}/auth/login", json=STAFF, timeout=20)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "staff"


def test_login_wrong():
    r = requests.post(f"{BASE}/auth/login", json={"email": "doctor@clinic.com", "password": "bad"}, timeout=20)
    assert r.status_code == 401


def test_me(doctor_token):
    r = requests.get(f"{BASE}/auth/me", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    assert r.json()["email"] == DOCTOR["email"]


def test_me_no_token():
    r = requests.get(f"{BASE}/auth/me", timeout=20)
    assert r.status_code == 401


# ── Dashboard ───────────────────────────────────────────────────────────────
def test_dashboard(doctor_token):
    r = requests.get(f"{BASE}/dashboard", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_patients", "todays_visits", "total_revenue_month", "total_due", "recent_patients", "today_followups"]:
        assert k in d
    assert d["total_patients"] >= 5


# ── Patients ───────────────────────────────────────────────────────────────
def test_list_patients(doctor_token):
    r = requests.get(f"{BASE}/patients", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    names = [p["general"]["first_name"] for p in r.json()]
    for n in ["Ananya", "Rohan", "Priya", "Arjun", "Meera"]:
        assert n in names


def test_get_patient_full(doctor_token):
    plist = requests.get(f"{BASE}/patients", headers=H(doctor_token), timeout=20).json()
    pid = plist[0]["id"]
    r = requests.get(f"{BASE}/patients/{pid}", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    p = r.json()
    assert "visits" in p and "odontogram" in p


def test_create_update_delete_patient(doctor_token, staff_token):
    payload = {"general": {"first_name": "TEST_John", "last_name": "Doe", "mobile": "+910000000000"}}
    r = requests.post(f"{BASE}/patients", json=payload, headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    pid = r.json()["id"]

    # update
    payload["general"]["last_name"] = "Updated"
    r2 = requests.put(f"{BASE}/patients/{pid}", json=payload, headers=H(doctor_token), timeout=20)
    assert r2.status_code == 200
    assert r2.json()["general"]["last_name"] == "Updated"

    # staff cannot delete
    r3 = requests.delete(f"{BASE}/patients/{pid}", headers=H(staff_token), timeout=20)
    assert r3.status_code == 403

    # doctor delete
    r4 = requests.delete(f"{BASE}/patients/{pid}", headers=H(doctor_token), timeout=20)
    assert r4.status_code == 200

    r5 = requests.get(f"{BASE}/patients/{pid}", headers=H(doctor_token), timeout=20)
    assert r5.status_code == 404


# ── Treatments ─────────────────────────────────────────────────────────────
def test_treatments_list(doctor_token):
    r = requests.get(f"{BASE}/treatments", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    assert len(r.json()) >= 10


def test_treatments_staff_cannot_create(staff_token):
    r = requests.post(f"{BASE}/treatments", json={"name": "TEST_X", "fee": 1}, headers=H(staff_token), timeout=20)
    assert r.status_code == 403


def test_treatments_doctor_create_delete(doctor_token):
    r = requests.post(f"{BASE}/treatments", json={"name": "TEST_T1", "fee": 100}, headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    tid = r.json()["id"]
    r2 = requests.delete(f"{BASE}/treatments/{tid}", headers=H(doctor_token), timeout=20)
    assert r2.status_code == 200


# ── Finances ───────────────────────────────────────────────────────────────
def test_finances_doctor(doctor_token):
    r = requests.get(f"{BASE}/finances/summary", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_revenue", "monthly", "pending", "visits"]:
        assert k in d


def test_finances_staff_forbidden(staff_token):
    r = requests.get(f"{BASE}/finances/summary", headers=H(staff_token), timeout=20)
    assert r.status_code == 403


# ── Followups ──────────────────────────────────────────────────────────────
def test_followups(doctor_token):
    r = requests.get(f"{BASE}/followups", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert "today" in d and "upcoming" in d


# ── Sessions ───────────────────────────────────────────────────────────────
def test_sessions_doctor(doctor_token):
    r = requests.get(f"{BASE}/auth/active-sessions", headers=H(doctor_token), timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_sessions_staff_forbidden(staff_token):
    r = requests.get(f"{BASE}/auth/active-sessions", headers=H(staff_token), timeout=20)
    assert r.status_code == 403
