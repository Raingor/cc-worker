"""CC Worker API — OpenAI-compatible proxy with Bearer auth."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from analysis.analyzer import analyze as analyze_excel
from analysis.email_sender import send_reminder_email

load_dotenv()

APP = Flask(__name__)

_cors_origins = os.getenv("CORS_ORIGINS", "https://raingor.github.io").split(",")
_cors_origins = [o.strip() for o in _cors_origins if o.strip()]
CORS(APP, origins=_cors_origins, supports_credentials=False)

APP_TOKEN = os.getenv("APP_TOKEN", "")
AI_API_BASE = os.getenv("AI_API_BASE", "https://api.openai.com/v1").rstrip("/")
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

# Email reminder config
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.qq.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
REMINDER_TO = os.getenv("REMINDER_TO", "")

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "cc_instructions.txt"

DAY_REMINDERS = {
    1: "**周一提醒**：今天要更新 CFC/厦门/墨西哥出运资料，准备好了吗？",
    2: "**周二提醒**：今天要做 Gap Crasher 缺料检查，还要发墨西哥下周出运装箱单。",
    3: "**周三提醒**：今天要更新 Order Pattern 并下单，还要发厦门当周出运装箱单。",
    4: "**周四提醒**：今天工作最多——处理墨西哥和厦门新订单、分析越南波动、分析厦门预测趋势、删除上周 SAP PIR。",
    5: "**周五提醒**：今天要完成当周 PIR 上传 SAP，还要检查报关资料。",
}
WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"]


def _load_base_instructions() -> str:
    if PROMPT_PATH.is_file():
        return PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "你是 CC 的工作助手。"


def build_system_prompt() -> str:
    base = _load_base_instructions()
    now = datetime.now()
    js_day = (now.weekday() + 1) % 7  # align with JS getDay(): Sun=0 .. Sat=6
    date_str = f"{now.year}年{now.month}月{now.day}日 星期{WEEKDAY_CN[js_day]}"
    reminder = DAY_REMINDERS.get(js_day, "")
    week_num = (now.day - 1) // 7 + 1
    if week_num == 3:
        reminder += "\n**本月第三周提醒**：本月 LE 数据分析需要完成。"
    extra = f"\n\n## 当前日期\n今天日期：{date_str}"
    if reminder:
        extra += f"\n{reminder}"
    return base + extra


def _verify_token() -> bool:
    if not APP_TOKEN:
        return False
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return False
    return auth[7:].strip() == APP_TOKEN


def _client_messages(body: dict) -> list:
    raw = body.get("messages") or []
    out = []
    for m in raw:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        if role == "system":
            continue
        if role in ("user", "assistant") and m.get("content"):
            out.append({"role": role, "content": m["content"]})
    return out


@APP.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "cc-worker-api"})


@APP.route("/v1/chat/upload", methods=["POST", "OPTIONS"])
def upload_file():
    """Upload an Excel file and return analysis results."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized", "type": "invalid_request_error"}}), 401

    if "file" not in request.files:
        return jsonify({"error": {"message": "No file provided", "type": "invalid_request_error"}}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": {"message": "Empty filename", "type": "invalid_request_error"}}), 400

    # Validate file type
    ext = Path(f.filename).suffix.lower()
    if ext not in (".xlsx", ".xls", ".csv"):
        return jsonify({"error": {"message": f"Unsupported file type: {ext}. Accepted: .xlsx, .xls, .csv"}}), 400

    # Save to temp, analyze, clean up
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    try:
        f.save(tmp.name)
        tmp.close()

        result = analyze_excel(tmp.name)
        return jsonify({
            "success": True,
            "analysis": result,
        })
    except Exception as e:
        return jsonify({
            "error": {"message": f"Analysis failed: {e}", "type": "server_error"},
        }), 500
    finally:
        Path(tmp.name).unlink(missing_ok=True)


@APP.route("/v1/reminder/email", methods=["POST", "OPTIONS"])
def reminder_email():
    """Send a daily reminder email. Requires SMTP config in .env"""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    if not SMTP_USER or not SMTP_PASSWORD:
        return jsonify({"error": {"message": "SMTP not configured"}}), 503

    body = request.get_json(silent=True) or {}
    to_email = body.get("to") or REMINDER_TO
    if not to_email:
        return jsonify({"error": {"message": "No recipient (set REMINDER_TO in .env or pass `to`)"}}), 400

    result = send_reminder_email(
        to_email=to_email,
        smtp_host=SMTP_HOST,
        smtp_port=SMTP_PORT,
        smtp_user=SMTP_USER,
        smtp_password=SMTP_PASSWORD,
    )
    status = 200 if result["success"] else 500
    return jsonify(result), status


@APP.route("/v1/chat/completions", methods=["POST", "OPTIONS"])
def chat_completions():
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized", "type": "invalid_request_error"}}), 401
    if not AI_API_KEY:
        return jsonify({"error": {"message": "AI API not configured", "type": "server_error"}}), 503

    try:
        body = request.get_json(force=True, silent=False) or {}
    except Exception:
        return jsonify({"error": {"message": "Invalid JSON body"}}), 400

    messages = [{"role": "system", "content": build_system_prompt()}]
    messages.extend(_client_messages(body))
    if len(messages) < 2:
        return jsonify({"error": {"message": "messages required"}}), 400

    payload = {
        "model": body.get("model") or AI_MODEL,
        "messages": messages,
        "stream": bool(body.get("stream", False)),
    }
    if "temperature" in body:
        payload["temperature"] = body["temperature"]
    if "max_tokens" in body:
        payload["max_tokens"] = body["max_tokens"]

    upstream_url = f"{AI_API_BASE}/chat/completions"
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }

    if payload["stream"]:
        def generate():
            with requests.post(
                upstream_url,
                headers=headers,
                json=payload,
                stream=True,
                timeout=600,
            ) as resp:
                if resp.status_code != 200:
                    err = resp.text[:500]
                    yield f"data: {json.dumps({'error': err})}\n\n"
                    return
                for line in resp.iter_lines(decode_unicode=True):
                    if line:
                        yield line + "\n"
                    else:
                        yield "\n"

        return Response(
            generate(),
            status=200,
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    resp = requests.post(upstream_url, headers=headers, json=payload, timeout=600)
    return Response(resp.content, status=resp.status_code, mimetype=resp.headers.get("Content-Type", "application/json"))


if __name__ == "__main__":
    APP.run(host="127.0.0.1", port=5001, debug=False)
