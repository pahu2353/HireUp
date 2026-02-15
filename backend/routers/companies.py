"""Company routes."""
import json as _json
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from schemas.company import (
    CreateJobPostingRequest,
    UpdateJobPostingRequest,
    DeleteJobPostingRequest,
    TopCandidatesRequest,
    SubmitIntervieweeListRequest,
    SubmitIntervieweeFeedbackRequest,
    UpdateCompanyProfileRequest,
    UpdateApplicationStatusRequest,
    AnalyzeCandidateSkillsRequest,
)
from services import company as company_service
import database

router = APIRouter(tags=["companies"])


@router.post("/create-job-posting")
def create_job_posting(payload: CreateJobPostingRequest):
    job_id = company_service.create_job_posting(payload.model_dump())
    return {"status": "ok", "job_id": job_id}


@router.put("/update-job-posting")
def update_job_posting(payload: UpdateJobPostingRequest):
    job = company_service.update_job_posting(payload.model_dump())
    return {"status": "ok", "job": job}


@router.post("/delete-job-posting")
def delete_job_posting(payload: DeleteJobPostingRequest):
    job = company_service.delete_job_posting(company_id=payload.company_id, job_id=payload.job_id)
    return {"status": "ok", "job": job}


@router.get("/get-company-jobs")
def get_company_jobs(company_id: str):
    from database import get_jobs_by_company
    import json
    jobs = get_jobs_by_company(company_id)
    # Parse skills JSON for each job
    for job in jobs:
        try:
            job["skills"] = json.loads(job.get("skills", "[]"))
        except Exception:
            job["skills"] = []
    return {"company_id": company_id, "jobs": jobs}


@router.post("/get-top-candidates")
def get_top_candidates(payload: TopCandidatesRequest):
    result = company_service.get_top_candidates(
        job_id=payload.job_id,
        prompt=payload.prompt,
        limit=payload.limit,
    )
    return {
        "job_id": payload.job_id,
        "top_candidates": result.get("top_candidates", []),
        "ranking_source": result.get("ranking_source", "unknown"),
        "ranking_error": result.get("ranking_error", ""),
    }


@router.post("/submit-interviewee-list")
def submit_interviewee_list(payload: SubmitIntervieweeListRequest):
    company_service.submit_interviewee_list(job_id=payload.job_id, user_ids=payload.user_ids)
    return {"status": "ok", "job_id": payload.job_id, "user_ids": payload.user_ids}


@router.post("/submit-interviewee-feedback")
def submit_interviewee_feedback(payload: SubmitIntervieweeFeedbackRequest):
    feedback_entry = company_service.submit_interviewee_feedback(
        job_id=payload.job_id,
        user_id=payload.user_id,
        feedback=payload.feedback,
    )
    return {"status": "ok", "feedback": feedback_entry}


@router.get("/company-profile")
def get_company_profile(company_id: str):
    return company_service.get_company_profile(company_id)


@router.put("/company-profile")
def update_company_profile(payload: UpdateCompanyProfileRequest):
    profile = company_service.update_company_profile(payload.model_dump())
    return {"status": "ok", "profile": profile}


@router.get("/company-dashboard")
def get_company_dashboard(company_id: str):
    return company_service.get_company_dashboard(company_id)


@router.get("/company-job-postings")
def get_company_job_postings(company_id: str):
    jobs = company_service.list_company_jobs(company_id)
    return {"company_id": company_id, "jobs": jobs}


@router.get("/get-company-applicants")
def get_company_applicants(company_id: str, job_id: str | None = None):
    applicants = company_service.list_company_applicants(company_id, job_id=job_id)
    return {"company_id": company_id, "job_id": job_id, "applicants": applicants}


@router.post("/score-applicants")
def score_applicants(company_id: str, job_id: str | None = None, batch_size: int = 5, offset: int = 0):
    result = company_service.score_unrated_applicants(
        company_id, 
        job_id=job_id,
        batch_size=batch_size,
        offset=offset,
    )
    return {
        "company_id": company_id,
        "job_id": job_id,
        "scored_count": result["scored_count"],
        "total_unrated": result["total_unrated"],
        "applicants": result["applicants"],
    }


@router.post("/update-application-status")
def update_application_status(payload: UpdateApplicationStatusRequest):
    updated = company_service.update_application_status(
        company_id=payload.company_id,
        application_id=payload.application_id,
        status=payload.status,
        technical_score=payload.technical_score,
    )
    return {"status": "ok", "application": updated}


@router.post("/analyze-candidate-skills")
def analyze_candidate_skills(payload: AnalyzeCandidateSkillsRequest):
    result = company_service.analyze_candidate_skills(
        company_id=payload.company_id,
        user_id=payload.user_id,
        job_id=payload.job_id,
    )
    return {"status": "ok", "analysis": result}


# --- Agent Chat Persistence ---


class SaveAgentMessageRequest(BaseModel):
    company_id: str
    message_id: str
    role: str
    content: str
    candidates: Optional[str] = "[]"
    ranking_source: Optional[str] = ""


class SaveAgentMessagesRequest(BaseModel):
    company_id: str
    messages: List[SaveAgentMessageRequest]


@router.get("/agent-messages")
def get_agent_messages(company_id: str):
    rows = database.get_agent_messages(company_id)
    result = []
    for row in rows:
        candidates_raw = row.get("candidates") or "[]"
        try:
            candidates = _json.loads(candidates_raw) if isinstance(candidates_raw, str) else []
        except Exception:
            candidates = []
        result.append({
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
            "candidates": candidates,
            "rankingSource": row.get("ranking_source") or "",
        })
    return {"company_id": company_id, "messages": result}


@router.post("/agent-messages")
def save_agent_messages(payload: SaveAgentMessagesRequest):
    for msg in payload.messages:
        database.save_agent_message(
            company_id=msg.company_id,
            message_id=msg.message_id,
            role=msg.role,
            content=msg.content,
            candidates=msg.candidates or "[]",
            ranking_source=msg.ranking_source or "",
        )
    return {"status": "ok", "count": len(payload.messages)}


@router.delete("/agent-messages")
def clear_agent_messages(company_id: str):
    database.clear_agent_messages(company_id)
    return {"status": "ok"}
