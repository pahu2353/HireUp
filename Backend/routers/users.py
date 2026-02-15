"""User (applicant) routes."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from schemas.user import ApplyJobRequest, UpdateProfileRequest
from services import user as user_service
import database

router = APIRouter(tags=["users"])


@router.get("/profile/{user_id}")
def get_profile(user_id: str):
    profile = user_service.get_user_profile(user_id)
    return {"user_id": user_id, "profile": profile}


@router.put("/profile/{user_id}")
def update_profile(user_id: str, payload: UpdateProfileRequest):
    updated = user_service.update_user_profile(user_id, payload.model_dump(exclude_none=False))
    return {"status": "ok", "profile": updated}


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


@router.get("/resume/{user_id}")
def get_resume(user_id: str):
    """Download user's resume PDF if available."""
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    resume_pdf = user.get("resume_pdf")
    if not resume_pdf:
        raise HTTPException(status_code=404, detail="No resume PDF found for this user")
    
    return Response(
        content=resume_pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{user.get("name", "resume").replace(" ", "_")}_resume.pdf"'
        }
    )


@router.get("/applications/{user_id}")
def get_applications(user_id: str):
    """Get all applications for a user."""
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    applications = database.get_user_applications(user_id)
    return {"user_id": user_id, "applications": applications}
