"""Server-side conversation storage — SQLite-backed.


Each row stores a per-token conversation with messages as a JSON blob.
SQLite WAL mode enables safe concurrent reads across uWSGI processes.
Auto-migrates from legacy per-token JSON files on first run.
"""


from __future__ import annotations
import hashlib
import json
import sqlite3
from pathlib import Path
from datetime import datetime

DATA_DIR = Path(__file__).resolve().parent / "data" / "conversations"
DB_PATH = Path(__file__).resolve().parent / "data" / "conversations.db"

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
            CREATE TABLE IF NOT EXISTS conversations (
                token_hash TEXT NOT NULL,
                conv_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT '',
                messages TEXT NOT NULL DEFAULT '[]',
                active_id TEXT DEFAULT NULL,
                PRIMARY KEY (token_hash, conv_id)
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conv_token ON conversations(token_hash)"
        )
        conn.commit()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _migrate_from_json():
    """One-time migration from legacy per-token JSON files to SQLite."""
    if DB_PATH.is_file():
        with _conn() as conn:
            existing = conn.execute("SELECT COUNT(*) AS c FROM conversations").fetchone()
            if existing and existing["c"] > 0:
                return
    json_files = sorted(DATA_DIR.glob("*.json"))
    if not json_files:
        return

    with _conn() as conn:
        for jf in json_files:
            token_hash = jf.stem
            try:
                data = json.loads(jf.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            active_id = data.get("activeId")
            for conv in data.get("conversations", []):
                messages = conv.get("messages", [])
                conn.execute(
                    """INSERT OR IGNORE INTO conversations
                       (token_hash, conv_id, title, created_at, updated_at, messages, active_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        token_hash,
                        conv["id"],
                        conv.get("title", ""),
                        conv.get("createdAt", ""),
                        conv.get("updatedAt", ""),
                        json.dumps(messages, ensure_ascii=False),
                        active_id,
                    ),
                )
            jf.rename(jf.with_suffix(".json.bak"))
        conn.commit()


_init_db()
_migrate_from_json()


def _load(token: str) -> dict:
    h = _token_hash(token)
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM conversations WHERE token_hash = ? ORDER BY updated_at DESC",
            (h,),
        ).fetchall()
    if not rows:
        return {"conversations": [], "activeId": None}
    active_id = None
    conversations = []
    for r in rows:
        conv = {
            "id": r["conv_id"],
            "title": r["title"],
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
            "messages": json.loads(r["messages"]) if r["messages"] else [],
        }
        conversations.append(conv)
        if r["active_id"]:
            active_id = r["active_id"]
    return {"conversations": conversations, "activeId": active_id}


def _save(token: str, data: dict) -> None:
    h = _token_hash(token)
    active_id = data.get("activeId")
    with _conn() as conn:
        for conv in data.get("conversations", []):
            messages = conv.get("messages", [])
            conn.execute(
                """INSERT OR REPLACE INTO conversations
                   (token_hash, conv_id, title, created_at, updated_at, messages, active_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    h,
                    conv["id"],
                    conv.get("title", ""),
                    conv.get("createdAt", ""),
                    conv.get("updatedAt", ""),
                    json.dumps(messages, ensure_ascii=False),
                    active_id,
                ),
            )
        conn.commit()


# --- Public API ---

def list_conversations(token: str) -> list[dict]:
    """Return conversation list (without messages body)."""
    h = _token_hash(token)
    with _conn() as conn:
        rows = conn.execute(
            "SELECT conv_id, title, created_at, updated_at FROM conversations WHERE token_hash = ? ORDER BY updated_at DESC",
            (h,),
        ).fetchall()
    return [
        {"id": r["conv_id"], "title": r["title"], "createdAt": r["created_at"], "updatedAt": r["updated_at"]}
        for r in rows
    ]


def get_conversation(token: str, conv_id: str) -> dict | None:
    """Get full conversation by id."""
    h = _token_hash(token)
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM conversations WHERE token_hash = ? AND conv_id = ?",
            (h, conv_id),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row["conv_id"],
        "title": row["title"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "messages": json.loads(row["messages"]) if row["messages"] else [],
    }


def upsert_conversation(token: str, conv: dict) -> dict:
    """Create or update a conversation. Returns the saved conversation (without messages)."""
    h = _token_hash(token)
    now = datetime.now().isoformat()
    messages = json.dumps(conv.get("messages", []), ensure_ascii=False)

    with _conn() as conn:
        existing = conn.execute(
            "SELECT * FROM conversations WHERE token_hash = ? AND conv_id = ?",
            (h, conv["id"]),
        ).fetchone()

        if existing:
            title = conv.get("title", existing["title"])
            conn.execute(
                """UPDATE conversations SET title=?, updated_at=?, messages=?
                   WHERE token_hash=? AND conv_id=?""",
                (title, now, messages, h, conv["id"]),
            )
        else:
            title = conv.get("title", "新对话")
            conn.execute(
                """INSERT INTO conversations
                   (token_hash, conv_id, title, created_at, updated_at, messages)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (h, conv["id"], title, now, now, messages),
            )
        conn.commit()

    return {"id": conv["id"], "title": title, "createdAt": existing["created_at"] if existing else now, "updatedAt": now}


def delete_conversation(token: str, conv_id: str) -> bool:
    """Delete conversation. Returns True if found."""
    h = _token_hash(token)
    with _conn() as conn:
        cur = conn.execute(
            "DELETE FROM conversations WHERE token_hash = ? AND conv_id = ?",
            (h, conv_id),
        )
        conn.commit()
        return cur.rowcount > 0


def pop_last_message(token: str, conv_id: str) -> bool:
    """Remove the last assistant message (used on streaming error rollback)."""
    h = _token_hash(token)
    with _conn() as conn:
        row = conn.execute(
            "SELECT messages FROM conversations WHERE token_hash = ? AND conv_id = ?",
            (h, conv_id),
        ).fetchone()
        if not row:
            return False
        msgs = json.loads(row["messages"]) if row["messages"] else []
        if not msgs:
            return False
        msgs.pop()
        conn.execute(
            "UPDATE conversations SET messages = ? WHERE token_hash = ? AND conv_id = ?",
            (json.dumps(msgs, ensure_ascii=False), h, conv_id),
        )
        conn.commit()
        return True
