# Embedding Visualizer

Interactive 3D explorer for two-tower embeddings (`job_vectors` + `user_vectors`).

## Features
- 3D navigable scatter (zoom/rotate/pan)
- Colors by cluster (KMeans on original embedding space)
- Different marker symbols per tower (`job` vs `user`)
- Hover metadata (`title`, `company`, resume snippet, etc.)
- Optional nearest-neighbor edge graph
- Optional anchor highlight with top-K nearest neighbors emphasized

## Run
From repo root:

```bash
python3 embedding_visualizer/visualize_embeddings.py \
  --vecdb two-tower/two_tower_vecdb.sqlite \
  --out embedding_visualizer/embeddings_3d.html \
  --neighbor-k 8 \
  --edge-k 0
```

Then open:

- `embedding_visualizer/embeddings_3d.html`

## Optional
- Highlight one entity and its nearest neighbors:

```bash
python3 embedding_visualizer/visualize_embeddings.py \
  --vecdb two-tower/two_tower_vecdb.sqlite \
  --out embedding_visualizer/embeddings_3d.html \
  --highlight-id <ID_HERE> \
  --neighbor-k 10
```

- Add dropdown to switch raw embedding dimensions (`start=s` => dims `[s,s+1,s+2]`):

```bash
python3 embedding_visualizer/visualize_embeddings.py \
  --vecdb two-tower/two_tower_vecdb.sqlite \
  --out embedding_visualizer/embeddings_3d.html \
  --dim-selector
```

- Auto-open browser:

```bash
python3 embedding_visualizer/visualize_embeddings.py --open
```

## Notes
- Requires `plotly` and `scikit-learn`.
- If your vecdb is large, use `--max-jobs` and `--max-users` to downsample.
