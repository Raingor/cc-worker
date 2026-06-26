"""CC Worker API — OpenAI-compatible proxy with Bearer auth."""

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
from analysis.email_checker import check_and_analyze, check_email_full
from usage_tracker import get_stats, record_usage
from conversation_store import list_conversations, get_conversation, upsert_conversation, delete_conversation, pop_last_message
from memory_store import store_messages as memory_store_messages, search_memories, count_memories
import checklist_store
import analysis_store
import board_store
import memo_store

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

# Email AI analysis config (separate from main chat AI)
EMAIL_AI_API_BASE = os.getenv("EMAIL_AI_API_BASE", AI_API_BASE)
EMAIL_AI_API_KEY = os.getenv("EMAIL_AI_API_KEY", AI_API_KEY)
EMAIL_AI_MODEL = os.getenv("EMAIL_AI_MODEL", AI_MODEL)

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
    return True


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
        from collections import defaultdict

        def _borderless_tables(page):
            """Detect borderless tables from word positions."""
            words = page.extract_words(keep_blank_chars=True, x_tolerance=1)
            if not words:
                return []

            lines = defaultdict(list)
            for w in words:
                lines[round(w['top'])].append(w)

            def _word_clusters(line_words):
                sw = sorted(line_words, key=lambda w: w['x0'])
                cl = [[sw[0]]]
                for i in range(1, len(sw)):
                    if sw[i]['x0'] - sw[i-1]['x1'] > 25:
                        cl.append([])
                    cl[-1].append(sw[i])
                return [c for c in cl if c]

            sorted_ys = sorted(lines.keys())
            table_ys = [y for y in sorted_ys if len(_word_clusters(lines[y])) >= 3]
            if not table_ys:
                return []

            # Cluster X positions to find column boundaries
            all_x0 = []
            for y in table_ys:
                for w in lines[y]:
                    all_x0.append(w['x0'])

            xs = sorted(set(round(v) for v in all_x0))
            col_clusters = [[x] for x in xs]
            while True:
                min_gap = float('inf')
                min_idx = None
                for i in range(len(col_clusters)-1):
                    gap = col_clusters[i+1][0] - col_clusters[i][-1]
                    if gap < min_gap:
                        min_gap = gap
                        min_idx = i
                if min_gap > 15 or min_idx is None:
                    break
                col_clusters[min_idx] = col_clusters[min_idx] + col_clusters[min_idx+1]
                col_clusters.pop(min_idx+1)

            col_ranges = [(min(c), max(c)) for c in col_clusters]
            N = len(col_ranges)
            if N < 3:
                return []

            col_centers = [(s+e)/2 for s, e in col_ranges]
            boundaries = [-1]
            for i in range(N-1):
                boundaries.append((col_centers[i] + col_centers[i+1]) / 2)
            boundaries.append(99999)

            rows = []
            for y in table_ys:
                row = [''] * N
                for w in sorted(lines[y], key=lambda w: w['x0']):
                    for ci in range(N):
                        if boundaries[ci] <= w['x0'] < boundaries[ci+1]:
                            row[ci] = (row[ci] + ' ' + w['text']).strip()
                            break
                rows.append(row)
            return rows

        def _total_rows(tables_dict):
            return sum(
                sum(df.shape[0] for df in dfs)
                for dfs in tables_dict.values()
            )

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

        # Also try borderless word-position detection; use whichever gives more rows
        borderless_tables = {}
        with pdfplumber.open(tmp_pdf.name) as pdf:
            for i, page in enumerate(pdf.pages):
                rows = _borderless_tables(page)
                if rows:
                    page_key = f"第{i+1}页"
                    df = pd.DataFrame(rows)
                    if not df.empty:
                        borderless_tables[page_key] = [df]

        if borderless_tables and _total_rows(borderless_tables) > _total_rows(all_tables):
            all_tables = borderless_tables

        if not all_tables:
            return jsonify({"error": {"message": "No tables found in the PDF"}}), 400

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            for page_key, dfs in all_tables.items():
                for j, df in enumerate(dfs):
                    sheet = page_key[:31] if len(dfs) <= 1 else f"{page_key[:24]}-{j+1}"[:31]
                    # Skip numeric column headers (0,1,2…) for borderless tables
                    has_header = not all(str(c).strip().isdigit() for c in df.columns)
                    df.to_excel(writer, sheet_name=sheet, index=False, header=has_header)
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


