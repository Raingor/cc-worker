"""Email sender for daily reminders — uses AgentMail API."""

from __future__ import annotations
import json
import requests
from datetime import datetime
from pathlib import Path

REMINDERS_PATH = Path(__file__).resolve().parents[1] / "prompts" / "day_reminders.json"

WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"]
MODE_CN = {"morning": "上午提醒", "afternoon": "下午核准"}


def _load_reminders() -> dict:
    try:
        if REMINDERS_PATH.is_file():
            return json.loads(REMINDERS_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _fetch_checklist(date_str: str) -> list[dict] | None:
    """Load today's checklist items from checklist_store (if available)."""
    try:
        from checklist_store import get_or_create
        data = get_or_create("", date_str)
        if data and data.get("items"):
            return data["items"]
    except Exception:
        pass
    return None


def _format_checklist_done(items: list[dict]) -> str:
    """Format completed items with notes for the email body."""
    done = [i for i in items if i.get("checked")]
    if not done:
        return ""
    lines = ["\n✅ 今日已完成事项："]
    for i in done:
        label = i.get("label", "")
        note = i.get("note", "").strip()
        if note:
            lines.append(f"  ✔ {label}  ── {note}")
        else:
            lines.append(f"  ✔ {label}")
    return "\n".join(lines)


def build_reminder_body(mode: str = "morning") -> tuple[str, str]:
    """Build email subject and body for today's reminder.

    mode='morning': send the day's tasks (daily planning).
    mode='afternoon': send the day's approval items + completed task notes.
    """
    now = datetime.now()
    js_day = (now.weekday() + 1) % 7
    date_str_iso = now.strftime("%Y-%m-%d")
    date_str = f"{now.year}年{now.month}月{now.day}日 星期{WEEKDAY_CN[js_day]}"

    reminders = _load_reminders()
    entry = reminders.get(str(js_day))
    if not entry:
        subject = f"CC 工作助手 — {date_str}（休息日）"
        body = f"今天是 {date_str}，周末没有固定工作安排。好好休息！"
        return subject, body

    title = entry["title"]
    mode_label = MODE_CN.get(mode, "提醒")
    subject = f"CC 工作助手 — {date_str} · {title} · {mode_label}"

    if mode == "afternoon":
        content = entry.get("afternoon_approval", "")
        if not content:
            content = "今天没有待核准事项。"

        checklist = _fetch_checklist(date_str_iso)
        done_block = _format_checklist_done(checklist) if checklist else ""

        body = f"""\
⏰ CC 工作助手 · 下午核准提醒
{'=' * 40}

日期：{date_str}

📋 待核准事项：
{content}
{done_block}

---
此邮件由 CC Worker API 自动发送
"""
    else:
        tasks = entry["tasks"]
        month_week = (now.day - 1) // 7 + 1
        le_reminder = ""
        if month_week == 3:
            le_reminder = "\n📌 本月第三周提醒：本月 LE 数据分析需要完成。"

        body = f"""\
⏰ CC 工作助手 · 早晨任务提醒
{'=' * 40}

日期：{date_str}

📋 今日工作：{title}

{tasks}
{le_reminder}

---
此邮件由 CC Worker API 自动发送
"""

    return subject, body


def send_reminder_email(
    agentmail_inbox: str,
    agentmail_api_key: str,
    to_email: str,
    cc_email: str | None = None,
    mode: str = "morning",
) -> dict:
    """Send a daily reminder email via AgentMail API."""
    subject, body = build_reminder_body(mode=mode)

    try:
        import urllib.parse
        inbox_encoded = urllib.parse.quote(agentmail_inbox, safe='')
        url = f"https://api.agentmail.to/v0/inboxes/{inbox_encoded}/messages/send"
        headers = {
            "Authorization": f"Bearer {agentmail_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "to": to_email,
            "subject": subject,
            "text": body,
        }
        if cc_email:
            payload["cc"] = cc_email

        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if not resp.ok:
            return {"success": False, "error": f"AgentMail API error: {resp.status_code} {resp.text}", "to": to_email, "mode": mode}

        return {"success": True, "to": to_email, "subject": subject, "mode": mode}
    except Exception as e:
        return {"success": False, "error": str(e), "to": to_email, "mode": mode}
