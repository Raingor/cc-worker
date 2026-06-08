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
from analysis.email_checker import check_and_analyze
from usage_tracker import get_stats, record_usage
from conversation_store import list_conversations, get_conversation, upsert_conversation, delete_conversation, pop_last_message
from memory_store import store_messages as memory_store_messages, search_memories, count_memories
import checklist_store

load_dotenv()

APP = Flask(__name__)

_cors_origins = os.getenv("CORS_ORIGINS", "https://raingor.github.io").split(",")
_cors_origins = []
for o in os.getenv("CORS_ORIGINS", "https://raingor.github.io").split(","):
    o = o.strip()
    if not o:
        continue
    if " " in o or o.startswith("(") or not (o.startswith("http://") or o.startswith("https://") or o.startswith("chrome-extension://")):
        print(f"[cors] skipping invalid origin: {o!r}")
        continue
    _cors_origins.append(o)
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
REMINDER_CC = os.getenv("REMINDER_CC", "")

# IMAP config (for email analysis)
IMAP_HOST = os.getenv("IMAP_HOST", "imap.qq.com")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))

PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "cc_instructions.txt"
REMINDERS_PATH = Path(__file__).resolve().parent / "prompts" / "day_reminders.json"

WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"]


def _load_base_instructions() -> str:
    if PROMPT_PATH.is_file():
        return PROMPT_PATH.read_text(encoding="utf-8").strip()
    return "你是 CC 的工作助手。"


