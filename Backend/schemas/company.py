"""Request/response schemas for company endpoints."""
from typing import List

from pydantic import BaseModel


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
