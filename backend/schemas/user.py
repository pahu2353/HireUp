"""Request/response schemas for user (applicant) endpoints."""
from typing import List, Optional

from pydantic import BaseModel


class ApplyJobRequest(BaseModel):
    user_id: str
    job_id: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    resume_pdf_base64: Optional[str] = None
    interests: Optional[List[str]] = None
    career_objective: Optional[str] = None
    grad_date: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class UpdateUserProfileRequest(BaseModel):
    user_id: str
    first_name: str = ""
    last_name: str = ""
    objective: str = ""
    resume: str = ""
    skills: List[str] = []
    grad_date: str = ""
    linkedin_url: str = ""
    github_url: str = ""
