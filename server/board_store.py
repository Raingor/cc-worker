"""Board (留言板) storage — SQLite-backed messages with replies and likes."""



from __future__ import annotations
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "board.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'CC',
                created_at TEXT NOT NULL,
                likes INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                author TEXT NOT NULL DEFAULT 'CC',
                created_at TEXT NOT NULL,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_replies_message_id
            ON replies(message_id)
        """)
        conn.commit()


_init_db()


def get_messages() -> list[dict]:
    """Return all messages with their replies, newest first."""
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM messages ORDER BY created_at DESC"
        ).fetchall()

    result = []
    for row in rows:
        msg_id = row["id"]
        reply_rows = conn.execute(
            "SELECT * FROM replies WHERE message_id = ? ORDER BY created_at ASC",
            (msg_id,),
        ).fetchall()
        replies = []
        for r in reply_rows:
            replies.append({
                "id": r["id"],
                "text": r["text"],
                "author": r["author"],
                "time": r["created_at"],
            })
        result.append({
            "id": msg_id,
            "text": row["text"],
            "author": row["author"],
            "time": row["created_at"],
            "likes": row["likes"],
            "liked": row["likes"] > 0,
            "replies": replies,
        })
    return result


def create_message(text: str, author: str) -> dict:
    """Create a new message and return it."""
    now = datetime.now().isoformat()
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO messages (text, author, created_at) VALUES (?, ?, ?)",
            (text, author, now),
        )
        conn.commit()
        return get_message(cur.lastrowid)


def get_message(msg_id: int) -> dict | None:
    """Get a single message with its replies."""
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM messages WHERE id = ?", (msg_id,)
        ).fetchone()
    if not row:
        return None
    reply_rows = conn.execute(
        "SELECT * FROM replies WHERE message_id = ? ORDER BY created_at ASC",
        (msg_id,),
    ).fetchall()
    replies = []
    for r in reply_rows:
        replies.append({
            "id": r["id"],
            "text": r["text"],
            "author": r["author"],
            "time": r["created_at"],
        })
    return {
        "id": row["id"],
        "text": row["text"],
        "author": row["author"],
        "time": row["created_at"],
        "likes": row["likes"],
        "liked": row["likes"] > 0,
        "replies": replies,
    }


def delete_message(msg_id: int) -> bool:
    """Delete a message and its replies (cascade)."""
    with _conn() as conn:
        conn.execute("DELETE FROM replies WHERE message_id = ?", (msg_id,))
        cur = conn.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
        conn.commit()
    return cur.rowcount > 0


def toggle_like(msg_id: int, action: str) -> int | None:
    """Like or unlike a message. Returns new like count or None if not found."""
    if action not in ("like", "unlike"):
        return None
    delta = 1 if action == "like" else -1
    with _conn() as conn:
        row = conn.execute(
            "SELECT likes FROM messages WHERE id = ?", (msg_id,)
        ).fetchone()
        if not row:
            return None
        new_likes = max(0, row["likes"] + delta)
        conn.execute(
            "UPDATE messages SET likes = ? WHERE id = ?",
            (new_likes, msg_id),
        )
        conn.commit()
    return new_likes


def create_reply(msg_id: int, text: str, author: str) -> dict | None:
    """Create a reply on a message. Returns reply dict or None if message not found."""
    with _conn() as conn:
        msg = conn.execute(
            "SELECT 1 FROM messages WHERE id = ?", (msg_id,)
        ).fetchone()
        if not msg:
            return None
        now = datetime.now().isoformat()
        cur = conn.execute(
            "INSERT INTO replies (message_id, text, author, created_at) VALUES (?, ?, ?, ?)",
            (msg_id, text, author, now),
        )
        conn.commit()
        return {
            "id": cur.lastrowid,
            "message_id": msg_id,
            "text": text,
            "author": author,
            "time": now,
        }


def delete_reply(reply_id: int) -> bool:
    """Delete a reply by its id."""
    with _conn() as conn:
        cur = conn.execute("DELETE FROM replies WHERE id = ?", (reply_id,))
        conn.commit()
    return cur.rowcount > 0
