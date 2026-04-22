// Run with: node --test tests/calc.test.js  (Node 18+)
const { test } = require('node:test');
const assert = require('node:assert/strict');

// KEEP IN SYNC WITH app.js — no module system in the browser build (no module system in the browser build)
function calculate(stocks, targets, freeCash) {
  const total = stocks.reduce((s, st) => s + st.amount, 0);
  const grandTotal = total + freeCash;
  const rawBuy = {};
  stocks.forEach(st => {
    rawBuy[st.id] = (targets[st.id] / 100) * grandTotal - st.amount;
  });
  const buy = {};
  stocks.forEach(st => {
    const capped = Math.min(Math.max(0, rawBuy[st.id]), freeCash);
    buy[st.id] = Math.floor(capped / 10) * 10;
  });
  const allocated = Object.values(buy).reduce((s, v) => s + v, 0);
  let remainder = freeCash - allocated;
  if (remainder > 0) {
    let bestId = null, bestGap = -Infinity;
    stocks.forEach(st => {
      if (rawBuy[st.id] > bestGap) { bestGap = rawBuy[st.id]; bestId = st.id; }
    });
    if (bestId !== null && bestGap > 0) {
      const toAdd = Math.floor(remainder / 10) * 10;
      buy[bestId] += toAdd;
      remainder -= toAdd;
    }
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
  const { buy, remainder } = calculate(stocks, targets, 1000);
  assert.equal(buy[1], 0);
  assert.ok(buy[2] > 0);
  assert.equal(buy[2], 1000);
  assert.equal(remainder, 0);
});

test('remainder goes to most-underweight stock', () => {
  const stocks = [{ id: 1, amount: 0 }, { id: 2, amount: 0 }];
  const targets = { 1: 50, 2: 50 };
  const { buy, remainder } = calculate(stocks, targets, 15);
  assert.equal(buy[1], 10);
  assert.equal(buy[2], 0);
  assert.equal(remainder, 5);
});

test('stock1 overweight receives zero; stock2 underweight absorbs all free cash', () => {
  const stocks = [{ id: 1, amount: 8000 }, { id: 2, amount: 2000 }];
  const targets = { 1: 50, 2: 50 };
  const { buy, remainder } = calculate(stocks, targets, 100);
  assert.equal(buy[1], 0);
  assert.equal(buy[2], 100);
  assert.equal(remainder, 0);
});

test('rounds each allocation down to nearest 10', () => {
  const stocks = [{ id: 1, amount: 0 }, { id: 2, amount: 0 }];
  const targets = { 1: 33, 2: 67 };
  const { buy } = calculate(stocks, targets, 100);
  assert.equal(buy[1] % 10, 0);
  assert.equal(buy[2] % 10, 0);
});