def _load_day_reminders() -> dict:
    try:
        if REMINDERS_PATH.is_file():
            import json
            return json.loads(REMINDERS_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def build_system_prompt() -> str:
    base = _load_base_instructions()
    now = datetime.now()
    js_day = (now.weekday() + 1) % 7  # align with JS getDay(): Sun=0 .. Sat=6
    date_str = f"{now.year}年{now.month}月{now.day}日 星期{WEEKDAY_CN[js_day]}"
    reminders = _load_day_reminders()
    entry = reminders.get(str(js_day), {})
    reminder = entry.get("short", "")
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


@APP.route("/v1/toolbox/pdf-to-excel", methods=["POST", "OPTIONS"])
def pdf_to_excel():
    """Upload a PDF, extract tables, return an Excel file."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized", "type": "invalid_request_error"}}), 401

    if "file" not in request.files:
        return jsonify({"error": {"message": "No file provided", "type": "invalid_request_error"}}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": {"message": "Empty filename", "type": "invalid_request_error"}}), 400

    ext = Path(f.filename).suffix.lower()
    if ext != ".pdf":
        return jsonify({"error": {"message": f"Unsupported file type: {ext}. Only .pdf accepted"}}), 400

    tmp_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    try:
        f.save(tmp_pdf.name)
        tmp_pdf.close()

        import pdfplumber
        import pandas as pd
        from io import BytesIO

        all_tables = {}  # page_number -> list of dataframes
        with pdfplumber.open(tmp_pdf.name) as pdf:
            for i, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if tables:
                    page_key = f"第{i+1}页"
                    page_dfs = []
                    for j, table in enumerate(tables):
                        if table:
                            headers = table[0] if len(table) > 1 else None
                            data = table[1:] if len(table) > 1 else table
                            df = pd.DataFrame(data, columns=headers)
                            page_dfs.append(df)
                    all_tables[page_key] = page_dfs

        if not all_tables:
            return jsonify({"error": {"message": "No tables found in the PDF"}}), 400

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            for page_key, dfs in all_tables.items():
                if len(dfs) == 1:
                    dfs[0].to_excel(writer, sheet_name=page_key[:31], index=False)
                else:
                    for j, df in enumerate(dfs):
                        sheet = f"{page_key[:24]}-{j+1}"[:31]
                        df.to_excel(writer, sheet_name=sheet, index=False)
        output.seek(0)

        return Response(
            output.getvalue(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{Path(f.filename).stem}.xlsx"',
            },
        )
    except ImportError:
        return jsonify({"error": {"message": "pdfplumber not installed on server"}}), 503
    except Exception as e:
        return jsonify({"error": {"message": f"PDF processing failed: {e}"}}), 500
    finally:
        Path(tmp_pdf.name).unlink(missing_ok=True)


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

    cc_email = body.get("cc") or REMINDER_CC or None
    mode = body.get("mode", "morning")
    if mode not in ("morning", "afternoon"):
        return jsonify({"error": {"message": "mode must be 'morning' or 'afternoon'"}}), 400

    result = send_reminder_email(
        to_email=to_email,
        cc_email=cc_email,
        smtp_host=SMTP_HOST,
        smtp_port=SMTP_PORT,
        smtp_user=SMTP_USER,
        smtp_password=SMTP_PASSWORD,
        mode=mode,
    )
    status = 200 if result["success"] else 500
    return jsonify(result), status


def _extract_provider() -> str:
    """Extract a readable provider name from AI_API_BASE."""
    base = AI_API_BASE.lower()
    if "opencode" in base:
        return "opencode.ai"
    if "openai" in base:
        return "OpenAI"
    if "deepseek" in base:
        return "DeepSeek"
    return base.replace("https://", "").split("/")[0]


def _parse_usage(body: dict, provider: str) -> dict | None:
    """Extract token usage from an upstream API response body."""
    usage = body.get("usage") if isinstance(body, dict) else None
    if not usage:
        return None
    return {
        "prompt_tokens": usage.get("prompt_tokens", 0) or usage.get("input_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0) or usage.get("output_tokens", 0) or usage.get("generated_tokens", 0),
        "cached_tokens": (
            usage.get("prompt_tokens_details", {}).get("cached_tokens", 0)
            or usage.get("prompt_cache_hit_tokens", 0)
            or 0
        ),
        "provider": provider,
        "model": body.get("model", AI_MODEL),
    }


@APP.route("/v1/stats", methods=["GET", "OPTIONS"])
def stats():
    """Return token usage statistics."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401

    data = get_stats()
    if not data["provider"]:
        data["provider"] = _extract_provider()
        data["model"] = AI_MODEL
    # Include memory count
    try:
        data["memory_count"] = count_memories()
    except Exception:
        data["memory_count"] = 0
    return jsonify(data)


@APP.route("/v1/conversations", methods=["GET", "POST", "OPTIONS"])
def conversations():
    """List or create conversations."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    # Extract token from auth header
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip()
    if request.method == "GET":
        return jsonify(list_conversations(token))
    # POST: upsert (create or update)
    body = request.get_json(silent=True) or {}
    if "id" not in body:
        return jsonify({"error": {"message": "conversation id required"}}), 400
    result = upsert_conversation(token, body)
    # Index messages into long-term memory
    if body.get("messages") and os.getenv("MEMORY_ENABLED", "true").lower() not in ("false", "0"):
        try:
            memory_store_messages(body["id"], body["messages"])
        except Exception:
            pass
    return jsonify(result), 200


@APP.route("/v1/conversations/<conv_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
def conversation_detail(conv_id):
    """Get, update, or delete a single conversation."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip()

    if request.method == "GET":
        c = get_conversation(token, conv_id)
        if not c:
            return jsonify({"error": {"message": "not found"}}), 404
        return jsonify(c)

    if request.method == "PUT":
        body = request.get_json(silent=True) or {}
        body["id"] = conv_id
        result = upsert_conversation(token, body)
        return jsonify(result)

    if request.method == "DELETE":
        ok = delete_conversation(token, conv_id)
        return jsonify({"deleted": ok}), (200 if ok else 404)


@APP.route("/v1/conversations/<conv_id>/pop", methods=["POST", "OPTIONS"])
def conversation_pop(conv_id):
    """Remove last message (rollback on streaming error)."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip()
    ok = pop_last_message(token, conv_id)
    return jsonify({"deleted": ok})


@APP.route("/v1/email/check", methods=["POST", "OPTIONS"])
def email_check():
    """Check IMAP for latest email from sylvia, download Excel, analyze."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    if not SMTP_USER or not SMTP_PASSWORD:
        return jsonify({"error": {"message": "Email (SMTP_USER) not configured"}}), 503

    result = check_and_analyze(
        imap_host=IMAP_HOST,
        imap_port=IMAP_PORT,
        email_user=SMTP_USER,
        email_password=SMTP_PASSWORD,
    )
    return jsonify(result), (200 if result.get("success") else 404)


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
    client_msgs = _client_messages(body)

    # --- Memory injection: retrieve relevant past conversations ---
    memory_enabled = os.getenv("MEMORY_ENABLED", "true").lower() not in ("false", "0")
    memory_context = None
    if memory_enabled and client_msgs:
        try:
            user_msgs = [m["content"] for m in client_msgs if m["role"] == "user"]
            if user_msgs:
                last_query = user_msgs[-1][:150]  # first 150 chars as search key
                results = search_memories(last_query, limit=int(os.getenv("MEMORY_SEARCH_LIMIT", "8")))
                if results:
                    lines = []
                    for r in results:
                        date = r["created_at"][:10] if r.get("created_at") else "过去"
                        preview = r["content"][:200].replace("\n", " ")
                        icon = "👤" if r["role"] == "user" else "🤖"
                        lines.append(f"- {icon} [{date}] {preview}")
                    memory_context = (
                        "[📚 过往记忆]\n"
                        "以下是你在之前的对话中讨论过的相关内容，请参考：\n\n"
                        + "\n".join(lines[:8])
                    )
        except Exception as exc:
            print(f"[memory] inject error: {exc}")

    if memory_context:
        messages.append({"role": "system", "content": memory_context})
    messages.extend(client_msgs)
    if len(messages) < 2:
        return jsonify({"error": {"message": "messages required"}}), 400

    stream = bool(body.get("stream", False))
    model = body.get("model") or AI_MODEL
    provider = _extract_provider()

    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
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

    if stream:
        def generate():
            last_usage = None
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
                        if line.startswith("data: "):
                            try:
                                chunk = json.loads(line[6:])
                                if chunk.get("usage"):
                                    last_usage = chunk["usage"]
                            except (json.JSONDecodeError, IndexError):
                                pass
                    else:
                        yield "\n"
            # Record usage from last chunk
            if last_usage:
                parsed = _parse_usage({"usage": last_usage, "model": model}, provider)
                if parsed:
                    record_usage(**parsed)

        return Response(
            generate(),
            status=200,
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    resp = requests.post(upstream_url, headers=headers, json=payload, timeout=600)
    try:
        resp_data = resp.json()
        parsed = _parse_usage(resp_data, provider) if resp.ok else None
        if parsed:
            record_usage(**parsed)
    except Exception:
        pass
    return Response(resp.content, status=resp.status_code, mimetype=resp.headers.get("Content-Type", "application/json"))


@APP.route("/v1/checklist", methods=["GET", "POST", "OPTIONS"])
def checklist_route():
    """GET: get checklist for a date. POST: save checked items."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip()

    if request.method == "GET":
        date = request.args.get("date", "")
        if not date:
            return jsonify({"error": {"message": "date query param required (YYYY-MM-DD)"}}), 400
        try:
            data = checklist_store.get_or_create(token, date)
            return jsonify(data)
        except Exception as e:
            return jsonify({"error": {"message": str(e)}}), 500

    # POST: save items
    body = request.get_json(silent=True) or {}
    date = body.get("date", "")
    items = body.get("items", [])
    if not date or not items:
        return jsonify({"error": {"message": "date and items required"}}), 400
    try:
        result = checklist_store.save_items(token, date, items)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@APP.route("/v1/checklist/summarize", methods=["POST", "OPTIONS"])
def checklist_summarize():
    """Generate AI summary for today's checklist and save it."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    if not AI_API_KEY:
        return jsonify({"error": {"message": "AI API not configured"}}), 503

    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip()
    body = request.get_json(silent=True) or {}
    date = body.get("date", "")
    if not date:
        return jsonify({"error": {"message": "date required"}}), 400

    ctx = checklist_store.get_summary_context(token, date)
    if ctx is None:
        return jsonify({"error": {"message": "No template for this date"}}), 400

    lines = [f"日期：{date}"]
    lines.append(f"主题：{ctx['title']}")
    lines.append("")
    if ctx["done"]:
        lines.append("【已完成】")
        lines.extend(ctx["done"])
        lines.append("")
    if ctx["undone"]:
        lines.append("【未完成】")
        lines.extend(ctx["undone"])
        lines.append("")

    prompt_text = "\n".join(lines)
    user_content = f"{prompt_text}\n\n请根据以上内容，给今天的工作做一个总结，包含已完成事项、未完成事项以及整体评价。"

    upstream_url = f"{AI_API_BASE}/chat/completions"
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": "你是一个工作助手，擅长总结日常工作。请用简洁、专业的语言总结。"},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
    }

    try:
        resp = requests.post(upstream_url, headers=headers, json=payload, timeout=120)
        if not resp.ok:
            return jsonify({"error": {"message": f"AI API error: {resp.status_code}"}}), 502
        resp_data = resp.json()
        summary = resp_data["choices"][0]["message"]["content"]

        checklist_store.save_summary(token, date, summary)
        return jsonify({"date": date, "summary": summary})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


@APP.route("/v1/checklist/history", methods=["GET", "OPTIONS"])
def checklist_history():
    """Return list of dates in a month that have checklist data."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip()

    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    if not year or not month:
        return jsonify({"error": {"message": "year and month required"}}), 400
    try:
        dates = checklist_store.get_history_dates(token, year, month)
        return jsonify({"year": year, "month": month, "dates": dates})
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


if __name__ == "__main__":
    APP.run(host="127.0.0.1", port=5001, debug=False)
