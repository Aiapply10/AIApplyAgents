# Bot Framework + API

This package provides a reusable automation bot skeleton plus a FastAPI
control plane.

## Run

From `packages/jobs_applier`:

```bash
python main.py
```

Open docs at [http://localhost:8002/docs](http://localhost:8002/docs).

## API Overview

- `GET /health`
- `POST /config/group`
- `POST /config/flow`
- `DELETE /config/flow/{flow_id}`
- `DELETE /config/group/{group_id}`
- `POST /control/all/pause|resume|stop`
- `POST /control/group/{group_id}/pause|resume|stop`
- `POST /control/flow/{flow_id}/pause|resume|stop`
- `GET /status`
- `GET /status/group/{group_id}`
- `GET /status/flow/{flow_id}`
- `GET /status/flow/{flow_id}/errors`

