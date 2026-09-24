(() => {
  let data = { holdings: [], actions: [], monthlyRealized: [], totals: {} };
  const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
  const pctFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const $ = (id) => document.getElementById(id);

  function money(value) {
    return currencyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);
  }

  function pct(value) {
    const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
    return `${pctFormatter.format(Number.isFinite(normalized) ? normalized : 0)}%`;
  }

  function signedClass(value) {
    return Number(value) >= 0 ? "positive" : "negative";
  }

  function cell(label, html, className = "") {
    const classAttr = className ? ` class="${className}"` : "";
    return `<td${classAttr} data-label="${escapeHtml(label)}">${html}</td>`;
  }

  function normalizeTicker(value) {
    return (value || "").trim().toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "—";
    return String(value).slice(0, 10);
  }

  function formatSync(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) + " HKT";
  }

  function renderStats() {
    const totals = data.totals || {};
    const holdings = data.holdings || [];
    $("stat-account-value").textContent = money(totals.accountValue);
    $("stat-value").textContent = money(totals.holdingsValue);
    $("stat-value-sub").textContent = holdings.length ? `${holdings.length} active holding${holdings.length === 1 ? "" : "s"}` : "No holdings yet";
    $("stat-cash").textContent = money(totals.cash);
    $("stat-unrealized").textContent = money(totals.unrealized);
    $("stat-unrealized").className = signedClass(totals.unrealized);
    $("stat-unrealized-pct").textContent = pct(totals.unrealizedPct);
    $("stat-realized").textContent = money(totals.realizedYtd);
    $("stat-realized").className = signedClass(totals.realizedYtd);
    $("data-as-of").textContent = formatDate(data.asOf);
    $("data-synced-at").textContent = formatSync(data.syncedAt);
    $("data-source").textContent = data.source || "Notion";
  }

  function renderHoldings() {
    const filter = normalizeTicker($("holding-filter").value);
    const holdings = (data.holdings || []).filter((h) => !filter || normalizeTicker(h.ticker).includes(filter) || String(h.name || "").toUpperCase().includes(filter));
    $("empty-dashboard").classList.toggle("hidden", (data.holdings || []).length > 0);
    $("dashboard-content").classList.toggle("hidden", (data.holdings || []).length === 0);
    $("holdings-body").innerHTML = holdings.map((h) => {
      const weight = Number(h.allocationPct) || ((Number(data.totals?.holdingsValue) || 0) ? Number(h.marketValue) / Number(data.totals.holdingsValue) : 0);
      return `<tr>${[
        cell("Ticker", `<strong>${escapeHtml(h.ticker)}</strong><span>${escapeHtml(h.currency || "USD")}</span>`, "ticker-cell"),
        cell("Asset", escapeHtml(h.name || h.assetClass || "—")),
        cell("Qty", numberFormatter.format(Number(h.quantity) || 0)),
        cell("Avg cost", money(h.averageCost)),
        cell("Last price", money(h.currentPrice)),
        cell("Market value", money(h.marketValue)),
        cell("Unrealized", `${money(h.unrealized)}<br><small>${pct(h.unrealizedPct)}</small>`, signedClass(h.unrealized)),
        cell("Weight", pct(weight)),
      ].join("")}</tr>`;
    }).join("") || `<tr><td colspan="8" class="muted">No active holdings match this filter.</td></tr>`;

    renderBars("allocation-bars", holdings.map((h) => ({ label: h.ticker, value: pctNumber(h.allocationPct), text: `${pct(h.allocationPct)} · ${money(h.marketValue)}` })));
    const movers = [...holdings].sort((a, b) => Math.abs(Number(b.unrealized) || 0) - Math.abs(Number(a.unrealized) || 0)).slice(0, 5);
    $("movers-list").innerHTML = movers.map((h) => `<div class="mover-row"><span><strong>${escapeHtml(h.ticker)}</strong><br><small class="muted">${escapeHtml(h.assetClass || "Position")}</small></span><span class="${signedClass(h.unrealized)}">${money(h.unrealized)}<br><small>${pct(h.unrealizedPct)}</small></span></div>`).join("") || `<p class="muted">No movers yet.</p>`;
  }

  function renderSummary() {
    $("summary-body").innerHTML = (data.holdings || []).map((h) => `<tr>${[
      cell("Ticker", `<strong>${escapeHtml(h.ticker)}</strong><span>${escapeHtml(h.currency || "USD")}</span>`, "ticker-cell"),
      cell("Asset class", escapeHtml(h.assetClass || "—")),
      cell("Cost basis", money(h.costBasis)),
      cell("Value", money(h.marketValue)),
      cell("Risk", escapeHtml(h.riskLevel || "—")),
      cell("Last update", formatDate(h.lastPriceUpdate)),
      cell("Total return", `${money(h.unrealized)}<br><small>${pct(h.unrealizedPct)}</small>`, signedClass(h.unrealized)),
    ].join("")}</tr>`).join("") || `<tr><td colspan="7" class="muted">No active positions yet.</td></tr>`;

    const byClass = new Map();
    for (const h of data.holdings || []) byClass.set(h.assetClass || "Unclassified", (byClass.get(h.assetClass || "Unclassified") || 0) + (Number(h.marketValue) || 0));
    const total = Number(data.totals?.holdingsValue) || 0;
    renderBars("asset-class-bars", [...byClass.entries()].map(([label, value]) => ({ label, value: total ? value / total * 100 : 0, text: `${pct(total ? value / total : 0)} · ${money(value)}` })));

    const largest = [...(data.holdings || [])].sort((a, b) => Number(b.marketValue) - Number(a.marketValue))[0];
    const insights = [];
    if (largest) insights.push(`${largest.ticker} is the largest active holding at ${pct(largest.allocationPct)} of holdings value.`);
    if (data.totals?.cash) insights.push(`Cash balance is ${money(data.totals.cash)}, or ${pct((Number(data.totals.cash) || 0) / (Number(data.totals.accountValue) || 1))} of account value.`);
    if (Number.isFinite(Number(data.totals?.realizedYtd))) insights.push(`Realized P/L YTD is ${money(data.totals.realizedYtd)}.`);
    if (data.summaryNotes) insights.push(data.summaryNotes);
    if (!insights.length) insights.push("No summary notes available yet.");
    $("insight-list").innerHTML = insights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderTransactions() {
    const filter = ($("transaction-filter").value || "").toLowerCase();
    const actions = (data.actions || []).filter((tx) => !filter || [tx.date, tx.type, tx.status, tx.ticker, tx.name, tx.notes].some((field) => String(field || "").toLowerCase().includes(filter)));
    $("transaction-count").textContent = `${actions.length} row${actions.length === 1 ? "" : "s"}`;
    $("transactions-body").innerHTML = actions.map((tx) => `<tr>${[
      cell("Date", formatDate(tx.date)),
      cell("Type", `<span class="badge ${escapeHtml(String(tx.type || "").toLowerCase())}">${escapeHtml(tx.type || "—")}</span>`),
      cell("Status", escapeHtml(tx.status || "—")),
      cell("Ticker", `<strong>${escapeHtml(tx.ticker)}</strong><span>${escapeHtml(tx.name || "—")}</span>`, "ticker-cell"),
      cell("Qty", tx.type === "Sell" || tx.type === "Buy" || tx.type === "Note" ? numberFormatter.format(Number(tx.quantity) || 0) : "—"),
      cell("Price", money(tx.price)),
      cell("Total", money(tx.totalAmount)),
      cell("Realized", tx.realized == null ? "—" : money(tx.realized), tx.realized == null ? "" : signedClass(tx.realized)),
    ].join("")}</tr>`).join("") || `<tr><td colspan="8" class="muted">No transactions found.</td></tr>`;
  }

  function renderRealized() {
    const monthly = data.monthlyRealized || [];
    $("monthly-body").innerHTML = monthly.map((row) => `<tr>${[
      cell("Month", `<strong>${escapeHtml(row.month)}</strong>`),
      cell("Sell proceeds", money(row.sellProceeds)),
      cell("Cost basis sold", money(row.costBasisSold)),
      cell("Realized G/L", money(row.realized), signedClass(row.realized)),
      cell("Realized G/L %", pct(row.realizedPct), signedClass(row.realized)),
      cell("Notes", escapeHtml(row.notes || "")),
    ].join("")}</tr>`).join("") || `<tr><td colspan="6" class="muted">No realized gains yet.</td></tr>`;
    const maxAbs = Math.max(...monthly.map((row) => Math.abs(Number(row.realized) || 0)), 0);
    $("monthly-realized-bars").innerHTML = monthly.length ? monthly.map((row) => `<div class="bar-row"><div class="bar-meta"><strong>${escapeHtml(row.month)}</strong><span class="${signedClass(row.realized)}">${money(row.realized)}</span></div><div class="bar-track"><div class="bar-fill ${Number(row.realized) < 0 ? "bar-negative" : ""}" style="width:${maxAbs ? Math.max(2, Math.abs(Number(row.realized)) / maxAbs * 100) : 2}%"></div></div></div>`).join("") : `<p class="muted">No data yet.</p>`;
  }

  function renderMonthlyPerformance() {
    const monthly = data.monthlyPerformance || [];
    const container = $("monthly-performance-chart");
    if (!container) return;
    if (!monthly.length) {
      container.innerHTML = `<p class="muted">No monthly performance history yet. It will appear after the next Notion sync.</p>`;
      return;
    }

    const latest = monthly[monthly.length - 1];
    const latestSimplePct = latest.simpleYtdPnlPct ?? latest.ytdPnlPct;
    container.innerHTML = `
      <div class="combo-summary">
        <span><strong>${money(latest.holdingsValue)}</strong><small>Latest holdings value</small></span>
        <span class="${signedClass(latest.ytdPnl)}"><strong>${pct(latestSimplePct)}</strong><small>Simple YTD P/L · ${money(latest.ytdPnl)}</small></span>
        <span class="${signedClass(latest.ytdXirrPct ?? 0)}"><strong>${latest.ytdXirrPct == null ? "—" : pct(latest.ytdXirrPct)}</strong><small>YTD XIRR, annualized</small></span>
      </div>
      <div id="monthly-performance-plot" class="plotly-chart" aria-label="Interactive monthly holdings value and simple YTD profit loss chart"></div>
      <div class="xirr-mini-title"><span><i class="legend-line xirr-legend"></i>YTD XIRR %</span><small>Annualized; separate scale because XIRR can spike early in the year. Hover for exact values.</small></div>
      <div id="monthly-xirr-plot" class="plotly-chart plotly-chart--mini" aria-label="Interactive annualized YTD XIRR chart"></div>`;

    if (!window.Plotly) {
      $("monthly-performance-plot").innerHTML = `<p class="muted">Interactive charts could not load. Check the Plotly CDN connection.</p>`;
      $("monthly-xirr-plot").innerHTML = "";
      return;
    }

    const plotRatio = (value) => {
      const number = Number(value) || 0;
      return Math.abs(number) > 1 ? number / 100 : number;
    };
    const months = monthly.map((row) => row.month);
    const isCompact = window.matchMedia("(max-width: 720px)").matches;
    const commonHover = monthly.map((row) => [
      row.monthEnd,
      Number(row.holdingsValue) || 0,
      Number(row.cash) || 0,
      Number(row.accountValue) || 0,
      Number(row.ytdPnl) || 0,
      Number(row.realizedYtd) || 0,
      Number(row.unrealized) || 0,
      Number(plotRatio(row.simpleYtdPnlPct ?? row.ytdPnlPct)) || 0,
    ]);
    const plotConfig = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    };
    const baseLayout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(3,7,18,0.22)",
      font: { color: "#cbd5e1", family: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
      margin: isCompact ? { l: 48, r: 18, t: 14, b: 64 } : { l: 76, r: 76, t: 18, b: 54 },
      hovermode: "x unified",
      hoverlabel: { bgcolor: "#08111f", bordercolor: "rgba(148,163,184,.32)", font: { color: "#e5eefb" } },
      legend: { orientation: "h", y: isCompact ? -0.32 : -0.22, x: 0, font: { color: "#9fb1c9" } },
      xaxis: { type: "category", tickfont: { color: "#9fb1c9" }, gridcolor: "rgba(148,163,184,.12)", zerolinecolor: "rgba(251,191,36,.35)" },
    };

    Plotly.newPlot("monthly-performance-plot", [
      {
        type: "bar",
        name: "Holdings value",
        x: months,
        y: monthly.map((row) => Number(row.holdingsValue) || 0),
        customdata: commonHover,
        marker: { color: "rgba(79,140,255,.74)", line: { color: "rgba(103,232,249,.55)", width: 1 } },
        hovertemplate: [
          "<b>%{x}</b>",
          "Holdings: $%{customdata[1]:,.2f}",
          "Cash: $%{customdata[2]:,.2f}",
          "Account value: $%{customdata[3]:,.2f}",
          "Month end: %{customdata[0]}",
          "<extra></extra>",
        ].join("<br>"),
      },
      {
        type: "scatter",
        mode: "lines+markers",
        name: "Simple YTD P/L %",
        x: months,
        y: monthly.map((row) => plotRatio(row.simpleYtdPnlPct ?? row.ytdPnlPct)),
        yaxis: "y2",
        customdata: commonHover,
        line: { color: "#34d399", width: 3, shape: "linear" },
        marker: { color: "#34d399", size: 9, line: { color: "#06111f", width: 2 } },
        hovertemplate: [
          "<b>%{x}</b>",
          "Simple YTD P/L: %{y:.2%}",
          "YTD P/L: $%{customdata[4]:,.2f}",
          "Realized YTD: $%{customdata[5]:,.2f}",
          "Unrealized: $%{customdata[6]:,.2f}",
          "Holdings: $%{customdata[1]:,.2f}",
          "<extra></extra>",
        ].join("<br>"),
      },
    ], {
      ...baseLayout,
      height: isCompact ? 340 : 420,
      yaxis: { title: "Holdings value", tickprefix: "$", separatethousands: true, gridcolor: "rgba(148,163,184,.12)", tickfont: { color: "#9fb1c9" }, titlefont: { color: "#cbd5e1" }, zerolinecolor: "rgba(148,163,184,.2)" },
      yaxis2: { title: "Simple YTD P/L %", overlaying: "y", side: "right", tickformat: ".2%", gridcolor: "rgba(0,0,0,0)", tickfont: { color: "#9fb1c9" }, titlefont: { color: "#cbd5e1" }, zeroline: false },
    }, plotConfig);

    const xirrRows = monthly.filter((row) => row.ytdXirrPct != null);
    if (xirrRows.length) {
      Plotly.newPlot("monthly-xirr-plot", [{
        type: "scatter",
        mode: "lines+markers",
        name: "YTD XIRR %",
        x: xirrRows.map((row) => row.month),
        y: xirrRows.map((row) => plotRatio(row.ytdXirrPct)),
        customdata: xirrRows.map((row) => [row.monthEnd, Number(row.accountValue) || 0, Number(row.cash) || 0, row.xirrMethod || "—"]),
        line: { color: "#fbbf24", width: 3, dash: "dash", shape: "linear" },
        marker: { color: "#fbbf24", size: 8, line: { color: "#06111f", width: 2 } },
        hovertemplate: [
          "<b>%{x}</b>",
          "YTD XIRR: %{y:.2%}",
          "Terminal account value: $%{customdata[1]:,.2f}",
          "Cash: $%{customdata[2]:,.2f}",
          "Month end: %{customdata[0]}",
          "Method: %{customdata[3]}",
          "<extra></extra>",
        ].join("<br>"),
      }], {
        ...baseLayout,
        height: isCompact ? 230 : 250,
        margin: isCompact ? { l: 48, r: 18, t: 10, b: 58 } : { l: 76, r: 76, t: 10, b: 50 },
        legend: { orientation: "h", y: isCompact ? -0.36 : -0.26, x: 0, font: { color: "#9fb1c9" } },
        yaxis: { title: "Annualized XIRR %", tickformat: ".2%", gridcolor: "rgba(148,163,184,.12)", tickfont: { color: "#9fb1c9" }, titlefont: { color: "#cbd5e1" }, zerolinecolor: "rgba(251,191,36,.35)" },
      }, plotConfig);
    } else {
      $("monthly-xirr-plot").innerHTML = `<p class="muted">XIRR needs at least one valid monthly point; it will fill in as the log grows.</p>`;
    }
  }

  function renderBars(id, items) {
    $(id).innerHTML = items.length ? items.map((item) => `<div class="bar-row"><div class="bar-meta"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.text)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.min(100, item.value))}%"></div></div></div>`).join("") : `<p class="muted">No data yet.</p>`;
  }

  function pctNumber(value) {
    const number = Number(value) || 0;
    return Math.abs(number) <= 1 ? number * 100 : number;
  }

  function switchTab(name) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      const active = button.dataset.tab === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      const active = panel.id === `tab-${name}`;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function renderAll() {
    renderStats();
    renderHoldings();
    renderSummary();
    renderTransactions();
    renderRealized();
    renderMonthlyPerformance();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll(".tab-button").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
    $("holding-filter").addEventListener("input", renderHoldings);
    $("transaction-filter").addEventListener("input", renderTransactions);
    try {
      const response = await fetch("../assets/investments-data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load portfolio data: ${response.status}`);
      data = await response.json();
      renderAll();
    } catch (error) {
      console.error(error);
      $("empty-dashboard").classList.remove("hidden");
      $("empty-dashboard").querySelector("p").textContent = "Could not load the Notion-synced portfolio data file.";
    }
  });
})();
