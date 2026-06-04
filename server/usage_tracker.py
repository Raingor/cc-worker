"""Usage tracker — record token usage per chat request, aggregate stats."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, date
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent / "usage_data.json"


def _load() -> list[dict]:
    if DATA_FILE.is_file():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save(records: list[dict]) -> None:
    DATA_FILE.write_text(
        json.dumps(records[-10000:], ensure_ascii=False),  # keep last 10k
        encoding="utf-8",
    )


def record_usage(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    cached_tokens: int = 0,
) -> None:
    """Record a single API call's token usage."""
    records = _load()
    records.append({
        "ts": datetime.now().isoformat(),
        "date": date.today().isoformat(),
        "provider": provider,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "cached_tokens": cached_tokens,
    })
    _save(records)


def get_stats() -> dict:
    """Return aggregated usage stats."""
    records = _load()
    if not records:
        return {
            "provider": "",
            "model": "",
            "total": {"prompt": 0, "completion": 0, "total": 0, "cached": 0},
            "today": {"prompt": 0, "completion": 0, "total": 0, "cached": 0},
            "request_count": 0,
        }

    today_str = date.today().isoformat()
    last = records[-1]

    totals = defaultdict(int)
    today_totals = defaultdict(int)
    count = 0

    for r in records:
        totals["prompt"] += r.get("prompt_tokens", 0)
        totals["completion"] += r.get("completion_tokens", 0)
        totals["total"] += r.get("total_tokens", 0)
        totals["cached"] += r.get("cached_tokens", 0)
        count += 1

        if r.get("date") == today_str:
            today_totals["prompt"] += r.get("prompt_tokens", 0)
            today_totals["completion"] += r.get("completion_tokens", 0)
            today_totals["total"] += r.get("total_tokens", 0)
            today_totals["cached"] += r.get("cached_tokens", 0)

    return {
        "provider": last.get("provider", ""),
        "model": last.get("model", ""),
        "total": dict(totals),
        "today": dict(today_totals),
        "request_count": count,
    }
