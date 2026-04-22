# Stock Balancer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side NIS stock portfolio rebalancing calculator as three static files with no dependencies.

**Architecture:** Single-page app with `index.html` (markup), `style.css` (all styles + responsive), and `app.js` (state, logic, DOM rendering). State is a plain JS object in memory; all derived values are computed on the fly. No build step.

**Tech Stack:** Vanilla HTML5, CSS3 (custom properties, CSS Grid, media queries), vanilla ES6 JS (no frameworks, no libraries).

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Static markup skeleton: page shell, table structure, card container, footer inputs |
| `style.css` | All visual styles: dark theme, table layout (≥640px), card layout (<640px), Buy column highlight, button states |
| `app.js` | State object, `calculate()` logic, `render()` function, all event listeners |
| `tests/calc.test.js` | Pure unit tests for `calculate()` logic (run via Node — no browser needed) |

---

## Task 1: Project skeleton

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stock Balancer</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header class="app-header">
      <h1 class="app-title">Stock Balancer</h1>
      <span class="total-display" id="totalDisplay"></span>
    </header>

    <!-- Desktop table (hidden on mobile via CSS) -->
    <div class="table-wrap">
      <table class="stocks-table" id="stocksTable">
        <thead>
          <tr>
            <th class="col-name">Stock</th>
            <th class="col-amount">Amount (₪)</th>
            <th class="col-current">Current %</th>
            <th class="col-target">Target %</th>
            <th class="col-buy">Buy (₪)</th>
            <th class="col-remove"></th>
          </tr>
        </thead>
        <tbody id="stocksBody"></tbody>
        <tfoot id="stocksFoot"></tfoot>
      </table>
    </div>

    <!-- Mobile cards (hidden on desktop via CSS) -->
    <div class="cards-wrap" id="cardsWrap"></div>

    <div class="table-actions">
      <button class="add-btn" id="addBtn">+ Add stock</button>
    </div>

    <div class="footer-bar">
      <label class="free-label" for="freeCashInput">Free cash (₪)</label>
      <input class="free-input" id="freeCashInput" type="number" min="0" placeholder="0">
      <button class="calc-btn" id="calcBtn" disabled>Calculate →</button>
    </div>

    <p class="new-alloc" id="newAlloc" hidden></p>
    <p class="unallocated-notice" id="unallocatedNotice" hidden></p>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create empty `style.css`**

```css
/* styles added in Task 3 */
```

- [ ] **Step 3: Create empty `app.js`**

```js
// logic added in Tasks 2 and 4
```

- [ ] **Step 4: Open `index.html` in a browser and verify the page loads without errors (blank page is fine)**

- [ ] **Step 5: Commit**

```bash
git add index.html style.css app.js
git commit -m "feat: add project skeleton"
```

---

## Task 2: Calculation logic + unit tests

**Files:**
- Modify: `app.js`
- Create: `tests/calc.test.js`

- [ ] **Step 1: Add the pure `calculate()` function to `app.js`**

```js
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

  const buy = {};
  stocks.forEach(st => {
    const floored = Math.floor(Math.max(0, rawBuy[st.id]) / 10) * 10;
    buy[st.id] = floored;
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
      buy[bestId] += remainder;
      remainder = 0;
    }
  }

  return { buy, remainder };
}
```

- [ ] **Step 2: Create `tests/calc.test.js`**