@APP.route("/v1/toolbox/pdf-split", methods=["POST", "OPTIONS"])
def pdf_split():
    """Upload a PDF, split into individual pages, return ZIP."""
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
    tmp_dir = tempfile.mkdtemp()
    try:
        f.save(tmp_pdf.name)
        tmp_pdf.close()

        import subprocess, zipfile
        from io import BytesIO

        env = os.environ.copy()
        env["LANG"] = "en_US.UTF-8"
        stem = Path(f.filename).stem
        out_pattern = f"{tmp_dir}/{stem}_%d.pdf"
        subprocess.run(["pdfseparate", tmp_pdf.name, out_pattern], check=True, capture_output=True, timeout=120, env=env)

        page_files = sorted(Path(tmp_dir).glob(f"{stem}_*.pdf"))
        if not page_files:
            return jsonify({"error": {"message": "No pages found in PDF"}}), 400

        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, pf in enumerate(page_files):
                zf.write(pf, f"{stem}_第{i+1}页.pdf")
        buf.seek(0)

        return Response(
            buf.getvalue(),
            mimetype="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{stem}_split.zip"',
            },
        )
    except subprocess.CalledProcessError as e:
        return jsonify({"error": {"message": f"PDF split failed: {e.stderr.decode()}"}}), 500
    except Exception as e:
        return jsonify({"error": {"message": f"PDF split failed: {e}"}}), 500
    finally:
        Path(tmp_pdf.name).unlink(missing_ok=True)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


@APP.route("/v1/toolbox/pdf-compress", methods=["POST", "OPTIONS"])
def pdf_compress():
    """Upload a PDF, compress it using Ghostscript, return compressed PDF."""
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
    out_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    try:
        f.save(tmp_pdf.name)
        tmp_pdf.close()
        out_pdf.close()

        import subprocess
        env = os.environ.copy()
        env["LANG"] = "en_US.UTF-8"
        subprocess.run(
            ["gs", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.7",
             "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH",
             f"-sOutputFile={out_pdf.name}", tmp_pdf.name],
            check=True, capture_output=True, timeout=120, env=env
        )

        with open(out_pdf.name, "rb") as fh:
            data = fh.read()

        return Response(
            data,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{Path(f.filename).stem}_compressed.pdf"',
            },
        )
    except subprocess.CalledProcessError as e:
        return jsonify({"error": {"message": f"PDF compress failed: {e.stderr.decode()}"}}), 500
    except Exception as e:
        return jsonify({"error": {"message": f"PDF compress failed: {e}"}}), 500
    finally:
        Path(tmp_pdf.name).unlink(missing_ok=True)
        Path(out_pdf.name).unlink(missing_ok=True)


@APP.route("/v1/toolbox/ocr", methods=["POST", "OPTIONS"])
def ocr_recognize():
    """Upload a PDF or image, run OCR, return extracted text."""
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
    if ext not in (".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"):
        return jsonify({"error": {"message": f"Unsupported file type: {ext}"}}), 400

    tmp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    try:
        f.save(tmp_file.name)
        tmp_file.close()

        import subprocess
        import shutil

        tesseract_cmd = shutil.which("tesseract")
        if not tesseract_cmd:
            return jsonify({"error": {"message": "Tesseract not installed on server"}}), 503

        if ext == ".pdf":
            import pypdfium2 as pdfium
            import os
            os.environ["TESSERACT_OUTPUT_ENCODING"] = "UTF-8"
            pdf = pdfium.PdfDocument(tmp_file.name)
            all_text = []
            tmp_dir = tempfile.mkdtemp()
            try:
                for i in range(len(pdf)):
                    page = pdf[i]
                    bitmap = page.render(scale=2)
                    img_path = f"{tmp_dir}/page_{i:04d}.png"
                    bitmap.to_pil().save(img_path)
                    result = subprocess.run(
                        [tesseract_cmd, img_path, "stdout", "-l", "chi_sim+eng"],
                        capture_output=True, timeout=60
                    )
                    if result.returncode == 0:
                        raw = result.stdout.decode("utf-8", errors="replace").strip()
                        all_text.append(f"--- 第{i+1}页 ---\n{raw}")
                    else:
                        all_text.append(f"--- 第{i+1}页 ---\n[OCR失败]")
            finally:
                import shutil as sh
                sh.rmtree(tmp_dir, ignore_errors=True)
                pdf.close()
            text = "\n\n".join(all_text)
        else:
            result = subprocess.run(
                [tesseract_cmd, tmp_file.name, "stdout", "-l", "chi_sim+eng"],
                capture_output=True, timeout=60
            )
            if result.returncode != 0:
                err = result.stderr.decode("utf-8", errors="replace")
                return jsonify({"error": {"message": f"OCR failed: {err}"}}), 500
            text = result.stdout.decode("utf-8", errors="replace").strip()

        if not text:
            return jsonify({"error": {"message": "No text found in image"}}), 400

        return jsonify({"success": True, "text": text})

    except Exception as e:
        return jsonify({"error": {"message": f"OCR failed: {e}"}}), 500
    finally:
        Path(tmp_file.name).unlink(missing_ok=True)


