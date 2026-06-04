"""Long-term memory store — SQLite-based conversation indexing for cross-session recall.

Every user and assistant message is automatically indexed when conversations
are saved. Before each AI response, relevant past memories are retrieved via
keyword matching and injected into the context, so the AI "remembers" across
sessions even without conversation history.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "memories.db"


def _conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                conv_id TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_memories_conv ON memories(conv_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_memories_time ON memories(created_at)"
        )
        conn.commit()


def store_messages(conv_id: str, messages: list[dict]) -> int:
    """Store new messages from a conversation into long-term memory.

    Tracks already-indexed count per conversation (by conv_id) so repeated
    syncs only index delta. Returns number of new messages stored.
    """
    _init_db()
    with _conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS c FROM memories WHERE conv_id = ?",
            (conv_id,),
        ).fetchone()
        already = row["c"] if row else 0

        new_msgs = messages[already:]
        if not new_msgs:
            return 0

        for msg in new_msgs:
            content = (msg.get("content") or "").strip()
            role = (msg.get("role") or "").strip()
            if content and role:
                conn.execute(
                    "INSERT INTO memories (role, content, conv_id) VALUES (?, ?, ?)",
                    (role, content, conv_id),
                )
        conn.commit()
        return len(new_msgs)


def search_memories(query: str, limit: int = 10) -> list[dict]:
    """Search past conversation memories by keyword.

    Uses LIKE for CJK-friendly matching (no FTS5 CJK issues).
    Returns list of {id, role, content, conv_id, created_at}, newest first.
    """
    _init_db()
    with _conn() as conn:
        like_q = f"%{query}%"
        rows = conn.execute(
            """SELECT id, role, content, conv_id, created_at
               FROM memories
               WHERE content LIKE ?
               ORDER BY id DESC
               LIMIT ?""",
            (like_q, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def count_memories() -> int:
    """Return total number of stored memory entries."""
    _init_db()
    with _conn() as conn:
        return conn.execute("SELECT COUNT(*) AS c FROM memories").fetchone()["c"]


def clear_memories() -> int:
    """Delete all memories. Returns count deleted."""
    _init_db()
    with _conn() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM memories").fetchone()["c"]
        conn.execute("DELETE FROM memories")
        conn.commit()
        return count
