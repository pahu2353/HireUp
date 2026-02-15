"""User (applicant) routes."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from schemas.user import ApplyJobRequest, UpdateProfileRequest, UpdateUserProfileRequest
from services import user as user_service
import database
import pdf_utils

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
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    resume_pdf = user.get("resume_pdf")
    if not resume_pdf:
        raise HTTPException(status_code=404, detail="No resume PDF found for this user")

    filename = f'{(user.get("name") or "resume").replace(" ", "_")}_resume.pdf'
    return Response(
        content=resume_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/applications/{user_id}")
def get_applications(user_id: str):
    if not database.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    applications = database.get_user_applications(user_id)
    return {"user_id": user_id, "applications": applications}


@router.get("/user-profile")
def get_user_profile(user_id: str):
    return user_service.get_user_profile(user_id)


@router.put("/user-profile")
def update_user_profile(payload: UpdateUserProfileRequest):
    profile = user_service.update_user_profile_v2(payload.model_dump())
    return {"status": "ok", "profile": profile}


class UploadResumeRequest(BaseModel):
    pdf_base64: str


@router.post("/users/upload-resume/{user_id}")
def upload_resume(user_id: str, payload: UploadResumeRequest):
    """Upload a new resume PDF and extract text."""
    import base64
    
    user = database.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF base64")
    
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty PDF")
    
    # Extract text from PDF
    resume_text = pdf_utils.extract_pdf_text(pdf_bytes)
    
    # Update user with new PDF and extracted text
    success = database.update_user(
        user_id=user_id,
        resume_pdf=pdf_bytes,
        resume_text=resume_text,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update resume")
    
    return {
        "status": "ok",
        "message": "Resume uploaded successfully",
        "text_length": len(resume_text),
    }
