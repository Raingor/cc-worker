"""Analysis records storage — SQLite-backed, persistent history."""



from __future__ import annotations
import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "analysis.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _migrate_db():
    """Add columns for re-analysis support (safe to run multiple times)."""
    with _conn() as conn:
        for col in (
            "email_body_full TEXT DEFAULT ''",
            "attachment_analysis TEXT DEFAULT '[]'",
            "user_instructions TEXT DEFAULT ''",
        ):
            try:
                conn.execute(f"ALTER TABLE analysis_records ADD COLUMN {col}")
            except sqlite3.OperationalError:
                pass  # column already exists
        conn.commit()


def _init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_records (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                email_subject TEXT NOT NULL DEFAULT '',
                email_sender TEXT NOT NULL DEFAULT '',
                email_date TEXT DEFAULT '',
                email_body_preview TEXT DEFAULT '',
                ai_response TEXT NOT NULL DEFAULT '',
                attachment_files TEXT DEFAULT '[]',
                has_pdf INTEGER DEFAULT 0,
                has_xlsx INTEGER DEFAULT 0,
                has_replied INTEGER DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_analysis_created_at
            ON analysis_records(created_at DESC)
        """)
        conn.commit()


_init_db()
_migrate_db()


def create_record(data: dict) -> dict:
    """Create a new analysis record and return it."""
    record_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()

    with _conn() as conn:
        conn.execute(
            """INSERT INTO analysis_records
               (id, created_at, email_subject, email_sender, email_date,
                email_body_preview, ai_response, attachment_files,
                email_body_full, attachment_analysis)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                record_id,
                now,
                data.get("email_subject", ""),
                data.get("email_sender", ""),
                data.get("email_date", ""),
                data.get("email_body_preview", "")[:500],
                data.get("ai_response", ""),
                json.dumps(data.get("attachment_files", []), ensure_ascii=False),
                data.get("email_body_full", "")[:10000],
                json.dumps(data.get("attachment_analysis", []), ensure_ascii=False),
            ),
        )
        conn.commit()

    return get_record(record_id)


def get_record(record_id: str) -> dict | None:
    """Get a single record by id."""
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM analysis_records WHERE id = ?",
            (record_id,),
        ).fetchone()

    if not row:
        return None
    return _row_to_dict(row)


def list_records(limit: int = 50) -> list[dict]:
    """List all records, newest first."""
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM analysis_records ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def update_flag(record_id: str, flag: str) -> dict | None:
    """Set a boolean flag to 1. flag: has_pdf, has_xlsx, has_replied."""
    if flag not in ("has_pdf", "has_xlsx", "has_replied"):
        return None
    with _conn() as conn:
        conn.execute(
            f"UPDATE analysis_records SET {flag} = 1 WHERE id = ?",
            (record_id,),
        )
        conn.commit()
    return get_record(record_id)


def update_response(record_id: str, ai_response: str, user_instructions: str = "") -> dict | None:
    """Update AI response and optionally save user instructions for re-analysis."""
    with _conn() as conn:
        conn.execute(
            """UPDATE analysis_records
               SET ai_response = ?,
                   user_instructions = CASE WHEN ? != '' THEN ? ELSE user_instructions END
               WHERE id = ?""",
            (ai_response, user_instructions, user_instructions, record_id),
        )
        conn.commit()
    return get_record(record_id)


def delete_record(record_id: str) -> bool:
    """Delete a record. Returns True if deleted."""
    with _conn() as conn:
        cur = conn.execute(
            "DELETE FROM analysis_records WHERE id = ?",
            (record_id,),
        )
        conn.commit()
    return cur.rowcount > 0


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    # Parse JSON fields
    for field in ("attachment_files", "attachment_analysis"):
        try:
            d[field] = json.loads(d.get(field, "[]"))
        except (json.JSONDecodeError, TypeError):
            d[field] = []
    # Convert booleans
    d["has_pdf"] = bool(d.get("has_pdf", 0))
    d["has_xlsx"] = bool(d.get("has_xlsx", 0))
    d["has_replied"] = bool(d.get("has_replied", 0))
    # Ensure string defaults
    d.setdefault("email_body_full", "")
    d.setdefault("user_instructions", "")
    # Truncate long response for list view
    if d.get("ai_response"):
        d["ai_response_preview"] = d["ai_response"][:200]
    else:
        d["ai_response_preview"] = ""
    return d
