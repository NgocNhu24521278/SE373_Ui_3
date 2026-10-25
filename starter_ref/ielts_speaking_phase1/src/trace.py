"""Structured action tracing without storing full learner answers in log files."""
import json
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_LOG = Path(__file__).resolve().parents[1] / 'logs' / 'agent_trace.jsonl'


def log(session_id, kind, payload=None, log_path=DEFAULT_LOG):
    path = Path(log_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    event = {'time': datetime.now(timezone.utc).isoformat(),
             'session_id': session_id, 'kind': kind, 'payload': payload or {}}
    with path.open('a', encoding='utf-8') as file:
        file.write(json.dumps(event, ensure_ascii=False) + '\n')
    return event


def recent_logs(session_id, log_path=DEFAULT_LOG, limit=40):
    path = Path(log_path)
    if not path.exists():
        return []
    with path.open(encoding='utf-8') as file:
        events = [json.loads(line) for line in file if line.strip()]
    return [event for event in events if event['session_id'] == session_id][-limit:]
