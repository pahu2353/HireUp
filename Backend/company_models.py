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


class CompanyBackendModels:
    def __init__(self) -> None:
        self.companies: Dict[str, Dict] = {}
        self.sessions: Dict[str, Dict] = {}
        self.jobs: Dict[str, Dict] = {}
        self.interview_lists: Dict[str, List[str]] = {}
        self.interview_feedback: List[Dict] = []

    def create_company(self, company_data: Dict) -> Dict:
        company_id = str(uuid4())
        company_record = dict(company_data)
        company_record["id"] = company_id
        self.companies[company_id] = company_record
        return company_record

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

    def create_job_posting(self, job_data: Dict) -> str:
        company_id = job_data.get("company_id")
        if company_id not in self.companies:
            raise HTTPException(status_code=404, detail="Company not found")
        job_id = str(uuid4())
        job_record = dict(job_data)
        job_record["job_id"] = job_id
        self.jobs[job_id] = job_record
        return job_id

    def lightweight_candidate_ranker(self, prompt: str, candidates: List[Dict]) -> List[Dict]:
        prompt_terms = {term.lower() for term in prompt.split() if len(term) > 2}
        ranked = []
        for candidate in candidates:
            skills = {s.lower() for s in candidate.get("skills", [])}
            score = len(prompt_terms & skills)
            ranked.append(
                {
                    **candidate,
                    "score": score,
                    "reasoning": f"Matched {score} prompt skill terms.",
                }
            )
        return sorted(ranked, key=lambda x: x["score"], reverse=True)

    def get_top_candidates(self, job_id: str, prompt: str) -> List[Dict]:
        if job_id not in self.jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        mock_candidates = [
            {"user_id": "user-1", "skills": ["python", "fastapi", "sql"]},
            {"user_id": "user-2", "skills": ["react", "typescript", "node"]},
            {"user_id": "user-3", "skills": ["pytorch", "ranking", "python"]},
        ]
        ranked = self.lightweight_candidate_ranker(prompt, mock_candidates)
        return ranked[:12]

    def submit_interviewee_list(self, job_id: str, user_ids: List[str]) -> None:
        if job_id not in self.jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        self.interview_lists[job_id] = user_ids

    def submit_interviewee_feedback(self, job_id: str, user_id: str, feedback: str) -> Dict:
        if job_id not in self.jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        feedback_entry = {
            "feedback_id": str(uuid4()),
            "job_id": job_id,
            "user_id": user_id,
            "feedback": feedback,
        }
        self.interview_feedback.append(feedback_entry)
        return feedback_entry
