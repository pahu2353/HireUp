"""SQLite database layer for HireUp. Uses a single file (hireup.db) for persistence."""
from __future__ import annotations

import sqlite3
from typing import Any, Dict, List, Optional
from uuid import uuid4

import bcrypt

try:
    from .config import DB_PATH
except ImportError:
    from config import DB_PATH


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                objective TEXT,
                resume TEXT,
                resume_pdf BLOB,
                resume_text TEXT,
                interests TEXT,
                career_objective TEXT,
                account_type TEXT DEFAULT 'user',
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                company_name TEXT,
                website TEXT,
                description TEXT,
                company_size TEXT,
                stage TEXT,
                culture_benefits TEXT,
                account_type TEXT DEFAULT 'company',
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                account_type TEXT NOT NULL,
                account_id TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                skills TEXT,
                location TEXT,
                salary_range TEXT,
                status TEXT DEFAULT 'open',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            );
            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                job_id TEXT NOT NULL,
                status TEXT DEFAULT 'submitted',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (job_id) REFERENCES jobs(id)
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
            CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
            CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
            CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
            """
        )

        # User migrations
        for stmt in (
            "ALTER TABLE users ADD COLUMN resume_pdf BLOB",
            "ALTER TABLE users ADD COLUMN resume_text TEXT",
            "ALTER TABLE users ADD COLUMN objective TEXT",
            "ALTER TABLE users ADD COLUMN career_objective TEXT",
        ):
            try:
                conn.execute(stmt)
            except sqlite3.OperationalError:
                pass

        # Company migrations
        for stmt in (
            "ALTER TABLE companies ADD COLUMN stage TEXT",
            "ALTER TABLE companies ADD COLUMN culture_benefits TEXT",
        ):
            try:
                conn.execute(stmt)
            except sqlite3.OperationalError:
                pass


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# --- Users ---
def create_user(
    email: str,
    password: str,
    name: str = "",
    objective: str = "",
    resume: str = "",
    resume_pdf: bytes | None = None,
    resume_text: str = "",
    interests: str = "[]",
    career_objective: str = "",
    user_id: str | None = None,
) -> Optional[Dict[str, Any]]:
    if get_user_by_email(email):
        return None

    user_id = user_id or str(uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO users (
                id, email, password_hash, name, objective, resume, resume_pdf, resume_text, interests, career_objective
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email,
                hash_password(password),
                name,
                objective,
                resume,
                resume_pdf,
                resume_text,
                interests,
                career_objective,
            ),
        )

    return {
        "id": user_id,
        "email": email,
        "name": name,
        "objective": objective,
        "resume": resume,
        "has_resume_pdf": bool(resume_pdf),
        "resume_text": resume_text,
        "interests": interests,
        "career_objective": career_objective,
        "account_type": "user",
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, email, password_hash, name, objective, resume, resume_pdf, resume_text, interests, career_objective
            FROM users WHERE email = ?
            """,
            (email,),
        ).fetchone()
    if not row:
        return None

    return {
        "id": row["id"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "name": row["name"] or "",
        "objective": row["objective"] or "",
        "resume": row["resume"] or "",
        "resume_pdf": row["resume_pdf"],
        "resume_text": row["resume_text"] or "",
        "interests": row["interests"] or "[]",
        "career_objective": row["career_objective"] or "",
        "account_type": "user",
    }


def verify_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return {k: v for k, v in user.items() if k != "password_hash"}


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, email, name, objective, resume, resume_pdf, resume_text, interests, career_objective
            FROM users WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def update_user(
    user_id: str,
    name: str | None = None,
    email: str | None = None,
    resume_pdf: bytes | None = None,
    resume_text: str | None = None,
    interests: str | None = None,
    objective: str | None = None,
    career_objective: str | None = None,
) -> bool:
    if not get_user_by_id(user_id):
        return False

    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if email is not None:
        updates.append("email = ?")
        params.append(email)
    if resume_pdf is not None:
        updates.append("resume_pdf = ?")
        params.append(resume_pdf)
    if resume_text is not None:
        updates.append("resume_text = ?")
        params.append(resume_text)
    if interests is not None:
        updates.append("interests = ?")
        params.append(interests)
    if objective is not None:
        updates.append("objective = ?")
        params.append(objective)
    if career_objective is not None:
        updates.append("career_objective = ?")
        params.append(career_objective)

    if not updates:
        return True

    params.append(user_id)
    with get_conn() as conn:
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    return True


def update_user_profile(
    user_id: str,
    name: str,
    objective: str,
    resume: str,
    interests: str,
) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return None
        conn.execute(
            """
            UPDATE users
            SET name = ?, objective = ?, career_objective = ?, resume = ?, resume_text = ?, interests = ?
            WHERE id = ?
            """,
            (name, objective, objective, resume, resume, interests, user_id),
        )
    return get_user_by_id(user_id)


# --- Companies ---
def create_company(
    email: str,
    password: str,
    company_name: str = "",
    website: str = "",
    description: str = "",
    company_size: str = "",
    stage: str = "",
    culture_benefits: str = "",
) -> Optional[Dict[str, Any]]:
    if get_company_by_email(email):
        return None

    company_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO companies (
                id, email, password_hash, company_name, website, description, company_size, stage, culture_benefits
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                company_id,
                email,
                hash_password(password),
                company_name,
                website,
                description,
                company_size,
                stage,
                culture_benefits,
            ),
        )

    return {
        "id": company_id,
        "email": email,
        "company_name": company_name,
        "website": website,
        "description": description,
        "company_size": company_size,
        "stage": stage,
        "culture_benefits": culture_benefits,
        "account_type": "company",
    }


