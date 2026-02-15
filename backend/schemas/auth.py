"""Request/response schemas for auth (signup, login)."""
from typing import List, Optional

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    account_type: str = "user"
    email: str
    password: str
    name: str = ""
    objective: str = ""
    career_objective: Optional[str] = None
    resume: Optional[str] = None  # fallback pasted text when no PDF
    resume_pdf_base64: Optional[str] = None  # base64-encoded PDF file
    interests: List[str] = Field(default_factory=list)
    grad_date: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    company_name: str = ""
    website: str = ""
    description: str = ""
    company_size: str = ""


class LoginRequest(BaseModel):
    account_type: str = Field(description="user or company")
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = ""
