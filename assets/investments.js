(() => {
  const STORAGE_KEY = "ditto-investments-v1";
  const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
  const pctFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const state = loadState();
  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { transactions: [], prices: {} };
    } catch {
      return { transactions: [], prices: {} };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function money(value) {
    return currencyFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function pct(value) {
    return `${pctFormatter.format(Number.isFinite(value) ? value : 0)}%`;
  }

  function signedClass(value) {
    return value >= 0 ? "positive" : "negative";
  }

  function normalizeTicker(value) {
    return (value || "").trim().toUpperCase();
  }

  function transactionCashFlow(tx) {
    const qty = Number(tx.quantity) || 0;
    const price = Number(tx.price) || 0;
    const fee = Number(tx.fee) || 0;
    if (tx.type === "buy") return -(qty * price + fee);
    if (tx.type === "sell") return qty * price - fee;
    return price;
  }

  function computePortfolio() {
    const lots = new Map();
    const names = new Map();
    const dividends = new Map();
    const realized = new Map();
    let realizedTotal = 0;
    let dividendTotal = 0;

    const txs = [...state.transactions].sort((a, b) => `${a.date || ""}${a.id}`.localeCompare(`${b.date || ""}${b.id}`));
    for (const tx of txs) {
      const ticker = normalizeTicker(tx.ticker);
      if (!ticker) continue;
      if (tx.name) names.set(ticker, tx.name);
      const qty = Number(tx.quantity) || 0;
      const price = Number(tx.price) || 0;
      const fee = Number(tx.fee) || 0;
      if (!lots.has(ticker)) lots.set(ticker, []);
      if (tx.type === "buy") {
        lots.get(ticker).push({ qty, costPerShare: qty ? (qty * price + fee) / qty : 0 });
      } else if (tx.type === "sell") {
        let remaining = qty;
        let costRemoved = 0;
        const queue = lots.get(ticker);
        while (remaining > 0 && queue.length) {
          const lot = queue[0];
          const take = Math.min(remaining, lot.qty);
          costRemoved += take * lot.costPerShare;
          lot.qty -= take;
          remaining -= take;
          if (lot.qty <= 0.0000001) queue.shift();
        }
        const proceeds = qty * price - fee;
        const gain = proceeds - costRemoved;
        realized.set(ticker, (realized.get(ticker) || 0) + gain);
        realizedTotal += gain;
      } else if (tx.type === "dividend") {
        dividends.set(ticker, (dividends.get(ticker) || 0) + price);
        dividendTotal += price;
      }
    }

    const holdings = [];
    for (const [ticker, queue] of lots.entries()) {
      const qty = queue.reduce((sum, lot) => sum + lot.qty, 0);
      const costBasis = queue.reduce((sum, lot) => sum + lot.qty * lot.costPerShare, 0);
      if (qty <= 0.0000001) continue;
      const avgCost = costBasis / qty;
      const lastPrice = Number(state.prices[ticker] ?? avgCost) || 0;
      state.prices[ticker] = lastPrice;
      const value = qty * lastPrice;
      const unrealized = value - costBasis;
      holdings.push({ ticker, name: names.get(ticker) || "", qty, costBasis, avgCost, lastPrice, value, unrealized, dividends: dividends.get(ticker) || 0, realized: realized.get(ticker) || 0 });
    }

    holdings.sort((a, b) => b.value - a.value);
    const totals = holdings.reduce((acc, h) => {
      acc.value += h.value;
      acc.costBasis += h.costBasis;
      acc.unrealized += h.unrealized;
      return acc;
    }, { value: 0, costBasis: 0, unrealized: 0 });
    totals.realized = realizedTotal;
    totals.dividends = dividendTotal;
    return { holdings, totals, dividends, realized };
  }

  function renderStats(portfolio) {
    const { totals, holdings } = portfolio;
    $("stat-value").textContent = money(totals.value);
    $("stat-value-sub").textContent = holdings.length ? `${holdings.length} open position${holdings.length === 1 ? "" : "s"}` : "No holdings yet";
    $("stat-invested").textContent = money(totals.costBasis);
    $("stat-unrealized").textContent = money(totals.unrealized);
    $("stat-unrealized").className = signedClass(totals.unrealized);
    $("stat-unrealized-pct").textContent = pct(totals.costBasis ? (totals.unrealized / totals.costBasis) * 100 : 0);
    $("stat-realized").textContent = money(totals.realized);
    $("stat-realized").className = signedClass(totals.realized);
    $("stat-dividends").textContent = money(totals.dividends);
  }

  function renderHoldings(portfolio) {
    const filter = normalizeTicker($("holding-filter").value);
    const holdings = portfolio.holdings.filter((h) => !filter || h.ticker.includes(filter) || h.name.toUpperCase().includes(filter));
    $("empty-dashboard").classList.toggle("hidden", state.transactions.length > 0);
    $("dashboard-content").classList.toggle("hidden", state.transactions.length === 0);
    $("holdings-body").innerHTML = holdings.map((h) => {
      const weight = portfolio.totals.value ? (h.value / portfolio.totals.value) * 100 : 0;
      return `<tr><td class="ticker-cell"><strong>${escapeHtml(h.ticker)}</strong><span>${escapeHtml(h.name || "—")}</span></td><td>${escapeHtml(h.name || "—")}</td><td>${numberFormatter.format(h.qty)}</td><td>${money(h.avgCost)}</td><td><input class="price-input" data-price-ticker="${escapeHtml(h.ticker)}" type="number" min="0" step="0.0001" value="${h.lastPrice.toFixed(4)}" aria-label="Last price for ${escapeHtml(h.ticker)}" /></td><td>${money(h.value)}</td><td class="${signedClass(h.unrealized)}">${money(h.unrealized)}<br><small>${pct(h.costBasis ? h.unrealized / h.costBasis * 100 : 0)}</small></td><td>${pct(weight)}</td></tr>`;
    }).join("") || `<tr><td colspan="8" class="muted">No open holdings match this filter.</td></tr>`;

    renderBars("allocation-bars", holdings.map((h) => ({ label: h.ticker, value: portfolio.totals.value ? h.value / portfolio.totals.value * 100 : 0, text: `${pct(portfolio.totals.value ? h.value / portfolio.totals.value * 100 : 0)} · ${money(h.value)}` })));
    const movers = [...holdings].sort((a, b) => Math.abs(b.unrealized) - Math.abs(a.unrealized)).slice(0, 5);
    $("movers-list").innerHTML = movers.map((h) => `<div class="mover-row"><span><strong>${escapeHtml(h.ticker)}</strong><br><small class="muted">${escapeHtml(h.name || "Open position")}</small></span><span class="${signedClass(h.unrealized)}">${money(h.unrealized)}<br><small>${pct(h.costBasis ? h.unrealized / h.costBasis * 100 : 0)}</small></span></div>`).join("") || `<p class="muted">No movers yet.</p>`;
  }

  function renderSummary(portfolio) {
    $("summary-body").innerHTML = portfolio.holdings.map((h) => {
      const totalReturn = h.unrealized + h.realized + h.dividends;
      return `<tr><td class="ticker-cell"><strong>${escapeHtml(h.ticker)}</strong><span>${escapeHtml(h.name || "—")}</span></td><td>${money(h.costBasis)}</td><td>${money(h.value)}</td><td>${money(h.dividends)}</td><td>${pct(h.costBasis ? h.dividends / h.costBasis * 100 : 0)}</td><td class="${signedClass(totalReturn)}">${money(totalReturn)}</td></tr>`;
    }).join("") || `<tr><td colspan="6" class="muted">No open positions yet.</td></tr>`;
    renderBars("income-bars", portfolio.holdings.filter((h) => h.dividends > 0).map((h) => ({ label: h.ticker, value: portfolio.totals.dividends ? h.dividends / portfolio.totals.dividends * 100 : 0, text: money(h.dividends) })));
    const largest = portfolio.holdings[0];
    const insights = [];
    if (largest && portfolio.totals.value) insights.push(`${largest.ticker} is the largest holding at ${pct(largest.value / portfolio.totals.value * 100)} of portfolio value.`);
    if (portfolio.totals.dividends) insights.push(`Logged dividend income totals ${money(portfolio.totals.dividends)}.`);
    if (portfolio.totals.costBasis) insights.push(`Open-book unrealized return is ${pct(portfolio.totals.unrealized / portfolio.totals.costBasis * 100)} before dividends and realized gains.`);
    if (!insights.length) insights.push("Add buy/sell/dividend transactions to generate portfolio insights.");
    $("insight-list").innerHTML = insights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderTransactions() {
    const filter = ($("transaction-filter").value || "").toLowerCase();
    const txs = [...state.transactions].sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .filter((tx) => !filter || [tx.date, tx.type, tx.ticker, tx.name, tx.account, tx.notes].some((field) => String(field || "").toLowerCase().includes(filter)));
    $("transactions-body").innerHTML = txs.map((tx) => `<tr><td>${escapeHtml(tx.date || "—")}</td><td><span class="badge ${tx.type}">${tx.type}</span></td><td class="ticker-cell"><strong>${escapeHtml(normalizeTicker(tx.ticker))}</strong><span>${escapeHtml(tx.name || "—")}</span></td><td>${tx.type === "dividend" ? "—" : numberFormatter.format(Number(tx.quantity) || 0)}</td><td>${tx.type === "dividend" ? money(Number(tx.price) || 0) : money(Number(tx.price) || 0)}</td><td class="${signedClass(transactionCashFlow(tx))}">${money(transactionCashFlow(tx))}</td><td><button class="action-button" data-edit="${tx.id}" type="button">Edit</button><button class="action-button delete" data-delete="${tx.id}" type="button">Delete</button></td></tr>`).join("") || `<tr><td colspan="7" class="muted">No transactions yet.</td></tr>`;
  }

  function renderDividends() {
    const dividends = state.transactions.filter((tx) => tx.type === "dividend").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    $("dividends-body").innerHTML = dividends.map((tx) => `<tr><td>${escapeHtml(tx.date || "—")}</td><td>${escapeHtml(normalizeTicker(tx.ticker))}</td><td>${escapeHtml(tx.name || "—")}</td><td class="positive">${money(Number(tx.price) || 0)}</td><td>${escapeHtml(tx.account || "—")}</td><td>${escapeHtml(tx.notes || "")}</td></tr>`).join("") || `<tr><td colspan="6" class="muted">No dividends logged yet.</td></tr>`;
    const monthly = new Map();
    for (const tx of dividends) {
      const month = (tx.date || "No date").slice(0, 7);
      monthly.set(month, (monthly.get(month) || 0) + (Number(tx.price) || 0));
    }
    const max = Math.max(...monthly.values(), 0);
    renderBars("monthly-dividend-bars", [...monthly.entries()].sort().slice(-12).map(([label, amount]) => ({ label, value: max ? amount / max * 100 : 0, text: money(amount) })));
  }

  function renderBars(id, items) {
    $(id).innerHTML = items.length ? items.map((item) => `<div class="bar-row"><div class="bar-meta"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.text)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.min(100, item.value))}%"></div></div></div>`).join("") : `<p class="muted">No data yet.</p>`;
  }

  function renderAll() {
    const portfolio = computePortfolio();
    saveState();
    renderStats(portfolio);
    renderHoldings(portfolio);
    renderSummary(portfolio);
    renderTransactions();
    renderDividends();
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

  function fillForm(tx = {}) {
    $("tx-id").value = tx.id || "";
    $("tx-type").value = tx.type || "buy";
    $("tx-date").value = tx.date || new Date().toISOString().slice(0, 10);
    $("tx-ticker").value = tx.ticker || "";
    $("tx-name").value = tx.name || "";
    $("tx-quantity").value = tx.quantity ?? "";
    $("tx-price").value = tx.price ?? "";
    $("tx-fee").value = tx.fee ?? "";
    $("tx-currency").value = tx.currency || "USD";
    $("tx-account").value = tx.account || "";
    $("tx-notes").value = tx.notes || "";
  }

  function readForm() {
    return {
      id: $("tx-id").value || crypto.randomUUID(),
      type: $("tx-type").value,
      date: $("tx-date").value,
      ticker: normalizeTicker($("tx-ticker").value),
      name: $("tx-name").value.trim(),
      quantity: Number($("tx-quantity").value) || 0,
      price: Number($("tx-price").value) || 0,
      fee: Number($("tx-fee").value) || 0,
      currency: ($("tx-currency").value || "USD").trim().toUpperCase(),
      account: $("tx-account").value.trim(),
      notes: $("tx-notes").value.trim(),
    };
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toCsv() {
    const fields = ["date", "type", "ticker", "name", "quantity", "price", "fee", "currency", "account", "notes"];
    const rows = [fields.join(",")];
    for (const tx of state.transactions) rows.push(fields.map((field) => `"${String(tx[field] ?? "").replaceAll('"', '""')}"`).join(","));
    return rows.join("\n");
  }

  function loadDemoData() {
    state.transactions = [
      { id: crypto.randomUUID(), type: "buy", date: "2026-01-08", ticker: "VOO", name: "Vanguard S&P 500 ETF", quantity: 12, price: 475, fee: 1, currency: "USD", account: "Demo", notes: "Core index position" },
      { id: crypto.randomUUID(), type: "buy", date: "2026-02-12", ticker: "NVDA", name: "NVIDIA Corp.", quantity: 15, price: 118, fee: 1, currency: "USD", account: "Demo", notes: "AI infrastructure exposure" },
      { id: crypto.randomUUID(), type: "buy", date: "2026-03-05", ticker: "MSFT", name: "Microsoft Corp.", quantity: 8, price: 405, fee: 1, currency: "USD", account: "Demo", notes: "Cloud and software" },
      { id: crypto.randomUUID(), type: "sell", date: "2026-04-10", ticker: "NVDA", name: "NVIDIA Corp.", quantity: 3, price: 144, fee: 1, currency: "USD", account: "Demo", notes: "Trim after rally" },
      { id: crypto.randomUUID(), type: "dividend", date: "2026-04-28", ticker: "VOO", name: "Vanguard S&P 500 ETF", quantity: 0, price: 22.4, fee: 0, currency: "USD", account: "Demo", notes: "Quarterly distribution" },
      { id: crypto.randomUUID(), type: "dividend", date: "2026-06-14", ticker: "MSFT", name: "Microsoft Corp.", quantity: 0, price: 6.64, fee: 0, currency: "USD", account: "Demo", notes: "Quarterly dividend" },
    ];
    state.prices = { VOO: 510, NVDA: 156, MSFT: 438 };
    renderAll();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillForm();
    document.querySelectorAll(".tab-button").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
    document.querySelectorAll("[data-open-tab]").forEach((button) => button.addEventListener("click", () => {
      switchTab(button.dataset.openTab);
      if (button.dataset.dividendShortcut) $("tx-type").value = "dividend";
      $("transaction-form").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    $("quick-add-button").addEventListener("click", () => { switchTab("transactions"); $("tx-ticker").focus(); });
    $("transaction-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const tx = readForm();
      const existingIndex = state.transactions.findIndex((item) => item.id === tx.id);
      if (existingIndex >= 0) state.transactions[existingIndex] = tx;
      else state.transactions.push(tx);
      fillForm();
      renderAll();
    });
    $("cancel-edit").addEventListener("click", () => fillForm());
    $("transactions-body").addEventListener("click", (event) => {
      const editId = event.target?.dataset?.edit;
      const deleteId = event.target?.dataset?.delete;
      if (editId) {
        const tx = state.transactions.find((item) => item.id === editId);
        if (tx) fillForm(tx);
      }
      if (deleteId && confirm("Delete this transaction from local storage?")) {
        state.transactions = state.transactions.filter((item) => item.id !== deleteId);
        renderAll();
      }
    });
    $("holdings-body").addEventListener("change", (event) => {
      const ticker = event.target?.dataset?.priceTicker;
      if (!ticker) return;
      state.prices[ticker] = Number(event.target.value) || 0;
      renderAll();
    });
    $("holding-filter").addEventListener("input", renderAll);
    $("transaction-filter").addEventListener("input", renderTransactions);
    $("export-json").addEventListener("click", () => download("ditto-investments.json", JSON.stringify(state, null, 2), "application/json"));
    $("export-csv").addEventListener("click", () => download("ditto-investment-transactions.csv", toCsv(), "text/csv"));
    $("import-json").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const imported = JSON.parse(await file.text());
      state.transactions = Array.isArray(imported.transactions) ? imported.transactions : [];
      state.prices = imported.prices || {};
      saveState();
      renderAll();
      event.target.value = "";
    });
    $("load-demo-button").addEventListener("click", () => {
      if (!state.transactions.length || confirm("Replace current local tracker data with demo data?")) loadDemoData();
    });
    $("reset-button").addEventListener("click", () => {
      if (confirm("Reset all local investment tracker data in this browser?")) {
        state.transactions = [];
        state.prices = {};
        saveState();
        fillForm();
        renderAll();
      }
    });
    renderAll();
  });
})();
