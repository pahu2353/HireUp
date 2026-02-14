"""SQLite database layer for HireUp. Uses a single file (hireup.db) for persistence."""
from __future__ import annotations

import sqlite3
from typing import Any, Dict, List, Optional
from uuid import uuid4

from passlib.context import CryptContext

try:
    from .config import DB_PATH
except ImportError:
    from config import DB_PATH

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                resume TEXT,
                interests TEXT,
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
                account_type TEXT DEFAULT 'company',
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                account_type TEXT NOT NULL,
                account_id TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
        """)


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# --- Users (applicants) ---
def create_user(email: str, password: str, name: str = "", resume: str = "", interests: str = "[]") -> Dict[str, Any]:
    if get_user_by_email(email):
        return None  # caller should raise 409
    user_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, email, password_hash, name, resume, interests) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, email, hash_password(password), name, resume, interests),
        )
    return {"id": user_id, "email": email, "name": name, "resume": resume, "interests": interests, "account_type": "user"}


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT id, email, password_hash, name, resume, interests FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "name": row["name"] or "",
        "resume": row["resume"] or "",
        "interests": row["interests"] or "[]",
        "account_type": "user",
    }


def verify_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return {k: v for k, v in user.items() if k != "password_hash"}


# --- Companies ---
def create_company(
    email: str,
    password: str,
    company_name: str = "",
    website: str = "",
    description: str = "",
    company_size: str = "",
) -> Dict[str, Any]:
    if get_company_by_email(email):
        return None
    company_id = str(uuid4())
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO companies (id, email, password_hash, company_name, website, description, company_size)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (company_id, email, hash_password(password), company_name, website, description, company_size),
        )
    return {
        "id": company_id,
        "email": email,
        "company_name": company_name,
        "website": website,
        "description": description,
        "company_size": company_size,
        "account_type": "company",
    }


def get_company_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, company_name, website, description, company_size FROM companies WHERE email = ?",
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
        "account_type": "company",
    }


def verify_company(email: str, password: str) -> Optional[Dict[str, Any]]:
    company = get_company_by_email(email)
    if not company or not verify_password(password, company["password_hash"]):
        return None
    return {k: v for k, v in company.items() if k != "password_hash"}


# --- Sessions ---
def create_session(account_type: str, account_id: str) -> str:
    token = str(uuid4())
    with get_conn() as conn:
        conn.execute("INSERT INTO sessions (token, account_type, account_id) VALUES (?, ?, ?)", (token, account_type, account_id))
    return token


def get_session(token: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT token, account_type, account_id FROM sessions WHERE token = ?", (token,)).fetchone()
    if not row:
        return None
    return {"token": row["token"], "account_type": row["account_type"], "account_id": row["account_id"]}


# --- In-memory data we still need (applications, jobs, etc.) - keep in models but allow future DB migration
def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT id, email, name, resume, interests FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return None
    return dict(row)


def get_company_by_id(company_id: str) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, company_name, website, description, company_size FROM companies WHERE id = ?",
            (company_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row)
