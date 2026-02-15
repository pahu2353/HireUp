# HireUp Backend

FastAPI app with SQLite. Run from this directory:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Layout

- **`main.py`** – Creates app, CORS, includes routers.
- **`config.py`** – DB path, CORS origins.
- **`database.py`** – SQLite connection, schema, and CRUD for users, companies, sessions; password hashing.
- **`schemas/`** – Pydantic request/response models (`auth`, `user`, `company`).
- **`services/`** – Business logic (user and company flows); no HTTP, calls `database` and in-memory state.
- **`routers/`** – FastAPI route handlers: `auth` (signup, login), `users` (matched jobs, apply), `companies` (jobs, candidates, interviews).

API docs: http://localhost:8000/docs
