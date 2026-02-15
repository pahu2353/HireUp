"""Seed 40 generic applicants to Google's Software Engineering Intern position."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import database

GOOGLE_COMPANY = {
    "company_name": "Google",
    "email": "google@google.com",
    "password": "password",
    "website": "google.com",
    "description": "Technology company specializing in Internet-related services and products.",
    "company_size": "10000+",
}

GOOGLE_INTERN_JOB = {
    "title": "Software Engineering Intern",
    "description": (
        "Work on next-generation technologies that change how billions of users connect, explore, "
        "and interact with information."
    ),
    "skills": ["Python", "Java", "C++", "Go", "Distributed Systems"],
    "location": "Mountain View, CA",
    "salary_range": "$8k-$12k/month",
}

NUM_APPLICANTS = 40


def get_or_create_google_company_id() -> str | None:
    with database.get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM companies WHERE company_name = ?",
            (GOOGLE_COMPANY["company_name"],),
        ).fetchone()

    if row:
        return row["id"]

    created = database.create_company(
        email=GOOGLE_COMPANY["email"],
        password=GOOGLE_COMPANY["password"],
        company_name=GOOGLE_COMPANY["company_name"],
        website=GOOGLE_COMPANY["website"],
        description=GOOGLE_COMPANY["description"],
        company_size=GOOGLE_COMPANY["company_size"],
    )
    if not created:
        with database.get_conn() as conn:
            row = conn.execute(
                "SELECT id FROM companies WHERE company_name = ?",
                (GOOGLE_COMPANY["company_name"],),
            ).fetchone()
        return row["id"] if row else None

    return created["id"]


def get_or_create_intern_job_id(company_id: str) -> str:
    with database.get_conn() as conn:
        row = conn.execute(
            """
            SELECT id FROM jobs
            WHERE company_id = ? AND title = ?
            """,
            (company_id, GOOGLE_INTERN_JOB["title"]),
        ).fetchone()

    if row:
        print(f"Found existing job: {GOOGLE_INTERN_JOB['title']}")
        return row["id"]

    job_id = database.create_job(
        company_id=company_id,
        title=GOOGLE_INTERN_JOB["title"],
        description=GOOGLE_INTERN_JOB["description"],
        skills=json.dumps(GOOGLE_INTERN_JOB["skills"]),
        location=GOOGLE_INTERN_JOB["location"],
        salary_range=GOOGLE_INTERN_JOB["salary_range"],
    )
    print(f"Created job: {GOOGLE_INTERN_JOB['title']}")
    return job_id


def seed_google_intern_applicants() -> None:
    database.init_db()

    company_id = get_or_create_google_company_id()
    if not company_id:
        print("Could not find or create Google company.")
        return

    job_id = get_or_create_intern_job_id(company_id)

    created_users = 0
    created_applications = 0

    for i in range(1, NUM_APPLICANTS + 1):
        name = f"Intern Candidate {i:02d}"
        email = f"google.intern{i:02d}@hireup.dev"

        user = database.get_user_by_email(email)
        if user:
            user_id = user["id"]
        else:
            created = database.create_user(
                email=email,
                password="password",
                name=name,
                objective="Seeking a software engineering internship.",
                interests=json.dumps(["Software Engineering", "Computer Science"]),
            )
            if not created:
                print(f"  ✗ Failed to create user: {email}")
                continue
            user_id = created["id"]
            created_users += 1

        if database.check_application_exists(user_id, job_id):
            continue

        database.create_application(user_id, job_id)
        created_applications += 1
        print(f"  ✓ Applied: {name} ({email})")

    print(
        f"\n✅ Google Intern seed complete: "
        f"{created_users} users created, {created_applications} applications created."
    )


if __name__ == "__main__":
    seed_google_intern_applicants()
