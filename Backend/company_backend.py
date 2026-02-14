from __future__ import annotations

from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

try:
    from .company_models import CompanyBackendModels, DEFAULT_CREDS
except ImportError:
    from company_models import CompanyBackendModels, DEFAULT_CREDS


class SignupRequest(BaseModel):
    account_type: str = Field(description="user or company")
    email: str = "company@example.com"
    password: str = DEFAULT_CREDS.get("default_password", "demo_pass")
    company_name: str = "New Company"


class LoginRequest(BaseModel):
    account_type: str = Field(description="user or company")
    username: str = DEFAULT_CREDS.get("default_username", "demo_user")
    password: str = DEFAULT_CREDS.get("default_password", "demo_pass")


class CreateJobPostingRequest(BaseModel):
    company_id: str
    title: str
    description: str
    skills: List[str]
    location: str = "Remote"
    salary_range: str = "TBD"


class TopCandidatesRequest(BaseModel):
    job_id: str
    prompt: str


class SubmitIntervieweeListRequest(BaseModel):
    job_id: str
    user_ids: List[str]


class SubmitIntervieweeFeedbackRequest(BaseModel):
    job_id: str
    user_id: str
    feedback: str


class CompanyBackendEndpoints:
    def __init__(self, app: FastAPI, models: CompanyBackendModels) -> None:
        self.app = app
        self.models = models
        self._register_routes()

    def _register_routes(self) -> None:
        @self.app.post("/signup")
        def signup(payload: SignupRequest):
            company = self.models.create_company(payload.model_dump())
            return {"status": "ok", "id": company["id"], "account_type": payload.account_type}

        @self.app.post("/login")
        def login(payload: LoginRequest):
            token = self.models.create_session(payload.model_dump())
            return {"status": "ok", "token": token, "account_type": payload.account_type}

        @self.app.post("/create-job-posting")
        def create_job_posting(payload: CreateJobPostingRequest):
            job_id = self.models.create_job_posting(payload.model_dump())
            return {"status": "ok", "job_id": job_id}

        @self.app.post("/get-top-candidates")
        def get_top_candidates(payload: TopCandidatesRequest):
            top_candidates = self.models.get_top_candidates(
                job_id=payload.job_id, prompt=payload.prompt
            )
            return {"job_id": payload.job_id, "top_candidates": top_candidates}

        @self.app.post("/submit-intervieweee-list")
        def submit_intervieweee_list(payload: SubmitIntervieweeListRequest):
            self.models.submit_interviewee_list(job_id=payload.job_id, user_ids=payload.user_ids)
            return {"status": "ok", "job_id": payload.job_id, "user_ids": payload.user_ids}

        @self.app.post("/submit-interviewee-feedback")
        def submit_interviewee_feedback(payload: SubmitIntervieweeFeedbackRequest):
            feedback_entry = self.models.submit_interviewee_feedback(
                job_id=payload.job_id,
                user_id=payload.user_id,
                feedback=payload.feedback,
            )
            return {"status": "ok", "feedback": feedback_entry}


app = FastAPI(title="HireUp Company Backend")
company_models = CompanyBackendModels()
company_endpoints = CompanyBackendEndpoints(app=app, models=company_models)
