"""Seed 12 existing applicants to Jane Street's Software Engineering Intern position."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import database

SOFTWARE_ENGINEERING_INTERN_JOB = {
    "title": "Software Engineering Intern",
    "description": (
        "Build and improve internal trading systems and developer tools. "
        "Work with engineers on production systems, data pipelines, and performance-critical services."
    ),
    "skills": ["Python", "Java", "C++", "Algorithms", "Distributed Systems"],
    "location": "New York, NY",
    "salary_range": "$120k-$180k",
}


def seed_jane_street_swe_intern_applicants():
    """Seed 12 applicants from the DB to Jane Street's Software Engineering Intern job."""
    database.init_db()

    # Get Jane Street company
    with database.get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM companies WHERE company_name = ?",
            ("Jane Street",),
        ).fetchone()

    if not row:
        print("Jane Street not found. Run seed_data.py first.")
        return

    company_id = row["id"]

    # Find or create Software Engineering Intern job
    with database.get_conn() as conn:
        job_row = conn.execute(
            """
            SELECT id FROM jobs
            WHERE company_id = ? AND title = ?
            """,
            (company_id, SOFTWARE_ENGINEERING_INTERN_JOB["title"]),
        ).fetchone()

    if job_row:
        job_id = job_row["id"]
        print(f"Found existing job: {SOFTWARE_ENGINEERING_INTERN_JOB['title']}")
    else:
        job_id = database.create_job(
            company_id=company_id,
            title=SOFTWARE_ENGINEERING_INTERN_JOB["title"],
            description=SOFTWARE_ENGINEERING_INTERN_JOB["description"],
            skills=json.dumps(SOFTWARE_ENGINEERING_INTERN_JOB["skills"]),
            location=SOFTWARE_ENGINEERING_INTERN_JOB["location"],
            salary_range=SOFTWARE_ENGINEERING_INTERN_JOB["salary_range"],
        )
        print(f"Created job: {SOFTWARE_ENGINEERING_INTERN_JOB['title']}")

    # Get 12 users who have not yet applied to this job
    with database.get_conn() as conn:
        rows = conn.execute(
            """
            SELECT u.id, u.name, u.email
            FROM users u
            WHERE u.id NOT IN (
                SELECT user_id FROM applications WHERE job_id = ?
            )
            LIMIT 12
            """,
            (job_id,),
        ).fetchall()

    users = [dict(r) for r in rows]

    if len(users) < 12:
        print(f"Only {len(users)} users available (need 12). Create more users first.")
    else:
        users = users[:12]

    created = 0
    for u in users:
        if database.check_application_exists(u["id"], job_id):
            continue
        database.create_application(u["id"], job_id)
        created += 1
        print(f"  ✓ Applied: {u.get('name') or u.get('email') or u['id']}")

    print(f"\n✅ {created} applicants applied to Jane Street Software Engineering Intern")


if __name__ == "__main__":
    seed_jane_street_swe_intern_applicants()
