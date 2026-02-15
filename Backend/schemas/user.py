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
