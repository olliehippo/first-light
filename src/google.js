'use strict';
// Google sign-in (OAuth 2.0 for desktop apps: PKCE + loopback redirect), Gmail and Google Calendar.
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly'
];

const endpoints = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  revoke: 'https://oauth2.googleapis.com/revoke',
  userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
  gmail: 'https://gmail.googleapis.com/gmail/v1/users/me',
  calendar: 'https://www.googleapis.com/calendar/v3'
};

// Test hook: point every Google endpoint at a local mock server
if (process.env.MM_GOOGLE_BASE) {
  const B = process.env.MM_GOOGLE_BASE;
  Object.assign(endpoints, { auth: B + '/auth', token: B + '/token', revoke: B + '/revoke', userinfo: B + '/userinfo', gmail: B + '/gmail', calendar: B + '/cal' });
}

function loadClient() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'google-client.json'), 'utf8'));
    const c = j.installed || j;
    if (c.client_id) return { id: c.client_id, secret: c.client_secret || '' };
  } catch (e) {}
  return null;
}

const b64url = buf => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const PAGE = (title, body) => `<!doctype html><meta charset="utf-8"><title>${title}</title>
<body style="font:16px -apple-system,BlinkMacSystemFont,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#f9f9fa;color:#1d1d1f">
<div style="text-align:center;max-width:420px"><h1 style="font-size:22px;font-weight:650">${title}</h1><p style="color:#6e6e73">${body}</p></div></body>`;

/**
 * Runs the browser sign-in. `openBrowser(url)` opens the system browser.
 * Resolves with { tokens, profile }.
 */
function signIn(openBrowser, { loginHint, timeoutMs = 5 * 60 * 1000 } = {}) {
  const client = loadClient();
  if (!client) return Promise.reject(new Error('Google sign-in is not set up in this build.'));
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));

  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); try { server.close(); } catch (e) {} err ? reject(err) : resolve(val); };
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      if (u.searchParams.get('state') !== state) { res.writeHead(400, { 'content-type': 'text/html' }); res.end(PAGE('Sign-in failed', 'This sign-in link has expired. Go back to First Light and try again.')); return; }
      const err = u.searchParams.get('error');
      if (err) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(PAGE('Sign-in cancelled', 'You can close this tab and go back to First Light.'));
        finish(new Error(err === 'access_denied' ? 'Google sign-in was cancelled.' : `Google sign-in failed (${err}).`));
        return;
      }
      const code = u.searchParams.get('code');
      try {
        const redirect = `http://127.0.0.1:${server.address().port}/callback`;
        const tokens = await tokenRequest({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirect, client_id: client.id, client_secret: client.secret });
        const granted = String(tokens.scope || '');
        const missing = [];
        if (!granted.includes('gmail.readonly')) missing.push('email');
        if (!granted.includes('calendar.readonly')) missing.push('calendar');
        const profile = await userInfo(tokens.access_token);
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(PAGE('You\'re signed in', `${escapeHtml(profile.email)} is connected. You can close this tab and go back to First Light.`));
        finish(null, { tokens: { ...tokens, obtained_at: Date.now() }, profile, missing });
      } catch (e) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(PAGE('Sign-in failed', escapeHtml(e.message)));
        finish(e);
      }
    });
    const timer = setTimeout(() => finish(new Error('Google sign-in timed out. Try again.')), timeoutMs);
    server.on('error', e => finish(e));
    server.listen(0, '127.0.0.1', () => {
      const redirect = `http://127.0.0.1:${server.address().port}/callback`;
      const q = new URLSearchParams({
        client_id: client.id, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '),
        code_challenge: challenge, code_challenge_method: 'S256', state,
        access_type: 'offline', prompt: 'consent select_account', include_granted_scopes: 'true'
      });
      if (loginHint) q.set('login_hint', loginHint);
      openBrowser(`${endpoints.auth}?${q}`);
    });
  });
}

const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function tokenRequest(params) {
  const res = await fetch(endpoints.token, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(j.error === 'invalid_grant' ? 'Google sign-in has expired for this account. Sign in again.' : `Google refused the sign-in (${j.error_description || j.error || res.status}).`);
    e.code = j.error; throw e;
  }
  return j;
}

async function userInfo(accessToken) {
  const res = await fetch(endpoints.userinfo, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('Could not read the Google profile.');
  const j = await res.json();
  return { email: j.email, name: j.name || j.given_name || '', picture: j.picture || '', sub: j.sub };
}

/** Keeps an access token fresh. `save(tokens)` persists refreshed tokens. */
async function accessToken(tokens, save) {
  if (tokens.access_token && tokens.obtained_at && Date.now() < tokens.obtained_at + (tokens.expires_in - 120) * 1000) return tokens.access_token;
  if (!tokens.refresh_token) { const e = new Error('Google sign-in has expired for this account. Sign in again.'); e.code = 'invalid_grant'; throw e; }
  const client = loadClient();
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: client.id, client_secret: client.secret });
  Object.assign(tokens, t, { obtained_at: Date.now() });
  if (save) save(tokens);
  return tokens.access_token;
}

