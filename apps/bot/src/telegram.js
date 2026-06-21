'use strict';

// Minimal Telegram Bot API client over the global fetch (Node 18+). No SDK dependency.
const { config } = require('./config');

const API = () => `https://api.telegram.org/bot${config.token}`;
const MAX_LEN = 4096; // Telegram's per-message character cap.

async function call(method, params) {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
  return data.result;
}

// Long-poll for updates. Returns [] on transient network errors so the loop keeps running.
async function getUpdates(offset) {
  try {
    const res = await fetch(`${API()}/getUpdates?timeout=${config.pollTimeout}&offset=${offset}`, {
      // a touch longer than the server-side long-poll, so we don't abort mid-wait
      signal: AbortSignal.timeout((config.pollTimeout + 10) * 1000),
    });
    const data = await res.json();
    return data.ok ? data.result : [];
  } catch (e) {
    if (e.name !== 'TimeoutError') console.error('getUpdates error:', e.message);
    return [];
  }
}

// Send text, splitting on line boundaries to respect the length cap.
async function sendMessage(chatId, text) {
  const chunks = splitText(String(text || '').trim() || '(empty)', MAX_LEN);
  for (const chunk of chunks) {
    try {
      await call('sendMessage', { chat_id: chatId, text: chunk, disable_web_page_preview: true });
    } catch (e) {
      console.error(`sendMessage to ${chatId} failed:`, e.message);
    }
  }
}

function splitText(text, max) {
  if (text.length <= max) return [text];
  const out = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + line + '\n').length > max) {
      if (buf) out.push(buf.trimEnd());
      // a single over-long line gets hard-split
      if (line.length > max) {
        for (let i = 0; i < line.length; i += max) out.push(line.slice(i, i + max));
        buf = '';
      } else {
        buf = line + '\n';
      }
    } else {
      buf += line + '\n';
    }
  }
  if (buf.trim()) out.push(buf.trimEnd());
  return out;
}

module.exports = { call, getUpdates, sendMessage };
