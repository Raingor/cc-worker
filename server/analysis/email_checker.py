"""Email checker — IMAP → download Excel → analyze."""



from __future__ import annotations
import email
import imaplib
import re
import tempfile
from pathlib import Path
from email.header import decode_header

from .analyzer import analyze as analyze_excel

SENDER_FILTER = "sylvia.tan@assaabloy.com"


def _decode(s: str | None) -> str:
    if not s:
        return ""
    parts = decode_header(s)
    result = []
    for part, charset in parts:
        if isinstance(part, bytes):
            try:
                result.append(part.decode(charset or "utf-8", errors="ignore"))
            except (LookupError, UnicodeDecodeError):
                result.append(part.decode("utf-8", errors="ignore"))
        else:
            result.append(str(part))
    return "".join(result)


def _extract_body(msg: email.message.Message) -> str:
    """Extract plain text body from an email message."""
    body_parts = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    body_parts.append(payload.decode(charset, errors="ignore"))
            elif content_type == "text/html" and not body_parts:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    html = payload.decode(charset, errors="ignore")
                    body_parts.append(re.sub(r"<[^>]+>", "", html).strip())
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            body_parts.append(payload.decode(charset, errors="ignore"))

    return "\n".join(body_parts).strip()


def check_email_full(
    imap_host: str,
    imap_port: int,
    email_user: str,
    email_password: str,
    sender_filter: str = SENDER_FILTER,
) -> dict:
    """Connect to IMAP, find latest email from sender, extract full content.

    Returns dict with email metadata, body text, attachments (with raw bytes),
    and attachment analysis results.
    """
    mail = None
    try:
        mail = imaplib.IMAP4_SSL(imap_host, imap_port)
        mail.login(email_user, email_password)
        mail.select("INBOX")
    except Exception as e:
        return {"success": False, "error": f"IMAP 连接失败: {e}"}

    try:
        # Search ALL emails to get the latest (FROM criterion may not work on all IMAP servers)
        status, msg_ids = mail.search(None, "ALL")
        if status != "OK" or not msg_ids[0]:
            return {"success": False, "error": f"未找到邮件"}

        # Iterate from newest to oldest to find the one matching sender_filter
        msg_ids_list = msg_ids[0].split()
        found_email = None
        for mid in reversed(msg_ids_list):
            status, msg_data = mail.fetch(mid, "(RFC822)")
            if status != "OK":
                continue
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            sender_raw = _decode(msg.get("From", ""))
            if sender_filter.lower() in sender_raw.lower():
                found_email = (msg, sender_raw)
                break

        if not found_email:
            return {"success": False, "error": f"未找到来自 {sender_filter} 的邮件"}

        msg, sender = found_email
        subject = _decode(msg.get("Subject", ""))
        date_str = msg.get("Date", "")
        body_text = _extract_body(msg)

        # Collect xlsx attachments (with raw bytes for AI analysis)
        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                filename = _decode(part.get_filename())
                if filename and filename.lower().endswith((".xlsx", ".xls", ".csv")):
                    payload = part.get_payload(decode=True)
                    if payload:
                        attachments.append({
                            "filename": filename,
                            "size": len(payload),
                            "data": payload,
                        })

        # Analyze xlsx attachments
        attachment_results = []
        for att in attachments:
            tmp = tempfile.NamedTemporaryFile(suffix=Path(att["filename"]).suffix, delete=False)
            try:
                tmp.write(att["data"])
                tmp.close()
                analysis = analyze_excel(tmp.name)
                attachment_results.append({
                    "filename": att["filename"],
                    "size": att["size"],
                    "analysis": analysis,
                })
            except Exception as e:
                attachment_results.append({
                    "filename": att["filename"],
                    "size": att.get("size", 0),
                    "error": str(e),
                })
            finally:
                Path(tmp.name).unlink(missing_ok=True)

        return {
            "success": True,
            "sender": sender,
            "subject": subject,
            "date": date_str,
            "body_text": body_text,
            "attachments_count": len(attachments),
            "attachments": attachment_results,
        }

    except Exception as e:
        return {"success": False, "error": f"处理失败: {e}"}

    finally:
        if mail is not None:
            try:
                mail.logout()
            except Exception:
                pass


def check_and_analyze(
    imap_host: str,
    imap_port: int,
    email_user: str,
    email_password: str,
    sender_filter: str = SENDER_FILTER,
) -> dict:
    """Connect to IMAP, find latest email from sender, download Excel, analyze.

    Returns dict with analysis results or error.
    """
    mail = None
    try:
        mail = imaplib.IMAP4_SSL(imap_host, imap_port)
        mail.login(email_user, email_password)
        mail.select("INBOX")
    except Exception as e:
        return {"success": False, "error": f"IMAP 连接失败: {e}"}

    try:
        # Search ALL emails first, then iterate to find the one matching sender_filter
        status, msg_ids = mail.search(None, "ALL")
        if status != "OK" or not msg_ids[0]:
            return {"success": False, "error": f"未找到来自 {sender_filter} 的邮件"}

        msg_ids_list = msg_ids[0].split()
        found_email = None
        for mid in reversed(msg_ids_list):
            status, msg_data = mail.fetch(mid, "(RFC822)")
            if status != "OK":
                continue
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            sender_raw = _decode(msg.get("From", ""))
            if sender_filter.lower() in sender_raw.lower():
                found_email = (msg, sender_raw, _decode(msg.get("Subject", "")))
                break

        if not found_email:
            return {"success": False, "error": f"未找到来自 {sender_filter} 的邮件"}

        msg, sender, subject = found_email

        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                filename = _decode(part.get_filename())
                if filename and filename.lower().endswith((".xlsx", ".xls", ".csv")):
                    payload = part.get_payload(decode=True)
                    size_bytes = len(payload) if payload else 0
                    attachments.append({
                        "filename": filename,
                        "size": size_bytes,
                        "data": payload,
                    })

        if not attachments:
            return {"success": False, "error": f"邮件「{subject}」中没有找到 Excel 附件"}

        results = []
        for att in attachments:
            tmp = tempfile.NamedTemporaryFile(suffix=Path(att["filename"]).suffix, delete=False)
            try:
                tmp.write(att["data"])
                tmp.close()
                analysis = analyze_excel(tmp.name)
                results.append({"filename": att["filename"], "size": att["size"], "analysis": analysis})
            except Exception as e:
                results.append({"filename": att["filename"], "size": att.get("size", 0), "error": str(e)})
            finally:
                Path(tmp.name).unlink(missing_ok=True)

        return {
            "success": True,
            "sender": sender,
            "subject": subject,
            "attachments_count": len(attachments),
            "results": results,
        }

    except Exception as e:
        return {"success": False, "error": f"处理失败: {e}"}

    finally:
        if mail is not None:
            try:
                mail.logout()
            except Exception:
                pass
