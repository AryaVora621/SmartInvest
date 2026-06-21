'use strict';

const { runResearch } = require('@smartinvest/ai-engine');
const { config } = require('./config');
const tg = require('./telegram');
const yahoo = require('./yahoo');
const store = require('./store');
const alerts = require('./alerts');
const fmt = require('./format');

const SYMBOL_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const HELP = [
  'SmartInvest US-market bot. Commands:',
  '',
  '/add <SYM>       add a ticker to this chat\'s watchlist',
  '/remove <SYM>    remove a ticker',
  '/watchlist       prices + day move for your watchlist',
  '/alerts          which alert rules currently fire',
  '/research <SYM>  AI research report (add "sonnet" for a deeper run)',
  '/help            show this message',
  '',
  'Scheduled: hourly market + movers, daily AI digest.',
].join('\n');

// Run the AI engine and collect the streamed text.
async function research(symbol, model) {
  let buf = '';
  const r = await runResearch(symbol, {}, (chunk) => { buf += chunk; }, { model });
  const text = (buf || r.text || '').trim();
  return { text: text || '(no content returned)', provider: r.provider };
}

async function handle(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  if (!text.startsWith('/')) return;

  store.ensureChat(chatId); // register the chat for scheduled broadcasts
  const [cmdRaw, ...args] = text.split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase(); // strip @botname in groups
  const arg = (args[0] || '').toUpperCase();

  switch (cmd) {
    case '/start':
    case '/help':
      return tg.sendMessage(chatId, HELP);

    case '/add': {
      if (!SYMBOL_RE.test(arg)) return tg.sendMessage(chatId, 'Usage: /add AAPL');
      const added = store.addSymbol(chatId, arg);
      return tg.sendMessage(chatId, added ? `Added ${arg} to your watchlist.` : `${arg} is already on your watchlist.`);
    }

    case '/remove': {
      if (!SYMBOL_RE.test(arg)) return tg.sendMessage(chatId, 'Usage: /remove AAPL');
      const removed = store.removeSymbol(chatId, arg);
      return tg.sendMessage(chatId, removed ? `Removed ${arg}.` : `${arg} wasn't on your watchlist.`);
    }

    case '/watchlist': {
      const wl = store.getWatchlist(chatId);
      if (!wl.length) return tg.sendMessage(chatId, 'Your watchlist is empty. Add one with /add AAPL');
      const quotes = await yahoo.getQuotes(wl);
      return tg.sendMessage(chatId, fmt.moversBlock(quotes));
    }

    case '/alerts': {
      const wl = store.getWatchlist(chatId);
      if (!wl.length) return tg.sendMessage(chatId, 'Your watchlist is empty. Add one with /add AAPL');
      const quotes = await yahoo.getQuotes(wl);
      const hits = alerts.evaluate(quotes);
      return tg.sendMessage(chatId, hits.length ? ['Alerts firing now:', ...hits.map(h => '• ' + h)].join('\n') : 'No alert rules are firing right now.');
    }

    case '/research': {
      if (!SYMBOL_RE.test(arg)) return tg.sendMessage(chatId, 'Usage: /research AAPL  (add "sonnet" for a deeper run)');
      const model = (args[1] || '').toLowerCase() === 'sonnet' ? 'sonnet' : config.researchModel;
      await tg.sendMessage(chatId, `Researching ${arg} (${model})… this can take a minute.`);
      try {
        const { text, provider } = await research(arg, model);
        return tg.sendMessage(chatId, `${arg} — research (${provider})\n\n${text}`);
      } catch (e) {
        return tg.sendMessage(chatId, `Research failed for ${arg}: ${e.message}`);
      }
    }

    default:
      return tg.sendMessage(chatId, `Unknown command. ${HELP}`);
  }
}

module.exports = { handle, research, HELP };
