"""Email sender for daily reminders — uses QQ SMTP."""

from __future__ import annotations

import smtplib
import ssl
from datetime import datetime
from email.mime.text import MIMEText

DAY_REMINDERS = {
    1: ("周一：出运资料更新",
        "今天要更新 CFC / 厦门 / 墨西哥的出运资料（Shipping Documentation），"
        "确保三个工厂的出运信息保持一致和最新。"),
    2: ("周二：缺料检查 & 出运预告",
        "1. Gap Crasher 缺料检查 — 按 P1→P2→P3 优先级排序\n"
        "2. 墨西哥下周出运装箱单 — 发给仓库 / 生产计划 / 船务 / 客户"),
    3: ("周三：下单 & 厦门出运",
        "1. 更新 Order Pattern & 下单 — 确认金额，通过 Gap Crasher 操作\n"
        "2. 厦门当周出运装箱单 — 发给仓库 / 生产计划 / 船务"),
    4: ("周四：订单处理 & 数据分析（最忙的一天）",
        "上午：墨西哥订单处理（下达到 MF）+ 越南四方盖波动分析\n"
        "下午：厦门订单处理 + 厦门未来趋势分析\n"
        "SAP：删除上周上传的 PIR"),
    5: ("周五：PIR 上传 & 报关检查",
        "1. 完成当周 PIR 并上传 SAP\n"
        "2. 检查厦门出运报关资料"),
}

WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"]


def build_reminder_body() -> tuple[str, str]:
    """Build email subject and body for today's reminder."""
    now = datetime.now()
    js_day = (now.weekday() + 1) % 7
    date_str = f"{now.year}年{now.month}月{now.day}日 星期{WEEKDAY_CN[js_day]}"

    entry = DAY_REMINDERS.get(js_day)
    if not entry:
        subject = f"CC 工作助手 — {date_str}（休息日）"
        body = f"今天是 {date_str}，周末没有固定工作安排。好好休息！"
        return subject, body

    title, tasks = entry
    subject = f"CC 工作助手 — {date_str} · {title}"

    month_week = (now.day - 1) // 7 + 1
    le_reminder = ""
    if month_week == 3:
        le_reminder = "\n📌 **本月第三周提醒**：本月 LE 数据分析需要完成。"

    body = f"""\
⏰ CC 工作助手每日提醒
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
    to_email: str,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    cc_email: str | None = None,
    use_ssl: bool = True,
) -> dict:
    """Send a daily reminder email. Returns dict with status."""
    subject, body = build_reminder_body()

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    if cc_email:
        msg["Cc"] = cc_email

    # Recipients for actual sending: To + Cc
    recipients = [to_email]
    if cc_email:
        recipients.append(cc_email)

    try:
        if use_ssl:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=ctx) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(msg, to_addrs=recipients)
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg, to_addrs=recipients)

        return {"success": True, "to": to_email, "subject": subject}
    except Exception as e:
        return {"success": False, "error": str(e), "to": to_email}
