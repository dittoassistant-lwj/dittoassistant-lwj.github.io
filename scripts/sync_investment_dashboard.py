#!/usr/bin/env python3
"""Sync Ethan's Notion investment dashboard to the public GitHub Pages JSON snapshot.

Source of truth: Notion trading dashboard data sources.
Market data: latest available Yahoo Finance chart quote via query2.finance.yahoo.com.

This script intentionally keeps the Notion token server-side. It writes only a static,
read-only JSON snapshot to assets/investments-data.json.
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

NOTION_VERSION = "2025-09-03"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_PATH = os.path.join(REPO_ROOT, "assets", "investments-data.json")

DATA_SOURCES = {
    "holdings": "f3202cd4-a5e0-49b7-a309-ef79f3c11562",
    "actions": "48af9c1f-b0d7-4cd7-b583-27e144bf0656",
    "summary": "33fbba0f-2aea-4ce2-85cb-37c6d5e13028",
    "monthly": "74332ebd-c5d1-4535-b7ad-ce53f477cf28",
}


def notion_headers() -> dict[str, str]:
    token = os.environ.get("NOTION_API_KEY")
    if not token:
        raise SystemExit("NOTION_API_KEY is required")
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def notion_request(path: str, method: str = "GET", body: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.notion.com/v1/{path}",
        data=data,
        method=method,
        headers=notion_headers(),
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Notion API error {exc.code} on {method} {path}: {detail[:1000]}") from exc


def query_data_source(data_source_id: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    cursor = None
    while True:
        body: dict[str, Any] = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        page = notion_request(f"data_sources/{data_source_id}/query", "POST", body)
        rows.extend(page.get("results", []))
        if not page.get("has_more"):
            return rows
        cursor = page.get("next_cursor")


def prop_value(prop: dict[str, Any] | None) -> Any:
    if not prop:
        return None
    typ = prop.get("type")
    value = prop.get(typ) if typ else None
    if typ == "title":
        return "".join(part.get("plain_text", "") for part in (value or []))
    if typ == "rich_text":
        return "".join(part.get("plain_text", "") for part in (value or []))
    if typ == "number":
        return value
    if typ == "select":
        return value.get("name") if isinstance(value, dict) else None
    if typ == "multi_select":
        return [item.get("name") for item in (value or [])]
    if typ == "date":
        return value.get("start") if isinstance(value, dict) else None
    if typ == "checkbox":
        return bool(value)
    if typ == "url":
        return value
    if typ == "formula" and isinstance(value, dict):
        formula_type = value.get("type")
        formula_value = value.get(formula_type)
        if formula_type == "date":
            return formula_value.get("start") if isinstance(formula_value, dict) else None
        return formula_value
    return None


def row_dict(page: dict[str, Any]) -> dict[str, Any]:
    row = {name: prop_value(prop) for name, prop in page.get("properties", {}).items()}
    row["_page_id"] = page["id"]
    return row


def to_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return default
        return number
    except (TypeError, ValueError):
        return default


def rounded(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def yahoo_chart(symbol: str, query: str) -> dict[str, Any]:
    symbol = symbol.upper().strip()
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.load(resp)
    result = payload.get("chart", {}).get("result", [None])[0]
    if not result:
        raise RuntimeError(f"No Yahoo Finance chart result for {symbol}")
    return result


def latest_quote(symbol: str) -> dict[str, Any]:
    symbol = symbol.upper().strip()
    result = yahoo_chart(symbol, "range=5d&interval=1d")
    meta = result.get("meta", {})
    quote = (result.get("indicators", {}).get("quote") or [{}])[0]
    closes = [x for x in quote.get("close", []) if x is not None]
    if not closes:
        price = to_float(meta.get("regularMarketPrice"), 0.0)
        previous = to_float(meta.get("chartPreviousClose"), price)
    else:
        price = to_float(meta.get("regularMarketPrice"), closes[-1])
        previous = closes[-2] if len(closes) >= 2 else to_float(meta.get("chartPreviousClose"), price)
    ts = meta.get("regularMarketTime")
    if ts:
        as_of = dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).astimezone(dt.timezone(dt.timedelta(hours=8))).date().isoformat()
    else:
        as_of = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date().isoformat()
    change = price - previous if previous is not None else 0.0
    change_pct = change / previous if previous else 0.0
    return {
        "symbol": symbol,
        "price": rounded(price, 6),
        "previousClose": rounded(previous, 6),
        "dailyChange": rounded(change, 6),
        "dailyChangePct": rounded(change_pct, 8),
        "asOf": as_of,
        "source": "Yahoo Finance chart API",
    }


def historical_daily_closes(symbol: str, start: dt.date, end: dt.date) -> dict[str, float]:
    """Return split-adjusted daily closes keyed by ISO date for the inclusive date range."""
    period1 = int(dt.datetime.combine(start, dt.time.min, tzinfo=dt.timezone.utc).timestamp())
    # Yahoo period2 is exclusive; add two days so month-end weekends can still use the prior trading day.
    period2 = int(dt.datetime.combine(end + dt.timedelta(days=2), dt.time.min, tzinfo=dt.timezone.utc).timestamp())
    result = yahoo_chart(symbol, f"period1={period1}&period2={period2}&interval=1d")
    timestamps = result.get("timestamp") or []
    adjclose = (result.get("indicators", {}).get("adjclose") or [{}])[0].get("adjclose") or []
    quote_close = (result.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
    closes: dict[str, float] = {}
    for ts, adj, close in zip(timestamps, adjclose, quote_close):
        price = adj if adj is not None else close
        if price is None:
            continue
        day = dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).date().isoformat()
        closes[day] = rounded(to_float(price), 6)
    return closes


def month_end_for(month: str, as_of: str) -> dt.date:
    year, month_num = [int(part) for part in month.split("-")]
    if month_num == 12:
        end = dt.date(year + 1, 1, 1) - dt.timedelta(days=1)
    else:
        end = dt.date(year, month_num + 1, 1) - dt.timedelta(days=1)
    as_of_date = dt.date.fromisoformat(as_of)
    return min(end, as_of_date)


def month_sequence(start_month: str, end_month: str) -> list[str]:
    year, month = [int(part) for part in start_month.split("-")]
    end_year, end_month_num = [int(part) for part in end_month.split("-")]
    months: list[str] = []
    while (year, month) <= (end_year, end_month_num):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year += 1
            month = 1
    return months


def latest_price_on_or_before(closes: dict[str, float], target: dt.date, fallback: float = 0.0) -> float:
    eligible = [day for day in closes if dt.date.fromisoformat(day) <= target]
    if not eligible:
        return fallback
    return closes[max(eligible)]


def xnpv(rate: float, flows: list[tuple[dt.date, float]]) -> float:
    if not flows:
        return 0.0
    start = min(day for day, _amount in flows)
    return sum(amount / ((1.0 + rate) ** ((day - start).days / 365.0)) for day, amount in flows)


def xirr(flows: list[tuple[dt.date, float]]) -> float | None:
    """Compute Excel-like XIRR for dated cash flows.

    Negative amounts are external money invested into the portfolio; positive amounts are
    withdrawals or the terminal account value. Returns None when no valid sign change exists.
    """
    valid_flows = [(day, amount) for day, amount in flows if abs(amount) > 1e-9]
    if not any(amount < 0 for _day, amount in valid_flows) or not any(amount > 0 for _day, amount in valid_flows):
        return None

    # Bracket a root. XIRR can have multiple roots, but this mirrors the practical
    # spreadsheet use case for one portfolio contribution stream and terminal value.
    low = -0.999999
    high = 10.0
    f_low = xnpv(low, valid_flows)
    f_high = xnpv(high, valid_flows)
    while f_low * f_high > 0 and high < 1_000_000:
        high *= 2
        f_high = xnpv(high, valid_flows)
    if f_low * f_high > 0:
        return None

    for _ in range(200):
        mid = (low + high) / 2
        f_mid = xnpv(mid, valid_flows)
        if abs(f_mid) < 1e-7:
            return mid
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
    return (low + high) / 2


def build_monthly_performance(actions_json: list[dict[str, Any]], quotes: dict[str, dict[str, Any]], as_of: str) -> list[dict[str, Any]]:
    """Build month-end holdings value, simple YTD P/L %, and heuristic YTD XIRR.

    The simple P/L % is `YTD P/L / holdings value`, matching the dashboard mental model.
    XIRR is inferred from the action log using minimal external cash flows: buys/initial
    notes are treated as deposits only when existing cash cannot fund them; sells increase
    cash; terminal account value closes the cash-flow series each month.
    """
    as_of_date = dt.date.fromisoformat(as_of)
    year = as_of_date.year
    ytd_actions = [row for row in actions_json if str(row.get("date") or "")[:4] == str(year)]
    if not ytd_actions:
        return []
    first_month = min(str(row.get("date"))[:7] for row in ytd_actions if row.get("date"))
    months = month_sequence(first_month, as_of_date.strftime("%Y-%m"))
    symbols = sorted({str(row.get("ticker") or "").upper().strip() for row in ytd_actions if row.get("ticker")})
    start = dt.date(year, 1, 1)
    close_history: dict[str, dict[str, float]] = {}
    for symbol in symbols:
        if not symbol:
            continue
        try:
            close_history[symbol] = historical_daily_closes(symbol, start, as_of_date)
            time.sleep(0.2)
        except Exception as exc:  # keep the dashboard publishable if one historical lookup fails
            print(f"Warning: failed to fetch historical prices for {symbol}: {exc}")
            close_history[symbol] = {}

    ordered_actions = sorted(ytd_actions, key=lambda row: str(row.get("date") or ""))
    positions: dict[str, float] = {}
    basis: dict[str, float] = {}
    realized_ytd = 0.0
    cash_balance = 0.0
    external_flows: list[tuple[dt.date, float]] = []
    cursor = 0
    monthly: list[dict[str, Any]] = []

    for month in months:
        month_end = month_end_for(month, as_of)
        while cursor < len(ordered_actions) and str(ordered_actions[cursor].get("date") or "") <= month_end.isoformat():
            row = ordered_actions[cursor]
            cursor += 1
            action_date = dt.date.fromisoformat(str(row.get("date")))
            symbol = str(row.get("ticker") or "").upper().strip()
            if not symbol:
                continue
            action_type = str(row.get("type") or "").lower()
            quantity = to_float(row.get("quantity"))
            fees = to_float(row.get("fees"))
            gross_amount = to_float(row.get("totalAmount"))
            if action_type in {"buy", "note"} and quantity > 0:
                cash_needed = gross_amount + fees
                if cash_balance + 1e-9 < cash_needed:
                    deposit = cash_needed - cash_balance
                    external_flows.append((action_date, -deposit))
                    cash_balance += deposit
                cash_balance -= cash_needed
                positions[symbol] = positions.get(symbol, 0.0) + quantity
                basis[symbol] = basis.get(symbol, 0.0) + cash_needed
            elif action_type == "sell" and quantity > 0:
                current_qty = positions.get(symbol, 0.0)
                current_basis = basis.get(symbol, 0.0)
                supplied_sold_basis = to_float(row.get("costBasisSold"), 0.0)
                sold_basis = supplied_sold_basis or (current_basis * min(quantity, current_qty) / current_qty if current_qty else 0.0)
                positions[symbol] = max(0.0, current_qty - quantity)
                basis[symbol] = max(0.0, current_basis - sold_basis)
                cash_balance += gross_amount - fees
                realized_ytd += to_float(row.get("realized"), 0.0)

        holdings_value = 0.0
        for symbol, quantity in positions.items():
            if quantity <= 0:
                continue
            fallback = to_float(quotes.get(symbol, {}).get("price"))
            price = latest_price_on_or_before(close_history.get(symbol, {}), month_end, fallback)
            holdings_value += quantity * price
        cost_basis = sum(value for value in basis.values() if value > 0)
        unrealized = holdings_value - cost_basis
        ytd_pnl = realized_ytd + unrealized
        account_value = holdings_value + cash_balance
        xirr_value = xirr(external_flows + [(month_end, account_value)]) if account_value > 0 else None
        simple_pnl_pct = ytd_pnl / holdings_value if holdings_value else 0.0
        monthly.append({
            "month": month,
            "monthEnd": month_end.isoformat(),
            "holdingsValue": rounded(holdings_value),
            "cash": rounded(cash_balance),
            "accountValue": rounded(account_value),
            "costBasis": rounded(cost_basis),
            "unrealized": rounded(unrealized),
            "realizedYtd": rounded(realized_ytd),
            "ytdPnl": rounded(ytd_pnl),
            "ytdPnlPct": rounded(simple_pnl_pct),
            "simpleYtdPnlPct": rounded(simple_pnl_pct),
            "ytdXirrPct": rounded(xirr_value) if xirr_value is not None else None,
            "xirrMethod": "heuristic_min_external_cash_flows_from_actions",
            "currency": "USD",
        })
    return monthly


def property_update_number(value: float) -> dict[str, Any]:
    return {"number": rounded(value, 6)}


def property_update_date(value: str) -> dict[str, Any]:
    return {"date": {"start": value}}


def property_update_rich_text(value: str) -> dict[str, Any]:
    return {"rich_text": [{"text": {"content": value[:1900]}}]}


def update_page_properties(page_id: str, properties: dict[str, Any]) -> None:
    notion_request(f"pages/{page_id}", "PATCH", {"properties": properties})
    time.sleep(0.35)  # stay comfortably under Notion's average rate limit


def main() -> None:
    holdings_pages = query_data_source(DATA_SOURCES["holdings"])
    actions_pages = query_data_source(DATA_SOURCES["actions"])
    summary_pages = query_data_source(DATA_SOURCES["summary"])
    monthly_pages = query_data_source(DATA_SOURCES["monthly"])

    holdings_rows = [row_dict(page) for page in holdings_pages]
    actions_rows = [row_dict(page) for page in actions_pages]
    summary_rows = [row_dict(page) for page in summary_pages]
    monthly_rows = [row_dict(page) for page in monthly_pages]

    active_holdings = [
        row for row in holdings_rows
        if row.get("Active") is not False and (row.get("Ticker") or row.get("Name")) and to_float(row.get("Quantity")) > 0
    ]

    quotes: dict[str, dict[str, Any]] = {}
    for row in active_holdings:
        ticker = str(row.get("Ticker") or row.get("Name") or "").upper().strip()
        if not ticker:
            continue
        quotes[ticker] = latest_quote(ticker)
        time.sleep(0.2)

    # First pass: compute fresh Notion values.
    updated_holdings: list[dict[str, Any]] = []
    latest_as_of = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date().isoformat()
    for row in active_holdings:
        ticker = str(row.get("Ticker") or row.get("Name") or "").upper().strip()
        quantity = to_float(row.get("Quantity"))
        average_cost = to_float(row.get("Average Cost"))
        cost_basis = to_float(row.get("Cost Basis"), quantity * average_cost)
        quote = quotes[ticker]
        current_price = quote["price"]
        market_value = quantity * current_price
        unrealized = market_value - cost_basis
        unrealized_pct = unrealized / cost_basis if cost_basis else 0.0
        latest_as_of = max(latest_as_of, quote["asOf"])

        row.update({
            "Current Price": current_price,
            "Market Value": market_value,
            "Unrealized P/L": unrealized,
            "Unrealized P/L %": unrealized_pct,
            "Last Price Update": quote["asOf"],
            "_quote": quote,
        })
        updated_holdings.append(row)

    total_market_value = sum(to_float(row.get("Market Value")) for row in updated_holdings)
    total_cost_basis = sum(to_float(row.get("Cost Basis")) for row in updated_holdings)
    total_unrealized = total_market_value - total_cost_basis
    total_unrealized_pct = total_unrealized / total_cost_basis if total_cost_basis else 0.0

    for row in updated_holdings:
        allocation = to_float(row.get("Market Value")) / total_market_value if total_market_value else 0.0
        row["Allocation %"] = allocation
        quote = row["_quote"]
        note = f"Latest price refreshed from Yahoo Finance chart API on {quote['asOf']}."
        update_page_properties(row["_page_id"], {
            "Current Price": property_update_number(to_float(row.get("Current Price"))),
            "Market Value": property_update_number(to_float(row.get("Market Value"))),
            "Unrealized P/L": property_update_number(to_float(row.get("Unrealized P/L"))),
            "Unrealized P/L %": property_update_number(to_float(row.get("Unrealized P/L %"))),
            "Allocation %": property_update_number(to_float(row.get("Allocation %"))),
            "Last Price Update": property_update_date(str(row.get("Last Price Update"))),
            "Data Source": property_update_rich_text("Yahoo Finance chart API"),
            "Notes": property_update_rich_text((row.get("Notes") or "").split(" Latest price refreshed from")[0] + " " + note),
        })

    summary = summary_rows[0] if summary_rows else {}
    cash = to_float(summary.get("Cash"))
    realized_ytd = to_float(summary.get("Realized P/L YTD"))
    summary_note = f"Latest holding prices refreshed from Yahoo Finance chart API on {latest_as_of}; public dashboard JSON synced by Ditto."
    if summary.get("_page_id"):
        update_page_properties(summary["_page_id"], {
            "As Of": property_update_date(latest_as_of),
            "Total Holdings Value": property_update_number(total_market_value),
            "Total Cost Basis": property_update_number(total_cost_basis),
            "Unrealized P/L": property_update_number(total_unrealized),
            "Unrealized P/L %": property_update_number(total_unrealized_pct),
            "Notes": property_update_rich_text(summary_note),
        })

    holdings_json = []
    for row in sorted(updated_holdings, key=lambda r: to_float(r.get("Market Value")), reverse=True):
        ticker = str(row.get("Ticker") or row.get("Name") or "").upper().strip()
        quote = row.get("_quote", {})
        holdings_json.append({
            "ticker": ticker,
            "name": row.get("Name") or ticker,
            "assetClass": row.get("Asset Class") or "",
            "quantity": rounded(to_float(row.get("Quantity"))),
            "averageCost": rounded(to_float(row.get("Average Cost"))),
            "costBasis": rounded(to_float(row.get("Cost Basis"))),
            "currentPrice": rounded(to_float(row.get("Current Price"))),
            "previousClose": rounded(to_float(quote.get("previousClose"))),
            "dailyChange": rounded(to_float(quote.get("dailyChange"))),
            "dailyChangePct": rounded(to_float(quote.get("dailyChangePct"))),
            "dailyPnl": rounded(to_float(row.get("Quantity")) * to_float(quote.get("dailyChange"))),
            "marketValue": rounded(to_float(row.get("Market Value"))),
            "unrealized": rounded(to_float(row.get("Unrealized P/L"))),
            "unrealizedPct": rounded(to_float(row.get("Unrealized P/L %"))),
            "allocationPct": rounded(to_float(row.get("Allocation %"))),
            "currency": row.get("Currency") or "USD",
            "riskLevel": row.get("Risk Level") or "",
            "lastPriceUpdate": row.get("Last Price Update"),
            "notes": row.get("Notes") or "",
        })

    def action_key(row: dict[str, Any]) -> str:
        return str(row.get("Date") or "")

    actions_json = []
    for row in sorted(actions_rows, key=action_key, reverse=True):
        actions_json.append({
            "date": row.get("Date"),
            "type": row.get("Type"),
            "status": row.get("Status"),
            "ticker": row.get("Asset/Ticker") or row.get("Name"),
            "name": row.get("Name"),
            "quantity": row.get("Quantity"),
            "price": row.get("Price"),
            "fees": row.get("Fees"),
            "totalAmount": row.get("Total Amount"),
            "currency": row.get("Currency") or "USD",
            "realized": row.get("Realized G/L"),
            "realizedPct": row.get("Realized G/L %"),
            "costBasisSold": row.get("Cost Basis Sold"),
            "month": row.get("Month"),
            "notes": row.get("Notes"),
        })

    monthly_json = []
    for row in sorted(monthly_rows, key=lambda r: str(r.get("Name") or ""), reverse=True):
        monthly_json.append({
            "month": row.get("Name"),
            "sellProceeds": row.get("Sell Proceeds"),
            "costBasisSold": row.get("Cost Basis Sold"),
            "realized": row.get("Realized G/L"),
            "realizedPct": row.get("Realized G/L %"),
            "currency": row.get("Currency") or "USD",
            "notes": row.get("Notes"),
        })

    monthly_performance = build_monthly_performance(actions_json, quotes, latest_as_of)
    if monthly_performance:
        latest_month = latest_as_of[:7]
        latest_ytd_pnl = realized_ytd + total_unrealized
        latest_simple_pct = latest_ytd_pnl / total_market_value if total_market_value else 0.0
        for row in monthly_performance:
            if row.get("month") == latest_month:
                row.update({
                    "holdingsValue": rounded(total_market_value),
                    "cash": rounded(cash),
                    "accountValue": rounded(total_market_value + cash),
                    "costBasis": rounded(total_cost_basis),
                    "unrealized": rounded(total_unrealized),
                    "realizedYtd": rounded(realized_ytd),
                    "ytdPnl": rounded(latest_ytd_pnl),
                    "ytdPnlPct": rounded(latest_simple_pct),
                    "simpleYtdPnlPct": rounded(latest_simple_pct),
                })
                break

    now_utc = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    output = {
        "source": "Notion trading dashboard + Yahoo Finance latest quotes",
        "syncedAt": now_utc,
        "asOf": latest_as_of,
        "currency": "USD",
        "totals": {
            "holdingsValue": rounded(total_market_value),
            "costBasis": rounded(total_cost_basis),
            "unrealized": rounded(total_unrealized),
            "unrealizedPct": rounded(total_unrealized_pct),
            "realizedYtd": rounded(realized_ytd),
            "cash": rounded(cash),
            "accountValue": rounded(total_market_value + cash),
        },
        "summaryNotes": summary_note,
        "holdings": holdings_json,
        "actions": actions_json,
        "monthlyRealized": monthly_json,
        "monthlyPerformance": monthly_performance,
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(output, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(json.dumps({
        "holdings": len(holdings_json),
        "actions": len(actions_json),
        "monthlyRealized": len(monthly_json),
        "asOf": latest_as_of,
        "holdingsValue": output["totals"]["holdingsValue"],
        "accountValue": output["totals"]["accountValue"],
        "output": OUTPUT_PATH,
    }, indent=2))


if __name__ == "__main__":
    main()
