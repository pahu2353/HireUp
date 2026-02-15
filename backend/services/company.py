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


def update_job_posting(job_data: Dict) -> Dict[str, Any]:
    company_id = job_data.get("company_id")
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")

    job_id = str(job_data.get("job_id", "")).strip()
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")

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

    updated = database.update_job_for_company(
        company_id=company_id,
        job_id=job_id,
        title=job_title,
        description=job_description,
        skills=json.dumps(cleaned_skills),
        location=str(job_data.get("location", "Remote")).strip() or "Remote",
        salary_range=str(job_data.get("salary_range", "TBD")).strip() or "TBD",
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found for company")

    try:
        updated["skills"] = json.loads(updated.get("skills", "[]"))
    except Exception:
        updated["skills"] = []
    _add_activity(company_id, "Job posting updated", f"{job_title} details were updated.")
    return updated


def delete_job_posting(company_id: str, job_id: str) -> Dict[str, Any]:
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")

    closed = database.close_job_for_company(company_id=company_id, job_id=job_id)
    if not closed:
        raise HTTPException(status_code=404, detail="Job not found for company")
    _add_activity(company_id, "Job posting closed", f"{closed.get('title', 'Job')} was closed.")
    return closed


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


def _openai_rank_and_analyze_candidates(job: Dict, prompt: str, candidates: List[Dict]) -> List[Dict]:
    """Use OpenAI to score candidates AND analyze their skills in one call."""
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
        "You are a recruiting fit-scoring and skill analysis assistant. "
        "For each candidate, provide TWO outputs: (1) fit score and reasoning, (2) skill breakdown. "
        "CRITICAL: Score each candidate independently and absolutely against the job description. "
        "Do NOT compare candidates to each other. Do NOT adjust scores based on the strength of other candidates in this batch. "
        "A candidate's score should be the same whether they are scored alone or with 100 others. "
        "Return strict JSON only with shape: "
        '{"ranked":[{"user_id":"...","score":0,"reasoning":"...","skills":[{"name":"...","score":0}],"skill_summary":"..."}]}. '
        "For skills: analyze ONLY the job-required skills. Score each 0-100 based on resume evidence. "
        "Provide a brief skill_summary (1-2 sentences) describing overall technical strengths."
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
        with urllib.request.urlopen(req, timeout=90) as resp:
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
                "skill_analysis": item.get("skills", []),
                "skill_summary": str(item.get("skill_summary", "")),
            }
        )

    if not merged:
        raise RuntimeError("OpenAI returned no usable candidate rankings")

    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged


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
        "You are a recruiting fit-scoring assistant. "
        "Score each candidate 0-100 based ONLY on how well they match the job requirements. "
        "CRITICAL: Score each candidate independently and absolutely against the job description. "
        "Do NOT compare candidates to each other. Do NOT adjust scores based on the strength of other candidates in this batch. "
        "A candidate's score should be the same whether they are scored alone or with 100 others. "
        "Return strict JSON only with shape: "
        '{"ranked":[{"user_id":"...","score":0,"reasoning":"..."}]}. '
        "Scoring criteria: technical skill match, relevant experience, demonstrated expertise, and alignment with job requirements."
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
        with urllib.request.urlopen(req, timeout=90) as resp:
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
        with urllib.request.urlopen(req, timeout=90) as resp:
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

    # Only return cached skill analysis from fit scoring
    cached_analysis = candidate.get("skill_analysis")
    cached_summary = candidate.get("skill_analysis_summary")
    if cached_analysis and cached_summary:
        try:
            skills = json.loads(cached_analysis) if isinstance(cached_analysis, str) else cached_analysis
            if isinstance(skills, list) and len(skills) > 0:
                return {
                    "mode": mode,
                    "source": "cached",
                    "summary": cached_summary,
                    "skills": skills[:7],
                }
        except Exception:
            pass

    # If no cached analysis, return placeholder indicating candidate needs scoring
    raise HTTPException(
        status_code=404, 
        detail="Skill analysis not available. Please score this candidate first by clicking 'Score Now'."
    )


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


