from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List
from uuid import uuid4

from fastapi import HTTPException


APP_DIR = Path(__file__).resolve().parent
PASSWORD_FILE = APP_DIR / "passwords.json"


def load_default_credentials() -> Dict[str, str]:
    if not PASSWORD_FILE.exists():
        return {"default_username": "demo_user", "default_password": "demo_pass"}
    with PASSWORD_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


DEFAULT_CREDS = load_default_credentials()


class UserBackendModels:
    def __init__(self) -> None:
        self.users: Dict[str, Dict] = {}
        self.sessions: Dict[str, Dict] = {}
        self.applications: List[Dict] = []
        self.interviews: Dict[str, List[Dict]] = {}
        self.mock_matched_jobs: List[Dict] = [
            {
                "job_id": "job-101",
                "title": "Backend Engineer",
                "company_name": "Sorttie Labs",
                "skills": ["python", "fastapi", "postgres"],
            },
            {
                "job_id": "job-102",
                "title": "ML Ranking Engineer",
                "company_name": "SignalMatch",
                "skills": ["pytorch", "recommenders", "ranking"],
            },
        ]

    def create_user(self, user_data: Dict) -> Dict:
        user_id = str(uuid4())
        user_record = dict(user_data)
        user_record["id"] = user_id
        self.users[user_id] = user_record
        return user_record

    def create_session(self, login_data: Dict) -> str:
        expected_username = DEFAULT_CREDS.get("default_username", "demo_user")
        expected_password = DEFAULT_CREDS.get("default_password", "demo_pass")
        if (
            login_data.get("username") != expected_username
            or login_data.get("password") != expected_password
        ):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = str(uuid4())
        self.sessions[token] = dict(login_data)
        return token

    def get_matched_jobs(self, user_id: str) -> List[Dict]:
        if user_id not in self.users:
            raise HTTPException(status_code=404, detail="User not found")
        return self.mock_matched_jobs

    def get_user_interviews(self, user_id: str) -> List[Dict]:
        return self.interviews.get(user_id, [])

    def apply_job(self, user_id: str, job_id: str) -> Dict:
        if user_id not in self.users:
            raise HTTPException(status_code=404, detail="User not found")
        application = {
            "application_id": str(uuid4()),
            "user_id": user_id,
            "job_id": job_id,
            "status": "submitted",
        }
        self.applications.append(application)
        return application
