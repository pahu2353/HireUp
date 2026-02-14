"""Auth routes: signup, login."""
from fastapi import APIRouter, HTTPException

from schemas.auth import LoginRequest, SignupRequest
from services import user as user_service
from services import company as company_service

router = APIRouter(tags=["auth"])


@router.post("/signup")
def signup(payload: SignupRequest):
    data = payload.model_dump()
    if payload.account_type == "company":
        company = company_service.create_company(data)
        return {"status": "ok", "id": company["id"], "account_type": "company"}
    u = user_service.create_user(data)
    return {"status": "ok", "id": u["id"], "account_type": "user"}


@router.post("/login")
def login(payload: LoginRequest):
    email = (payload.email or payload.username or "").strip()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    login_data = {"email": email, "password": payload.password}
    if payload.account_type == "company":
        result = company_service.create_session(login_data)
        return {"status": "ok", "token": result["token"], "account_type": "company", "id": result["id"]}
    result = user_service.create_session(login_data)
    return {"status": "ok", "token": result["token"], "account_type": "user", "id": result["id"]}
