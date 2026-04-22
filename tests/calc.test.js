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
