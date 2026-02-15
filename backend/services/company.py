"""Company business logic."""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

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

STATUS_SUBMITTED = "submitted"
STATUS_REJECTED_PRE = "rejected_pre_interview"
STATUS_IN_PROGRESS = "in_progress"
STATUS_REJECTED_POST = "rejected_post_interview"
STATUS_OFFER = "offer"

ALLOWED_STATUSES = {
    STATUS_SUBMITTED,
    STATUS_REJECTED_PRE,
    STATUS_IN_PROGRESS,
    STATUS_REJECTED_POST,
    STATUS_OFFER,
}

ALLOWED_TRANSITIONS = {
    STATUS_SUBMITTED: {STATUS_REJECTED_PRE, STATUS_IN_PROGRESS},
    STATUS_IN_PROGRESS: {STATUS_REJECTED_POST, STATUS_OFFER},
    STATUS_REJECTED_PRE: set(),
    STATUS_REJECTED_POST: set(),
    STATUS_OFFER: set(),
}


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
    if not isinstance(skills, list):
        raise HTTPException(status_code=400, detail="skills must be a list")
    cleaned_skills = [str(skill).strip() for skill in skills if str(skill).strip()]
    if len(cleaned_skills) < 3:
        raise HTTPException(status_code=400, detail="At least 3 skills are required")

    job_title = str(job_data.get("title", "")).strip()
    if not job_title:
        raise HTTPException(status_code=400, detail="title is required")

    job_description = str(job_data.get("description", "")).strip()
    if not job_description:
        raise HTTPException(status_code=400, detail="description is required")

    skills_str = json.dumps(cleaned_skills)
    job_id = database.create_job(
        company_id=company_id,
        title=job_title,
        description=job_description,
        skills=skills_str,
        location=job_data.get("location", "Remote"),
        salary_range=job_data.get("salary_range", "TBD"),
    )
    _add_activity(company_id, "New job posting live", f"{job_title or 'New role'} is now open.")
    return job_id


def _rank_candidates(prompt: str, candidates: List[Dict]) -> List[Dict]:
    """Local fallback ranker using both skills and resume text."""
    stop_words = {
        "the", "and", "for", "with", "that", "this", "from", "have", "has", "are", "you",
        "your", "top", "best", "give", "show", "find", "applicant", "applicants", "candidate",
        "candidates",
    }
    prompt_terms = {
        term.lower()
        for term in re.findall(r"[a-zA-Z0-9\+#\.]+", prompt)
        if len(term) > 2 and term.lower() not in stop_words
    }
    ranked = []
    for candidate in candidates:
        skills = {str(s).lower() for s in candidate.get("skills", [])}
        resume_text = (candidate.get("resume_text") or "").lower()
        skill_hits = len(prompt_terms & skills)
        resume_hits = sum(1 for term in prompt_terms if term in resume_text)
        score = skill_hits * 5 + resume_hits
        ranked.append(
            {
                **candidate,
                "score": score,
                "reasoning": f"Local ranking: {skill_hits} skill matches and {resume_hits} resume-text matches.",
            }
        )
    return sorted(ranked, key=lambda x: x["score"], reverse=True)


def _read_env_value(key: str) -> str:
    """Read env var from process first, then fallback to .env files."""
    from_process = os.getenv(key)
    if from_process:
        return from_process

    # Support both backend/.env and repo-root/.env
    env_paths = [
        Path(__file__).resolve().parents[1] / ".env",  # backend/.env
        Path(__file__).resolve().parents[2] / ".env",  # repo-root/.env
    ]
    for env_path in env_paths:
        if not env_path.exists():
            continue
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                k, v = stripped.split("=", 1)
                if k.strip() == key:
                    return v.strip().strip('"').strip("'")
        except Exception:
            continue
    return ""


def _extract_json_blob(text: str) -> Dict:
    """Extract and parse first JSON object from model output."""
    text = text.strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except Exception:
        return {}


