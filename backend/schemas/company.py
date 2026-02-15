"""Request/response schemas for company endpoints."""
from typing import List

from pydantic import BaseModel, Field


class CreateJobPostingRequest(BaseModel):
    company_id: str
    title: str
    description: str
    skills: List[str] = Field(min_length=3)
    location: str = "Remote"
    salary_range: str = "TBD"


class UpdateJobPostingRequest(BaseModel):
    company_id: str
    job_id: str
    title: str
    description: str
    skills: List[str] = Field(min_length=3)
    location: str = "Remote"
    salary_range: str = "TBD"


class DeleteJobPostingRequest(BaseModel):
    company_id: str
    job_id: str


class TopCandidatesRequest(BaseModel):
    job_id: str
    prompt: str
    limit: int | None = None  # if not set, parsed from prompt (e.g. "top 3") or defaults to 12


class SubmitIntervieweeListRequest(BaseModel):
    job_id: str
    user_ids: List[str]


class SubmitIntervieweeFeedbackRequest(BaseModel):
    job_id: str
    user_id: str
    feedback: str


class UpdateCompanyProfileRequest(BaseModel):
    company_id: str
    company_name: str = ""
    website: str = ""
    description: str = ""
    company_size: str = ""
    stage: str = ""
    culture_benefits: str = ""


class UpdateApplicationStatusRequest(BaseModel):
    company_id: str
    application_id: str
    status: str
    technical_score: int | None = None


class AnalyzeCandidateSkillsRequest(BaseModel):
    company_id: str
    user_id: str
    job_id: str | None = None
