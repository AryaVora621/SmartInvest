'use strict';

// Entry point: long-poll Telegram for commands and run the scheduled jobs.
const { config } = require('./src/config');
const tg = require('./src/telegram');
const store = require('./src/store');
const commands = require('./src/commands');
const scheduler = require('./src/scheduler');

async function main() {
  if (!config.token) {
    console.error('TELEGRAM_BOT_TOKEN is not set. Copy apps/bot/.env.example to apps/bot/.env and set the token (or export it), then `npm start -w @smartinvest/bot`.');
    process.exit(1);
  }

  store.load();
  scheduler.start();
  console.log(`SmartInvest bot started. Daily digest at ${config.dailyHour}:00 local, model "${config.researchModel}".`);

  let offset = 0;
  // Long-poll loop. getUpdates already swallows transient errors and returns [].
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const updates = await tg.getUpdates(offset);
    for (const u of updates) {
      offset = u.update_id + 1;
      const message = u.message || u.channel_post;
      if (!message || !message.text) continue;
      try {
        await commands.handle(message);
      } catch (e) {
        console.error('command handler error:', e.message);
        try { await tg.sendMessage(message.chat.id, `Something went wrong: ${e.message}`); } catch {}
      }
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
