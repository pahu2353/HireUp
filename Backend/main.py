"""
HireUp API – single FastAPI app.
Run from backend/: uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import database
from config import CORS_ORIGINS, CORS_ORIGIN_REGEX
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth_router, users_router, companies_router

database.init_db()

app = FastAPI(title="HireUp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(companies_router)


@app.get("/")
def root():
    return {"message": "HireUp API", "docs": "/docs"}
