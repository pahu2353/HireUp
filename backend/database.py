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


def _ensure_company_profile_columns(conn: sqlite3.Connection) -> None:
    for stmt in (
        "ALTER TABLE companies ADD COLUMN stage TEXT",
        "ALTER TABLE companies ADD COLUMN culture_benefits TEXT",
    ):
        try:
            conn.execute(stmt)
        except sqlite3.OperationalError:
            pass


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
                technical_score INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (job_id) REFERENCES jobs(id)
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
            CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
            CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
            CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

            CREATE TABLE IF NOT EXISTS agent_messages (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                candidates TEXT,
                ranking_source TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            );
            CREATE INDEX IF NOT EXISTS idx_agent_messages_company ON agent_messages(company_id);

            CREATE TABLE IF NOT EXISTS custom_reports (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                job_id TEXT,
                report_name TEXT NOT NULL,
                custom_prompt TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (company_id) REFERENCES companies(id),
                FOREIGN KEY (job_id) REFERENCES jobs(id)
            );
            CREATE INDEX IF NOT EXISTS idx_custom_reports_company ON custom_reports(company_id);

            CREATE TABLE IF NOT EXISTS report_scores (
                id TEXT PRIMARY KEY,
                report_id TEXT NOT NULL,
                application_id TEXT NOT NULL,
                custom_fit_score INTEGER,
                custom_fit_reasoning TEXT,
                scored_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (report_id) REFERENCES custom_reports(id),
                FOREIGN KEY (application_id) REFERENCES applications(id)
            );
            CREATE INDEX IF NOT EXISTS idx_report_scores_report ON report_scores(report_id);
            CREATE INDEX IF NOT EXISTS idx_report_scores_application ON report_scores(application_id);
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
        _ensure_company_profile_columns(conn)
        try:
            conn.execute("ALTER TABLE applications ADD COLUMN technical_score INTEGER")
        except sqlite3.OperationalError:
            pass
        for stmt in (
            "ALTER TABLE applications ADD COLUMN fit_score INTEGER",
            "ALTER TABLE applications ADD COLUMN fit_reasoning TEXT",
            "ALTER TABLE applications ADD COLUMN fit_scored_at TEXT",
            "ALTER TABLE applications ADD COLUMN skill_analysis TEXT",
            "ALTER TABLE applications ADD COLUMN skill_analysis_summary TEXT",
        ):
            try:
                conn.execute(stmt)
            except sqlite3.OperationalError:
                pass
        try:
            conn.execute("ALTER TABLE agent_messages ADD COLUMN chat_id TEXT")
        except sqlite3.OperationalError:
            pass
        conn.execute("UPDATE agent_messages SET chat_id = 'legacy' WHERE chat_id IS NULL OR chat_id = ''")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_agent_messages_company_chat ON agent_messages(company_id, chat_id)")
        
        # Add report metadata column for agent messages
        try:
            conn.execute("ALTER TABLE agent_messages ADD COLUMN report_metadata TEXT")
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
        # Only update editable fields - resume_text should only be updated via PDF upload
        conn.execute(
            """
            UPDATE users
            SET name = ?, objective = ?, career_objective = ?, interests = ?
            WHERE id = ?
            """,
            (name, objective, objective, interests, user_id),
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
    with get_conn() as conn:
        _ensure_company_profile_columns(conn)
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
        _ensure_company_profile_columns(conn)
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
        _ensure_company_profile_columns(conn)
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
        _ensure_company_profile_columns(conn)
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


def update_job_for_company(
    company_id: str,
    job_id: str,
    title: str,
    description: str,
    skills: str,
    location: str,
    salary_range: str,
) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM jobs WHERE id = ? AND company_id = ?",
            (job_id, company_id),
        ).fetchone()
        if not row:
            return None
        conn.execute(
            """
            UPDATE jobs
            SET title = ?, description = ?, skills = ?, location = ?, salary_range = ?
            WHERE id = ? AND company_id = ?
            """,
            (title, description, skills, location, salary_range, job_id, company_id),
        )
        updated = conn.execute(
            """
            SELECT id, company_id, title, description, skills, location, salary_range, status, created_at
            FROM jobs
            WHERE id = ? AND company_id = ?
            """,
            (job_id, company_id),
        ).fetchone()
    return dict(updated) if updated else None


