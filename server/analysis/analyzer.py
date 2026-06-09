"""Main analyzer — reads Excel, runs all analyses, returns chat-friendly result."""



from __future__ import annotations
from pathlib import Path

from .reader import read_file
from .stats import monthly_demand_analysis, sheet_overview, version_comparison


def analyze(filepath: str | Path) -> dict:
    """Analyze an Excel file and return structured results for the chat.

    Returns a dict with:
      - summary: one-line description of what was found
      - overview: dict with key numbers
      - version_comparison: list of version diffs (if multiple versions)
      - monthly_demand: monthly demand analysis (if present)
      - tables: list of {title, headers, rows} for rendering
    """
    result = read_file(filepath)
    tables: list[dict] = []
    output: dict = {
        "filename": result.filename,
        "file_type": result.file_type,
        "summary": "",
        "overview": {},
        "details": {},
        "tables": tables,
        "sheets": {},
    }

    # --- Version analysis ---
    if result.version_sheets:
        last = result.version_sheets[0]

        overview = sheet_overview(last)
        output["overview"] = overview

        output["summary"] = (
            f"📊 {result.filename}: {overview['total_skus']} 个 SKU, "
            f"总数量 {overview['total_quantity']:,.0f}, "
            f"总金额 {overview['total_amount']:,.0f}, "
            f"{overview['date_range']['min']} ~ {overview['date_range']['max']}"
        )

        # Version comparison (if multiple versions)
        if len(result.version_sheets) >= 2:
            vc = version_comparison(result.version_sheets)
            output["details"]["version_comparison"] = vc

            if vc.get("version_diffs"):
                diff_rows = []
                for d in vc["version_diffs"]:
                    diff_rows.append({
                        "newer": d["newer"],
                        "older": d["older"],
                        "SKU 变化": f"{d['sku_diff']:+d} ({d['sku_change_pct'] or 'N/A'}%)",
                        "数量变化": f"{d['qty_diff']:+,.0f} ({d['qty_change_pct'] or 'N/A'}%)",
                    })
                tables.append({
                    "title": "版本差异对比",
                    "headers": ["较新版", "旧版", "SKU 变化", "数量变化"],
                    "rows": diff_rows,
                })

            if vc.get("sku_fluctuation"):
                flu_rows = []
                for f in vc["sku_fluctuation"][:15]:
                    flu_rows.append({
                        "sku": f["sku"],
                        "变化": f"{f['diff']:+,.0f}",
                        "变化率": f"{f['change_pct'] or 'N/A'}%",
                        "方向": "↑" if f["direction"] == "up" else "↓",
                    })
                tables.append({
                    "title": f"SKU 波动明细（{last.name} vs {result.version_sheets[1].name}）",
                    "headers": ["SKU", "数量变化", "变化率", "方向"],
                    "rows": flu_rows,
                })

        # COO breakdown table
        if overview.get("coo_breakdown"):
            coo_rows = []
            for coo, data in sorted(
                overview["coo_breakdown"].items(),
                key=lambda x: x[1]["total_qty"],
                reverse=True,
            ):
                coo_rows.append({
                    "coo": coo,
                    "sku_count": data["sku_count"],
                    "total_qty": f"{data['total_qty']:,.0f}",
                    "total_amount": f"{data['total_amount']:,.0f}",
                })
            tables.append({
                "title": "按 COO 分类统计",
                "headers": ["COO", "SKU 数", "总数量", "总金额"],
                "rows": coo_rows,
            })

        for vs in result.version_sheets:
            output["sheets"][vs.name] = {
                "row_count": len(vs.rows),
                "headers": vs.headers,
                "total_qty": vs.total_qty,
                "total_amount": vs.total_amount,
            }

    # --- Monthly demand analysis ---
    if result.monthly_demand:
        md = monthly_demand_analysis(result.monthly_demand.rows)
        output["details"]["monthly_demand"] = md

        if md.get("category_breakdown"):
            md_rows = []
            for cat, data in sorted(
                md["category_breakdown"].items(),
                key=lambda x: x[1]["total_monthly"],
                reverse=True,
            ):
                md_rows.append({
                    "category": cat,
                    "sku_count": data["sku_count"],
                    "total_psi": f"{data['total_psi']:,.0f}",
                    "total_monthly": f"{data['total_monthly']:,.0f}",
                })
            tables.append({
                "title": "Monthly Demand 分类统计",
                "headers": ["分类", "SKU 数", "总 2025PSI", "总 Monthly Demand"],
                "rows": md_rows,
            })

    output["details"]["sheet_info"] = output["sheets"]

    # --- Fallback: generic Excel analysis ---
    if not result.version_sheets and not result.monthly_demand:
        output["file_type"] = "generic"
        _fallback_analysis(filepath, output, tables)

    return output


def _fallback_analysis(filepath: str | Path, output: dict, tables: list[dict]) -> None:
    """Analyze an unknown Excel file — read all sheets, show column-level stats."""
    import pandas as pd

    try:
        xls = pd.ExcelFile(filepath)
        sheet_names = xls.sheet_names
        output["summary"] = f"📄 {output['filename']}: {len(sheet_names)} 个工作表"

        for name in sheet_names:
            try:
                df = pd.read_excel(xls, sheet_name=name)
                if df.empty:
                    continue
                output["summary"] += f", 「{name}」{len(df)} 行 × {len(df.columns)} 列"

                numeric_cols = df.select_dtypes(include="number").columns
                if len(numeric_cols) > 0:
                    stats_rows = []
                    for col in numeric_cols:
                        stats_rows.append({
                            "列名": col,
                            "总数": f"{df[col].sum():,.0f}",
                            "平均值": f"{df[col].mean():,.2f}",
                            "最大值": f"{df[col].max():,.0f}",
                            "最小值": f"{df[col].min():,.0f}",
                        })
                    tables.append({
                        "title": f"「{name}」数值列统计",
                        "headers": ["列名", "总数", "平均值", "最大值", "最小值"],
                        "rows": stats_rows,
                    })

                # Show first few rows as a preview
                preview_rows = []
                for _, row in df.head(8).iterrows():
                    preview_rows.append({str(c): str(row[c])[:60] for c in df.columns})
                if preview_rows:
                    tables.append({
                        "title": f"「{name}」数据预览（前 8 行）",
                        "headers": list(df.columns),
                        "rows": preview_rows,
                    })
            except Exception:
                continue
    except Exception:
        output["summary"] = f"📄 {output['filename']}（无法自动分析）"
