// logic added in Tasks 2 and 4

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
    const capped = Math.min(Math.max(0, rawBuy[st.id]), freeCash);
    buy[st.id] = Math.floor(capped / 10) * 10;
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
