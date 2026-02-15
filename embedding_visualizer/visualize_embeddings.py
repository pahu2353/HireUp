from __future__ import annotations

import argparse
import json
import random
import sqlite3
import webbrowser
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

try:
    import plotly.graph_objects as go
except Exception as e:
    raise RuntimeError(
        "plotly is required. Install with: pip install -r embedding_visualizer/requirements.txt"
    ) from e


@dataclass
class Row:
    entity_id: str
    tower: str  # 'job' | 'user'
    vec: np.ndarray
    meta: dict[str, Any]


def load_rows(vecdb: Path) -> list[Row]:
    if not vecdb.exists():
        raise FileNotFoundError(f"VecDB not found: {vecdb}")

    out: list[Row] = []
    with sqlite3.connect(vecdb) as conn:
        conn.row_factory = sqlite3.Row

        for table, tower in (("job_vectors", "job"), ("user_vectors", "user")):
            rows = conn.execute(
                f"SELECT id, vector_json, metadata_json FROM {table}"
            ).fetchall()
            for r in rows:
                try:
                    vec = np.array(json.loads(r["vector_json"]), dtype=np.float32)
                    meta = json.loads(r["metadata_json"] or "{}")
                    out.append(Row(entity_id=r["id"], tower=tower, vec=vec, meta=meta))
                except Exception:
                    continue
    if not out:
        raise RuntimeError("No vectors loaded from vecdb.")
    return out


def downsample(rows: list[Row], max_jobs: int | None, max_users: int | None, seed: int) -> list[Row]:
    rng = random.Random(seed)
    jobs = [r for r in rows if r.tower == "job"]
    users = [r for r in rows if r.tower == "user"]

    if max_jobs and len(jobs) > max_jobs:
        jobs = rng.sample(jobs, max_jobs)
    if max_users and len(users) > max_users:
        users = rng.sample(users, max_users)
    return jobs + users


def cosine_sim_matrix(X: np.ndarray) -> np.ndarray:
    Xn = X / np.clip(np.linalg.norm(X, axis=1, keepdims=True), 1e-12, None)
    return Xn @ Xn.T


def compute_clusters(X: np.ndarray, n_clusters: int) -> np.ndarray:
    k = max(2, min(n_clusters, X.shape[0]))
    return KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X)


def nearest_neighbors(X: np.ndarray, idx: int, k: int) -> list[int]:
    sims = cosine_sim_matrix(X)[idx].copy()
    sims[idx] = -1.0
    order = np.argsort(-sims)
    return [int(i) for i in order[:k]]


def format_hover(row: Row, cluster: int) -> str:
    if row.tower == "job":
        title = row.meta.get("title") or "(no title)"
        company = row.meta.get("company_name") or row.meta.get("company_id") or "(unknown company)"
        skills = row.meta.get("skills") or ""
        desc = (row.meta.get("description") or "")[:200]
        return (
            f"<b>{title}</b><br>"
            f"tower: job<br>"
            f"id: {row.entity_id}<br>"
            f"company: {company}<br>"
            f"cluster: {cluster}<br>"
            f"skills: {skills}<br>"
            f"desc: {desc}"
        )
    resume = (row.meta.get("resume_text") or "")[:220]
    return (
        f"<b>{row.meta.get('name') or '(user)'}</b><br>"
        f"tower: user<br>"
        f"id: {row.entity_id}<br>"
        f"cluster: {cluster}<br>"
        f"resume: {resume}"
    )