def close_job_for_company(company_id: str, job_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM jobs WHERE id = ? AND company_id = ?",
            (job_id, company_id),
        ).fetchone()
        if not row:
            return None
        conn.execute(
            "UPDATE jobs SET status = 'closed' WHERE id = ? AND company_id = ?",
            (job_id, company_id),
        )
        conn.execute(
            "UPDATE applications SET status = 'closed' WHERE job_id = ?",
            (job_id,),
        )
        updated = conn.execute(
            """
            SELECT id, company_id, title, description, skills, location, salary_range, status, created_at
            FROM jobs
            WHERE id = ? AND company_id = ?
            """,
            (job_id, company_id),
        ).fetchone()
    return dict(updated) if updated else None


# --- Applications ---
def create_application(user_id: str, job_id: str) -> Dict[str, Any]:
    app_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO applications (id, user_id, job_id, status, technical_score) VALUES (?, ?, ?, ?, ?)",
            (app_id, user_id, job_id, "submitted", None),
        )
    return {
        "id": app_id,
        "user_id": user_id,
        "job_id": job_id,
        "status": "submitted",
        "technical_score": None,
        "fit_score": None,
        "fit_reasoning": "",
        "fit_scored_at": None,
    }


def get_user_applications(user_id: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT a.id, a.user_id, a.job_id, a.status, a.technical_score, a.created_at,
                   j.title, j.location, j.salary_range, j.status AS job_status, c.company_name
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


def get_company_applications(company_id: str, job_id: str | None = None) -> List[Dict[str, Any]]:
    query = """
        SELECT
            a.id AS application_id,
            a.user_id,
            a.job_id,
            a.status,
            a.technical_score,
            a.fit_score,
            a.fit_reasoning,
            a.fit_scored_at,
            a.skill_analysis,
            a.skill_analysis_summary,
            a.created_at,
            j.title AS job_title,
            u.name AS user_name,
            u.email AS user_email,
            u.resume_text,
            u.interests
        FROM applications a
        INNER JOIN jobs j ON a.job_id = j.id
        INNER JOIN users u ON a.user_id = u.id
        WHERE j.company_id = ?
    """
    params: list[Any] = [company_id]
    if job_id:
        query += " AND a.job_id = ?"
        params.append(job_id)
    query += " ORDER BY a.created_at DESC"

    with get_conn() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
    return [dict(row) for row in rows]


def get_company_application_stats(company_id: str) -> Dict[str, int]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT
                SUM(CASE WHEN a.status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
                SUM(CASE WHEN a.status = 'rejected_pre_interview' THEN 1 ELSE 0 END) AS rejected_pre_interview,
                SUM(CASE WHEN a.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN a.status = 'rejected_post_interview' THEN 1 ELSE 0 END) AS rejected_post_interview,
                SUM(CASE WHEN a.status = 'offer' THEN 1 ELSE 0 END) AS offer
            FROM applications a
            INNER JOIN jobs j ON a.job_id = j.id
            WHERE j.company_id = ?
            """,
            (company_id,),
        ).fetchone()
    return {
        "submitted": int((row["submitted"] or 0) if row else 0),
        "rejected_pre_interview": int((row["rejected_pre_interview"] or 0) if row else 0),
        "in_progress": int((row["in_progress"] or 0) if row else 0),
        "rejected_post_interview": int((row["rejected_post_interview"] or 0) if row else 0),
        "offer": int((row["offer"] or 0) if row else 0),
    }


def update_company_application_status(
    company_id: str,
    application_id: str,
    status: str,
    technical_score: int | None,
) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT a.id
            FROM applications a
            INNER JOIN jobs j ON a.job_id = j.id
            WHERE a.id = ? AND j.company_id = ?
            """,
            (application_id, company_id),
        ).fetchone()
        if not row:
            return None
        conn.execute(
            "UPDATE applications SET status = ?, technical_score = ? WHERE id = ?",
            (status, technical_score, application_id),
        )

    with get_conn() as conn:
        updated = conn.execute(
            """
            SELECT
                a.id AS application_id,
                a.user_id,
                a.job_id,
                a.status,
                a.technical_score,
                a.fit_score,
                a.fit_reasoning,
                a.fit_scored_at,
                a.skill_analysis,
                a.skill_analysis_summary,
                a.created_at,
                j.title AS job_title,
                u.name AS user_name,
                u.email AS user_email,
                u.resume_text,
                u.interests
            FROM applications a
            INNER JOIN jobs j ON a.job_id = j.id
            INNER JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
            """,
            (application_id,),
        ).fetchone()
    return dict(updated) if updated else None


def update_application_fit_score(
    application_id: str,
    fit_score: int,
    fit_reasoning: str,
    fit_scored_at: str,
    skill_analysis: str = "",
    skill_analysis_summary: str = "",
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE applications
            SET fit_score = ?, fit_reasoning = ?, fit_scored_at = ?, skill_analysis = ?, skill_analysis_summary = ?
            WHERE id = ?
            """,
            (fit_score, fit_reasoning, fit_scored_at, skill_analysis, skill_analysis_summary, application_id),
        )


# --- Agent Messages ---
def save_agent_message(
    company_id: str,
    chat_id: str,
    message_id: str,
    role: str,
    content: str,
    candidates: str = "[]",
    ranking_source: str = "",
    report_metadata: str = "",
) -> Dict[str, Any]:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO agent_messages (id, company_id, chat_id, role, content, candidates, ranking_source, report_metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (message_id, company_id, chat_id, role, content, candidates, ranking_source, report_metadata),
        )
    return {
        "id": message_id,
        "company_id": company_id,
        "chat_id": chat_id,
        "role": role,
        "content": content,
        "candidates": candidates,
        "ranking_source": ranking_source,
        "report_metadata": report_metadata,
    }


def get_agent_messages(company_id: str, chat_id: str | None = None) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        if chat_id:
            rows = conn.execute(
                """
                SELECT id, company_id, chat_id, role, content, candidates, ranking_source, report_metadata, created_at
                FROM agent_messages
                WHERE company_id = ? AND chat_id = ?
                ORDER BY created_at ASC
                """,
                (company_id, chat_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, company_id, chat_id, role, content, candidates, ranking_source, report_metadata, created_at
                FROM agent_messages
                WHERE company_id = ?
                ORDER BY created_at ASC
                """,
                (company_id,),
            ).fetchall()
    return [dict(row) for row in rows]


def clear_agent_messages(company_id: str, chat_id: str | None = None) -> None:
    with get_conn() as conn:
        if chat_id:
            conn.execute("DELETE FROM agent_messages WHERE company_id = ? AND chat_id = ?", (company_id, chat_id))
        else:
            conn.execute("DELETE FROM agent_messages WHERE company_id = ?", (company_id,))


def get_agent_chats(company_id: str) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
                chat_id,
                MAX(created_at) AS updated_at,
                COUNT(*) AS message_count,
                MAX(CASE WHEN role = 'user' THEN content ELSE '' END) AS last_user_message
            FROM agent_messages
            WHERE company_id = ?
            GROUP BY chat_id
            ORDER BY updated_at DESC
            """,
            (company_id,),
        ).fetchall()
    return [dict(row) for row in rows]


# --- Custom Reports ---
def create_custom_report(
    company_id: str,
    job_id: str | None,
    report_name: str,
    custom_prompt: str,
) -> str:
    """Create a new custom scoring report."""
    report_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO custom_reports (id, company_id, job_id, report_name, custom_prompt)
            VALUES (?, ?, ?, ?, ?)
            """,
            (report_id, company_id, job_id, report_name, custom_prompt),
        )
    return report_id