def score_unrated_applicants(
    company_id: str, 
    job_id: str | None = None,
    batch_size: int = 20,
    offset: int = 0,
) -> Dict:
    """Score one batch of unrated applicants. Returns scored count, total unrated, and applicants."""
    if not database.get_company_by_id(company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get all applicants for counting
    all_applicants = database.get_company_applications(company_id, job_id=job_id)
    for applicant in all_applicants:
        interests_raw = applicant.get("interests") or "[]"
        try:
            applicant["skills"] = json.loads(interests_raw) if isinstance(interests_raw, str) else []
            if not isinstance(applicant["skills"], list):
                applicant["skills"] = []
        except Exception:
            applicant["skills"] = []
    
    # Count total unrated before processing
    unrated = [a for a in all_applicants if a.get("fit_score") is None]
    total_unrated_before = len(unrated)
    
    if total_unrated_before == 0:
        return {"scored_count": 0, "total_unrated": 0, "applicants": all_applicants}
    
    # Process batch
    batch = unrated[offset:offset + batch_size]
    if not batch:
        return {"scored_count": 0, "total_unrated": total_unrated_before, "applicants": all_applicants}
    
    by_job: Dict[str, List[Dict]] = {}
    for app in batch:
        by_job.setdefault(str(app["job_id"]), []).append(app)

    scored_count = 0
    
    for job_id_key, job_apps in by_job.items():
        job = database.get_job(job_id_key)
        if not job:
            continue

        candidate_pool = []
        app_by_user: Dict[str, Dict] = {}
        for app in job_apps:
            user_id = str(app.get("user_id") or "")
            if not user_id:
                continue
            app_by_user[user_id] = app
            candidate_pool.append(
                {
                    "user_id": user_id,
                    "name": app.get("user_name", ""),
                    "skills": app.get("skills", []),
                    "resume_text": app.get("resume_text", ""),
                }
            )
        if not candidate_pool:
            continue

        prompt = "Evaluate each candidate's fit for this role based solely on the job requirements. Score them independently — do not compare them to each other."
        try:
            ranked = _openai_rank_and_analyze_candidates(job, prompt, candidate_pool)
        except Exception as e:
            print(f"⚠️  OpenAI rank+analyze failed: {e}")
            ranked = _rank_candidates(prompt, candidate_pool)

        now_iso = _utc_now_iso()
        for item in ranked:
            user_id = str(item.get("user_id") or "")
            app = app_by_user.get(user_id)
            if not app:
                continue
            score = int(item.get("score", 0))
            
            # Store skill analysis if available
            skill_analysis_json = ""
            skill_summary = ""
            if "skill_analysis" in item and item["skill_analysis"]:
                try:
                    skill_analysis_json = json.dumps(item["skill_analysis"])
                    skill_summary = item.get("skill_summary", "")
                except Exception:
                    pass
            
            database.update_application_fit_score(
                application_id=app["application_id"],
                fit_score=max(0, min(100, score)),
                fit_reasoning=str(item.get("reasoning", "")),
                fit_scored_at=now_iso,
                skill_analysis=skill_analysis_json,
                skill_analysis_summary=skill_summary,
            )
            scored_count += 1
    
    # Get refreshed applicant list with new scores
    applicants = database.get_company_applications(company_id, job_id=job_id)
    for applicant in applicants:
        interests_raw = applicant.get("interests") or "[]"
        try:
            applicant["skills"] = json.loads(interests_raw) if isinstance(interests_raw, str) else []
            if not isinstance(applicant["skills"], list):
                applicant["skills"] = []
        except Exception:
            applicant["skills"] = []
    
    # Count remaining unrated
    remaining_unrated = len([a for a in applicants if a.get("fit_score") is None])
    
    if scored_count:
        _add_activity(company_id, "Applicant fit scores updated", f"Scored {scored_count} applicants.")
    
    return {"scored_count": scored_count, "total_unrated": remaining_unrated, "applicants": applicants}


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