def _openai_rank_candidates(job: Dict, prompt: str, candidates: List[Dict]) -> List[Dict]:
    """Use OpenAI chat completions to score candidates for a job."""
    api_key = _read_env_value("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    # Keep payload bounded for latency and token usage.
    limited = candidates[:100]
    candidate_payload = []
    for c in limited:
        candidate_payload.append(
            {
                "user_id": c.get("user_id", ""),
                "resume_text": (c.get("resume_text") or "")[:10000],
            }
        )

    system_msg = (
        "You are a recruiting ranking assistant. "
        "Given a job and recruiter prompt, score each candidate 0-100. "
        "Return strict JSON only with shape: "
        '{"ranked":[{"user_id":"...","score":0,"reasoning":"..."}]}. '
        "Score should reflect skill match, experience relevance, how cracked they are, and prompt fit."
    )
    user_msg = {
        "job": {
            "id": job.get("id"),
            "title": job.get("title"),
            "description": job.get("description"),
            "skills": job.get("skills"),
            "location": job.get("location"),
        },
        "prompt": prompt,
        "candidates": candidate_payload,
    }

    body = json.dumps(
        {
            "model": "gpt-5.2",
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": json.dumps(user_msg)},
            ],
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        details = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI HTTP {e.code}: {details[:300]}")
    except Exception as e:
        raise RuntimeError(f"OpenAI request failed: {e}")

    content = (
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    parsed = _extract_json_blob(content)
    ranked = parsed.get("ranked", [])
    if not isinstance(ranked, list):
        raise RuntimeError("OpenAI response missing ranked list")

    by_user = {c.get("user_id"): c for c in limited}
    merged = []
    for item in ranked:
        if not isinstance(item, dict):
            continue
        user_id = str(item.get("user_id", "")).strip()
        if not user_id or user_id not in by_user:
            continue
        base = by_user[user_id]
        score = item.get("score", 0)
        try:
            score = int(score)
        except Exception:
            score = 0
        merged.append(
            {
                "user_id": user_id,
                "name": base.get("name") or "",
                "skills": base.get("skills", []),
                "score": max(0, min(100, score)),
                "reasoning": str(item.get("reasoning", "Model-ranked candidate.")),
            }
        )

    if not merged:
        raise RuntimeError("OpenAI returned no usable candidate rankings")

    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged


def _openai_analyze_candidate_skills(
    candidate: Dict[str, Any],
    job: Dict[str, Any] | None,
) -> Dict[str, Any]:
    api_key = _read_env_value("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    mode = "job_specific" if job else "general"
    job_skill_targets: List[str] = []
    if job:
        raw_job_skills = job.get("skills", "[]")
        if isinstance(raw_job_skills, str):
            try:
                raw_job_skills = json.loads(raw_job_skills)
            except Exception:
                raw_job_skills = []
        if isinstance(raw_job_skills, list):
            job_skill_targets = [str(s).strip() for s in raw_job_skills if str(s).strip()]
    system_msg = (
        "You evaluate technical skills from resumes. "
        "Return strict JSON only with this shape: "
        '{"summary":"...", "skills":[{"name":"...","score":0}]}. '
        "Scores must be integers 0-100."
    )
    user_msg = {
        "mode": mode,
        "candidate": {
            "name": candidate.get("user_name", ""),
            "skills": candidate.get("skills", []),
            "resume_text": (candidate.get("resume_text") or "")[:12000],
        },
        "job": {
            "title": (job or {}).get("title", ""),
            "description": (job or {}).get("description", ""),
            "skills": job_skill_targets,
        },
        "scoring_instruction": (
            "If mode is job_specific, score ONLY the provided job.skills and do not invent additional skills. "
            "If mode is general, prioritize strongest proven technical competencies."
        ),
    }

    body = json.dumps(
        {
            "model": "gpt-5.2",
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": json.dumps(user_msg)},
            ],
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        details = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI HTTP {e.code}: {details[:300]}")
    except Exception as e:
        raise RuntimeError(f"OpenAI request failed: {e}")

    content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = _extract_json_blob(content)
    skills = parsed.get("skills", [])
    summary = str(parsed.get("summary", "")).strip()
    if not isinstance(skills, list) or len(skills) == 0:
        raise RuntimeError("OpenAI response missing skills list")

    cleaned = []
    for item in skills:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        try:
            score = int(item.get("score", 0))
        except Exception:
            score = 0
        cleaned.append({"name": name, "score": max(0, min(100, score))})
    if not cleaned:
        raise RuntimeError("OpenAI returned no usable skill scores")
    if mode == "job_specific" and job_skill_targets:
        allowed = {name.lower() for name in job_skill_targets}
        filtered = [item for item in cleaned if item["name"].lower() in allowed]
        by_name = {item["name"].lower(): item for item in filtered}
        ordered: List[Dict[str, Any]] = []
        for skill_name in job_skill_targets:
            existing = by_name.get(skill_name.lower())
            if existing:
                ordered.append(existing)
            else:
                ordered.append({"name": skill_name, "score": 0})
        cleaned = ordered
    else:
        cleaned.sort(key=lambda x: x["score"], reverse=True)
    return {"summary": summary, "skills": cleaned[:7]}


def _parse_limit_from_prompt(prompt: str) -> int | None:
    """Extract requested count from prompt, e.g. 'top 3', '5 applicants', 'best 10'."""
    import re
    prompt_lower = (prompt or "").lower()
    # "top 3", "top 5 applicants", "give me top 10"
    m = re.search(r"top\s+(\d+)", prompt_lower)
    if m:
        return min(100, max(1, int(m.group(1))))
    # "3 applicants", "5 candidates"
    m = re.search(r"(\d+)\s+(?:applicants|candidates)", prompt_lower)
    if m:
        return min(100, max(1, int(m.group(1))))
    # "best 7"
    m = re.search(r"best\s+(\d+)", prompt_lower)
    if m:
        return min(100, max(1, int(m.group(1))))
    return None


def get_top_candidates(job_id: str, prompt: str, limit: int | None = None) -> Dict:
    job = database.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    company_id = job.get("company_id", "")
    if company_id:
        _agent_queries_by_company[company_id] = _agent_queries_by_company.get(company_id, 0) + 1

    applicants = list_company_applicants(company_id, job_id=job_id)
    candidate_pool = [
        {
            "user_id": a.get("user_id", ""),
            "name": a.get("user_name", ""),
            "skills": a.get("skills", []),
            "resume_text": a.get("resume_text", ""),
        }
        for a in applicants
        if a.get("user_id")
    ]
    if not candidate_pool:
        return {"top_candidates": [], "ranking_source": "none", "ranking_error": ""}

    # Try OpenAI first; fall back to local overlap ranking for resilience.
    ranking_source = "openai"
    ranking_error = ""
    try:
        ranked = _openai_rank_candidates(job, prompt, candidate_pool)
    except Exception as exc:
        ranking_source = "fallback"
        ranking_error = str(exc)[:300]
        ranked = _rank_candidates(prompt, candidate_pool)

    n = limit if limit is not None else _parse_limit_from_prompt(prompt)
    n = min(len(ranked), n) if n else min(len(ranked), 12)

    top_candidates = ranked[:n]
    if company_id:
        _add_activity(
            company_id,
            "AI Agent completed search",
            f'Found {len(top_candidates)} candidates for prompt "{prompt}" (source: {ranking_source}).',
        )
    return {
        "top_candidates": top_candidates,
        "ranking_source": ranking_source,
        "ranking_error": ranking_error,
    }


def analyze_candidate_skills(company_id: str, user_id: str, job_id: str | None = None) -> Dict[str, Any]:
    applicants = list_company_applicants(company_id, job_id=job_id)
    candidate = next((a for a in applicants if a.get("user_id") == user_id), None)
    if not candidate:
        # fallback to all jobs for this company
        applicants = list_company_applicants(company_id, job_id=None)
        candidate = next((a for a in applicants if a.get("user_id") == user_id), None)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found for company")

    job = database.get_job(job_id) if job_id else None
    mode = "job_specific" if job else "general"

    try:
        openai_result = _openai_analyze_candidate_skills(candidate, job)
        return {
            "mode": mode,
            "source": "openai",
            "summary": openai_result.get("summary", ""),
            "skills": openai_result.get("skills", []),
        }
    except Exception:
        # deterministic fallback
        resume_text = (candidate.get("resume_text") or "").lower()
        candidate_skills = [str(s) for s in (candidate.get("skills") or [])]
        if mode == "job_specific":
            job_skills = job.get("skills", "[]") if job else []
            if isinstance(job_skills, str):
                try:
                    job_skills = json.loads(job_skills)
                except Exception:
                    job_skills = []
            names = [str(s) for s in job_skills][:7] or candidate_skills[:7]
        else:
            names = candidate_skills[:7]
        if not names:
            names = ["Python", "APIs", "System Design", "Databases", "Testing"]
        scored = []
        for idx, name in enumerate(names):
            base = 62 - idx * 3
            hits = resume_text.count(name.lower())
            score = min(100, max(35, base + hits * 6))
            scored.append({"name": name, "score": score})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return {
            "mode": mode,
            "source": "fallback",
            "summary": (
                "Local analysis based on resume text and inferred skill match."
                if mode == "general"
                else "Local analysis focused on skills relevant to the selected job."
            ),
            "skills": scored,
        }


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


def list_company_applicants(company_id: str, job_id: str | None = None) -> List[Dict]:
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    applicants = database.get_company_applications(company_id, job_id=job_id)
    for applicant in applicants:
        interests_raw = applicant.get("interests") or "[]"
        try:
            applicant["skills"] = json.loads(interests_raw) if isinstance(interests_raw, str) else []
            if not isinstance(applicant["skills"], list):
                applicant["skills"] = []
        except Exception:
            applicant["skills"] = []
    return applicants


def update_application_status(
    company_id: str,
    application_id: str,
    status: str,
    technical_score: int | None,
) -> Dict:
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid application status")

    applicants = database.get_company_applications(company_id)
    current = next((a for a in applicants if a.get("application_id") == application_id), None)
    if not current:
        raise HTTPException(status_code=404, detail="Application not found for company")
    previous_status = current.get("status") or STATUS_SUBMITTED

    if previous_status not in ALLOWED_TRANSITIONS or status not in ALLOWED_TRANSITIONS[previous_status]:
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {previous_status} -> {status}")

    if status in {STATUS_REJECTED_POST, STATUS_OFFER}:
        if technical_score is None:
            raise HTTPException(status_code=400, detail="technical_score is required for this status")
        if technical_score < 1 or technical_score > 10:
            raise HTTPException(status_code=400, detail="technical_score must be between 1 and 10")
    else:
        technical_score = None

    updated = database.update_company_application_status(
        company_id=company_id,
        application_id=application_id,
        status=status,
        technical_score=technical_score,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found for company")

    _add_activity(
        company_id,
        "Application status updated",
        f"Application {application_id} moved to {status}.",
    )
    return updated


def get_company_dashboard(company_id: str) -> Dict:
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")

    jobs = list_company_jobs(company_id)
    applications = database.get_company_applications(company_id)
    counts = database.get_company_application_stats(company_id)
    total_applicants = len(applications)
    interview_rate = round((counts["in_progress"] / total_applicants) * 100, 1) if total_applicants else 0.0

    activities = list(reversed(_activities_by_company.get(company_id, [])))[:10]
    return {
        "company_id": company_id,
        "stats": {
            "active_postings": len(jobs),
            "total_applicants": total_applicants,
            "ai_agent_queries": _agent_queries_by_company.get(company_id, 0),
            "interview_rate_percent": interview_rate,
        },
        "workflow": counts,
        "recent_activity": activities,
    }
