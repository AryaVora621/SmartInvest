'use strict';

// Two scheduled jobs, driven by a 5-minute tick:
//   - hourly: market snapshot + watchlist movers (cheap, no AI tokens)
//   - daily:  an AI research digest per watchlist symbol, sent once at config.dailyHour
// Both broadcast to every chat that has a non-empty watchlist.
const { config } = require('./config');
const tg = require('./telegram');
const yahoo = require('./yahoo');
const store = require('./store');
const commands = require('./commands');
const fmt = require('./format');

let lastHourlyHour = -1;
let lastDailyDate = '';

async function chatsWithWatchlist() {
  return store.allChatIds()
    .map(id => ({ id, wl: store.getWatchlist(id) }))
    .filter(c => c.wl.length);
}

async function runHourly() {
  const [indices, chats] = await Promise.all([yahoo.getIndices(), chatsWithWatchlist()]);
  for (const { id, wl } of chats) {
    const quotes = await yahoo.getQuotes(wl);
    const msg = `Hourly update\n\n${fmt.indicesBlock(indices)}\n\n${fmt.moversBlock(quotes)}`;
    await tg.sendMessage(id, msg);
  }
}

async function runDaily() {
  const chats = await chatsWithWatchlist();
  for (const { id, wl } of chats) {
    await tg.sendMessage(id, `Daily AI digest for ${wl.length} stock(s). Generating…`);
    for (const sym of wl) {
      try {
        const { text, provider } = await commands.research(sym, config.researchModel);
        // Keep each digest entry concise — first ~1500 chars.
        const trimmed = text.length > 1500 ? text.slice(0, 1500) + '…' : text;
        await tg.sendMessage(id, `${sym} (${provider})\n\n${trimmed}`);
      } catch (e) {
        await tg.sendMessage(id, `${sym}: research failed (${e.message}).`);
      }
    }
  }
}

async function tick() {
  const now = new Date();
  const hour = now.getHours();
  const date = now.toDateString();

  if (hour !== lastHourlyHour) {
    lastHourlyHour = hour;
    try { await runHourly(); } catch (e) { console.error('hourly job failed:', e.message); }
  }
  if (hour === config.dailyHour && date !== lastDailyDate) {
    lastDailyDate = date;
    try { await runDaily(); } catch (e) { console.error('daily job failed:', e.message); }
  }
}

function start() {
  // Seed the markers so the bot doesn't fire a burst the moment it boots.
  const now = new Date();
  lastHourlyHour = now.getHours();
  if (now.getHours() === config.dailyHour) lastDailyDate = now.toDateString();
  setInterval(() => { tick().catch(e => console.error('tick error:', e.message)); }, 5 * 60 * 1000);
}

module.exports = { start, runHourly, runDaily };
