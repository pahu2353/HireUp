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


# In-memory state (interviews). Applications and jobs are in DB.
_interviews: Dict[str, List[Dict]] = {}


def create_user(user_data: Dict) -> Dict:
    email = user_data.get("email", "").strip()
    password = user_data.get("password", "")
    name = user_data.get("name", "")
    objective = user_data.get("objective", "")
    career_objective = user_data.get("career_objective", objective)
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
        objective=objective,
        resume=resume,
        resume_pdf=resume_pdf,
        resume_text=resume_text,
        interests=interests_str,
        career_objective=career_objective,
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
    all_jobs = database.get_all_jobs(status="open")
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
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if (job.get("status") or "").lower() != "open":
        raise HTTPException(status_code=400, detail="Job is closed")
    if database.check_application_exists(user_id, job_id):
        raise HTTPException(status_code=409, detail="Already applied to this job")
    return database.create_application(user_id, job_id)


def get_user_profile(user_id: str) -> Dict:
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    full_name = (user.get("name") or "").strip()
    first_name = ""
    last_name = ""
    if full_name:
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    interests_raw = user.get("interests") or "[]"
    try:
        skills = json.loads(interests_raw) if isinstance(interests_raw, str) else interests_raw
        if not isinstance(skills, list):
            skills = []
    except Exception:
        skills = []

    career_objective = user.get("career_objective") or user.get("objective") or ""
    has_resume_pdf = user.get("resume_pdf") is not None
    
    # Use resume_text if available, otherwise fall back to resume field
    resume_content = user.get("resume_text") or user.get("resume") or ""

    return {
        "user_id": user.get("id", ""),
        "id": user.get("id", ""),
        "email": user.get("email", "") or "",
        "name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "objective": career_objective,  # Use career_objective as the primary objective
        "career_objective": career_objective,
        "resume": resume_content,
        "resume_text": user.get("resume_text", "") or "",
        "skills": [str(s) for s in skills],
        "interests": json.dumps(skills),
        "has_resume_pdf": has_resume_pdf,
    }


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
        objective=profile_data.get("objective"),
        career_objective=profile_data.get("career_objective"),
    )
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return get_user_profile(user_id)


def update_user_profile_v2(profile_data: Dict) -> Dict:
    user_id = profile_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    first_name = (profile_data.get("first_name") or "").strip()
    last_name = (profile_data.get("last_name") or "").strip()
    full_name = f"{first_name} {last_name}".strip()

    skills = profile_data.get("skills", [])
    if not isinstance(skills, list):
        skills = []

    updated = database.update_user_profile(
        user_id=user_id,
        name=full_name,
        objective=profile_data.get("objective", "") or "",
        resume=profile_data.get("resume", "") or "",
        interests=json.dumps(skills),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return get_user_profile(user_id)
