"""Company routes."""
from fastapi import APIRouter

from schemas.company import (
    CreateJobPostingRequest,
    TopCandidatesRequest,
    SubmitIntervieweeListRequest,
    SubmitIntervieweeFeedbackRequest,
)
from services import company as company_service

router = APIRouter(tags=["companies"])


@router.post("/create-job-posting")
def create_job_posting(payload: CreateJobPostingRequest):
    job_id = company_service.create_job_posting(payload.model_dump())
    return {"status": "ok", "job_id": job_id}


@router.post("/get-top-candidates")
def get_top_candidates(payload: TopCandidatesRequest):
    top_candidates = company_service.get_top_candidates(
        job_id=payload.job_id,
        prompt=payload.prompt,
    )
    return {"job_id": payload.job_id, "top_candidates": top_candidates}


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
