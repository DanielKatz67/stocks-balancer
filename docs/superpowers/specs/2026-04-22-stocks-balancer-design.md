# Stock Balancer — Design Spec

**Date:** 2026-04-22

## Overview

A client-side web calculator that helps users decide how to split a free cash amount across stocks to move their portfolio toward a desired percentage allocation. No backend, no auth, no persistence — pure calculator.

---

## Architecture

Three static files, no build step, no dependencies:

```
index.html    ← markup only
style.css     ← all styles, including responsive breakpoints
app.js        ← state object, calculation logic, DOM rendering
```

Deployed statically anywhere (GitHub Pages, Netlify, S3, or opened locally).

---

## Data Model

All state lives in a single JS object in memory:

```js
state = {
  stocks: [
    { id: 1, label: "Stock 1", amount: 12500 },
    { id: 2, label: "Stock 2", amount: 7500 }
  ],
  targets: { 1: 60, 2: 40 },  // must sum to 100
  freeCash: 1000,
  results: null                // populated after Calculate; null hides Buy column
}
```

**Derived values (computed on the fly, never stored):**
- `total` = sum of all `amount`
- `currentPct[i]` = `amount[i] / total * 100`
- `targetSum` = sum of all `targets[i]`

---

## Calculation Logic

```
desired[i] = (targets[i] / 100) * (total + freeCash)
rawBuy[i]  = desired[i] - amount[i]
buy[i]     = max(0, floor(rawBuy[i] / 10) * 10)
```

Rules:
- **Never sell:** if `rawBuy[i] < 0` (stock overweight), `buy[i] = 0`
- **Round down to ₪10:** each allocation is a multiple of 10
- **Remainder handling:** after rounding, any unallocated cash goes to the stock with the largest gap between current amount and desired amount. If all stocks are overweight, show a notice: *"₪X could not be allocated — all targets already met or exceeded."*

---

## UI & Layout

### Desktop (≥ 640px)

Full table layout:

| Stock | Amount (₪) | Current % | Target % | Buy (₪) | |
|---|---|---|---|---|---|
| Optional name input | Editable number | Read-only, live | Editable number | Result, lit up after Calculate | ✕ |

Footer row: totals for Amount, Current %, Target % sum indicator, Buy total.

Below table:
- `+ Add stock` link
- Free cash input (₪)
- Calculate button (disabled until `targetSum === 100` and `freeCash > 0`)
- After Calculate: *"New allocation after purchase: X% / Y% / ..."*

### Mobile (< 640px)

Table hidden. Each stock renders as a card:

```
┌─────────────────────────┐
│ Stock 1              ✕  │
│ Amount (₪)  Current %   │
│ 12,500      62.5%       │
│ Target %    Buy (₪)     │
│ 60%         ₪640        │
└─────────────────────────┘
```

Footer: same Free cash input + Calculate button below all cards.

### Visual Style (Theme C — Finance/Frost)

- Background: dark navy (`#0a1520`)
- Accent: sky blue (`#0ea5e9`, `#38bdf8`)
- Buy column: highlighted with subtle blue background (`rgba(14,165,233,0.08)`) and blue left border
- Calculate button: solid sky blue, disabled state muted
- Font: system sans-serif
- Currency: ₪ (NIS) throughout

---

## Interactions & Validation

| Event | Behavior |
|---|---|
| Type in Amount | Recalculate Current % live for all rows |
| Type in Target % | Update `targetSum` indicator live |
| `targetSum === 100` + `freeCash > 0` | Enable Calculate button |
| Click Calculate | Run calculation, populate Buy column |
| Click `+ Add stock` | Append new row/card with next generic label (Stock 3, etc.) |
| Click ✕ | Remove stock; minimum 2 stocks enforced |
| Stock name | Optional free text; blank shows placeholder "Stock N" |

---

## Edge Cases

| Case | Behavior |
|---|---|
| Stock overweight (current > target) | `buy = 0`, shown as `₪0` in Buy column |
| All stocks overweight | Notice: *"₪X could not be allocated"* |
| Rounding leaves remainder | Remainder goes to most-underweight stock |
| Only 2 stocks, try to remove | ✕ button disabled at 2 stocks |
| Free cash = 0 | Calculate button disabled |
| Target % don't sum to 100 | Calculate button disabled |
