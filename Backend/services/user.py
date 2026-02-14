"""User (applicant) business logic."""
from __future__ import annotations

import base64
import json
from typing import Dict, List
from uuid import uuid4

from fastapi import HTTPException

try:
    from . import database
    from . import pdf_utils
except ImportError:
    import database
    import pdf_utils


# In-memory state (applications, interviews); matched jobs are mock data for now.
_applications: List[Dict] = []
_interviews: Dict[str, List[Dict]] = {}
MOCK_MATCHED_JOBS: List[Dict] = [
    {"job_id": "job-101", "title": "Backend Engineer", "company_name": "Sorttie Labs", "skills": ["python", "fastapi", "postgres"]},
    {"job_id": "job-102", "title": "ML Ranking Engineer", "company_name": "SignalMatch", "skills": ["pytorch", "recommenders", "ranking"]},
]


def create_user(user_data: Dict) -> Dict:
    email = user_data.get("email", "").strip()
    password = user_data.get("password", "")
    name = user_data.get("name", "")
    resume = user_data.get("resume", "")
    resume_pdf_base64 = user_data.get("resume_pdf_base64")
    interests = user_data.get("interests", [])
    interests_str = json.dumps(interests) if isinstance(interests, list) else str(interests)
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    resume_pdf = None
    resume_text = ""
    if resume_pdf_base64:
        try:
            pdf_bytes = base64.b64decode(resume_pdf_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid resume PDF (base64 decode failed)")
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty resume PDF")
        resume_pdf = pdf_bytes
        resume_text = pdf_utils.extract_pdf_text(pdf_bytes)
    elif resume:
        resume_text = resume

    user = database.create_user(
        email=email,
        password=password,
        name=name,
        resume=resume,
        resume_pdf=resume_pdf,
        resume_text=resume_text,
        interests=interests_str,
    )
    if user is None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    return user


def create_session(login_data: Dict) -> Dict:
    email = (login_data.get("email") or login_data.get("username") or "").strip()
    password = login_data.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = database.verify_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = database.create_session("user", user["id"])
    return {"token": token, "id": user["id"]}


def get_matched_jobs(user_id: str) -> List[Dict]:
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return MOCK_MATCHED_JOBS


def get_user_interviews(user_id: str) -> List[Dict]:
    return _interviews.get(user_id, [])


def apply_job(user_id: str, job_id: str) -> Dict:
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    application = {
        "application_id": str(uuid4()),
        "user_id": user_id,
        "job_id": job_id,
        "status": "submitted",
    }
    _applications.append(application)
    return application
