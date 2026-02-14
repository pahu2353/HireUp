"""Request/response schemas for user (applicant) endpoints."""
from pydantic import BaseModel


class ApplyJobRequest(BaseModel):
    user_id: str
    job_id: str
