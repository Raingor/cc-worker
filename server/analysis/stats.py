"""Statistical analysis for SQ&RQ Excel files."""

from __future__ import annotations

from collections import Counter
from typing import Any

from .reader import AnalysisFile, VersionSheet


def _safe_float(v: Any) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _safe_str(v: Any) -> str:
    return str(v).strip() if v else ""


def sheet_overview(sheet: VersionSheet) -> dict:
    """Generate overview statistics for a single version sheet."""
    rows = sheet.rows
    if not rows:
        return {"error": "no data rows"}

    quantities = [_safe_float(r.get("Quantity", 0)) for r in rows if r.get("Quantity")]
    amounts = [_safe_float(r.get("Amount", 0)) for r in rows if r.get("Amount")]
    skus = [r.get("SKU", "") for r in rows if r.get("SKU")]
    dates = [r.get("出运日期") for r in rows if r.get("出运日期")]
    coo_list = [_safe_str(r.get("COO", "")) for r in rows if r.get("COO")]

    # COO breakdown
    coo_breakdown: dict[str, dict] = {}
    for r in rows:
        coo = _safe_str(r.get("COO", ""))
        qty = _safe_float(r.get("Quantity", 0))
        amt = _safe_float(r.get("Amount", 0))
        if coo:
            if coo not in coo_breakdown:
                coo_breakdown[coo] = {"sku_count": 0, "total_qty": 0, "total_amount": 0}
            coo_breakdown[coo]["sku_count"] += 1
            coo_breakdown[coo]["total_qty"] += qty
            coo_breakdown[coo]["total_amount"] += amt

    # Top SKUs by quantity
    sorted_by_qty = sorted(rows, key=lambda r: _safe_float(r.get("Quantity", 0)), reverse=True)
    top_10 = [
        {
            "sku": r.get("SKU"),
            "quantity": _safe_float(r.get("Quantity", 0)),
            "amount": _safe_float(r.get("Amount", 0)),
            "coo": _safe_str(r.get("COO", "")),
        }
        for r in sorted_by_qty[:10]
        if r.get("SKU")
    ]

    # Date range
    date_min = min(dates) if dates else None
    date_max = max(dates) if dates else None

    return {
        "sheet_name": sheet.name,
        "total_skus": sheet.total_skus or len(skus),
        "total_quantity": round(sheet.total_qty or sum(quantities), 2),
        "total_amount": round(sheet.total_amount or sum(amounts), 2),
        "actual_row_count": len(rows),
        "date_range": {"min": date_min, "max": date_max},
        "coo_breakdown": coo_breakdown,
        "top_10_skus": top_10,
    }


def version_comparison(sheets: list[VersionSheet]) -> dict:
    """Compare multiple version sheets and show differences."""
    if len(sheets) < 2:
        return {"error": "need at least 2 version sheets for comparison"}

    results = []
    for sheet in sheets:
        results.append(sheet_overview(sheet))

    # Compute diffs between consecutive versions
    diffs = []
    for i in range(len(results) - 1):
        newer = results[i]
        older = results[i + 1]
        diffs.append({
            "newer": newer["sheet_name"],
            "older": older["sheet_name"],
            "sku_diff": newer["total_skus"] - older["total_skus"],
            "qty_diff": round(newer["total_quantity"] - older["total_quantity"], 2),
            "amount_diff": round(newer["total_amount"] - older["total_amount"], 2),
            "sku_change_pct": _pct_diff(newer["total_skus"], older["total_skus"]),
            "qty_change_pct": _pct_diff(newer["total_quantity"], older["total_quantity"]),
        })

    # Fluctuation: SKU-level changes between latest two versions
    latest = sheets[0]
    prev = sheets[1] if len(sheets) > 1 else None
    fluctuation = _sku_fluctuation(latest, prev) if prev else []

    return {
        "version_count": len(sheets),
        "latest_version": sheets[0].name,
        "earliest_version": sheets[-1].name,
        "version_overviews": results,
        "version_diffs": diffs,
        "sku_fluctuation": fluctuation[:20],  # top 20 fluctuated SKUs
    }


def _pct_diff(new_val: float, old_val: float) -> float | None:
    """Compute percentage change, return None if old_val is 0."""
    if old_val and old_val != 0:
        return round((new_val - old_val) / old_val * 100, 2)
    return None


def _sku_fluctuation(latest: VersionSheet, prev: VersionSheet) -> list[dict]:
    """Compare SKU-level qty changes between two versions."""
    latest_map = {r["SKU"]: _safe_float(r.get("Quantity", 0)) for r in latest.rows}
    prev_map = {r["SKU"]: _safe_float(r.get("Quantity", 0)) for r in prev.rows}

    changes = []
    all_skus = set(latest_map.keys()) | set(prev_map.keys())

    for sku in sorted(all_skus):
        lq = latest_map.get(sku, 0)
        pq = prev_map.get(sku, 0)
        diff = lq - pq
        pct = _pct_diff(lq, pq)

        # Only include non-trivial changes
        if abs(diff) >= 10 or (pct is not None and abs(pct) >= 5):
            changes.append({
                "sku": sku,
                "prev_qty": pq,
                "latest_qty": lq,
                "diff": round(diff, 2),
                "change_pct": pct,
                "direction": "up" if diff > 0 else ("down" if diff < 0 else "stable"),
            })

    changes.sort(key=lambda c: abs(c["diff"]), reverse=True)
    return changes


def monthly_demand_analysis(md_rows: list[dict]) -> dict:
    """Analyze Monthly Demand data."""
    if not md_rows:
        return {"error": "no monthly demand data"}

    total_psi = 0
    total_monthly = 0
    viable = 0  # SKUs with both PSI and monthly demand > 0
    skus_with_data = 0

    category_breakdown: dict[str, dict] = {}

    for r in md_rows:
        psi = _safe_float(r.get("2025PSI", 0))
        monthly = _safe_float(r.get("Monthly demand", 0))
        cat = _safe_str(r.get("分类", "Uncategorized"))

        if psi > 0 or monthly > 0:
            skus_with_data += 1
            total_psi += psi
            total_monthly += monthly

            if cat:
                if cat not in category_breakdown:
                    category_breakdown[cat] = {"sku_count": 0, "total_psi": 0, "total_monthly": 0}
                category_breakdown[cat]["sku_count"] += 1
                category_breakdown[cat]["total_psi"] += psi
                category_breakdown[cat]["total_monthly"] += monthly

            if psi > 0 and monthly > 0:
                viable += 1

    return {
        "total_skus": len(md_rows),
        "skus_with_data": skus_with_data,
        "viable_skus": viable,
        "total_psi": round(total_psi, 2),
        "total_monthly_demand": round(total_monthly, 2),
        "avg_monthly_demand": round(total_monthly / viable, 2) if viable else 0,
        "category_breakdown": category_breakdown,
    }
