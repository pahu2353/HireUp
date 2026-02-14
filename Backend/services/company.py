"""Company business logic."""
from __future__ import annotations

from typing import Dict, List
from uuid import uuid4

from fastapi import HTTPException

try:
    from . import database
except ImportError:
    import database


# In-memory state (jobs, interview lists, feedback). Can be moved to DB later.
_jobs: Dict[str, Dict] = {}
_interview_lists: Dict[str, List[str]] = {}
_interview_feedback: List[Dict] = []


def create_company(company_data: Dict) -> Dict:
    email = company_data.get("email", "").strip()
    password = company_data.get("password", "")
    company_name = company_data.get("company_name", "")
    website = company_data.get("website", "")
    description = company_data.get("description", "")
    company_size = company_data.get("company_size", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    company = database.create_company(
        email=email,
        password=password,
        company_name=company_name,
        website=website,
        description=description,
        company_size=company_size,
    )
    if company is None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    return company


def create_session(login_data: Dict) -> Dict:
    email = (login_data.get("email") or login_data.get("username") or "").strip()
    password = login_data.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    company = database.verify_company(email, password)
    if not company:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = database.create_session("company", company["id"])
    return {"token": token, "id": company["id"]}


def create_job_posting(job_data: Dict) -> str:
    company_id = job_data.get("company_id")
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    job_id = str(uuid4())
    job_record = dict(job_data)
    job_record["job_id"] = job_id
    _jobs[job_id] = job_record
    return job_id


def _rank_candidates(prompt: str, candidates: List[Dict]) -> List[Dict]:
    prompt_terms = {term.lower() for term in prompt.split() if len(term) > 2}
    ranked = []
    for candidate in candidates:
        skills = {s.lower() for s in candidate.get("skills", [])}
        score = len(prompt_terms & skills)
        ranked.append({**candidate, "score": score, "reasoning": f"Matched {score} prompt skill terms."})
    return sorted(ranked, key=lambda x: x["score"], reverse=True)


def get_top_candidates(job_id: str, prompt: str) -> List[Dict]:
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    mock_candidates = [
        {"user_id": "user-1", "skills": ["python", "fastapi", "sql"]},
        {"user_id": "user-2", "skills": ["react", "typescript", "node"]},
        {"user_id": "user-3", "skills": ["pytorch", "ranking", "python"]},
    ]
    ranked = _rank_candidates(prompt, mock_candidates)
    return ranked[:12]


def submit_interviewee_list(job_id: str, user_ids: List[str]) -> None:
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    _interview_lists[job_id] = user_ids


def submit_interviewee_feedback(job_id: str, user_id: str, feedback: str) -> Dict:
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    entry = {"feedback_id": str(uuid4()), "job_id": job_id, "user_id": user_id, "feedback": feedback}
    _interview_feedback.append(entry)
    return entry