@APP.route("/v1/toolbox/table-extract", methods=["POST", "OPTIONS"])
def table_extract():
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

        all_tables = {}
        with pdfplumber.open(tmp_pdf.name) as pdf:
            for i, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if tables:
                    page_dfs = []
                    for j, table in enumerate(tables):
                        if table:
                            headers = table[0] if len(table) > 1 else None
                            data = table[1:] if len(table) > 1 else table
                            df = pd.DataFrame(data, columns=headers)
                            page_dfs.append(df)
                    all_tables[f"第{i+1}页"] = page_dfs

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
                "Content-Disposition": f'attachment; filename="{Path(f.filename).stem}_tables.xlsx"',
            },
        )
    except ImportError as e:
        return jsonify({"error": {"message": f"Missing dependency: {e}"}}), 503
    except Exception as e:
        return jsonify({"error": {"message": f"Table extraction failed: {e}"}}), 500
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


def _parse_usage(body, provider):
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


@APP.route("/v1/email/ai-analyze", methods=["POST", "OPTIONS"])
def email_ai_analyze():
    """Check IMAP for the latest email from sylvia, extract email body + xlsx,
    then send everything to AI for task completion."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    if not SMTP_USER or not SMTP_PASSWORD:
        return jsonify({"error": {"message": "Email (SMTP_USER) not configured"}}), 503
    if not EMAIL_AI_API_KEY:
        return jsonify({"error": {"message": "AI API not configured for email analysis"}}), 503

    try:
        # 1. Fetch latest email from sylvia with full content
        email_data = check_email_full(
            imap_host=IMAP_HOST,
            imap_port=IMAP_PORT,
            email_user=SMTP_USER,
            email_password=SMTP_PASSWORD,
        )

        if not email_data.get("success"):
            return jsonify(email_data), 404

        subject = email_data.get("subject", "")
        sender = email_data.get("sender", "")
        date_str = email_data.get("date", "")
        body_text = email_data.get("body_text", "")
        attachments = email_data.get("attachments", [])

        # 2. Build AI prompt with email context + xlsx analysis
        prompt_parts = [
            "你是一个专业的数据分析助手。请根据以下邮件内容和附件数据，按要求完成工作任务。\n",
            "## 邮件信息",
            f"发件人: {sender}",
            f"主题: {subject}",
            f"日期: {date_str}",
        ]

        if body_text:
            prompt_parts.append(f"\n## 邮件正文\n{body_text[:3000]}")
        else:
            prompt_parts.append("\n## 邮件正文\n(无正文内容)")

        if attachments:
            prompt_parts.append(f"\n## 附件分析结果（共 {len(attachments)} 个附件）")
            for att in attachments:
                prompt_parts.append(f"\n### 附件: {att['filename']} ({att.get('size', 0) // 1024}KB)")
                analysis = att.get("analysis", {})
                if analysis.get("summary"):
                    prompt_parts.append(f"摘要: {analysis['summary']}")
                if analysis.get("overview"):
                    prompt_parts.append(f"概览: {json.dumps(analysis['overview'], ensure_ascii=False, default=str)}")
                if analysis.get("details"):
                    details = analysis["details"]
                    if details.get("version_comparison"):
                        prompt_parts.append(f"版本对比: {json.dumps(details['version_comparison'], ensure_ascii=False, default=str)}")
                    if details.get("monthly_demand"):
                        prompt_parts.append(f"月需求: {json.dumps(details['monthly_demand'], ensure_ascii=False, default=str)}")
                # Include table data for more context
                tables = analysis.get("tables", [])
                for tbl in tables:
                    prompt_parts.append(f"\n[表格] {tbl.get('title', '')}")
                    prompt_parts.append(f"表头: {', '.join(tbl.get('headers', []))}")
                    for row in tbl.get("rows", [])[:10]:
                        prompt_parts.append(f"  {json.dumps(list(row.values()), ensure_ascii=False, default=str)}")
                if att.get("error"):
                    prompt_parts.append(f"分析出错: {att['error']}")
        else:
            prompt_parts.append("\n## 附件\n(无 Excel 附件)")

        prompt_parts.append("")
        prompt_parts.append("## 任务")
        prompt_parts.append("请根据以上邮件内容和附件数据，完成以下工作：")
        prompt_parts.append("1. 理解邮件正文的要求和指令，明确需要完成的任务")
        prompt_parts.append("2. 分析附件 Excel 中的数据，提取关键信息和趋势")
        prompt_parts.append("3. 给出详细的分析报告，包括数据概览、关键发现和建议")
        prompt_parts.append("4. 如果有需要回复的事项，请给出回复草稿")
        prompt_parts.append("5. 用中文回答，格式清晰易读")

        full_prompt = "\n".join(prompt_parts)

        # 3. Call the AI API
        upstream_url = f"{EMAIL_AI_API_BASE.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {EMAIL_AI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": EMAIL_AI_MODEL,
            "messages": [
                {"role": "system", "content": "你是一个专业的数据分析助手。请仔细阅读邮件内容和附件数据，按要求完成工作任务。用中文回答，格式清晰易读。"},
                {"role": "user", "content": full_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 8192,
        }

        resp = requests.post(upstream_url, headers=headers, json=payload, timeout=600)

        ai_response_text = ""
        ai_error = None

        if resp.ok:
            resp_data = resp.json()
            ai_response_text = resp_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        else:
            ai_error = f"AI API error: {resp.status_code}"
            try:
                err_body = resp.json()
                ai_error += f" - {json.dumps(err_body, ensure_ascii=False)}"
            except Exception:
                ai_error += f" - {resp.text[:300]}"

        # 5. Save record to database (with full data for re-analysis)
        record = None
        if ai_response_text and not ai_error:
            try:
                # Prepare attachment analysis summary for re-analysis
                attachment_analysis = []
                for a in attachments:
                    analysis = a.get("analysis", {})
                    att_entry = {
                        "filename": a["filename"],
                        "size": a.get("size", 0),
                        "summary": analysis.get("summary", ""),
                        "overview": analysis.get("overview", {}),
                        "details": analysis.get("details", {}),
                        "tables": analysis.get("tables", []),
                    }
                    if a.get("error"):
                        att_entry["error"] = a["error"]
                    attachment_analysis.append(att_entry)

                record = analysis_store.create_record({
                    "email_subject": subject,
                    "email_sender": sender,
                    "email_date": date_str,
                    "email_body_preview": body_text[:500] if body_text else "",
                    "email_body_full": body_text[:10000] if body_text else "",
                    "ai_response": ai_response_text,
                    "attachment_files": [{"filename": a["filename"], "size": a.get("size", 0)} for a in attachments],
                    "attachment_analysis": attachment_analysis,
                })
            except Exception as e:
                print(f"[analysis] save error: {e}")

        return jsonify({
            "success": True,
            "record_id": record["id"] if record else None,
            "email": {
                "subject": subject,
                "sender": sender,
                "date": date_str,
                "body_preview": body_text[:600] if body_text else "",
            },
            "attachments": [{"filename": a["filename"], "size": a.get("size", 0)} for a in attachments],
            "ai_response": ai_response_text,
            "ai_error": ai_error,
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"处理失败: {e}"}), 500


@APP.route("/v1/analysis", methods=["GET", "OPTIONS"])
def analysis_list():
    """List all analysis records, newest first."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    records = analysis_store.list_records(limit=100)
    return jsonify({"records": records})


