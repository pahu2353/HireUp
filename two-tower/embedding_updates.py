"""Event-driven embedding updates for the two-tower vecdb.

This module updates vectors in `job_vectors` and `user_vectors` tables:
- user applies to a job -> pull together
- user rejects an offer -> push apart
- company selects interview -> pull together
- company feedback score (0-10) -> pull or push by score
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

import numpy as np


DEFAULT_VECDB_PATH = Path(__file__).resolve().parent / "two_tower_vecdb.sqlite"


def _normalize(v: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(v))
    if norm <= 1e-12:
        return v.astype(np.float32)
    return (v / norm).astype(np.float32)


def _pull(a: np.ndarray, b: np.ndarray, strength: float) -> Tuple[np.ndarray, np.ndarray]:
    a0 = a.copy()
    b0 = b.copy()
    a1 = _normalize((1.0 - strength) * a0 + strength * b0)
    b1 = _normalize((1.0 - strength) * b0 + strength * a0)
    return a1, b1


def _push(a: np.ndarray, b: np.ndarray, strength: float) -> Tuple[np.ndarray, np.ndarray]:
    # Move away from each other symmetrically.
    delta = a - b
    a1 = _normalize(a + strength * delta)
    b1 = _normalize(b - strength * delta)
    return a1, b1


@dataclass
class UpdateConfig:
    apply_pull_strength: float = 0.14
    reject_push_strength: float = 0.08
    interview_pull_strength: float = 0.16
    feedback_max_strength: float = 0.20


class EmbeddingUpdater:
    """Updates user/job embeddings for interaction events."""

    def __init__(self, vecdb_path: str | Path = DEFAULT_VECDB_PATH, config: UpdateConfig | None = None):
        self.vecdb_path = Path(vecdb_path)
        self.config = config or UpdateConfig()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.vecdb_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_vector(self, conn: sqlite3.Connection, table: str, entity_id: str) -> np.ndarray:
        row = conn.execute(
            f"SELECT vector_json FROM {table} WHERE id = ?",
            (entity_id,),
        ).fetchone()
        if row is None:
            raise KeyError(f"{table} missing id={entity_id}")
        vec = np.array(json.loads(row["vector_json"]), dtype=np.float32)
        return _normalize(vec)

    def _save_vector(self, conn: sqlite3.Connection, table: str, entity_id: str, vec: np.ndarray) -> None:
        conn.execute(
            f"""
            UPDATE {table}
            SET vector_json = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (json.dumps(_normalize(vec).tolist()), entity_id),
        )

    def _update_pair(self, user_id: str, job_id: str, mode: str, strength: float) -> None:
        if strength <= 0.0:
            return
        strength = max(0.0, min(1.0, float(strength)))

        with self._get_conn() as conn:
            user_vec = self._get_vector(conn, "user_vectors", user_id)
            job_vec = self._get_vector(conn, "job_vectors", job_id)

            if mode == "pull":
                user_new, job_new = _pull(user_vec, job_vec, strength)
            elif mode == "push":
                user_new, job_new = _push(user_vec, job_vec, strength)
            else:
                raise ValueError(f"Unknown update mode: {mode}")

            self._save_vector(conn, "user_vectors", user_id, user_new)
            self._save_vector(conn, "job_vectors", job_id, job_new)

    def on_user_applies(self, user_id: str, job_id: str) -> None:
        """User applies to a job: pull user/job vectors together."""
        self._update_pair(user_id, job_id, mode="pull", strength=self.config.apply_pull_strength)

    def on_user_rejects_offer(self, user_id: str, job_id: str) -> None:
        """User rejects a job offer: push user/job vectors apart."""
        self._update_pair(user_id, job_id, mode="push", strength=self.config.reject_push_strength)

    def on_company_selects_interview(self, user_id: str, job_id: str) -> None:
        """Company selects a candidate for interview: pull user/job vectors together."""
        self._update_pair(user_id, job_id, mode="pull", strength=self.config.interview_pull_strength)

    def on_company_feedback_score(self, user_id: str, job_id: str, score_out_of_10: float) -> None:
        """Push/pull based on feedback score.

        Mapping:
        - score > 5: pull
        - score < 5: push
        - score == 5: no update

        Strength scales linearly with distance from neutral 5.
        """
        score = max(0.0, min(10.0, float(score_out_of_10)))
        centered = score - 5.0
        if centered == 0.0:
            return

        strength = (abs(centered) / 5.0) * self.config.feedback_max_strength
        mode = "pull" if centered > 0 else "push"
        self._update_pair(user_id, job_id, mode=mode, strength=strength)

