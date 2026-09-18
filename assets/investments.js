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