@APP.route("/v1/analysis/<record_id>/flag", methods=["POST", "OPTIONS"])
def analysis_set_flag(record_id):
    """Set a flag: has_pdf, has_xlsx, has_replied."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401

    body = request.get_json(silent=True) or {}
    flag = body.get("flag")
    if flag not in ("has_pdf", "has_xlsx", "has_replied"):
        return jsonify({"error": {"message": "Invalid flag. Use: has_pdf, has_xlsx, has_replied"}}), 400

    record = analysis_store.update_flag(record_id, flag)
    if not record:
        return jsonify({"error": {"message": "Record not found"}}), 404
    return jsonify({"success": True, "record": record})


@APP.route("/v1/analysis/<record_id>", methods=["DELETE", "OPTIONS"])
def analysis_delete(record_id):
    """Delete an analysis record."""
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    ok = analysis_store.delete_record(record_id)
    return jsonify({"deleted": ok}), (200 if ok else 404)


@APP.route("/v1/analysis/<record_id>/reanalyze", methods=["POST", "OPTIONS"])
def analysis_reanalyze(record_id):
    """Re-analyze an existing record with additional user instructions.
    Uses stored email data + attachment analysis, injects user instructions,
    calls AI, and updates the record's ai_response.
    """
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    if not EMAIL_AI_API_KEY:
        return jsonify({"error": {"message": "AI API not configured"}}), 503

    body = request.get_json(silent=True) or {}
    instructions = (body.get("instructions") or "").strip()
    if not instructions:
        return jsonify({"error": {"message": "instructions required"}}), 400

    # 1. Fetch the stored record
    record = analysis_store.get_record(record_id)
    if not record:
        return jsonify({"error": {"message": "Record not found"}}), 404

    try:
        # 2. Reconstruct the AI prompt from stored data
        prompt_parts = [
            "你是一个专业的数据分析助手。请根据以下邮件内容和附件数据，按要求完成工作任务。\n",
            "## 邮件信息",
            f"发件人: {record.get('email_sender', '')}",
            f"主题: {record.get('email_subject', '')}",
            f"日期: {record.get('email_date', '')}",
        ]

        body_text = record.get("email_body_full", "") or record.get("email_body_preview", "")
        if body_text:
            prompt_parts.append(f"\n## 邮件正文\n{body_text[:3000]}")
        else:
            prompt_parts.append("\n## 邮件正文\n(无正文内容)")

        attachment_analysis = record.get("attachment_analysis", [])
        if attachment_analysis:
            prompt_parts.append(f"\n## 附件分析结果（共 {len(attachment_analysis)} 个附件）")
            for att in attachment_analysis:
                prompt_parts.append(f"\n### 附件: {att.get('filename', '')} ({att.get('size', 0) // 1024}KB)")
                if att.get("summary"):
                    prompt_parts.append(f"摘要: {att['summary']}")
                if att.get("overview"):
                    prompt_parts.append(f"概览: {json.dumps(att['overview'], ensure_ascii=False, default=str)}")
                if att.get("details"):
                    details = att["details"]
                    if details.get("version_comparison"):
                        prompt_parts.append(f"版本对比: {json.dumps(details['version_comparison'], ensure_ascii=False, default=str)}")
                    if details.get("monthly_demand"):
                        prompt_parts.append(f"月需求: {json.dumps(details['monthly_demand'], ensure_ascii=False, default=str)}")
                tables = att.get("tables", [])
                for tbl in tables:
                    prompt_parts.append(f"\n[表格] {tbl.get('title', '')}")
                    prompt_parts.append(f"表头: {', '.join(tbl.get('headers', []))}")
                    for row in tbl.get("rows", [])[:10]:
                        prompt_parts.append(f"  {json.dumps(list(row.values()), ensure_ascii=False, default=str)}")
                if att.get("error"):
                    prompt_parts.append(f"分析出错: {att['error']}")
        else:
            prompt_parts.append("\n## 附件\n(无 Excel 附件)")

        # 3. Include previous analysis result for context
        prev_response = record.get("ai_response", "")
        if prev_response:
            prompt_parts.append("")
            prompt_parts.append("## 上一次分析结果")
            prompt_parts.append(prev_response[:2000])

        # 4. Append user's supplementary instructions
        prompt_parts.append("")
        prompt_parts.append("## 用户补充需求")
        prompt_parts.append(instructions)
        prompt_parts.append("")
        prompt_parts.append("## 任务")
        prompt_parts.append("请结合以上原始邮件数据、附件分析结果、上一次分析结果，重点针对用户补充需求重新分析。")
        prompt_parts.append("用中文回答，格式清晰易读。")

        full_prompt = "\n".join(prompt_parts)

        # 5. Call the AI API
        upstream_url = f"{EMAIL_AI_API_BASE.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {EMAIL_AI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": EMAIL_AI_MODEL,
            "messages": [
                {"role": "system", "content": "你是一个专业的数据分析助手。请仔细分析数据，按要求完成工作任务。用中文回答，格式清晰易读。"},
                {"role": "user", "content": full_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 8192,
        }

        resp = requests.post(upstream_url, headers=headers, json=payload, timeout=600)
        ai_response_text = ""
        ai_error = None

        if resp.ok:
            resp_data = resp.json()
            ai_response_text = resp_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        else:
            ai_error = f"AI API error: {resp.status_code}"
            try:
                err_body = resp.json()
                ai_error += f" - {json.dumps(err_body, ensure_ascii=False)}"
            except Exception:
                ai_error += f" - {resp.text[:300]}"

        # 6. Update the record
        if ai_response_text and not ai_error:
            analysis_store.update_response(record_id, ai_response_text, instructions)
            updated = analysis_store.get_record(record_id)
            return jsonify({
                "success": True,
                "record": updated,
                "ai_response": ai_response_text,
            })
        else:
            return jsonify({
                "success": False,
                "error": ai_error,
            }), 500

    except Exception as e:
        return jsonify({"success": False, "error": f"重新分析失败: {e}"}), 500


# ── Board (留言板) ──────────────────────────────────────────────

@APP.route("/v1/board", methods=["GET", "POST", "OPTIONS"])
def board_handler():
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401

    if request.method == "GET":
        return jsonify({"messages": board_store.get_messages()})

    # POST
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": {"message": "text is required"}}), 400
    author = body.get("author", "CC").strip() or "CC"
    msg = board_store.create_message(text, author)
    return jsonify(msg), 201


@APP.route("/v1/board/<int:msg_id>", methods=["DELETE", "OPTIONS"])
def board_delete(msg_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    ok = board_store.delete_message(msg_id)
    return jsonify({"deleted": ok}), (200 if ok else 404)


@APP.route("/v1/board/<int:msg_id>/like", methods=["POST", "OPTIONS"])
def board_like(msg_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    body = request.get_json(silent=True) or {}
    action = body.get("action", "like")
    new_likes = board_store.toggle_like(msg_id, action)
    if new_likes is None:
        return jsonify({"error": {"message": "Message not found"}}), 404
    return jsonify({"likes": new_likes})


@APP.route("/v1/board/<int:msg_id>/replies", methods=["POST", "OPTIONS"])
def board_reply(msg_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": {"message": "text is required"}}), 400
    author = body.get("author", "CC").strip() or "CC"
    reply = board_store.create_reply(msg_id, text, author)
    if not reply:
        return jsonify({"error": {"message": "Message not found"}}), 404
    return jsonify(reply), 201


@APP.route("/v1/board/reply/<int:reply_id>", methods=["DELETE", "OPTIONS"])
def board_delete_reply(reply_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401
    ok = board_store.delete_reply(reply_id)
    return jsonify({"deleted": ok}), (200 if ok else 404)


# ── Memo (备忘录) ───────────────────────────────────────────────

@APP.route("/v1/memos", methods=["GET", "POST", "OPTIONS"])
def memos_handler():
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401

    if request.method == "GET":
        return jsonify(memo_store.get_memos())

    # POST
    body = request.get_json(silent=True) or {}
    content = (body.get("content") or "").strip()
    if not content:
        return jsonify({"error": {"message": "content is required"}}), 400
    title = (body.get("title") or "").strip()
    memo = memo_store.create_memo(title, content)
    return jsonify(memo), 201


@APP.route("/v1/memos/<int:memo_id>", methods=["PUT", "DELETE", "OPTIONS"])
def memos_detail(memo_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _verify_token():
        return jsonify({"error": {"message": "Unauthorized"}}), 401

    if request.method == "DELETE":
        ok = memo_store.delete_memo(memo_id)
        return jsonify({"deleted": ok}), (200 if ok else 404)

    # PUT
    body = request.get_json(silent=True) or {}
    content = (body.get("content") or "").strip()
    if not content:
        return jsonify({"error": {"message": "content is required"}}), 400
    title = (body.get("title") or "").strip()
    memo = memo_store.update_memo(memo_id, title, content)
    if not memo:
        return jsonify({"error": {"message": "Memo not found"}}), 404
    return jsonify(memo)


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
