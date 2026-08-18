#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mexicali CVR Analysis
对比 3 个料号 (27639 / 63251-002 / 63252-002) 2025 vs 2026 订单量差异与月度波动
输出: 汇总统计 + 柱状对比图 + 波动分析 -> Excel(.xlsx) + PDF(.pdf)
"""
import json
import math
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path

OUT = Path("/Users/mac-2312-r/workspace/wwwroot/CC/cc-worker/email_analysis")
CHART = OUT / "charts"
CHART.mkdir(parents=True, exist_ok=True)

# ---------- 1. 读取原始数据 ----------
src = OUT / "1_锁盖分析 08 12 26.xlsx"
df = pd.read_excel(src, sheet_name="Sheet1", header=1)  # 第2行是 2025/2026 标题
# 修正列名
df.columns = ["Month", "v27639_25", "v27639_26",
              "v63251_25", "v63251_26",
              "v63252_25", "v63252_26"]
# 数值化（缺失 -> NaN）
num_cols = [c for c in df.columns if c != "Month"]
for c in num_cols:
    df[c] = pd.to_numeric(df[c], errors="coerce")
# 去掉汇总/平均/变化行（Month 不在 1-12 月列表里）
months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
df = df[df["Month"].isin(months)].reset_index(drop=True)

# 合并 63251 + 63252
df["comb_25"] = df["v63251_25"] + df["v63252_25"]
df["comb_26"] = df["v63251_26"] + df["v63252_26"]

# ---------- 2. 汇总统计函数 ----------
def summary(y25, y26, label):
    """y25/y26 为 pd.Series（可能含 NaN）"""
    t25 = y25.sum(skipna=True)
    t26 = y26.sum(skipna=True)
    n25 = y25.notna().sum()
    n26 = y26.notna().sum()
    avg25 = y25.mean(skipna=True)
    avg26 = y26.mean(skipna=True)
    diff = t26 - t25
    pct = (diff / t25 * 100) if t25 else float("nan")
    # 波动指标：变异系数 CV = std/mean（按月）
    cv25 = (y25.std(skipna=True) / avg25 * 100) if avg25 else float("nan")
    cv26 = (y26.std(skipna=True) / avg26 * 100) if avg26 else float("nan")
    # 月度最大/最小
    mx25 = y25.max(); mn25 = y25.min(); mx26 = y26.max(); mn26 = y26.min()
    return {
        "label": label,
        "total_2025": t25, "total_2026": t26,
        "diff": diff, "pct_change": pct,
        "avg_2025": avg25, "avg_2026": avg26,
        "months_2025": int(n25), "months_2026": int(n26),
        "cv_2025": cv25, "cv_26": cv26,
        "max_2025": mx25, "min_2025": mn25,
        "max_2026": mx26, "min_2026": mn26,
    }

s_27639 = summary(df["v27639_25"], df["v27639_26"], "27639-003")
s_comb   = summary(df["comb_25"], df["comb_26"], "63251-002 + 63252-002 (合并)")
s_63251  = summary(df["v63251_25"], df["v63251_26"], "63251-002")
s_63252  = summary(df["v63252_25"], df["v63252_26"], "63252-002")

# ---------- 3. 月度波动分析（逐月差异与变化率） ----------
df["d27639"] = df["v27639_26"] - df["v27639_25"]
df["p27639"] = np.where(df["v27639_25"] > 0,
                        (df["v27639_26"] - df["v27639_25"]) / df["v27639_25"] * 100, np.nan)
df["dcomb"] = df["comb_26"] - df["comb_25"]
df["pcomb"] = np.where(df["comb_25"] > 0,
                       (df["comb_26"] - df["comb_25"]) / df["comb_25"] * 100, np.nan)

# 波动幅度排名（按 |%变化| 降序）
fluct_27639 = df[["Month", "v27639_25", "v27639_26", "d27639", "p27639"]].copy()
fluct_27639["abs_pct"] = fluct_27639["p27639"].abs()
fluct_27639 = fluct_27639.sort_values("abs_pct", ascending=False)

fluct_comb = df[["Month", "comb_25", "comb_26", "dcomb", "pcomb"]].copy()
fluct_comb["abs_pct"] = fluct_comb["pcomb"].abs()
fluct_comb = fluct_comb.sort_values("abs_pct", ascending=False)

# ---------- 4. 绘制柱状对比图 ----------
plt.rcParams["font.sans-serif"] = ["Arial"]
plt.rcParams["axes.unicode_minus"] = False
C25, C26 = "#4C72B0", "#DD8452"

def grouped_bar(d25, d26, title, fname, missing_mask=None):
    fig, ax = plt.subplots(figsize=(11, 5))
    x = np.arange(len(months))
    w = 0.4
    ax.bar(x - w/2, d25, w, label="2025", color=C25)
    ax.bar(x + w/2, d26, w, label="2026", color=C26)
    if missing_mask is not None:
        for i, m in enumerate(missing_mask):
            if m:
                ax.text(x[i] + w/2, 0, "N/A", ha="center", va="bottom",
                        fontsize=7, color="red", rotation=90)
    ax.set_xticks(x); ax.set_xticklabels(months)
    ax.set_title(title, fontsize=13, fontweight="bold")
    ax.set_ylabel("Volume")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    for s in ["top", "right"]:
        ax.spines[s].set_visible(False)
    plt.tight_layout()
    fig.savefig(CHART / fname, dpi=130)
    plt.close(fig)

grouped_bar(df["v27639_25"], df["v27639_26"],
            "27639-003 Monthly Volume: 2025 vs 2026",
            "bar_27639.png")
grouped_bar(df["comb_25"], df["comb_26"],
            "63251-002 + 63252-002 Combined Monthly Volume: 2025 vs 2026",
            "bar_combined.png",
            missing_mask=df["v63251_26"].isna().values)

# 年度总量对比柱状图
fig, ax = plt.subplots(figsize=(8, 5))
cats = ["27639-003", "63251+63252\n(合并)"]
t25 = [s_27639["total_2025"], s_comb["total_2025"]]
t26 = [s_27639["total_2026"], s_comb["total_2026"]]
x = np.arange(len(cats)); w = 0.35
ax.bar(x - w/2, t25, w, label="2025", color=C25)
ax.bar(x + w/2, t26, w, label="2026", color=C26)
for i in range(len(cats)):
    ax.text(x[i]-w/2, t25[i], f"{t25[i]:,.0f}", ha="center", va="bottom", fontsize=8)
    ax.text(x[i]+w/2, t26[i], f"{t26[i]:,.0f}", ha="center", va="bottom", fontsize=8)
ax.set_xticks(x); ax.set_xticklabels(cats)
ax.set_title("Annual Total Volume: 2025 vs 2026", fontsize=13, fontweight="bold")
ax.set_ylabel("Total Volume")
ax.legend(); ax.grid(axis="y", alpha=0.3)
for s in ["top", "right"]:
    ax.spines[s].set_visible(False)
plt.tight_layout()
fig.savefig(CHART / "bar_yearly_total.png", dpi=130)
plt.close(fig)

# 月度波动折线图（归一化到各年均值，凸显波动形态）
fig, ax = plt.subplots(figsize=(11, 5))
norm25 = df["v27639_25"] / df["v27639_25"].mean()
norm26 = df["v27639_26"] / df["v27639_26"].mean()
ax.plot(months, norm25, "-o", label="27639 2025 (相对均值)", color=C25)
ax.plot(months, norm26, "-o", label="27639 2026 (相对均值)", color=C26)
ax.axhline(1.0, color="grey", ls="--", lw=0.8)
ax.set_title("27639-003 Monthly Fluctuation (normalized, 1.0 = annual avg)", fontsize=13, fontweight="bold")
ax.set_ylabel("x of annual average")
ax.legend(); ax.grid(alpha=0.3)
for s in ["top", "right"]:
    ax.spines[s].set_visible(False)
plt.tight_layout()
fig.savefig(CHART / "line_27639_fluct.png", dpi=130)
plt.close(fig)

print("✅ 图表已生成:", [p.name for p in CHART.glob('*.png')])

# 保存中间结果供后续生成报告使用
ctx = {
    "s_27639": s_27639, "s_comb": s_comb,
    "s_63251": s_63251, "s_63252": s_63252,
}
with open(OUT / "analysis_ctx.json", "w") as f:
    json.dump(ctx, f, ensure_ascii=False, indent=2, default=str)

# 打印关键结论
print("\n===== 关键统计 =====")
for s in [s_27639, s_comb]:
    print(f"{s['label']}: 2025={s['total_2025']:,.0f}  2026={s['total_2026']:,.0f}  "
          f"Δ={s['diff']:,.0f} ({s['pct_change']:+.1f}%)  "
          f"CV25={s['cv_2025']:.1f}%  CV26={s['cv_26']:.1f}%")
print("缺失值: 63251-002 2026年9月 = NaN")