def get_company_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, email, password_hash, company_name, website, description, company_size, stage, culture_benefits
            FROM companies WHERE email = ?
            """,
            (email,),
        ).fetchone()
    if not row:
        return None

    return {
        "id": row["id"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "company_name": row["company_name"] or "",
        "website": row["website"] or "",
        "description": row["description"] or "",
        "company_size": row["company_size"] or "",
        "stage": row["stage"] or "",
        "culture_benefits": row["culture_benefits"] or "",
        "account_type": "company",
    }


def verify_company(email: str, password: str) -> Optional[Dict[str, Any]]:
    company = get_company_by_email(email)
    if not company or not verify_password(password, company["password_hash"]):
        return None
    return {k: v for k, v in company.items() if k != "password_hash"}


def get_company_by_id(company_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, email, company_name, website, description, company_size, stage, culture_benefits
            FROM companies WHERE id = ?
            """,
            (company_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def update_company_profile(
    company_id: str,
    company_name: str,
    website: str,
    description: str,
    company_size: str,
    stage: str,
    culture_benefits: str,
) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM companies WHERE id = ?", (company_id,)).fetchone()
        if not row:
            return None
        conn.execute(
            """
            UPDATE companies
            SET company_name = ?, website = ?, description = ?, company_size = ?, stage = ?, culture_benefits = ?
            WHERE id = ?
            """,
            (company_name, website, description, company_size, stage, culture_benefits, company_id),
        )
    return get_company_by_id(company_id)


# --- Sessions ---
def create_session(account_type: str, account_id: str) -> str:
    token = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (token, account_type, account_id) VALUES (?, ?, ?)",
            (token, account_type, account_id),
        )
    return token


def get_session(token: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT token, account_type, account_id FROM sessions WHERE token = ?",
            (token,),
        ).fetchone()
    if not row:
        return None
    return {"token": row["token"], "account_type": row["account_type"], "account_id": row["account_id"]}


# --- Jobs ---
def create_job(
    company_id: str,
    title: str,
    description: str = "",
    skills: str = "[]",
    location: str = "Remote",
    salary_range: str = "TBD",
) -> str:
    job_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO jobs (id, company_id, title, description, skills, location, salary_range)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (job_id, company_id, title, description, skills, location, salary_range),
        )
    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, company_id, title, description, skills, location, salary_range, status, created_at
            FROM jobs WHERE id = ?
            """,
            (job_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def get_all_jobs(status: str = "open") -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT j.id, j.company_id, j.title, j.description, j.skills, j.location, j.salary_range, j.status, j.created_at,
                   c.company_name
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE j.status = ?
            ORDER BY j.created_at DESC
            """,
            (status,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_jobs_by_company(company_id: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, company_id, title, description, skills, location, salary_range, status, created_at
            FROM jobs WHERE company_id = ?
            ORDER BY created_at DESC
            """,
            (company_id,),
        ).fetchall()
    return [dict(row) for row in rows]


# --- Applications ---
def create_application(user_id: str, job_id: str) -> Dict[str, Any]:
    app_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO applications (id, user_id, job_id, status) VALUES (?, ?, ?, ?)",
            (app_id, user_id, job_id, "submitted"),
        )
    return {"id": app_id, "user_id": user_id, "job_id": job_id, "status": "submitted"}


def get_user_applications(user_id: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT a.id, a.user_id, a.job_id, a.status, a.created_at,
                   j.title, j.location, j.salary_range, c.company_name
            FROM applications a
            LEFT JOIN jobs j ON a.job_id = j.id
            LEFT JOIN companies c ON j.company_id = c.id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
            """,
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def check_application_exists(user_id: str, job_id: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM applications WHERE user_id = ? AND job_id = ?",
            (user_id, job_id),
        ).fetchone()
    return row is not None
