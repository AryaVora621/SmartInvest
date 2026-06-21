'use strict';

// All bot configuration comes from the environment so the same code runs on a VPS or a
// home desktop. Only the bot token is required.
const path = require('path');
const fs = require('fs');

// Tiny zero-dependency .env loader: if apps/bot/.env exists, fill any vars not already set
// in the real environment (which always wins). Avoids pulling in dotenv just for this.
(function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch { /* best-effort */ }
})();

const config = {
  token: process.env.TELEGRAM_BOT_TOKEN || '',
  // Default research model — haiku is cheapest on the user's Claude subscription.
  researchModel: process.env.RESEARCH_MODEL || 'haiku',
  // Local hour (0-23) at which the daily AI digest is sent.
  dailyHour: Number.isFinite(+process.env.DAILY_HOUR) ? +process.env.DAILY_HOUR : 8,
  // Where the per-chat watchlist is persisted.
  dataDir: process.env.BOT_DATA_DIR || path.join(__dirname, '..', 'data'),
  // Telegram long-poll timeout (seconds).
  pollTimeout: Number.isFinite(+process.env.POLL_TIMEOUT) ? +process.env.POLL_TIMEOUT : 30,
};

module.exports = { config };
