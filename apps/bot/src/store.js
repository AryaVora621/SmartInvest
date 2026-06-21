'use strict';

// Per-chat watchlists, persisted to a single JSON file. Keyed by chat id so the bot works
// in more than one chat. Synchronous fs is fine here — the file is tiny and writes are rare.
const fs = require('fs');
const path = require('path');
const { config } = require('./config');

const FILE = path.join(config.dataDir, 'watchlist.json');

let state = { chats: {} }; // { chats: { [chatId]: { watchlist: ["AAPL", ...] } } }

function load() {
  try {
    if (fs.existsSync(FILE)) state = JSON.parse(fs.readFileSync(FILE, 'utf8')) || { chats: {} };
  } catch (e) {
    console.error('store load failed, starting empty:', e.message);
    state = { chats: {} };
  }
  if (!state.chats) state.chats = {};
}

function save() {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('store save failed:', e.message);
  }
}

function ensureChat(chatId) {
  const key = String(chatId);
  if (!state.chats[key]) {
    state.chats[key] = { watchlist: [] };
    save();
  }
  return state.chats[key];
}

function getWatchlist(chatId) {
  return ensureChat(chatId).watchlist.slice();
}

function addSymbol(chatId, symbol) {
  const chat = ensureChat(chatId);
  const sym = symbol.toUpperCase();
  if (chat.watchlist.includes(sym)) return false;
  chat.watchlist.push(sym);
  save();
  return true;
}

function removeSymbol(chatId, symbol) {
  const chat = ensureChat(chatId);
  const sym = symbol.toUpperCase();
  const before = chat.watchlist.length;
  chat.watchlist = chat.watchlist.filter(s => s !== sym);
  if (chat.watchlist.length !== before) { save(); return true; }
  return false;
}

// Chats that have ever interacted (so scheduled jobs know where to broadcast).
function allChatIds() {
  return Object.keys(state.chats);
}

module.exports = { load, ensureChat, getWatchlist, addSymbol, removeSymbol, allChatIds };