def get_custom_reports(company_id: str, job_id: str | None = None) -> List[Dict[str, Any]]:
    """Get all custom reports for a company, optionally filtered by job."""
    with get_conn() as conn:
        if job_id:
            rows = conn.execute(
                """
                SELECT id, company_id, job_id, report_name, custom_prompt, created_at
                FROM custom_reports
                WHERE company_id = ? AND (job_id = ? OR job_id IS NULL)
                ORDER BY created_at DESC
                """,
                (company_id, job_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, company_id, job_id, report_name, custom_prompt, created_at
                FROM custom_reports
                WHERE company_id = ?
                ORDER BY created_at DESC
                """,
                (company_id,),
            ).fetchall()
    return [dict(row) for row in rows]


def get_custom_report(report_id: str) -> Dict[str, Any] | None:
    """Get a specific custom report by ID."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, company_id, job_id, report_name, custom_prompt, created_at FROM custom_reports WHERE id = ?",
            (report_id,),
        ).fetchone()
    return dict(row) if row else None


def save_report_score(
    report_id: str,
    application_id: str,
    custom_fit_score: int,
    custom_fit_reasoning: str,
) -> None:
    """Save a custom fit score for an application within a report."""
    score_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO report_scores (id, report_id, application_id, custom_fit_score, custom_fit_reasoning)
            VALUES (?, ?, ?, ?, ?)
            """,
            (score_id, report_id, application_id, custom_fit_score, custom_fit_reasoning),
        )


def get_report_scores(report_id: str) -> List[Dict[str, Any]]:
    """Get all scores for a specific report."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT rs.id, rs.report_id, rs.application_id, rs.custom_fit_score, rs.custom_fit_reasoning, rs.scored_at
            FROM report_scores rs
            WHERE rs.report_id = ?
            ORDER BY rs.custom_fit_score DESC
            """,
            (report_id,),
        ).fetchall()
    return [dict(row) for row in rows]
