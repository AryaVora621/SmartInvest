'use strict';

// Self-contained alert rules over a set of live quotes. The web app's per-user alert configs
// live in the browser and aren't reachable here, so the bot applies a sensible default rule
// set to every watchlist symbol.
function evaluate(quotes) {
  const hits = [];
  for (const q of quotes) {
    if (!q || q.price == null) continue;
    const nearHigh = q.high52 && q.price >= 0.95 * q.high52;
    const downFromHigh = q.high52 && q.price <= 0.85 * q.high52;
    const bigUp = q.changePct >= 5;
    const bigDown = q.changePct <= -5;
    if (nearHigh) hits.push(`${q.symbol}: within 5% of its 52-week high ($${q.high52.toFixed(2)}).`);
    if (downFromHigh) hits.push(`${q.symbol}: 15%+ below its 52-week high ($${q.high52.toFixed(2)}).`);
    if (bigUp) hits.push(`${q.symbol}: up ${q.changePct.toFixed(1)}% today.`);
    if (bigDown) hits.push(`${q.symbol}: down ${q.changePct.toFixed(1)}% today.`);
  }
  return hits;
}

module.exports = { evaluate };
