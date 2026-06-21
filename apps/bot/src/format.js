'use strict';

// Plain-text message formatting (no Markdown, to avoid Telegram parse errors on tickers).
function sign(pct) {
  const s = pct >= 0 ? '+' : '';
  return `${s}${pct.toFixed(2)}%`;
}

function quoteLine(q) {
  return `${q.symbol.padEnd(6)} $${q.price.toFixed(2).padStart(9)}  ${sign(q.changePct)}`;
}

function indicesBlock(indices) {
  if (!indices.length) return 'US indices unavailable right now.';
  return ['US Markets', ...indices.map(i => `  ${i.label.padEnd(10)} ${sign(i.changePct)}`)].join('\n');
}

// Watchlist quotes sorted by day move, biggest gainers first.
function moversBlock(quotes) {
  const valid = quotes.filter(q => q && q.price != null).sort((a, b) => b.changePct - a.changePct);
  if (!valid.length) return 'No watchlist symbols with quotes.';
  return ['Watchlist (by day move)', ...valid.map(q => '  ' + quoteLine(q))].join('\n');
}

module.exports = { sign, quoteLine, indicesBlock, moversBlock };
