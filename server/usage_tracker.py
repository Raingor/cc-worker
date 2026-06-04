"""Usage tracker — record token usage per chat request, aggregate stats.

Uses SQLite for thread-safe concurrent access (WAL mode). Auto-migrates
from legacy JSON storage on first run.
"""

from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from datetime import datetime, date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "usage.db"
LEGACY_JSON = DATA_DIR / "usage_data.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                date TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT '',
                model TEXT NOT NULL DEFAULT '',
                prompt_tokens INTEGER NOT NULL DEFAULT 0,
                completion_tokens INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                cached_tokens INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_records(date)"
        )
        conn.commit()


def _migrate_from_json():
    if not LEGACY_JSON.is_file():
        return
    try:
        records = json.loads(LEGACY_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return
    if not records:
        return
    with _conn() as conn:
        for r in records:
            conn.execute(
                """INSERT INTO usage_records
                   (ts, date, provider, model, prompt_tokens, completion_tokens, total_tokens, cached_tokens)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    r.get("ts", ""),
                    r.get("date", ""),
                    r.get("provider", ""),
                    r.get("model", ""),
                    r.get("prompt_tokens", 0),
                    r.get("completion_tokens", 0),
                    r.get("total_tokens", 0),
                    r.get("cached_tokens", 0),
                ),
            )
        conn.commit()
    LEGACY_JSON.rename(LEGACY_JSON.with_suffix(".json.bak"))


_init_db()
_migrate_from_json()


def record_usage(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    cached_tokens: int = 0,
) -> None:
    """Record a single API call's token usage."""
    now = datetime.now()
    with _conn() as conn:
        conn.execute(
            """INSERT INTO usage_records
               (ts, date, provider, model, prompt_tokens, completion_tokens, total_tokens, cached_tokens)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                now.isoformat(),
                now.strftime("%Y-%m-%d"),
                provider,
                model,
                prompt_tokens,
                completion_tokens,
                prompt_tokens + completion_tokens,
                cached_tokens,
            ),
        )
        conn.commit()


def get_stats() -> dict:
    """Return aggregated usage stats."""
    with _conn() as conn:
        today_str = date.today().isoformat()

        row = conn.execute(
            "SELECT * FROM usage_records ORDER BY id DESC LIMIT 1"
        ).fetchone()

        if not row:
            return {
                "provider": "",
                "model": "",
                "total": {"prompt": 0, "completion": 0, "total": 0, "cached": 0},
                "today": {"prompt": 0, "completion": 0, "total": 0, "cached": 0},
                "request_count": 0,
            }

        totals = conn.execute(
            """SELECT
                COALESCE(SUM(prompt_tokens), 0) AS prompt,
                COALESCE(SUM(completion_tokens), 0) AS completion,
                COALESCE(SUM(total_tokens), 0) AS total,
                COALESCE(SUM(cached_tokens), 0) AS cached,
                COUNT(*) AS count
               FROM usage_records"""
        ).fetchone()

        today = conn.execute(
            """SELECT
                COALESCE(SUM(prompt_tokens), 0) AS prompt,
                COALESCE(SUM(completion_tokens), 0) AS completion,
                COALESCE(SUM(total_tokens), 0) AS total,
                COALESCE(SUM(cached_tokens), 0) AS cached
               FROM usage_records WHERE date = ?""",
            (today_str,),
        ).fetchone()

        return {
            "provider": row["provider"] if "provider" in row.keys() else "",
            "model": row["model"] if "model" in row.keys() else "",
            "total": {
                "prompt": totals["prompt"],
                "completion": totals["completion"],
                "total": totals["total"],
                "cached": totals["cached"],
            },
            "today": {
                "prompt": today["prompt"],
                "completion": today["completion"],
                "total": today["total"],
                "cached": today["cached"],
            },
            "request_count": totals["count"],
        }
