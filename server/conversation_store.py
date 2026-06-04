"""Server-side conversation storage — per-token JSON files."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data" / "conversations"


def _data_path(token: str) -> Path:
    h = hashlib.sha256(token.encode()).hexdigest()[:16]
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR / f"{h}.json"


def _load(token: str) -> dict:
    path = _data_path(token)
    if path.is_file():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"conversations": [], "activeId": None}


def _save(token: str, data: dict) -> None:
    _data_path(token).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# --- Public API ---

def list_conversations(token: str) -> list[dict]:
    """Return conversation list (without messages body)."""
    data = _load(token)
    return [
        {"id": c["id"], "title": c["title"], "createdAt": c.get("createdAt"), "updatedAt": c.get("updatedAt")}
        for c in data.get("conversations", [])
    ]


def get_conversation(token: str, conv_id: str) -> dict | None:
    """Get full conversation by id."""
    data = _load(token)
    for c in data.get("conversations", []):
        if c["id"] == conv_id:
            return c
    return None


def upsert_conversation(token: str, conv: dict) -> dict:
    """Create or update a conversation. Returns the saved conversation."""
    data = _load(token)
    now = datetime.now().isoformat()
    existing = None
    for i, c in enumerate(data.get("conversations", [])):
        if c["id"] == conv["id"]:
            existing = i
            break

    if existing is not None:
        # Update
        old = data["conversations"][existing]
        old["title"] = conv.get("title", old["title"])
        old["updatedAt"] = now
        if "messages" in conv:
            old["messages"] = conv["messages"]
        saved = old
    else:
        # Create
        conv["createdAt"] = now
        conv["updatedAt"] = now
        if "messages" not in conv:
            conv["messages"] = []
        data["conversations"].append(conv)
        saved = conv

    _save(token, data)
    return {k: v for k, v in saved.items() if k != "messages"}  # return without body


def delete_conversation(token: str, conv_id: str) -> bool:
    """Delete conversation. Returns True if found."""
    data = _load(token)
    before = len(data.get("conversations", []))
    data["conversations"] = [c for c in data.get("conversations", []) if c["id"] != conv_id]
    if len(data["conversations"]) < before:
        _save(token, data)
        return True
    return False


def pop_last_message(token: str, conv_id: str) -> bool:
    """Remove the last assistant message (used on streaming error rollback)."""
    data = _load(token)
    for c in data.get("conversations", []):
        if c["id"] == conv_id and c.get("messages"):
            c["messages"].pop()
            _save(token, data)
            return True
    return False