async function api(token, url) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) { const e = new Error('Google sign-in has expired for this account. Sign in again.'); e.code = 'invalid_grant'; throw e; }
  if (res.status === 403) {
    const j = await res.json().catch(() => ({}));
    const m = (j.error && j.error.message) || '';
    throw new Error(/has not been used|disabled/i.test(m) ? 'The Gmail or Calendar API is turned off in the Google Cloud project.' : 'Google did not allow access. Sign in again and tick every permission.');
  }
  if (!res.ok) throw new Error(`Google returned ${res.status}.`);
  return res.json();
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch(() => null); } }));
  return out;
}

const header = (m, name) => ((m.payload && m.payload.headers) || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
function parseFrom(v) {
  const m = String(v).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), address: m[2].trim() } : { name: '', address: String(v).trim() };
}
const decodeEntities = s => String(s || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function gmailInbox(token, limit = 25) {
  const list = await api(token, `${endpoints.gmail}/messages?labelIds=INBOX&maxResults=${limit}`);
  const ids = (list.messages || []).map(m => m.id);
  let unread = 0;
  try { const lab = await api(token, `${endpoints.gmail}/labels/INBOX`); unread = lab.messagesUnread || 0; } catch (e) {}
  const q = 'format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID';
  const msgs = await pool(ids, 8, id => api(token, `${endpoints.gmail}/messages/${id}?${q}`));
  const messages = msgs.filter(Boolean).map(m => ({
    uid: m.id, threadId: m.threadId,
    messageId: header(m, 'Message-ID'),
    from: parseFrom(header(m, 'From')),
    subject: header(m, 'Subject') || '(no subject)',
    date: new Date(Number(m.internalDate) || Date.parse(header(m, 'Date')) || Date.now()).toISOString(),
    unread: (m.labelIds || []).includes('UNREAD'),
    flagged: (m.labelIds || []).includes('STARRED'),
    important: (m.labelIds || []).includes('IMPORTANT') || (m.labelIds || []).includes('STARRED'),
    bulk: (m.labelIds || []).some(l => ['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS', 'CATEGORY_UPDATES'].includes(l)) && !(m.labelIds || []).includes('STARRED'),
    preview: decodeEntities(m.snippet).slice(0, 220)
  }));
  return { unread, messages };
}

async function calendarList(token) {
  const j = await api(token, `${endpoints.calendar}/users/me/calendarList?minAccessRole=reader&maxResults=100`);
  return (j.items || []).filter(c => !c.deleted && !c.hidden).map(c => ({ id: c.id, name: c.summaryOverride || c.summary || c.id, color: c.backgroundColor || '#408cff', primary: !!c.primary, selected: c.selected !== false }));
}

async function calendarEvents(token, calId, from, to) {
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '100' });
  const j = await api(token, `${endpoints.calendar}/calendars/${encodeURIComponent(calId)}/events?${q}`);
  return (j.items || []).filter(e => e.status !== 'cancelled').filter(e => {
    const me = (e.attendees || []).find(a => a.self);
    return !(me && me.responseStatus === 'declined');
  }).map(e => {
    const allDay = !!(e.start && e.start.date);
    const start = allDay ? new Date(e.start.date + 'T00:00:00') : new Date(e.start.dateTime);
    const end = allDay ? new Date(e.end.date + 'T00:00:00') : new Date(e.end.dateTime);
    const video = ((e.conferenceData && e.conferenceData.entryPoints) || []).find(p => p.entryPointType === 'video');
    const join = e.hangoutLink || (video && video.uri) || findJoinUrl(`${e.location || ''} ${e.description || ''}`);
    return { uid: e.iCalUID || e.id, start: start.toISOString(), end: end.toISOString(), allDay, title: e.summary || 'Busy', location: e.location || (e.hangoutLink ? 'Google Meet' : ''), link: e.htmlLink || '', join: join || '' };
  });
}

function findJoinUrl(text) {
  const m = String(text || '').match(/https:\/\/[^\s<>"')]*(zoom\.us|teams\.microsoft\.com|teams\.live\.com|meet\.google\.com|webex\.com|whereby\.com|around\.co)[^\s<>"')]*/i);
  return m ? m[0].replace(/[.,;:!?]+$/, '') : '';
}

async function revoke(tokens) {
  const t = tokens.refresh_token || tokens.access_token;
  if (!t) return;
  try { await fetch(`${endpoints.revoke}?token=${encodeURIComponent(t)}`, { method: 'POST' }); } catch (e) {}
}

module.exports = { findJoinUrl, endpoints, SCOPES, loadClient, signIn, accessToken, gmailInbox, calendarList, calendarEvents, revoke, parseFrom };