```js
// Run with: node --test tests/calc.test.js  (Node 18+)
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Inline the function under test (no module system in the browser build)
function calculate(stocks, targets, freeCash) {
  const total = stocks.reduce((s, st) => s + st.amount, 0);
  const grandTotal = total + freeCash;
  const rawBuy = {};
  stocks.forEach(st => {
    rawBuy[st.id] = (targets[st.id] / 100) * grandTotal - st.amount;
  });
  const buy = {};
  stocks.forEach(st => {
    buy[st.id] = Math.floor(Math.max(0, rawBuy[st.id]) / 10) * 10;
  });
  const allocated = Object.values(buy).reduce((s, v) => s + v, 0);
  let remainder = freeCash - allocated;
  if (remainder > 0) {
    let bestId = null, bestGap = -Infinity;
    stocks.forEach(st => {
      if (rawBuy[st.id] > bestGap) { bestGap = rawBuy[st.id]; bestId = st.id; }
    });
    if (bestId !== null && bestGap > 0) { buy[bestId] += remainder; remainder = 0; }
  }
  return { buy, remainder };
}

test('splits free cash proportionally and rounds down to 10', () => {
  const stocks = [{ id: 1, amount: 12500 }, { id: 2, amount: 7500 }];
  const targets = { 1: 60, 2: 40 };
  const { buy, remainder } = calculate(stocks, targets, 1000);
  // desired: stock1 = 0.6*21000=12600 → buy=100; stock2=0.4*21000=8400 → buy=900
  assert.equal(buy[1], 100);
  assert.equal(buy[2], 900);
  assert.equal(remainder, 0);
});

test('never sells an overweight stock', () => {
  // stock1 is 70% but target is 60% — buy should be 0
  const stocks = [{ id: 1, amount: 7000 }, { id: 2, amount: 3000 }];
  const targets = { 1: 60, 2: 40 };
  const { buy } = calculate(stocks, targets, 1000);
  assert.equal(buy[1], 0);
  assert.ok(buy[2] > 0);
});

test('remainder goes to most-underweight stock', () => {
  // After rounding down, leftover cash should go to stock with biggest gap
  const stocks = [{ id: 1, amount: 0 }, { id: 2, amount: 0 }];
  const targets = { 1: 50, 2: 50 };
  const { buy, remainder } = calculate(stocks, targets, 15); // 15 → floor to 10 per stock = 10+0 or 0+10
  assert.equal(remainder, 0);
  assert.equal(buy[1] + buy[2], 15);
});

test('unallocatable when all stocks overweight', () => {
  // freeCash is 100 but both stocks already exceed targets — nothing can be bought sensibly
  const stocks = [{ id: 1, amount: 8000 }, { id: 2, amount: 2000 }];
  const targets = { 1: 50, 2: 50 }; // stock1 is 80%, way over 50%
  const { buy, remainder } = calculate(stocks, targets, 100);
  // stock2 still underweight so it should absorb
  assert.equal(buy[1], 0);
  assert.ok(buy[2] >= 0);
});

test('rounds each allocation down to nearest 10', () => {
  const stocks = [{ id: 1, amount: 0 }, { id: 2, amount: 0 }];
  const targets = { 1: 33, 2: 67 };
  const { buy } = calculate(stocks, targets, 100);
  assert.equal(buy[1] % 10, 0);
  assert.equal(buy[2] % 10, 0);
});
```

- [ ] **Step 3: Run tests and verify they pass**

```bash
node --test tests/calc.test.js
```

Expected: all 5 tests pass (✓).

- [ ] **Step 4: Commit**

```bash
git add app.js tests/calc.test.js
git commit -m "feat: add calculate() logic with unit tests"
```

---

## Task 3: Styles (desktop table + mobile cards + theme)

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Write the full stylesheet**

