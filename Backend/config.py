"""App configuration."""
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "hireup.db"
# Allow frontend on common dev ports; regex allows any port on localhost/127.0.0.1
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
# For any other port (e.g. Next.js turbo): match http://localhost:* or http://127.0.0.1:*
CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
