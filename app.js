// logic added in Tasks 2 and 4

// KEEP IN SYNC WITH tests/calc.test.js
/**
 * @param {Array<{id: number, amount: number}>} stocks
 * @param {Object<number, number>} targets  e.g. { 1: 60, 2: 40 }
 * @param {number} freeCash
 * @returns {{ buy: Object<number, number>, remainder: number }}
 */
function calculate(stocks, targets, freeCash) {
  const total = stocks.reduce((s, st) => s + st.amount, 0);
  const grandTotal = total + freeCash;

  const rawBuy = {};
  stocks.forEach(st => {
    const desired = (targets[st.id] / 100) * grandTotal;
    rawBuy[st.id] = desired - st.amount;
  });

  // Distribute freeCash proportionally across underweight stocks
  const positiveRaw = {};
  let positiveSum = 0;
  stocks.forEach(st => {
    if (rawBuy[st.id] > 0) {
      positiveRaw[st.id] = rawBuy[st.id];
      positiveSum += rawBuy[st.id];
    }
  });

  const buy = {};
  stocks.forEach(st => {
    if (positiveRaw[st.id] === undefined) {
      buy[st.id] = 0;
    } else {
      const share = (positiveRaw[st.id] / positiveSum) * freeCash;
      buy[st.id] = Math.floor(share / 10) * 10;
    }
  });

  const allocated = Object.values(buy).reduce((s, v) => s + v, 0);
  let remainder = freeCash - allocated;

  // Give remainder to the stock with the largest positive gap
  if (remainder > 0) {
    let bestId = null;
    let bestGap = -Infinity;
    stocks.forEach(st => {
      const gap = rawBuy[st.id];
      if (gap > bestGap) { bestGap = gap; bestId = st.id; }
    });
    if (bestId !== null && bestGap > 0) {
      const toAdd = Math.floor(remainder / 10) * 10;
      buy[bestId] += toAdd;
      remainder -= toAdd;
    }
  }

  return { buy, remainder };
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── State ──────────────────────────────────────────────────────────────
let nextId = 3;
const state = {
  stocks: [
    { id: 1, label: '', amount: 0 },
    { id: 2, label: '', amount: 0 },
  ],
  targets: { 1: 50, 2: 50 },
  freeCash: 0,
  results: null,
};

// ── Derived ────────────────────────────────────────────────────────────
function total()      { return state.stocks.reduce((s, st) => s + st.amount, 0); }
function targetSum()  { return Object.values(state.targets).reduce((s, v) => s + v, 0); }
function currentPct(stock) {
  const t = total();
  return t === 0 ? 0 : (stock.amount / t) * 100;
}

// ── Render ─────────────────────────────────────────────────────────────
function render() {
  renderTable();
  renderCards();
  renderFooter();
  renderResults();
}

function renderTable() {
  const tbody = document.getElementById('stocksBody');
  tbody.innerHTML = '';

  state.stocks.forEach(stock => {
    const buy = state.results ? state.results.buy[stock.id] : null;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-name">
        <input class="name-input" data-id="${stock.id}" data-field="label"
               placeholder="Stock ${stock.id}" value="${esc(stock.label)}">
      </td>
      <td>
        <input class="amount-input" data-id="${stock.id}" data-field="amount"
               type="number" min="0" step="any" placeholder="0" value="${stock.amount || ''}">
      </td>
      <td class="current-pct" data-pct-id="${stock.id}">${currentPct(stock).toFixed(1)}%</td>
      <td>
        <input class="target-input" data-id="${stock.id}" data-field="target"
               type="number" min="0" max="100" step="any" placeholder="0"
               value="${state.targets[stock.id] || ''}">
      </td>
      <td class="col-buy">${buy !== null ? '₪' + buy : '—'}</td>
      <td class="col-remove">
        <button class="remove-btn" data-id="${stock.id}"
                ${state.stocks.length <= 2 ? 'disabled' : ''}>✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderTfoot();
}

function renderTfoot() {
  const tfoot = document.getElementById('stocksFoot');
  if (!tfoot) return;
  const ts = targetSum();
  const totalBuy = state.results
    ? Object.values(state.results.buy).reduce((s, v) => s + v, 0)
    : null;
  const grandTotal = total() + state.freeCash;

  tfoot.innerHTML = `
    <tr>
      <td class="col-name"></td>
      <td style="text-align:right;color:var(--text);font-weight:600">
        ₪${grandTotal.toLocaleString()}
      </td>
      <td style="text-align:right;color:var(--text-dim)">100%</td>
      <td style="text-align:right">
        <span class="${ts === 100 ? 'target-sum-ok' : 'target-sum-err'}">
          ${ts}% ${ts === 100 ? '✓' : '✗'}
        </span>
      </td>
      <td class="col-buy">${totalBuy !== null ? '₪' + totalBuy : '—'}</td>
      <td></td>
    </tr>
  `;

  document.getElementById('totalDisplay').textContent =
    grandTotal > 0 ? `Total: ₪${grandTotal.toLocaleString()}` : '';
}

function renderCards() {
  const wrap = document.getElementById('cardsWrap');
  wrap.innerHTML = '';

  state.stocks.forEach(stock => {
    const buy = state.results ? state.results.buy[stock.id] : null;
    const div = document.createElement('div');
    div.className = 'stock-card';
    div.innerHTML = `
      <div class="stock-card-header">
        <input class="name-input field-val" data-id="${stock.id}" data-field="label"
               placeholder="Stock ${stock.id}" value="${esc(stock.label)}">
        <button class="remove-btn" data-id="${stock.id}"
                ${state.stocks.length <= 2 ? 'disabled' : ''}>✕</button>
      </div>
      <div class="stock-card-grid">
        <div class="card-field">
          <label>Amount (₪)</label>
          <input class="field-val" data-id="${stock.id}" data-field="amount"
                 type="number" min="0" step="any" placeholder="0" value="${stock.amount || ''}">
        </div>
        <div class="card-field">
          <label>Current %</label>
          <div class="field-val is-pct" data-pct-id="${stock.id}">${currentPct(stock).toFixed(1)}%</div>
        </div>
        <div class="card-field">
          <label>Target %</label>
          <input class="field-val" data-id="${stock.id}" data-field="target"
                 type="number" min="0" max="100" step="any" placeholder="0"
                 value="${state.targets[stock.id] || ''}">
        </div>
        <div class="card-field">
          <label>Buy (₪)</label>
          <div class="field-val is-buy">${buy !== null ? '₪' + buy : '—'}</div>
        </div>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function renderFooter() {
  const ts = targetSum();
  const fc = state.freeCash;
  const btn = document.getElementById('calcBtn');
  btn.disabled = !(ts === 100 && fc > 0);
}

function renderResults() {
  const allocEl   = document.getElementById('newAlloc');
  const noticeEl  = document.getElementById('unallocatedNotice');

  if (!state.results) {
    allocEl.hidden  = true;
    noticeEl.hidden = true;
    return;
  }

  const t = total() + state.freeCash;
  allocEl.textContent = '';
  const prefix = document.createTextNode('New allocation after purchase: ');
  allocEl.appendChild(prefix);
  state.stocks.forEach((st, i) => {
    const newAmt = st.amount + (state.results.buy[st.id] || 0);
    const pct = t > 0 ? ((newAmt / t) * 100).toFixed(1) : (0).toFixed(1);
    const span = document.createElement('span');
    span.textContent = `${st.label || 'Stock ' + st.id}: ${pct}%`;
    allocEl.appendChild(span);
    if (i < state.stocks.length - 1) {
      allocEl.appendChild(document.createTextNode(' / '));
    }
  });
  allocEl.hidden = false;

  if (state.results.remainder > 0) {
    noticeEl.textContent =
      `₪${state.results.remainder} could not be allocated — remainder is too small to round to ₪10.`;
    noticeEl.hidden = false;
  } else {
    noticeEl.hidden = true;
  }
}

// ── Events ─────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  const field = e.target.dataset.field;
  const isAmount = field === 'amount' || e.target.id === 'freeCashInput';
  const isTarget = field === 'target';
  if (!isAmount && !isTarget) return;
  e.preventDefault();
  const step = isAmount ? 500 : 5;
  const delta = e.key === 'ArrowUp' ? step : -step;
  const current = parseFloat(e.target.value) || 0;
  const next = Math.max(0, current + delta);
  e.target.value = next;
  e.target.dispatchEvent(new Event('input', { bubbles: true }));
});

document.addEventListener('input', e => {
  const id = e.target.dataset.id ? Number(e.target.dataset.id) : null;
  const field = e.target.dataset.field;

  if (id && field === 'label') {
    state.stocks.find(s => s.id === id).label = e.target.value;
    renderResults();
  }
  if (id && field === 'amount') {
    state.stocks.find(s => s.id === id).amount = parseFloat(e.target.value) || 0;
    state.results = null;
    // Patch current % cells in-place (avoids wiping tbody and losing focus)
    state.stocks.forEach(st => {
      const pctEl = document.querySelector(`td[data-pct-id="${st.id}"]`);
      if (pctEl) pctEl.textContent = currentPct(st).toFixed(1) + '%';
      const cardPctEl = document.querySelector(`div[data-pct-id="${st.id}"]`);
      if (cardPctEl) cardPctEl.textContent = currentPct(st).toFixed(1) + '%';
    });
    document.querySelectorAll('tbody .col-buy').forEach(td => { td.textContent = '—'; });
    document.querySelectorAll('#stocksFoot .col-buy').forEach(td => { td.textContent = '—'; });
    document.querySelectorAll('.card-field .is-buy').forEach(div => { div.textContent = '—'; });
    renderFooter();
    renderTfoot();
    return;
  }
  if (id && field === 'target') {
    state.targets[id] = parseFloat(e.target.value) || 0;
    state.results = null;
    // Clear stale buy column cells
    document.querySelectorAll('tbody .col-buy').forEach(td => { td.textContent = '—'; });
    document.querySelectorAll('#stocksFoot .col-buy').forEach(td => { td.textContent = '—'; });
    document.querySelectorAll('.card-field .is-buy').forEach(div => { div.textContent = '—'; });
    renderFooter();
    // update tfoot sum indicator without full re-render (avoids losing focus)
    const ts = targetSum();
    const span = document.querySelector('tfoot .target-sum-ok, tfoot .target-sum-err');
    if (span) {
      span.className = ts === 100 ? 'target-sum-ok' : 'target-sum-err';
      span.textContent = `${ts}% ${ts === 100 ? '✓' : '✗'}`;
    }
    return;
  }

  if (e.target.id === 'freeCashInput') {
    state.freeCash = parseFloat(e.target.value) || 0;
    state.results = null;
    renderFooter();
    renderTfoot();
  }
});

document.addEventListener('click', e => {
  // Remove stock
  if (e.target.classList.contains('remove-btn') && !e.target.disabled) {
    const id = Number(e.target.dataset.id);
    state.stocks = state.stocks.filter(s => s.id !== id);
    delete state.targets[id];
    state.results = null;
    render();
  }

  // Add stock
  if (e.target.id === 'addBtn') {
    const id = nextId++;
    state.stocks.push({ id, label: '', amount: 0 });
    state.targets[id] = 0;
    state.results = null;
    render();
  }

  // Calculate
  if (e.target.id === 'calcBtn') {
    state.results = calculate(state.stocks, state.targets, state.freeCash);
    render();
  }
});

// ── Boot ───────────────────────────────────────────────────────────────
render();
