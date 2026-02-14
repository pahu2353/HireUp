"""User (applicant) routes."""
from fastapi import APIRouter

from schemas.user import ApplyJobRequest
from services import user as user_service

router = APIRouter(tags=["users"])


@router.get("/get-matched-jobs")
def get_matched_jobs(user_id: str):
    matched_jobs = user_service.get_matched_jobs(user_id)
    return {"user_id": user_id, "matched_jobs": matched_jobs}


@router.get("/get-user-interviews")
def get_user_interviews(user_id: str):
    interviews = user_service.get_user_interviews(user_id)
    return {"user_id": user_id, "interviews": interviews}


@router.post("/apply-job")
def apply_job(payload: ApplyJobRequest):
    application = user_service.apply_job(user_id=payload.user_id, job_id=payload.job_id)
    return {"status": "ok", "application": application}
