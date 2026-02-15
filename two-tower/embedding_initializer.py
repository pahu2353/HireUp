"""LLM-assisted initialization for new user/job vectors in the two-tower vecdb.

Flow:
1) Sample 30 existing same-type entities (users for new user, jobs for new job).
2) Ask LLM for 5 closest and 5 farthest matches to the new object.
3) Initialize new vector as:
      normalize(pos_weight * mean(closest_vecs) - neg_weight * mean(farthest_vecs))
4) Upsert the new vector + metadata into vecdb.
"""

from __future__ import annotations

import json
import os
import random
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI


DEFAULT_VECDB_PATH = Path(__file__).resolve().parent / "two_tower_vecdb.sqlite"
DEFAULT_MODEL = "gpt-5-nano"


def _normalize(v: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(v))
    if norm <= 1e-12:
        return v.astype(np.float32)
    return (v / norm).astype(np.float32)


def _extract_json_object(text: str) -> dict:
    text = (text or "").strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{.*\}", text, flags=re.S)
    if not match:
        raise ValueError(f"No JSON object found in model output: {text[:200]}")
    return json.loads(match.group(0))


def _random_unit(dim: int) -> np.ndarray:
    return _normalize(np.random.normal(size=dim).astype(np.float32))


def _safe_indices(raw: Any, max_n: int) -> List[int]:
    if not isinstance(raw, list):
        return []
    out: List[int] = []
    seen = set()
    for x in raw:
        if not str(x).lstrip("-").isdigit():
            continue
        i = int(x)
        if 0 <= i < max_n and i not in seen:
            out.append(i)
            seen.add(i)
    return out


