# HireUp
<img width="2880" height="1684" alt="image" src="https://github.com/user-attachments/assets/1b670e35-b57f-4d9a-8acc-213e821e3aed" />

https://youtu.be/a03VWeouYsk
HireUp is a high-signal hiring platform built to fix noisy recruiting pipelines.

Instead of rewarding spam applications and resume falsification, HireUp combines:

- Scarcity-driven application limits
- A novel two-way two-tower matching system
- Iris, an AI recruiting analyst/chat interface

The goal is simple: help companies find stronger candidates faster, and help applicants apply with intent instead of volume.

Imagine you’re a recruiter at an early-stage startup. You open applications expecting 100 strong resumes. Instead, you get 2000 applicants, and most are not relevant to your stack or role requirements.

You end up spending time sifting through low-signal applications while the best-fit candidates get buried. At the same time, applicants are forced into a spam-apply strategy just to get responses.

This creates three core problems:

1. Job applications become a volume game, not a quality game.
2. Resume misrepresentation rises because the system rewards attention-grabbing over fit.
3. Screening burden falls on one recruiter/hiring lead, slowing down decisions.

HireUp addresses these in sequence:

- Scarcity constraints reduce spam and improve applicant intent.
- A two-way two-tower model improves fit matching in both directions.
- Iris analyzes and ranks finalists through an interactive recruiting interface.

Iris works because problems 1 and 2 are solved first, so it operates on higher-quality, higher-trust candidate pools.

## Why This Team Thesis

- We are Waterloo students and have seen WaterlooWorks quality degrade over time as competition and volume pressure increased.
- We have direct experience implementing two-tower retrieval systems.
- Our adaptation applies two-way preference learning to hiring, which is uncommon in this space.
- We aim to make recruiters 10x more effective, similar to how tools like Cursor increase developer leverage.

## Product Thesis

### Problem 1: Applications Are a Volume Game

- Platforms incentivize spam
- Serious candidates get drowned out
- Recruiters spend energy filtering noise instead of evaluating signal

### Problem 2: Resume Signal Is Easy to Game

- Resume point falsification is incentivized by spam-heavy funnels
- Resume-only filtering is weak when input quality is poor

### Problem 3: Final Screening Load Is Too High

- One recruiter/founder often handles too much manual triage
- Decision quality drops as fatigue rises

## Solution Architecture

### 1. Scarcity as a Product Mechanism

- Daily application caps force intentional applications
- Constrained flow increases average quality per application

### 2. Two-Way Two-Tower Matching

- Represent users and jobs as embeddings
- Learn both:
  - Which jobs users are likely to apply to
  - Which users companies are likely to interview/select
- Continuously update from outcomes:
  - apply, reject, interview, offer, feedback

### 3. Iris (AI Recruiting Agent)

- Parses and reasons over the shortlisted candidate pool
- Supports chat-based queries:
  - “Find candidates strong in X/Y/Z”
  - “Rank for this role with these constraints”
- “Agent mode” continuously searches for better-fit candidates as data changes

## End-to-End Flows

### Applicant Flow

1. Create account (resume, interests, objectives)
2. Receive daily matched jobs
3. Apply to a limited number of jobs
4. Interview and offer outcomes are logged
5. Acceptance/rejection feeds back into matching model

### Company Flow

1. Create company account
2. Create/manage job postings
3. Two-tower ranking reduces raw pool (e.g., 2000 -> ~50 strong-fit candidates)
4. Iris analyzes and ranks candidates based on recruiter prompts (e.g., 50 -> ~12)
5. Recruiter submits interview list and post-interview feedback
6. Feedback loops into model updates

## How We Differ

- We optimize data quality before AI ranking.
- Two-tower validation and behavior feedback reduce embellishment impact.
- Iris operates on higher-trust candidate sets, which improves ranking quality.

## System Components

### Frontend

- Company:
  - Signup/login
  - Create/manage postings
  - Iris chat + ranking UI
  - Interview list + feedback submission
- Applicant:
  - Signup/profile with resume + interests
  - Daily matched jobs
  - Apply flow

## Two-Tower Notebook Plan (Initialization + Balancing)

Planned notebook workflow:

1. Load jobs from `hireup.db`, initialize random normalized embeddings in a jobs vecdb.
2. Load users from `hireup.db`, initialize random normalized embeddings in a users vecdb.
3. Repeatedly sample job subsets, score similarity with an LLM, and update cluster structure.
4. Repeatedly sample user subsets, score similarity with an LLM, and update cluster structure.
5. Repeatedly sample 1 user + N jobs, infer likely apply behavior, update both towers.
6. Repeatedly sample 1 job + N users, infer likely selection behavior, update both towers.

Important constraint:

- Always re-normalize vectors to the unit sphere after updates.

## Evaluation Cells (Planned)

Include notebook cells that run repeated comparison tests between vecdb nearest-neighbor outcomes and LLM judgments:

1. User-user nearest match checks
2. Job-job nearest match checks
3. Job-to-user preference checks
4. User-to-job preference checks

Each test should run multiple rounds and print aggregate accuracy per metric and overall.

## Embedding Update Functions (Planned in `two-tower/`)

Add functions for:

- User applies to job -> pull embeddings closer
- User rejects offer -> push embeddings apart
- Company interviews user -> pull embeddings closer
- Company feedback score (0-10) -> push/pull by score intensity

## Setup

### Backend

```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Use a local `.env` file and keep secrets out of git.

Example:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5-nano
```

Security note: if any API key has been shared in plain text, rotate it immediately and replace it with a new key.
