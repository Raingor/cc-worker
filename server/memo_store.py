"""Memo (备忘录) storage — SQLite-backed notes grouped by date."""



from __future__ import annotations
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "memo.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS memos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_memos_created_at
            ON memos(created_at DESC)
        """)
        conn.commit()


_init_db()


def get_memos() -> dict:
    """Return memos grouped by date, newest first."""
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM memos ORDER BY created_at DESC"
        ).fetchall()

    groups = {}
    for row in rows:
        date_key = row["created_at"][:10]  # YYYY-MM-DD
        if date_key not in groups:
            groups[date_key] = []
        groups[date_key].append({
            "id": row["id"],
            "title": row["title"],
            "content": row["content"],
            "time": row["created_at"],
        })

    result = []
    for date_key in sorted(groups.keys(), reverse=True):
        result.append({
            "date": date_key,
            "memos": groups[date_key],
        })
    return {"groups": result}


def create_memo(title: str, content: str) -> dict:
    """Create a new memo and return it."""
    now = datetime.now().isoformat()
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO memos (title, content, created_at) VALUES (?, ?, ?)",
            (title, content, now),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM memos WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "time": row["created_at"],
    }


def update_memo(memo_id: int, title: str, content: str) -> dict | None:
    """Update a memo. Returns updated memo or None if not found."""
    with _conn() as conn:
        existing = conn.execute(
            "SELECT 1 FROM memos WHERE id = ?", (memo_id,)
        ).fetchone()
        if not existing:
            return None
        conn.execute(
            "UPDATE memos SET title = ?, content = ? WHERE id = ?",
            (title, content, memo_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM memos WHERE id = ?", (memo_id,)
        ).fetchone()
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "time": row["created_at"],
    }


def delete_memo(memo_id: int) -> bool:
    """Delete a memo by id."""
    with _conn() as conn:
        cur = conn.execute("DELETE FROM memos WHERE id = ?", (memo_id,))
        conn.commit()
    return cur.rowcount > 0