def build_figure(
    rows: list[Row],
    coords: np.ndarray,
    coords_by_start: dict[int, np.ndarray] | None,
    clusters: np.ndarray,
    edge_k: int,
    neighbor_k: int,
    highlight_id: str | None,
) -> go.Figure:
    fig = go.Figure()

    towers = ["job", "user"]
    symbols = {"job": "circle", "user": "diamond"}

    trace_idx_by_tower: dict[str, int] = {}

    # Base points per tower (colored by cluster)
    for tower in towers:
        idxs = [i for i, r in enumerate(rows) if r.tower == tower]
        if not idxs:
            continue

        hover = [format_hover(rows[i], int(clusters[i])) for i in idxs]
        trace_idx_by_tower[tower] = len(fig.data)
        fig.add_trace(
            go.Scatter3d(
                x=coords[idxs, 0],
                y=coords[idxs, 1],
                z=coords[idxs, 2],
                mode="markers",
                name=f"{tower}s",
                marker=dict(
                    size=4 if tower == "user" else 5,
                    symbol=symbols[tower],
                    color=clusters[idxs],
                    colorscale="Turbo",
                    opacity=0.82,
                    colorbar=dict(title="Cluster") if tower == "job" else None,
                ),
                text=hover,
                hovertemplate="%{text}<extra></extra>",
            )
        )

    X = np.stack([r.vec for r in rows]).astype(np.float32)

    # `coords_by_start` is currently unused in-figure; dimension selection is handled
    # by the custom checkbox panel injected into the output HTML.
    _ = coords_by_start

    # Optional global NN edges to reveal local structure
    if edge_k > 0:
        sim = cosine_sim_matrix(X)
        xs: list[float] = []
        ys: list[float] = []
        zs: list[float] = []
        n = len(rows)
        for i in range(n):
            sim[i, i] = -1.0
            nn = np.argsort(-sim[i])[:edge_k]
            for j in nn:
                if j <= i:
                    continue
                xs += [coords[i, 0], coords[j, 0], None]
                ys += [coords[i, 1], coords[j, 1], None]
                zs += [coords[i, 2], coords[j, 2], None]
        fig.add_trace(
            go.Scatter3d(
                x=xs,
                y=ys,
                z=zs,
                mode="lines",
                name="local neighbor edges",
                line=dict(color="rgba(120,120,120,0.16)", width=1),
                hoverinfo="skip",
                showlegend=True,
            )
        )

    # Optional anchor highlight + top neighbors
    if highlight_id:
        id_to_idx = {r.entity_id: i for i, r in enumerate(rows)}
        if highlight_id in id_to_idx:
            i = id_to_idx[highlight_id]
            nn = nearest_neighbors(X, i, k=max(1, neighbor_k))
            h_idxs = [i] + nn

            fig.add_trace(
                go.Scatter3d(
                    x=coords[h_idxs, 0],
                    y=coords[h_idxs, 1],
                    z=coords[h_idxs, 2],
                    mode="markers+text",
                    name="anchor + nearest",
                    marker=dict(size=[10] + [7] * len(nn), color=["#ff006e"] + ["#ffd166"] * len(nn), opacity=0.98),
                    text=["ANCHOR"] + [f"NN {k+1}" for k in range(len(nn))],
                    textposition="top center",
                    hovertext=[format_hover(rows[j], int(clusters[j])) for j in h_idxs],
                    hovertemplate="%{hovertext}<extra></extra>",
                )
            )

            # Anchor-to-neighbor lines
            xs = []
            ys = []
            zs = []
            for j in nn:
                xs += [coords[i, 0], coords[j, 0], None]
                ys += [coords[i, 1], coords[j, 1], None]
                zs += [coords[i, 2], coords[j, 2], None]
            fig.add_trace(
                go.Scatter3d(
                    x=xs,
                    y=ys,
                    z=zs,
                    mode="lines",
                    name="anchor links",
                    line=dict(color="rgba(255,0,110,0.65)", width=4),
                    hoverinfo="skip",
                )
            )

    fig.update_layout(
        template="plotly_dark",
        title=dict(text="Two-Tower Embedding Explorer (3D)", x=0.5, y=0.98, xanchor="center"),
        scene=dict(
            xaxis_title="PC1",
            yaxis_title="PC2",
            zaxis_title="PC3",
            bgcolor="rgba(10,10,14,1)",
        ),
        legend=dict(orientation="h", yanchor="top", y=-0.05, xanchor="left", x=0),
        updatemenus=[],
        margin=dict(l=0, r=0, t=95, b=90),
        height=900,
    )
    return fig


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive 3D visualizer for two-tower embeddings")
    parser.add_argument("--vecdb", default="two-tower/most_run_two_tower_vecdb.sqlite", help="Path to vecdb sqlite file")
    parser.add_argument("--out", default="embedding_visualizer/embeddings_3d.html", help="Output HTML path")
    parser.add_argument("--clusters", type=int, default=10, help="Number of KMeans clusters")
    parser.add_argument("--edge-k", type=int, default=0, help="Local neighbor edges per point (0 to disable)")
    parser.add_argument("--neighbor-k", type=int, default=8, help="Nearest neighbors to show for --highlight-id")
    parser.add_argument("--highlight-id", default=None, help="Entity id to highlight with nearest neighbors")
    parser.add_argument(
        "--dim-selector",
        action="store_true",
        help="Enable interactive any-3-dim selector (checkboxes + Apply button)",
    )
    parser.add_argument("--max-jobs", type=int, default=None, help="Downsample jobs")
    parser.add_argument("--max-users", type=int, default=None, help="Downsample users")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--open", action="store_true", help="Open output in browser")
    args = parser.parse_args()

    vecdb = Path(args.vecdb)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = load_rows(vecdb)
    rows = downsample(rows, args.max_jobs, args.max_users, args.seed)

    X = np.stack([r.vec for r in rows]).astype(np.float32)
    coords = PCA(n_components=3, random_state=42).fit_transform(X)
    clusters = compute_clusters(X, n_clusters=args.clusters)
    coords_by_start: dict[int, np.ndarray] | None = None
    if args.dim_selector and X.shape[1] >= 3:
        coords_by_start = {s: X[:, s : s + 3] for s in range(0, X.shape[1] - 2)}

    fig = build_figure(
        rows=rows,
        coords=coords,
        coords_by_start=coords_by_start,
        clusters=clusters,
        edge_k=max(0, args.edge_k),
        neighbor_k=max(1, args.neighbor_k),
        highlight_id=args.highlight_id,
    )

    if not args.dim_selector:
        fig.write_html(str(out), include_plotlyjs=True)
    else:
        # Build HTML and inject controls/scripts for arbitrary 3-dimension selection.
        div_id = "plotly-embeddings"
        html = fig.to_html(include_plotlyjs=True, full_html=True, div_id=div_id)

        # Base traces are added first in build_figure: jobs then users (if present).
        job_rows = [i for i, r in enumerate(rows) if r.tower == "job"]
        user_rows = [i for i, r in enumerate(rows) if r.tower == "user"]
        X_json = json.dumps(X.tolist())
        job_rows_json = json.dumps(job_rows)
        user_rows_json = json.dumps(user_rows)
        dim_n = int(X.shape[1])

        controls = f"""
<div style="position:fixed;top:10px;right:10px;z-index:9999;background:rgba(20,20,24,0.94);padding:12px;border-radius:10px;border:1px solid #444;max-width:340px;color:#eee;font-family:ui-sans-serif,system-ui,sans-serif;">
  <div style="font-weight:700;margin-bottom:8px;">Dimension Picker</div>
  <div style="font-size:12px;opacity:0.85;margin-bottom:8px;">Pick exactly 3 embedding dimensions, then click Apply.</div>
  <div id="dim-checkboxes" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;max-height:220px;overflow:auto;padding:4px;border:1px solid #3a3a3a;border-radius:6px;"></div>
  <button id="apply-dims" style="margin-top:10px;background:#2f7fff;color:#fff;border:none;border-radius:6px;padding:7px 10px;cursor:pointer;">Apply</button>
  <div id="dim-msg" style="margin-top:8px;font-size:12px;opacity:0.85;"></div>
</div>
<script>
(function() {{
  const DIM_N = {dim_n};
  const rawX = {X_json};
  const jobRows = {job_rows_json};
  const userRows = {user_rows_json};
  const plot = document.getElementById('{div_id}');
  const box = document.getElementById('dim-checkboxes');
  const msg = document.getElementById('dim-msg');
  const applyBtn = document.getElementById('apply-dims');

  function setMsg(t) {{ msg.textContent = t; }}
  function checkedDims() {{
    const out = [];
    box.querySelectorAll('input[type=checkbox]').forEach(cb => {{
      if (cb.checked) out.push(parseInt(cb.value, 10));
    }});
    return out;
  }}

  for (let d = 0; d < DIM_N; d++) {{
    const wrap = document.createElement('label');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '4px';
    wrap.style.fontSize = '12px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = String(d);
    if (d < 3) cb.checked = true;
    cb.addEventListener('change', () => {{
      const cur = checkedDims();
      if (cur.length > 3) {{
        cb.checked = false;
        setMsg('Select exactly 3 dimensions.');
      }} else {{
        setMsg('');
      }}
    }});
    const txt = document.createElement('span');
    txt.textContent = String(d);
    wrap.appendChild(cb);
    wrap.appendChild(txt);
    box.appendChild(wrap);
  }}

  applyBtn.addEventListener('click', () => {{
    const dims = checkedDims();
    if (dims.length !== 3) {{
      setMsg('Please select exactly 3 dimensions.');
      return;
    }}
    const [dx, dy, dz] = dims;

    const jobX = jobRows.map(i => rawX[i][dx]);
    const jobY = jobRows.map(i => rawX[i][dy]);
    const jobZ = jobRows.map(i => rawX[i][dz]);
    const userX = userRows.map(i => rawX[i][dx]);
    const userY = userRows.map(i => rawX[i][dy]);
    const userZ = userRows.map(i => rawX[i][dz]);

    // Trace 0 = jobs, trace 1 = users in current figure build order.
    Plotly.restyle(plot, {{x:[jobX], y:[jobY], z:[jobZ]}}, [0]);
    Plotly.restyle(plot, {{x:[userX], y:[userY], z:[userZ]}}, [1]);
    Plotly.relayout(plot, {{
      'scene.xaxis.title': `dim ${{dx}}`,
      'scene.yaxis.title': `dim ${{dy}}`,
      'scene.zaxis.title': `dim ${{dz}}`
    }});
    setMsg(`Applied dimensions: [${{dx}}, ${{dy}}, ${{dz}}]`);
  }});
}})();
</script>
"""
        html = html.replace("</body>", controls + "\n</body>")
        out.write_text(html, encoding="utf-8")

    print(f"Wrote interactive explorer: {out}")
    print(f"Points: {len(rows)} | jobs={sum(r.tower=='job' for r in rows)} | users={sum(r.tower=='user' for r in rows)}")

    if args.open:
        webbrowser.open(out.resolve().as_uri())


if __name__ == "__main__":
    main()