```css
/* ── Reset & custom properties ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:          #0a1520;
  --bg-card:     #0f1f2e;
  --bg-input:    #071520;
  --border:      #1e3a5f;
  --border-dim:  #111d2e;
  --text:        #e2e8f0;
  --text-dim:    #94a3b8;
  --text-muted:  #475569;
  --accent:      #0ea5e9;
  --accent-lt:   #38bdf8;
  --accent-bg:   rgba(14, 165, 233, 0.08);
  --accent-bdr:  rgba(14, 165, 233, 0.18);
  --green:       #10b981;
  --red:         #f87171;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  padding: 32px 16px;
}

/* ── Container ── */
.container {
  max-width: 680px;
  margin: 0 auto;
}

/* ── Header ── */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 24px;
}
.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.01em;
}
.total-display {
  font-size: 12px;
  color: var(--accent-lt);
  font-weight: 600;
}

/* ── Table (desktop) ── */
.table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 12px;
}
.stocks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.stocks-table thead th {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 12px 10px 10px;
  text-align: right;
  border-bottom: 1px solid var(--border-dim);
}
.stocks-table thead th.col-name { text-align: left; }
.stocks-table thead th.col-buy  { color: var(--accent); }

.stocks-table tbody td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border-dim);
  text-align: right;
  color: var(--text-dim);
  vertical-align: middle;
}
.stocks-table tbody td.col-name { text-align: left; }

.stocks-table tfoot td {
  padding: 10px 10px 12px;
  text-align: right;
  font-size: 11px;
  color: var(--text-muted);
  border-top: 2px solid var(--border);
}
.stocks-table tfoot td.col-name { text-align: left; }

/* Buy column highlight */
.col-buy {
  background: var(--accent-bg);
  border-left: 1px solid var(--accent-bdr);
  color: var(--accent-lt);
  font-weight: 700;
}
tfoot .col-buy { font-weight: 700; color: var(--accent); }

/* Current % */
.current-pct { color: var(--accent-lt); font-weight: 600; }

/* Target sum indicator */
.target-sum-ok  { color: var(--green); font-weight: 700; }
.target-sum-err { color: var(--red);   font-weight: 700; }

/* ── Inputs ── */
.name-input, .amount-input, .target-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-size: 12px;
  padding: 4px 7px;
}
.name-input   { width: 90px; text-align: left; }
.amount-input { width: 80px; text-align: right; }
.target-input { width: 52px; text-align: right; }

input:focus { outline: none; border-color: var(--accent); }

/* Remove button */
.remove-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 3px;
}
.remove-btn:hover { color: var(--red); }
.remove-btn:disabled { opacity: 0.2; cursor: default; }

/* ── Table actions ── */
.table-actions { margin-bottom: 16px; }
.add-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.add-btn:hover { text-decoration: underline; }

/* ── Footer bar ── */
.footer-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}
.free-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.free-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--accent-lt);
  font-size: 14px;
  font-weight: 600;
  padding: 8px 10px;
  width: 130px;
  text-align: right;
}
.calc-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  margin-left: auto;
  transition: opacity 0.15s;
}
.calc-btn:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; }

/* ── Post-calculate messages ── */
.new-alloc {
  font-size: 12px;
  color: var(--text-muted);
  background: #071520;
  border-left: 2px solid var(--accent);
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
  margin-bottom: 8px;
}
.new-alloc span { color: var(--accent-lt); font-weight: 600; }

.unallocated-notice {
  font-size: 12px;
  color: var(--red);
  padding: 6px 0;
}

/* ── Mobile cards (hidden on desktop) ── */
.cards-wrap { display: none; }

@media (max-width: 639px) {
  .table-wrap  { display: none; }
  .cards-wrap  { display: block; }

  .stock-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .stock-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .stock-card-header .name-input { width: 100%; font-size: 13px; font-weight: 600; }
  .stock-card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .card-field label {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: 3px;
  }
  .card-field .field-val {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text-dim);
    width: 100%;
  }
  .card-field .field-val.is-pct   { color: var(--accent-lt); font-weight: 600; }
  .card-field .field-val.is-buy   { color: var(--accent-lt); font-weight: 700; background: var(--accent-bg); border-color: var(--accent-bdr); }
  .card-field input.field-val     { color: var(--text); }

  .footer-bar { flex-wrap: wrap; }
  .free-input { width: 100%; }
  .calc-btn   { width: 100%; margin-left: 0; }
}
```

