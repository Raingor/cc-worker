#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过 QQ/Foxmail SMTP 回复分析结果给 Sylvia
附件: Mexicali_CVR_Analysis_Report.xlsx + .pdf
"""
import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.header import Header
from email.utils import formataddr
from email import encoders
from pathlib import Path
import os

OUT = Path("/Users/mac-2312-r/workspace/wwwroot/CC/cc-worker/email_analysis")
XLSX = OUT / "Mexicali_CVR_Analysis_Report.xlsx"
PDF = OUT / "Mexicali_CVR_Analysis_Report.pdf"

# QQ / Foxmail 发信配置
SMTP_HOST = "smtp.qq.com"
SMTP_PORT = 465
SENDER = "ro_ye@foxmail.com"
AUTH_CODE = "rjeeqbkxkmbmdaih"      # QQ 邮箱授权码
RECIPIENT = "sylvia.tan@assaabloy.com"

SUBJECT = "Re: Mexicali CVR Analysis - 2025 vs 2026 Order Volume Report"

BODY = """Dear Sylvia,

Please find attached the Mexicali CVR order-volume analysis (2025 vs 2026).

**Key Findings**
1. 27639-003 (analyzed separately): total volume rose +11.3% (13,641,000 -> 15,180,000). Growth is led by Q1 (Jan +15.8%, Feb +56.3%, Apr +125.5%) and a strong December (+80.3%). Monthly volatility (CV) improved from 79.6% to 59.4%.
2. 63251-002 + 63252-002 (combined): total volume fell -14.9% (3,344,400 -> 2,847,000). Only Jan (+30%), Mar (+40%) and Nov (+233%, low base) grew; Apr, May, Jul and Oct declined 25-49%.
3. Data gap: 63251-002 Sept 2026 is blank in the source file - excluded from totals and marked N/A.
4. Pattern: 27639 is a high-volume, seasonally-peaked item (January peak both years, a blank March 2025 recovered in 2026); the two smaller SKUs show broad 2026 demand softening outside Q1.

**Files attached**
- Mexicali_CVR_Analysis_Report.xlsx  (Summary, 27639 monthly, Combined monthly, 3-SKU fluctuation, Raw data)
- Mexicali_CVR_Analysis_Report.pdf   (Key findings, charts, reason commentary)

Best regards,
Rain
"""

msg = MIMEMultipart()
msg["From"] = formataddr((str(Header("Rain", "utf-8")), SENDER))
msg["To"] = RECIPIENT
msg["Subject"] = Header(SUBJECT, "utf-8")
msg.attach(MIMEText(BODY, "plain", "utf-8"))

for f in [XLSX, PDF]:
    part = MIMEBase("application", "octet-stream")
    with open(f, "rb") as fh:
        part.set_payload(fh.read())
    encoders.encode_base64(part)   # 二进制转为 base64 ASCII，避免编码错误
    # 英文文件名，避免中文附件名显示 noname
    part.add_header("Content-Disposition", "attachment", filename=f.name)
    msg.attach(part)

print(f"正在通过 {SMTP_HOST}:{SMTP_PORT} 发送邮件到 {RECIPIENT} ...")
with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as server:
    server.login(SENDER, AUTH_CODE)
    server.sendmail(SENDER, [RECIPIENT], msg.as_string())
print("✅ 邮件发送成功")
