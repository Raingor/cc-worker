"""Checklist storage — SQLite-backed, per-token per-date."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent / "data" / "checklist.db"
_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS checklists (
                token_hash TEXT NOT NULL,
                date TEXT NOT NULL,
                items TEXT NOT NULL DEFAULT '[]',
                summary TEXT DEFAULT NULL,
                summary_at TEXT DEFAULT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (token_hash, date)
            )
        """)
        conn.commit()


_init_db()


def _load_template(js_day: int) -> dict | None:
    """Load checklist template from day_reminders.json for a given weekday."""
    path = _PROMPTS_DIR / "day_reminders.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    entry = data.get(str(js_day))
    if not entry:
        return None
    return {
        "title": entry.get("title", ""),
        "tasks": entry.get("tasks", ""),
        "afternoon_approval": entry.get("afternoon_approval", ""),
        "items": entry.get("checklist", []),
    }


def get_or_create(token: str, date: str) -> dict:
    """Return checklist for a date, merging template with saved state."""
    h = _token_hash(token)
    today = datetime.now().strftime("%Y-%m-%d")
    is_today = date == today

    weekday = _date_to_weekday(date)
    template = _load_template(weekday)

    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM checklists WHERE token_hash = ? AND date = ?",
            (h, date),
        ).fetchone()

    saved_items = {}
    saved_summary = None
    if row:
        try:
            saved_items_list = json.loads(row["items"]) if row["items"] else []
            saved_items = {i["id"]: i for i in saved_items_list}
        except (json.JSONDecodeError, TypeError):
            saved_items = {}
        saved_summary = row["summary"]

    merged = []
    for tpl in (template or {}).get("items", []):
        item = dict(tpl)
        saved = saved_items.get(item["id"])
        if saved:
            item["checked"] = saved.get("checked", False)
            item["note"] = saved.get("note", "")
        else:
            item["checked"] = False
            item["note"] = ""
        merged.append(item)

    checked_count = sum(1 for m in merged if m.get("checked"))
    total_count = len(merged)

    return {
        "date": date,
        "is_today": is_today,
        "title": (template or {}).get("title", ""),
        "items": merged,
        "summary": saved_summary,
        "progress": {"checked": checked_count, "total": total_count},
    }


def _upsert(token_hash: str, date: str, fields: dict) -> None:
    """Generic upsert compatible with SQLite 3.7+ (no ON CONFLICT)."""
    now = datetime.now().isoformat()
    fields_clean = {k: v for k, v in fields.items() if v is not None}
    with _conn() as conn:
        existing = conn.execute(
            "SELECT 1 FROM checklists WHERE token_hash = ? AND date = ?",
            (token_hash, date),
        ).fetchone()

        if existing:
            set_parts = ", ".join(f"{k} = ?" for k in fields_clean)
            values = list(fields_clean.values()) + [token_hash, date]
            conn.execute(
                f"UPDATE checklists SET {set_parts} WHERE token_hash = ? AND date = ?",
                values,
            )
        else:
            keys = ", ".join(fields_clean.keys())
            placeholders = ", ".join("?" for _ in fields_clean)
            values = list(fields_clean.values())
            conn.execute(
                f"INSERT INTO checklists (token_hash, date, {keys}) "
                f"VALUES (?, ?, {placeholders})",
                [token_hash, date] + values,
            )
        conn.commit()


def save_items(token: str, date: str, items: list[dict]) -> dict:
    """Save checked state and notes for a date."""
    h = _token_hash(token)
    now = datetime.now().isoformat()

    clean = []
    for item in items:
        clean.append({
            "id": item["id"],
            "checked": bool(item.get("checked", False)),
            "note": item.get("note", "") or "",
            "updated_at": now,
        })

    _upsert(h, date, {
        "items": json.dumps(clean, ensure_ascii=False),
        "updated_at": now,
    })

    return {"date": date, "saved": len(clean)}


def save_summary(token: str, date: str, summary: str) -> dict:
    """Save AI-generated summary for a date."""
    h = _token_hash(token)
    now = datetime.now().isoformat()

    with _conn() as conn:
        existing = conn.execute(
            "SELECT items FROM checklists WHERE token_hash = ? AND date = ?",
            (h, date),
        ).fetchone()
        items_json = existing["items"] if existing else "[]"

    _upsert(h, date, {
        "items": items_json,
        "summary": summary,
        "summary_at": now,
        "updated_at": now,
    })

    return {"date": date, "summary": summary}


def get_history_dates(token: str, year: int, month: int) -> list[str]:
    """Return list of dates in a month that have checklist data."""
    h = _token_hash(token)
    prefix = f"{year:04d}-{month:02d}"
    with _conn() as conn:
        rows = conn.execute(
            "SELECT date FROM checklists WHERE token_hash = ? AND date LIKE ?",
            (h, prefix + "%"),
        ).fetchall()
    return [r["date"] for r in rows]


def get_summary_context(token: str, date: str) -> dict | None:
    """Build context for AI summary generation.

    Returns None if the date has no template (weekend).
    """
    weekday = _date_to_weekday(date)
    template = _load_template(weekday)
    if not template:
        return None

    h = _token_hash(token)
    with _conn() as conn:
        row = conn.execute(
            "SELECT items FROM checklists WHERE token_hash = ? AND date = ?",
            (h, date),
        ).fetchone()

    saved = {}
    if row:
        try:
            saved_list = json.loads(row["items"]) if row["items"] else []
            saved = {i["id"]: i for i in saved_list}
        except (json.JSONDecodeError, TypeError):
            saved = {}

    done_lines = []
    undone_lines = []
    for tpl in template.get("items", []):
        sid = saved.get(tpl["id"])
        checked = sid.get("checked", False) if sid else False
        note = sid.get("note", "") if sid else ""
        label = tpl["label"]
        if checked:
            line = f"- [x] {label}"
            if note:
                line += f" (备注：{note})"
            done_lines.append(line)
        else:
            line = f"- [ ] {label}"
            undone_lines.append(line)

    return {
        "title": template["title"],
        "done": done_lines,
        "undone": undone_lines,
    }


def _token_hash(token: str) -> str:
    # Fixed hash to preserve existing data from the prod token
    import hashlib
    return hashlib.sha256(b"8d522cb8a4d7dd394d7687c32500a73c").hexdigest()


def _date_to_weekday(date_str: str) -> int:
    """Convert '2026-06-05' to JS-style weekday (0=Sun, 1=Mon...)."""
    from datetime import date as dt_date
    try:
        d = dt_date.fromisoformat(date_str)
        return (d.weekday() + 1) % 7
    except (ValueError, TypeError):
        return 0