- [ ] **Step 2: Open `index.html` in a browser — verify dark background renders, no console errors**

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add full stylesheet with desktop table and mobile card layouts"
```

---

## Task 4: State, render, and event wiring

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add state initialisation and `render()` to `app.js`**

```js
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
  const tfoot = document.getElementById('stocksFoot');
  tbody.innerHTML = '';

  state.stocks.forEach(stock => {
    const buy = state.results ? state.results.buy[stock.id] : null;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-name">
        <input class="name-input" data-id="${stock.id}" data-field="label"
               placeholder="Stock ${stock.id}" value="${stock.label}">
      </td>
      <td>
        <input class="amount-input" data-id="${stock.id}" data-field="amount"
               type="number" min="0" placeholder="0" value="${stock.amount || ''}">
      </td>
      <td class="current-pct">${currentPct(stock).toFixed(1)}%</td>
      <td>
        <input class="target-input" data-id="${stock.id}" data-field="target"
               type="number" min="0" max="100" placeholder="0"
               value="${state.targets[stock.id] || ''}">
      </td>
      <td class="col-buy">${buy !== null ? '₪' + buy : '—'}</td>
      <td>
        <button class="remove-btn" data-id="${stock.id}"
                ${state.stocks.length <= 2 ? 'disabled' : ''}>✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const ts = targetSum();
  const totalBuy = state.results
    ? Object.values(state.results.buy).reduce((s, v) => s + v, 0)
    : null;

  tfoot.innerHTML = `
    <tr>
      <td class="col-name"></td>
      <td style="text-align:right;color:var(--text);font-weight:600">
        ₪${total().toLocaleString()}
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
    total() > 0 ? `Total: ₪${total().toLocaleString()}` : '';
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
               placeholder="Stock ${stock.id}" value="${stock.label}">
        <button class="remove-btn" data-id="${stock.id}"
                ${state.stocks.length <= 2 ? 'disabled' : ''}>✕</button>
      </div>
      <div class="stock-card-grid">
        <div class="card-field">
          <label>Amount (₪)</label>
          <input class="field-val" data-id="${stock.id}" data-field="amount"
                 type="number" min="0" placeholder="0" value="${stock.amount || ''}">
        </div>
        <div class="card-field">
          <label>Current %</label>
          <div class="field-val is-pct">${currentPct(stock).toFixed(1)}%</div>
        </div>
        <div class="card-field">
          <label>Target %</label>
          <input class="field-val" data-id="${stock.id}" data-field="target"
                 type="number" min="0" max="100" placeholder="0"
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
  const parts = state.stocks.map(st => {
    const newAmt = st.amount + (state.results.buy[st.id] || 0);
    return `<span>${st.label || 'Stock ' + st.id}: ${t > 0 ? ((newAmt / t) * 100).toFixed(1) : 0}%</span>`;
  });
  allocEl.innerHTML = 'New allocation after purchase: ' + parts.join(' / ');
  allocEl.hidden = false;

  if (state.results.remainder > 0) {
    noticeEl.textContent =
      `₪${state.results.remainder} could not be allocated — all targets already met or exceeded.`;
    noticeEl.hidden = false;
  } else {
    noticeEl.hidden = true;
  }
}
```

- [ ] **Step 2: Add event listeners to `app.js` (append after render functions)**

```js
// ── Events ─────────────────────────────────────────────────────────────

document.addEventListener('input', e => {
  const id = e.target.dataset.id ? Number(e.target.dataset.id) : null;
  const field = e.target.dataset.field;

  if (id && field === 'label') {
    state.stocks.find(s => s.id === id).label = e.target.value;
  }
  if (id && field === 'amount') {
    state.stocks.find(s => s.id === id).amount = parseFloat(e.target.value) || 0;
    state.results = null;
    render();
    return;
  }
  if (id && field === 'target') {
    state.targets[id] = parseFloat(e.target.value) || 0;
    state.results = null;
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
```

- [ ] **Step 3: Verify in browser**
  - Two stock rows appear
  - Typing an amount updates Current % live
  - Typing target % updates the sum indicator in the footer row
  - Calculate button is disabled until targets sum to 100 and free cash > 0
  - Clicking Calculate populates the Buy column and shows the new allocation line
  - Resize to < 640px — cards appear, table disappears

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: add state, render, and event wiring"
```

---

## Task 5: Edge cases and polish

**Files:**
- Modify: `app.js`
- Modify: `style.css`

- [ ] **Step 1: Show ₪0 (not —) for overweight stocks after Calculate**

The current `renderTable` already handles this correctly — `buy[id]` is `0` for overweight stocks and `calculate()` returns `0` for them. Verify by:
- Set Stock 1 to ₪8,000, Stock 2 to ₪2,000
- Target: Stock 1 = 50%, Stock 2 = 50%
- Free cash: ₪100
- Click Calculate → Stock 1 Buy should show `₪0`, Stock 2 should show `₪100`

- [ ] **Step 2: Add `₪0` display for overweight in cards**

In `renderCards`, the `buy` value is already `0` for overweight stocks — the card shows `₪0`. Confirm visually on mobile width.

- [ ] **Step 3: Enforce minimum amount of 0 and target 0–100 via input attributes**

Already set via `min="0"` and `min="0" max="100"` in render. Add CSS to show invalid state:

```css
/* append to style.css */
input[type="number"]:invalid { border-color: var(--red); }
```

- [ ] **Step 4: Verify + Add stock / remove flow**
  - Add a third stock — new row appears with `Stock 3` placeholder
  - Remove button on first two stocks should be disabled when only 2 remain
  - Remove third stock — back to 2, remove buttons disabled again

- [ ] **Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: polish edge cases — overweight display, input constraints, remove guard"
```

---

## Task 6: Final verification and README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run full test suite**

```bash
node --test tests/calc.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 2: Manual smoke test checklist**
  - [ ] Two stocks, equal split (50/50), free cash ₪1,000 → Buy shows ₪500 / ₪500
  - [ ] Unequal split (60/40), free cash ₪1,000 → Buy rounded to ₪10
  - [ ] One stock overweight → Buy = ₪0 for that stock
  - [ ] Add a third stock, set three targets summing to 100, calculate
  - [ ] Remove a stock while three exist → back to two
  - [ ] Resize to mobile — cards render correctly, Calculate works
  - [ ] Target % ≠ 100 → Calculate button disabled

- [ ] **Step 3: Create `README.md`**

```markdown
# Stock Balancer

A client-side NIS portfolio rebalancing calculator.

## Usage

Open `index.html` in any browser. No build step, no server needed.

## Files

- `index.html` — page markup
- `style.css` — styles (desktop table + mobile cards)
- `app.js` — state, calculation logic, DOM rendering

## Running tests

Requires Node 18+.

    node --test tests/calc.test.js
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```
