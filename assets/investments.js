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
      return `<tr><td class="ticker-cell"><strong>${escapeHtml(h.ticker)}</strong><span>${escapeHtml(h.currency || "USD")}</span></td><td>${escapeHtml(h.name || h.assetClass || "—")}</td><td>${numberFormatter.format(Number(h.quantity) || 0)}</td><td>${money(h.averageCost)}</td><td>${money(h.currentPrice)}</td><td>${money(h.marketValue)}</td><td class="${signedClass(h.unrealized)}">${money(h.unrealized)}<br><small>${pct(h.unrealizedPct)}</small></td><td>${pct(weight)}</td></tr>`;
    }).join("") || `<tr><td colspan="8" class="muted">No active holdings match this filter.</td></tr>`;

    renderBars("allocation-bars", holdings.map((h) => ({ label: h.ticker, value: pctNumber(h.allocationPct), text: `${pct(h.allocationPct)} · ${money(h.marketValue)}` })));
    const movers = [...holdings].sort((a, b) => Math.abs(Number(b.unrealized) || 0) - Math.abs(Number(a.unrealized) || 0)).slice(0, 5);
    $("movers-list").innerHTML = movers.map((h) => `<div class="mover-row"><span><strong>${escapeHtml(h.ticker)}</strong><br><small class="muted">${escapeHtml(h.assetClass || "Position")}</small></span><span class="${signedClass(h.unrealized)}">${money(h.unrealized)}<br><small>${pct(h.unrealizedPct)}</small></span></div>`).join("") || `<p class="muted">No movers yet.</p>`;
  }

  function renderSummary() {
    $("summary-body").innerHTML = (data.holdings || []).map((h) => `<tr><td class="ticker-cell"><strong>${escapeHtml(h.ticker)}</strong><span>${escapeHtml(h.currency || "USD")}</span></td><td>${escapeHtml(h.assetClass || "—")}</td><td>${money(h.costBasis)}</td><td>${money(h.marketValue)}</td><td>${escapeHtml(h.riskLevel || "—")}</td><td>${formatDate(h.lastPriceUpdate)}</td><td class="${signedClass(h.unrealized)}">${money(h.unrealized)}<br><small>${pct(h.unrealizedPct)}</small></td></tr>`).join("") || `<tr><td colspan="7" class="muted">No active positions yet.</td></tr>`;

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
    $("transactions-body").innerHTML = actions.map((tx) => `<tr><td>${formatDate(tx.date)}</td><td><span class="badge ${escapeHtml(String(tx.type || "").toLowerCase())}">${escapeHtml(tx.type || "—")}</span></td><td>${escapeHtml(tx.status || "—")}</td><td class="ticker-cell"><strong>${escapeHtml(tx.ticker)}</strong><span>${escapeHtml(tx.name || "—")}</span></td><td>${tx.type === "Sell" || tx.type === "Buy" || tx.type === "Note" ? numberFormatter.format(Number(tx.quantity) || 0) : "—"}</td><td>${money(tx.price)}</td><td>${money(tx.totalAmount)}</td><td class="${tx.realized == null ? "" : signedClass(tx.realized)}">${tx.realized == null ? "—" : money(tx.realized)}</td></tr>`).join("") || `<tr><td colspan="8" class="muted">No transactions found.</td></tr>`;
  }

  function renderRealized() {
    const monthly = data.monthlyRealized || [];
    $("monthly-body").innerHTML = monthly.map((row) => `<tr><td><strong>${escapeHtml(row.month)}</strong></td><td>${money(row.sellProceeds)}</td><td>${money(row.costBasisSold)}</td><td class="${signedClass(row.realized)}">${money(row.realized)}</td><td class="${signedClass(row.realized)}">${pct(row.realizedPct)}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("") || `<tr><td colspan="6" class="muted">No realized gains yet.</td></tr>`;
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

    const width = 920;
    const height = 320;
    const padding = { top: 24, right: 76, bottom: 56, left: 84 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...monthly.map((row) => Number(row.holdingsValue) || 0), 1);
    const simpleValues = monthly.map((row) => pctNumber(row.simpleYtdPnlPct ?? row.ytdPnlPct));
    const xirrRows = monthly.filter((row) => row.ytdXirrPct != null);
    const minPct = Math.min(0, ...simpleValues);
    const maxPct = Math.max(0, ...simpleValues);
    const pctSpan = Math.max(1, maxPct - minPct);
    const slot = plotWidth / monthly.length;
    const barWidth = Math.min(54, slot * 0.54);
    const xCenter = (index) => padding.left + slot * index + slot / 2;
    const yValue = (value) => padding.top + plotHeight - ((Number(value) || 0) / maxValue) * plotHeight;
    const yPct = (value) => padding.top + plotHeight - ((pctNumber(value) - minPct) / pctSpan) * plotHeight;
    const zeroY = yPct(0);
    const simpleLinePoints = monthly.map((row, index) => `${xCenter(index)},${yPct(row.simpleYtdPnlPct ?? row.ytdPnlPct)}`).join(" ");

    const bars = monthly.map((row, index) => {
      const x = xCenter(index) - barWidth / 2;
      const y = yValue(row.holdingsValue);
      const h = padding.top + plotHeight - y;
      return `<rect class="combo-bar" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${Math.max(1, h).toFixed(2)}" rx="8"><title>${escapeHtml(row.month)} holdings: ${money(row.holdingsValue)}</title></rect>`;
    }).join("");

    const simpleDots = monthly.map((row, index) => {
      const value = row.simpleYtdPnlPct ?? row.ytdPnlPct;
      const y = yPct(value);
      return `<g><circle class="combo-dot simple-dot ${Number(value) < 0 ? "negative-dot" : ""}" cx="${xCenter(index).toFixed(2)}" cy="${y.toFixed(2)}" r="5"><title>${escapeHtml(row.month)} simple YTD P/L: ${pct(value)} (${money(row.ytdPnl)})</title></circle><text class="combo-point-label" x="${xCenter(index).toFixed(2)}" y="${(y - 12).toFixed(2)}" text-anchor="middle">${pct(value)}</text></g>`;
    }).join("");

    const xirrSparkline = (() => {
      if (xirrRows.length < 2) return `<p class="muted">XIRR needs at least two valid monthly points; it will fill in as the log grows.</p>`;
      const sparkHeight = 150;
      const sparkPadding = { top: 22, right: 76, bottom: 34, left: 84 };
      const sparkPlotWidth = width - sparkPadding.left - sparkPadding.right;
      const sparkPlotHeight = sparkHeight - sparkPadding.top - sparkPadding.bottom;
      const values = xirrRows.map((row) => pctNumber(row.ytdXirrPct));
      const minXirr = Math.min(0, ...values);
      const maxXirr = Math.max(0, ...values);
      const xirrSpan = Math.max(1, maxXirr - minXirr);
      const xirrSlot = sparkPlotWidth / xirrRows.length;
      const xirrX = (index) => sparkPadding.left + xirrSlot * index + xirrSlot / 2;
      const xirrY = (value) => sparkPadding.top + sparkPlotHeight - ((pctNumber(value) - minXirr) / xirrSpan) * sparkPlotHeight;
      const line = xirrRows.map((row, index) => `${xirrX(index)},${xirrY(row.ytdXirrPct)}`).join(" ");
      const dots = xirrRows.map((row, index) => {
        const y = xirrY(row.ytdXirrPct);
        return `<g><circle class="combo-dot xirr-dot ${Number(row.ytdXirrPct) < 0 ? "negative-dot" : ""}" cx="${xirrX(index).toFixed(2)}" cy="${y.toFixed(2)}" r="4"><title>${escapeHtml(row.month)} YTD XIRR: ${pct(row.ytdXirrPct)} annualized</title></circle><text class="combo-point-label xirr-label" x="${xirrX(index).toFixed(2)}" y="${(y - 10).toFixed(2)}" text-anchor="middle">${pct(row.ytdXirrPct)}</text></g>`;
      }).join("");
      const sparkLabels = xirrRows.map((row, index) => `<text class="combo-x-label" x="${xirrX(index).toFixed(2)}" y="${sparkHeight - 12}" text-anchor="middle">${escapeHtml(row.month.slice(5))}</text>`).join("");
      const ticks = [minXirr, 0, maxXirr].filter((value, index, arr) => arr.indexOf(value) === index).map((value) => `<text class="combo-y-label" x="${width - sparkPadding.right + 10}" y="${(sparkPadding.top + sparkPlotHeight - ((value - minXirr) / xirrSpan) * sparkPlotHeight + 4).toFixed(2)}">${pct(value)}</text>`).join("");
      const zero = xirrY(0);
      return `<div class="xirr-mini-title"><span><i class="legend-line xirr-legend"></i>YTD XIRR %</span><small>Annualized; separate scale because XIRR can spike early in the year.</small></div><svg class="xirr-mini-chart" viewBox="0 0 ${width} ${sparkHeight}" role="presentation" aria-hidden="true"><line class="combo-zero" x1="${sparkPadding.left}" x2="${width - sparkPadding.right}" y1="${zero.toFixed(2)}" y2="${zero.toFixed(2)}"></line><polyline class="combo-line xirr-line" points="${line}"></polyline>${dots}${sparkLabels}${ticks}</svg>`;
    })();

    const labels = monthly.map((row, index) => `<text class="combo-x-label" x="${xCenter(index).toFixed(2)}" y="${height - 24}" text-anchor="middle">${escapeHtml(row.month.slice(5))}</text>`).join("");
    const valueTicks = [0, maxValue / 2, maxValue].map((value) => `<g><line class="combo-grid" x1="${padding.left}" x2="${width - padding.right}" y1="${yValue(value).toFixed(2)}" y2="${yValue(value).toFixed(2)}"></line><text class="combo-y-label" x="${padding.left - 10}" y="${(yValue(value) + 4).toFixed(2)}" text-anchor="end">${money(value)}</text></g>`).join("");
    const pctTicks = [minPct, 0, maxPct].filter((value, index, arr) => arr.indexOf(value) === index).map((value) => `<text class="combo-y-label" x="${width - padding.right + 10}" y="${(padding.top + plotHeight - ((value - minPct) / pctSpan) * plotHeight + 4).toFixed(2)}">${pct(value)}</text>`).join("");

    const latest = monthly[monthly.length - 1];
    const latestSimplePct = latest.simpleYtdPnlPct ?? latest.ytdPnlPct;
    container.innerHTML = `
      <div class="combo-summary">
        <span><strong>${money(latest.holdingsValue)}</strong><small>Latest holdings value</small></span>
        <span class="${signedClass(latest.ytdPnl)}"><strong>${pct(latestSimplePct)}</strong><small>Simple YTD P/L · ${money(latest.ytdPnl)}</small></span>
        <span class="${signedClass(latest.ytdXirrPct ?? 0)}"><strong>${latest.ytdXirrPct == null ? "—" : pct(latest.ytdXirrPct)}</strong><small>YTD XIRR, annualized</small></span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="presentation" aria-hidden="true">
        ${valueTicks}
        <line class="combo-zero" x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY.toFixed(2)}" y2="${zeroY.toFixed(2)}"></line>
        ${bars}
        <polyline class="combo-line simple-line" points="${simpleLinePoints}"></polyline>
        ${simpleDots}
        ${labels}
        ${pctTicks}
        <text class="combo-axis-title" x="${padding.left}" y="16">Holdings value</text>
        <text class="combo-axis-title" x="${width - padding.right}" y="16" text-anchor="end">Simple YTD P/L %</text>
      </svg>
      <div class="chart-legend"><span><i class="legend-bar"></i>Holdings value</span><span><i class="legend-line simple-legend"></i>Simple YTD P/L %</span></div>
      ${xirrSparkline}`;
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
