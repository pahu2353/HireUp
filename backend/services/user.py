"""User (applicant) business logic."""
from __future__ import annotations

import base64
import importlib.util
import json
import random
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import numpy as np
from fastapi import HTTPException

try:
    from . import database
    from . import pdf_utils
except ImportError:
    import database
    import pdf_utils


# In-memory state (interviews). Applications and jobs are in DB.
_interviews: Dict[str, List[Dict]] = {}
_daily_job_pool_cache: Dict[tuple[str, str], List[str]] = {}
_daily_job_pool_lock = threading.Lock()

_VECDB_PATH = Path(__file__).resolve().parents[2] / "two-tower" / "two_tower_vecdb.sqlite"
_EMBED_INIT_PATH = Path(__file__).resolve().parents[2] / "two-tower" / "embedding_initializer.py"


def _normalize(v: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(v))
    if norm <= 1e-12:
        return v.astype(np.float32)
    return (v / norm).astype(np.float32)


def _load_embedding_initializer_cls():
    spec = importlib.util.spec_from_file_location("two_tower_embedding_initializer", _EMBED_INIT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load embedding initializer at {_EMBED_INIT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.NewEmbeddingInitializer


def _fetch_user_vector(user_id: str) -> np.ndarray | None:
    if not _VECDB_PATH.exists():
        return None
    with sqlite3.connect(_VECDB_PATH) as conn:
        row = conn.execute(
            "SELECT vector_json FROM user_vectors WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    try:
        return _normalize(np.array(json.loads(row[0]), dtype=np.float32))
    except Exception:
        return None


def _fetch_job_vectors(job_ids: List[str]) -> Dict[str, np.ndarray]:
    if not _VECDB_PATH.exists() or not job_ids:
        return {}
    placeholders = ",".join(["?"] * len(job_ids))
    with sqlite3.connect(_VECDB_PATH) as conn:
        rows = conn.execute(
            f"SELECT id, vector_json FROM job_vectors WHERE id IN ({placeholders})",
            tuple(job_ids),
        ).fetchall()
    vectors: Dict[str, np.ndarray] = {}
    for row in rows:
        try:
            vectors[str(row[0])] = _normalize(np.array(json.loads(row[1]), dtype=np.float32))
        except Exception:
            continue
    return vectors


def _user_payload_for_initializer(user: Dict) -> Dict:
    return {
        "email": user.get("email"),
        "name": user.get("name"),
        "resume_text": user.get("resume_text") or user.get("resume") or "",
        "objective": user.get("objective"),
        "career_objective": user.get("career_objective"),
        "interests": user.get("interests"),
    }


def _job_payload_for_initializer(job: Dict) -> Dict:
    return {
        "company_id": job.get("company_id"),
        "title": job.get("title"),
        "description": job.get("description"),
        "skills": job.get("skills"),
        "location": job.get("location"),
        "salary_range": job.get("salary_range"),
        "status": job.get("status"),
    }


def _today_utc_key() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _get_or_create_daily_job_pool(user_id: str, available_job_ids: List[str], sample_size: int) -> List[str]:
    if sample_size <= 0 or not available_job_ids:
        return []

    today = _today_utc_key()
    available_set = set(available_job_ids)
    cache_key = (user_id, today)

    with _daily_job_pool_lock:
        # Drop stale day entries to keep memory bounded.
        stale_keys = [k for k in _daily_job_pool_cache.keys() if k[1] != today]
        for k in stale_keys:
            _daily_job_pool_cache.pop(k, None)

        cached = _daily_job_pool_cache.get(cache_key, [])
        # Keep existing ordering for stability, remove jobs no longer open.
        pool = [jid for jid in cached if jid in available_set]

        if len(pool) < sample_size:
            remaining = [jid for jid in sorted(available_set) if jid not in set(pool)]
            rng = random.Random(f"{user_id}:{today}")
            rng.shuffle(remaining)
            pool.extend(remaining[: max(0, sample_size - len(pool))])

        pool = pool[:sample_size]
        _daily_job_pool_cache[cache_key] = pool
        return pool


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
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_jobs = database.get_all_jobs(status="open")
    for job in all_jobs:
        try:
            job["skills"] = json.loads(job.get("skills", "[]"))
        except Exception:
            job["skills"] = []
        job["applied"] = database.check_application_exists(user_id, job["id"])

    if not all_jobs:
        return []

    sample_size = min(30, len(all_jobs))
    jobs_by_id = {str(job["id"]): job for job in all_jobs if job.get("id")}
    sampled_job_ids = _get_or_create_daily_job_pool(
        user_id=user_id,
        available_job_ids=list(jobs_by_id.keys()),
        sample_size=sample_size,
    )
    sampled_jobs = [jobs_by_id[jid] for jid in sampled_job_ids if jid in jobs_by_id]

    user_vec = _fetch_user_vector(user_id)
    job_vecs = _fetch_job_vectors(sampled_job_ids)

    initializer = None
    if user_vec is None or len(job_vecs) < len(sampled_job_ids):
        try:
            NewEmbeddingInitializer = _load_embedding_initializer_cls()
            initializer = NewEmbeddingInitializer(vecdb_path=_VECDB_PATH)
        except Exception:
            initializer = None

    if user_vec is None and initializer is not None:
        try:
            initializer.initialize_new_user(user_id=user_id, user_payload=_user_payload_for_initializer(user))
            user_vec = _fetch_user_vector(user_id)
        except Exception:
            user_vec = None

    if initializer is not None:
        missing_job_ids = [jid for jid in sampled_job_ids if jid not in job_vecs]
        if missing_job_ids:
            by_id = {str(job["id"]): job for job in sampled_jobs}
            for jid in missing_job_ids:
                job = by_id.get(jid)
                if not job:
                    continue
                try:
                    initializer.initialize_new_job(job_id=jid, job_payload=_job_payload_for_initializer(job))
                except Exception:
                    continue
            job_vecs = _fetch_job_vectors(sampled_job_ids)

    if user_vec is None:
        # Fallback if vecdb/bootstrap is unavailable.
        return sampled_jobs[:10]

    scored_jobs = []
    for job in sampled_jobs:
        jid = str(job["id"])
        j_vec = job_vecs.get(jid)
        if j_vec is None:
            continue
        score = float(np.dot(user_vec, j_vec))
        scored_jobs.append({**job, "vector_score": score})

    if not scored_jobs:
        return sampled_jobs[:10]

    scored_jobs.sort(key=lambda x: x["vector_score"], reverse=True)
    return scored_jobs[:10]


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
