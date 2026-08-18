#!/usr/bin/env python3
"""
Foxmail/QQ 邮箱 IMAP 读取脚本
连接 ro_ye@foxmail.com，读取最新一封邮件，解析正文与附件。
"""
import imaplib
import email
import json
import base64
from pathlib import Path
from email.header import decode_header

# ===== 配置 =====
EMAIL = "ro_ye@foxmail.com"
PASSWORD = "rjeeqbkxkmbmdaih"   # QQ 邮箱授权码
IMAP_SERVER = "imap.qq.com"
IMAP_PORT = 993
OUTPUT_DIR = Path("/Users/mac-2312-r/workspace/wwwroot/CC/cc-worker/email_analysis")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def decode_str(value):
    if not value:
        return ""
    parts = decode_header(value)
    out = []
    for part, charset in parts:
        if isinstance(part, bytes):
            try:
                out.append(part.decode(charset or "utf-8", errors="ignore"))
            except Exception:
                out.append(part.decode("utf-8", errors="ignore"))
        else:
            out.append(str(part))
    return "".join(out)


def connect():
    mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
    mail.login(EMAIL, PASSWORD)
    mail.select("INBOX")
    return mail


def parse(msg):
    result = {"subject": "", "from": "", "to": "", "date": "",
              "body": "", "attachments": []}
    result["subject"] = decode_str(msg.get("Subject", ""))
    result["from"] = decode_str(msg.get("From", ""))
    result["to"] = decode_str(msg.get("To", ""))
    result["date"] = decode_str(msg.get("Date", ""))

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            if ctype == "text/plain" and "attachment" not in disp:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    result["body"] = part.get_payload(decode=True).decode(charset, errors="ignore")
                except Exception:
                    pass
            if ctype == "text/html" and not result["body"] and "attachment" not in disp:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    result["body"] = part.get_payload(decode=True).decode(charset, errors="ignore")
                except Exception:
                    pass
            if "attachment" in disp:
                fn = decode_str(part.get_filename())
                if fn:
                    data = part.get_payload(decode=True)
                    safe = f"{len(result['attachments'])+1}_{fn}"
                    fp = OUTPUT_DIR / safe
                    with open(fp, "wb") as f:
                        f.write(data)
                    result["attachments"].append({"filename": fn, "filepath": str(fp),
                                                  "size": len(data)})
    else:
        try:
            charset = msg.get_content_charset() or "utf-8"
            result["body"] = msg.get_payload(decode=True).decode(charset, errors="ignore")
        except Exception:
            pass
    return result


def main():
    print("=" * 60)
    print(f"📧 连接 Foxmail 邮箱: {EMAIL}")
    print("=" * 60)
    mail = connect()
    status, data = mail.search(None, "ALL")
    if status != "OK" or not data[0]:
        print("📭 收件箱为空")
        mail.logout()
        return
    ids = data[0].split()
    latest_id = ids[-1]  # 最新一封
    print(f"收件箱共 {len(ids)} 封，读取最新一封 ID={latest_id.decode()}")
    status, msg_data = mail.fetch(latest_id, "(RFC822)")
    mail.logout()
    if status != "OK":
        print("❌ 读取失败")
        return
    msg = email.message_from_bytes(msg_data[0][1])
    info = parse(msg)
    info["email_id"] = latest_id.decode()
    # 输出 JSON 供后续分析
    out = OUTPUT_DIR / "latest_email.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=2)
    print("\n--- 邮件概要 ---")
    print(f"标题: {info['subject']}")
    print(f"发件人: {info['from']}")
    print(f"收件人: {info['to']}")
    print(f"日期: {info['date']}")
    print(f"附件: {[a['filename'] for a in info['attachments']]}")
    print(f"\n正文长度: {len(info['body'])} 字符")
    print(f"详情已保存: {out}")
    print("=" * 60)


if __name__ == "__main__":
    main()
