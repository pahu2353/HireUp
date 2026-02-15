"""Company business logic."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import HTTPException

try:
    from . import database
except ImportError:
    import database


# In-memory state for interview workflow/analytics.
_interview_lists: Dict[str, List[str]] = {}
_interview_feedback: List[Dict] = []
_agent_queries_by_company: Dict[str, int] = {}
_activities_by_company: Dict[str, List[Dict[str, str]]] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _add_activity(company_id: str, action: str, detail: str) -> None:
    _activities_by_company.setdefault(company_id, []).append(
        {"action": action, "detail": detail, "time": _utc_now_iso()}
    )


def create_company(company_data: Dict) -> Dict:
    email = company_data.get("email", "").strip()
    password = company_data.get("password", "")
    company_name = company_data.get("company_name", "")
    website = company_data.get("website", "")
    description = company_data.get("description", "")
    company_size = company_data.get("company_size", "")
    stage = company_data.get("stage", "")
    culture_benefits = company_data.get("culture_benefits", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    company = database.create_company(
        email=email,
        password=password,
        company_name=company_name,
        website=website,
        description=description,
        company_size=company_size,
        stage=stage,
        culture_benefits=culture_benefits,
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

    skills = job_data.get("skills", [])
    skills_str = json.dumps(skills) if isinstance(skills, list) else str(skills)
    job_id = database.create_job(
        company_id=company_id,
        title=job_data.get("title", ""),
        description=job_data.get("description", ""),
        skills=skills_str,
        location=job_data.get("location", "Remote"),
        salary_range=job_data.get("salary_range", "TBD"),
    )
    _add_activity(company_id, "New job posting live", f"{job_data.get('title', 'New role')} is now open.")
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
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    company_id = job.get("company_id", "")
    if company_id:
        _agent_queries_by_company[company_id] = _agent_queries_by_company.get(company_id, 0) + 1

    mock_candidates = [
        {"user_id": "user-1", "skills": ["python", "fastapi", "sql"]},
        {"user_id": "user-2", "skills": ["react", "typescript", "node"]},
        {"user_id": "user-3", "skills": ["pytorch", "ranking", "python"]},
    ]
    ranked = _rank_candidates(prompt, mock_candidates)

    if company_id:
        _add_activity(
            company_id,
            "AI Agent completed search",
            f'Found {len(ranked[:12])} candidates for prompt "{prompt}".',
        )
    return ranked[:12]


def submit_interviewee_list(job_id: str, user_ids: List[str]) -> None:
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    _interview_lists[job_id] = user_ids
    company_id = job.get("company_id", "")
    if company_id:
        _add_activity(
            company_id,
            "Interview list submitted",
            f"Submitted {len(user_ids)} candidates for interview.",
        )


def submit_interviewee_feedback(job_id: str, user_id: str, feedback: str) -> Dict:
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    feedback_id = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    entry = {"feedback_id": feedback_id, "job_id": job_id, "user_id": user_id, "feedback": feedback}
    _interview_feedback.append(entry)

    company_id = job.get("company_id", "")
    if company_id:
        _add_activity(
            company_id,
            "Interview feedback submitted",
            f"Feedback submitted for candidate {user_id}.",
        )
    return entry


def get_company_profile(company_id: str) -> Dict:
    company = database.get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "company_id": company["id"],
        "email": company.get("email") or "",
        "company_name": company.get("company_name") or "",
        "website": company.get("website") or "",
        "description": company.get("description") or "",
        "company_size": company.get("company_size") or "",
        "stage": company.get("stage") or "",
        "culture_benefits": company.get("culture_benefits") or "",
    }


def update_company_profile(profile_data: Dict) -> Dict:
    company_id = profile_data.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="company_id is required")

    updated = database.update_company_profile(
        company_id=company_id,
        company_name=profile_data.get("company_name", ""),
        website=profile_data.get("website", ""),
        description=profile_data.get("description", ""),
        company_size=profile_data.get("company_size", ""),
        stage=profile_data.get("stage", ""),
        culture_benefits=profile_data.get("culture_benefits", ""),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Company not found")

    _add_activity(company_id, "Company profile updated", "Company details were updated.")
    return get_company_profile(company_id)


def list_company_jobs(company_id: str) -> List[Dict]:
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")

    jobs = database.get_jobs_by_company(company_id)
    for job in jobs:
        try:
            job["skills"] = json.loads(job.get("skills", "[]"))
        except Exception:
            job["skills"] = []
    return jobs


def get_company_dashboard(company_id: str) -> Dict:
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")

    jobs = list_company_jobs(company_id)
    total_interviewed = sum(len(_interview_lists.get(job["id"], [])) for job in jobs)
    total_feedback = sum(
        1
        for entry in _interview_feedback
        if (database.get_job(entry["job_id"]) or {}).get("company_id") == company_id
    )

    interview_rate = 0.0
    if total_interviewed > 0:
        interview_rate = round((total_feedback / total_interviewed) * 100, 1)

    activities = list(reversed(_activities_by_company.get(company_id, [])))[:10]
    return {
        "company_id": company_id,
        "stats": {
            "active_postings": len(jobs),
            "total_applicants": total_interviewed,
            "ai_agent_queries": _agent_queries_by_company.get(company_id, 0),
            "interview_rate_percent": interview_rate,
        },
        "recent_activity": activities,
    }