class NewEmbeddingInitializer:
    def __init__(
        self,
        vecdb_path: str | Path = DEFAULT_VECDB_PATH,
        model: str = DEFAULT_MODEL,
        max_output_tokens: int = 120,
        timeout_sec: int = 25,
    ) -> None:
        self.vecdb_path = Path(vecdb_path)
        self.model = model
        self.max_output_tokens = max_output_tokens
        self.timeout_sec = timeout_sec

        load_dotenv(Path(__file__).resolve().parent.parent / ".env")
        load_dotenv(Path(".env"))
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing; set it in .env")
        self.client = OpenAI(api_key=api_key)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.vecdb_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _load_table(self, table: str) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                f"SELECT id, vector_json, metadata_json FROM {table}"
            ).fetchall()
        out: List[Dict[str, Any]] = []
        for r in rows:
            try:
                vec = np.array(json.loads(r["vector_json"]), dtype=np.float32)
                meta = json.loads(r["metadata_json"]) if r["metadata_json"] else {}
            except Exception:
                continue
            out.append({"id": r["id"], "vec": _normalize(vec), "meta": meta})
        return out

    def _llm_rank_closest_farthest(
        self,
        entity_type: str,
        new_object_payload: Dict[str, Any],
        candidates: List[Dict[str, Any]],
    ) -> Tuple[List[int], List[int]]:
        # Keep prompt compact and aligned with current training fields.
        if entity_type == "job":
            new_payload = {
                "title": new_object_payload.get("title"),
                "description": (new_object_payload.get("description") or "")[:900],
                "skills": new_object_payload.get("skills"),
            }
            cand_payload = [
                {
                    "i": i,
                    "title": c["meta"].get("title"),
                    "description": (c["meta"].get("description") or "")[:700],
                    "skills": c["meta"].get("skills"),
                }
                for i, c in enumerate(candidates)
            ]
            system = "You compare job similarity and dissimilarity. Return strict JSON only."
            user = (
                "Given NEW_JOB and 30 CANDIDATE_JOBS, return the 5 closest and 5 farthest.\n"
                "Output exactly: {\"closest\":[a,b,c,d,e],\"farthest\":[u,v,w,x,y]}.\n"
                "Rules: indices in [0,29], unique in each list, and no overlap.\n"
                f"NEW_JOB:{json.dumps(new_payload, ensure_ascii=True, separators=(',', ':'))}\n"
                f"CANDIDATE_JOBS:{json.dumps(cand_payload, ensure_ascii=True, separators=(',', ':'))}"
            )
        elif entity_type == "user":
            new_payload = {
                "resume_text": (new_object_payload.get("resume_text") or "")[:1200],
            }
            cand_payload = [
                {
                    "i": i,
                    "resume_text": (c["meta"].get("resume_text") or "")[:800],
                }
                for i, c in enumerate(candidates)
            ]
            system = "You compare candidate similarity and dissimilarity. Return strict JSON only."
            user = (
                "Given NEW_USER and 30 CANDIDATE_USERS, return the 5 closest and 5 farthest.\n"
                "Output exactly: {\"closest\":[a,b,c,d,e],\"farthest\":[u,v,w,x,y]}.\n"
                "Rules: indices in [0,29], unique in each list, and no overlap.\n"
                f"NEW_USER:{json.dumps(new_payload, ensure_ascii=True, separators=(',', ':'))}\n"
                f"CANDIDATE_USERS:{json.dumps(cand_payload, ensure_ascii=True, separators=(',', ':'))}"
            )
        else:
            raise ValueError("entity_type must be 'job' or 'user'")

        try:
            resp = self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                max_output_tokens=self.max_output_tokens,
                timeout=self.timeout_sec,
            )
            out = _extract_json_object(resp.output_text)
        except Exception:
            out = {"closest": [0, 1, 2, 3, 4], "farthest": [25, 26, 27, 28, 29]}

        n = len(candidates)
        closest = _safe_indices(out.get("closest"), n)
        farthest = _safe_indices(out.get("farthest"), n)

        # Enforce exactly 5 + 5 with no overlap.
        used = set()
        closest_fixed: List[int] = []
        for i in closest:
            if i not in used and len(closest_fixed) < 5:
                closest_fixed.append(i)
                used.add(i)
        for i in range(n):
            if len(closest_fixed) >= 5:
                break
            if i not in used:
                closest_fixed.append(i)
                used.add(i)

        farthest_fixed: List[int] = []
        for i in farthest:
            if i not in used and len(farthest_fixed) < 5:
                farthest_fixed.append(i)
                used.add(i)
        for i in range(n - 1, -1, -1):
            if len(farthest_fixed) >= 5:
                break
            if i not in used:
                farthest_fixed.append(i)
                used.add(i)

        return closest_fixed, farthest_fixed

    def _compose_vector(
        self,
        candidates: List[Dict[str, Any]],
        closest_idx: List[int],
        farthest_idx: List[int],
        pos_weight: float,
        neg_weight: float,
    ) -> np.ndarray:
        c_vecs = np.stack([candidates[i]["vec"] for i in closest_idx]).astype(np.float32)
        f_vecs = np.stack([candidates[i]["vec"] for i in farthest_idx]).astype(np.float32)
        vec = pos_weight * c_vecs.mean(axis=0) - neg_weight * f_vecs.mean(axis=0)
        return _normalize(vec)

    def _upsert(self, table: str, entity_id: str, vec: np.ndarray, metadata: Dict[str, Any]) -> None:
        with self._conn() as conn:
            conn.execute(
                f"""
                INSERT INTO {table} (id, vector_json, metadata_json, updated_at)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                    vector_json = excluded.vector_json,
                    metadata_json = excluded.metadata_json,
                    updated_at = datetime('now')
                """,
                (entity_id, json.dumps(_normalize(vec).tolist()), json.dumps(metadata)),
            )

    def initialize_new_job(
        self,
        job_id: str,
        job_payload: Dict[str, Any],
        sample_size: int = 30,
        pos_weight: float = 1.0,
        neg_weight: float = 0.7,
    ) -> Dict[str, Any]:
        rows = self._load_table("job_vectors")
        if len(rows) < 10:
            raise RuntimeError(f"Need at least 10 existing jobs in vecdb; found {len(rows)}")
        if len(rows) < sample_size:
            sample_size = len(rows)
        sampled = random.sample(rows, sample_size)

        closest_idx, farthest_idx = self._llm_rank_closest_farthest("job", job_payload, sampled)
        vec = self._compose_vector(sampled, closest_idx, farthest_idx, pos_weight, neg_weight)
        self._upsert("job_vectors", job_id, vec, job_payload)

        return {
            "entity_type": "job",
            "id": job_id,
            "sample_size": sample_size,
            "closest_ids": [sampled[i]["id"] for i in closest_idx],
            "farthest_ids": [sampled[i]["id"] for i in farthest_idx],
        }

    def initialize_new_user(
        self,
        user_id: str,
        user_payload: Dict[str, Any],
        sample_size: int = 30,
        pos_weight: float = 1.0,
        neg_weight: float = 0.7,
    ) -> Dict[str, Any]:
        rows = self._load_table("user_vectors")
        if len(rows) < 10:
            raise RuntimeError(f"Need at least 10 existing users in vecdb; found {len(rows)}")
        if len(rows) < sample_size:
            sample_size = len(rows)
        sampled = random.sample(rows, sample_size)

        closest_idx, farthest_idx = self._llm_rank_closest_farthest("user", user_payload, sampled)
        vec = self._compose_vector(sampled, closest_idx, farthest_idx, pos_weight, neg_weight)
        self._upsert("user_vectors", user_id, vec, user_payload)

        return {
            "entity_type": "user",
            "id": user_id,
            "sample_size": sample_size,
            "closest_ids": [sampled[i]["id"] for i in closest_idx],
            "farthest_ids": [sampled[i]["id"] for i in farthest_idx],
        }

