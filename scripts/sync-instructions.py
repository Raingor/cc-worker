#!/usr/bin/env python3
"""Sync instructions and conversation starters from declarativeAgent.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "appPackage" / "declarativeAgent.json"
SERVER_PROMPT = ROOT / "server" / "prompts" / "cc_instructions.txt"
WEB_META = ROOT / "web" / "assets" / "cc-meta.json"


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    instructions = data.get("instructions", "")
    if not instructions:
        raise SystemExit("declarativeAgent.json: missing instructions")

    SERVER_PROMPT.parent.mkdir(parents=True, exist_ok=True)
    SERVER_PROMPT.write_text(instructions, encoding="utf-8")

    meta = {
        "name": data.get("name", {}),
        "description": data.get("description", {}),
        "conversation_starters": data.get("conversation_starters", []),
    }
    WEB_META.parent.mkdir(parents=True, exist_ok=True)
    WEB_META.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {SERVER_PROMPT}")
    print(f"Wrote {WEB_META}")


if __name__ == "__main__":
    main()
