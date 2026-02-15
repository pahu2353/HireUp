"""Company routes."""
from fastapi import APIRouter

from schemas.company import (
    CreateJobPostingRequest,
    TopCandidatesRequest,
    SubmitIntervieweeListRequest,
    SubmitIntervieweeFeedbackRequest,
    UpdateCompanyProfileRequest,
    UpdateApplicationStatusRequest,
)
from services import company as company_service

router = APIRouter(tags=["companies"])


@router.post("/create-job-posting")
def create_job_posting(payload: CreateJobPostingRequest):
    job_id = company_service.create_job_posting(payload.model_dump())
    return {"status": "ok", "job_id": job_id}


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


@router.post("/update-application-status")
def update_application_status(payload: UpdateApplicationStatusRequest):
    updated = company_service.update_application_status(
        company_id=payload.company_id,
        application_id=payload.application_id,
        status=payload.status,
        technical_score=payload.technical_score,
    )
    return {"status": "ok", "application": updated}
