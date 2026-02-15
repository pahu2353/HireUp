"""User (applicant) business logic."""
from __future__ import annotations

import base64
import json
from typing import Dict, List

from fastapi import HTTPException

try:
    from . import database
    from . import pdf_utils
except ImportError:
    import database
    import pdf_utils


# In-memory state (interviews). Applications and jobs now in DB.
_interviews: Dict[str, List[Dict]] = {}


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
    """Get all open jobs for the user. Eventually we'll use vector search to filter relevant ones."""
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    all_jobs = database.get_all_jobs(status="open")
    # For each job, parse skills from JSON string and add an 'applied' flag
    for job in all_jobs:
        try:
            job["skills"] = json.loads(job.get("skills", "[]"))
        except Exception:
            job["skills"] = []
        job["applied"] = database.check_application_exists(user_id, job["id"])
    return all_jobs


def get_user_interviews(user_id: str) -> List[Dict]:
    return _interviews.get(user_id, [])


def apply_job(user_id: str, job_id: str) -> Dict:
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not database.get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    if database.check_application_exists(user_id, job_id):
        raise HTTPException(status_code=409, detail="Already applied to this job")
    application = database.create_application(user_id, job_id)
    return application


def get_user_profile(user_id: str) -> Dict:
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Don't send the actual PDF blob in the profile response, just indicate if it exists
    has_resume_pdf = user.get("resume_pdf") is not None
    user_data = dict(user)
    user_data.pop("resume_pdf", None)  # Remove the blob from response
    user_data["has_resume_pdf"] = has_resume_pdf
    return user_data


def update_user_profile(user_id: str, profile_data: Dict) -> Dict:
    resume_pdf_base64 = profile_data.get("resume_pdf_base64")
    interests = profile_data.get("interests")
    resume_pdf = None
    resume_text = None
    if resume_pdf_base64:
        try:
            pdf_bytes = base64.b64decode(resume_pdf_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid resume PDF")
        if pdf_bytes:
            resume_pdf = pdf_bytes
            resume_text = pdf_utils.extract_pdf_text(pdf_bytes)
    interests_str = json.dumps(interests) if interests is not None else None
    ok = database.update_user(
        user_id=user_id,
        name=profile_data.get("name"),
        email=profile_data.get("email"),
        resume_pdf=resume_pdf,
        resume_text=resume_text,
        interests=interests_str,
        career_objective=profile_data.get("career_objective"),
    )
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return get_user_profile(user_id)
