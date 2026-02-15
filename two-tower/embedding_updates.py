"""Event-driven embedding updates for the two-tower vecdb.

This module updates vectors in `job_vectors` and `user_vectors` tables:
- user applies to a job -> pull together
- user rejects an offer -> push apart
- company selects interview -> pull together
- company feedback score (0-10) -> pull or push by score
"""

from __future__ import annotations

import json
import os
import random
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI


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
    resume_init_sample_size: int = 30
    resume_init_pos_weight: float = 1.0
    resume_init_neg_weight: float = 0.7


class EmbeddingUpdater:
    """Updates user/job embeddings for interaction events."""

    def __init__(self, vecdb_path: str | Path = DEFAULT_VECDB_PATH, config: UpdateConfig | None = None):
        self.vecdb_path = Path(vecdb_path)
        self.config = config or UpdateConfig()
        self._client: OpenAI | None = None

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

    def _get_metadata(self, conn: sqlite3.Connection, table: str, entity_id: str) -> Dict[str, Any]:
        row = conn.execute(
            f"SELECT metadata_json FROM {table} WHERE id = ?",
            (entity_id,),
        ).fetchone()
        if row is None:
            raise KeyError(f"{table} missing id={entity_id}")
        try:
            return json.loads(row["metadata_json"] or "{}")
        except Exception:
            return {}

    def _save_metadata(self, conn: sqlite3.Connection, table: str, entity_id: str, metadata: Dict[str, Any]) -> None:
        conn.execute(
            f"""
            UPDATE {table}
            SET metadata_json = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (json.dumps(metadata), entity_id),
        )

    def _get_client(self) -> OpenAI:
        if self._client is not None:
            return self._client
        load_dotenv(Path(__file__).resolve().parent.parent / ".env")
        load_dotenv(Path(".env"))
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing; set it in .env")
        self._client = OpenAI(api_key=api_key)
        return self._client

    def _extract_json_object(self, text: str) -> dict:
        text = (text or "").strip()
        try:
            return json.loads(text)
        except Exception:
            pass
        m = re.search(r"\{.*\}", text, flags=re.S)
        if not m:
            raise ValueError(f"No JSON object in model output: {text[:200]}")
        return json.loads(m.group(0))

    def _safe_indices(self, raw: Any, n: int) -> List[int]:
        if not isinstance(raw, list):
            return []
        out: List[int] = []
        seen = set()
        for x in raw:
            if not str(x).lstrip("-").isdigit():
                continue
            i = int(x)
            if 0 <= i < n and i not in seen:
                out.append(i)
                seen.add(i)
        return out

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

    def resume_update(self, user_id: str, new_resume_text: str, model: str = "gpt-5-nano") -> Dict[str, Any]:
        """Update a user's embedding when they change resume text.

        New embedding is computed as-if this user did not already exist:
        - sample N other users from vecdb
        - LLM selects 5 closest + 5 farthest vs new resume
        - compose: normalize(pos_weight*mean(closest) - neg_weight*mean(farthest))
        - final user vector: average(old_vector, new_composed_vector), then normalize
        """
        with self._get_conn() as conn:
            old_vec = self._get_vector(conn, "user_vectors", user_id)
            old_meta = self._get_metadata(conn, "user_vectors", user_id)

            rows = conn.execute(
                """
                SELECT id, vector_json, metadata_json
                FROM user_vectors
                WHERE id <> ?
                """,
                (user_id,),
            ).fetchall()

            pool: List[Dict[str, Any]] = []
            for r in rows:
                try:
                    vec = _normalize(np.array(json.loads(r["vector_json"]), dtype=np.float32))
                    meta = json.loads(r["metadata_json"] or "{}")
                except Exception:
                    continue
                pool.append({"id": r["id"], "vec": vec, "meta": meta})

            if not pool:
                # Nothing to compare against; only metadata changes.
                old_meta["resume_text"] = new_resume_text
                self._save_metadata(conn, "user_vectors", user_id, old_meta)
                return {"user_id": user_id, "updated": False, "reason": "no_other_users_in_vecdb"}

            sample_n = min(self.config.resume_init_sample_size, len(pool))
            sampled = random.sample(pool, sample_n)

            candidate_payload = [
                {
                    "i": i,
                    "resume_text": (c["meta"].get("resume_text") or "")[:800],
                }
                for i, c in enumerate(sampled)
            ]
            new_payload = {"resume_text": (new_resume_text or "")[:1200]}

            system = "You compare candidate similarity and dissimilarity. Return strict JSON only."
            user_prompt = (
                "Given NEW_USER and CANDIDATE_USERS, return the 5 closest and 5 farthest.\n"
                "Output exactly: {\"closest\":[a,b,c,d,e],\"farthest\":[u,v,w,x,y]}.\n"
                f"NEW_USER:{json.dumps(new_payload, ensure_ascii=True, separators=(',', ':'))}\n"
                f"CANDIDATE_USERS:{json.dumps(candidate_payload, ensure_ascii=True, separators=(',', ':'))}"
            )

            closest_idx: List[int]
            farthest_idx: List[int]
            try:
                resp = self._get_client().responses.create(
                    model=model,
                    input=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user_prompt},
                    ],
                    max_output_tokens=120,
                    timeout=25,
                )
                out = self._extract_json_object(resp.output_text)
                closest_idx = self._safe_indices(out.get("closest"), sample_n)
                farthest_idx = self._safe_indices(out.get("farthest"), sample_n)
            except Exception:
                closest_idx = list(range(min(5, sample_n)))
                farthest_idx = list(range(max(0, sample_n - 5), sample_n))

            # Ensure exactly up to 5 unique closest/farthest and no overlap.
            used = set()
            closest_fixed: List[int] = []
            for i in closest_idx:
                if i not in used and len(closest_fixed) < min(5, sample_n):
                    closest_fixed.append(i)
                    used.add(i)
            for i in range(sample_n):
                if len(closest_fixed) >= min(5, sample_n):
                    break
                if i not in used:
                    closest_fixed.append(i)
                    used.add(i)

            farthest_fixed: List[int] = []
            target_far = min(5, max(0, sample_n - len(closest_fixed)))
            for i in farthest_idx:
                if i not in used and len(farthest_fixed) < target_far:
                    farthest_fixed.append(i)
                    used.add(i)
            for i in range(sample_n - 1, -1, -1):
                if len(farthest_fixed) >= target_far:
                    break
                if i not in used:
                    farthest_fixed.append(i)
                    used.add(i)

            if not closest_fixed:
                closest_fixed = [0]
            if not farthest_fixed:
                farthest_fixed = [closest_fixed[-1]]

            closest_vecs = np.stack([sampled[i]["vec"] for i in closest_fixed]).astype(np.float32)
            farthest_vecs = np.stack([sampled[i]["vec"] for i in farthest_fixed]).astype(np.float32)
            fresh_vec = _normalize(
                self.config.resume_init_pos_weight * closest_vecs.mean(axis=0)
                - self.config.resume_init_neg_weight * farthest_vecs.mean(axis=0)
            )

            blended = _normalize(0.5 * old_vec + 0.5 * fresh_vec)
            self._save_vector(conn, "user_vectors", user_id, blended)

            old_meta["resume_text"] = new_resume_text
            self._save_metadata(conn, "user_vectors", user_id, old_meta)

            return {
                "user_id": user_id,
                "updated": True,
                "sample_size": sample_n,
                "closest_user_ids": [sampled[i]["id"] for i in closest_fixed],
                "farthest_user_ids": [sampled[i]["id"] for i in farthest_fixed],
            }
