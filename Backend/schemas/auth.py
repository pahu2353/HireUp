"""Request/response schemas for auth (signup, login)."""
from typing import List, Optional

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    account_type: str = "user"
    email: str
    password: str
    name: str = ""
    resume: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    company_name: str = ""
    website: str = ""
    description: str = ""
    company_size: str = ""


class LoginRequest(BaseModel):
    account_type: str = Field(description="user or company")
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = ""
