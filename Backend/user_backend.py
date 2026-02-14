from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

try:
    from .user_models import DEFAULT_CREDS, UserBackendModels
except ImportError:
    from user_models import DEFAULT_CREDS, UserBackendModels


class SignupRequest(BaseModel):
    account_type: str = Field(description="user or company")
    email: str = "user@example.com"
    password: str = DEFAULT_CREDS.get("default_password", "demo_pass")
    name: str = "New User"
    resume: Optional[str] = None
    interests: List[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
    account_type: str = Field(description="user or company")
    username: str = DEFAULT_CREDS.get("default_username", "demo_user")
    password: str = DEFAULT_CREDS.get("default_password", "demo_pass")


class ApplyJobRequest(BaseModel):
    user_id: str
    job_id: str


class UserBackendEndpoints:
    def __init__(self, app: FastAPI, models: UserBackendModels) -> None:
        self.app = app
        self.models = models
        self._register_routes()

    def _register_routes(self) -> None:
        @self.app.post("/signup")
        def signup(payload: SignupRequest):
            user = self.models.create_user(payload.model_dump())
            return {"status": "ok", "id": user["id"], "account_type": payload.account_type}

        @self.app.post("/login")
        def login(payload: LoginRequest):
            token = self.models.create_session(payload.model_dump())
            return {"status": "ok", "token": token, "account_type": payload.account_type}

        @self.app.get("/get-matched-jobs")
        def get_matched_jobs(user_id: str):
            matched_jobs = self.models.get_matched_jobs(user_id)
            return {"user_id": user_id, "matched_jobs": matched_jobs}

        @self.app.get("/get-user-interviews")
        def get_user_interviews(user_id: str):
            interviews = self.models.get_user_interviews(user_id)
            return {"user_id": user_id, "interviews": interviews}

        @self.app.post("/apply-job")
        def apply_job(payload: ApplyJobRequest):
            application = self.models.apply_job(user_id=payload.user_id, job_id=payload.job_id)
            return {"status": "ok", "application": application}


app = FastAPI(title="HireUp User Backend")
user_models = UserBackendModels()
user_endpoints = UserBackendEndpoints(app=app, models=user_models)
