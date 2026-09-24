'use strict';
const { app, BrowserWindow, ipcMain, shell, safeStorage, Notification, powerMonitor, nativeTheme, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ical = require('node-ical');
const { DEFAULT_PREFS, EXAMPLE_WISHES, normalisePrefs, cleanPlan, PLAN_SYSTEM, planPrompt, feedSystemPrompt, buildFeedPrompt } = require('./prompt');
const feeds = require('./feeds');
const mail = require('./mail');
const google = require('./google');

app.setName("First Light");

/* ---------- storage ---------- */
const dataDir = () => app.getPath('userData');
const CONFIG = () => path.join(dataDir(), 'config.json');
const KEYFILE = () => path.join(dataDir(), 'api-key.bin');
const SECRETS = () => path.join(dataDir(), 'accounts');
const LEGACY_MAILFILE = () => path.join(dataDir(), 'mail-pass.bin');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}
function saveSecret(file, value) {
  if (!value) { try { fs.unlinkSync(file); } catch (e) {} return; }
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from('plain:' + value);
  fs.writeFileSync(file, buf, { mode: 0o600 });
}
function readSecret(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.slice(0, 6).toString() === 'plain:') return buf.slice(6).toString();
    return safeStorage.decryptString(buf);
  } catch (e) { return null; }
}
const saveKey = k => saveSecret(KEYFILE(), k);
const readKey = () => readSecret(KEYFILE());
const secretFile = id => path.join(SECRETS(), `${id}.bin`);
const newId = () => crypto.randomBytes(6).toString('hex');

const COLORS = ['#408cff', '#ff6659', '#36c374', '#a970ff', '#f5a524', '#1fb5c9'];
let cfg = null;

function validAccount(a) {
  if (!a || typeof a !== 'object' || !/^[a-f0-9]{12}$/.test(String(a.id))) return false;
  if (a.type === 'google') return !!a.email;
  if (a.type === 'imap') return !!(a.email && a.host);
  if (a.type === 'ical') return /^https:\/\//.test(a.url || '');
  return false;
}

function migrateFromOldName() {
  if (fs.existsSync(CONFIG())) return;
  const old = path.join(app.getPath('appData'), "Mark's Morning", 'config.json');
  const raw = readJSON(old, null);
  if (!raw) return;
  raw.migratedFrom = "Mark's Morning";
  writeJSON(CONFIG(), raw);
}

function loadConfig() {
  migrateFromOldName();
  const raw = readJSON(CONFIG(), {}) || {};
  cfg = {
    schema: 2,
    profile: raw.profile && raw.profile.email ? { name: String(raw.profile.name || ''), email: String(raw.profile.email), picture: String(raw.profile.picture || ''), via: raw.profile.via === 'google' ? 'google' : 'email' } : null,
    signedIn: !!raw.signedIn,
    model: typeof raw.model === 'string' ? raw.model : '',
    models: Array.isArray(raw.models) ? raw.models : [],
    prefs: normalisePrefs(raw.prefs),
    openAtLogin: raw.openAtLogin !== false,
    theme: ['system', 'light', 'dark'].includes(raw.theme) ? raw.theme : 'system',
    brief: raw.brief && Array.isArray(raw.brief.sections) ? raw.brief : null,
    accounts: Array.isArray(raw.accounts) && raw.schema === 2 ? raw.accounts.filter(validAccount) : [],
    engine: 'feeds',
    priority: raw.priority && typeof raw.priority === 'object' ? { msgs: Object.assign({}, raw.priority.msgs), senders: Object.assign({}, raw.priority.senders) } : { msgs: {}, senders: {} },
    todos: Array.isArray(raw.todos) ? raw.todos.filter(t => t && t.id && typeof t.text === 'string').slice(0, 500) : [],
    weather: raw.weather && Number.isFinite(raw.weather.lat) ? raw.weather : { name: 'London', lat: 51.5072, lon: -0.1276 }
  };
  if (raw.engine !== 'feeds' && !/haiku/i.test(cfg.model)) cfg.model = pickDefaultModel(cfg.models) || '';
  // migrate v1: one IMAP mailbox and one iCal link
  if (raw.schema !== 2) {
    if (raw.mail && raw.mail.host && raw.mail.user) {
      const pass = readSecret(LEGACY_MAILFILE());
      if (pass) {
        const a = { id: newId(), type: 'imap', email: raw.mail.user, host: raw.mail.host, port: raw.mail.port || 993, preset: raw.mail.preset || 'other', color: COLORS[0] };
        saveSecret(secretFile(a.id), pass); cfg.accounts.push(a);
      }
    }
    if (typeof raw.calendarUrl === 'string' && /^https:\/\//.test(raw.calendarUrl)) {
      cfg.accounts.push({ id: newId(), type: 'ical', url: raw.calendarUrl, name: 'Calendar', color: COLORS[1] });
    }
    try { fs.unlinkSync(LEGACY_MAILFILE()); } catch (e) {}
  }
  save();
}
const save = () => writeJSON(CONFIG(), cfg);
const nextColor = () => COLORS[cfg.accounts.length % COLORS.length];

/* ---------- dates ---------- */
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function todayRange() {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + 1); to.setMilliseconds(-1);
  return { from, to };
}

/* ---------- Anthropic API ---------- */
const API = process.env.MM_ANTHROPIC_BASE || 'https://api.anthropic.com/v1'; // override is for tests only
const headers = key => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' });
async function apiError(res) {
  let msg = `Anthropic API returned ${res.status}`;
  try { const j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
  if (res.status === 401) msg = 'That API key was not accepted. Check it at console.anthropic.com and paste it again.';
  if (res.status === 429) msg = 'The Anthropic API is rate limiting this key. It will try again shortly.';
  if (res.status === 402 || /credit balance|add funds|billing/i.test(msg)) msg = 'The Anthropic account has run out of credit. Add funds at platform.claude.com, then click Refresh.';
  return new Error(msg);
}
async function listModels(key) {
  const res = await fetch(`${API}/models?limit=100`, { headers: headers(key) });
  if (!res.ok) throw await apiError(res);
  const j = await res.json();
  return (j.data || []).map(m => ({ id: m.id, name: m.display_name || m.id }));
}
const pickDefaultModel = models => (models.find(m => /haiku/i.test(m.id)) || models.find(m => /sonnet/i.test(m.id)) || models[0] || {}).id;

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const a = body.indexOf('{'), b = body.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('The brief came back in an unexpected format. It will try again shortly.');
  return JSON.parse(body.slice(a, b + 1));
}
function validateBrief(j) {
  if (!j || !Array.isArray(j.sections) || !j.sections.length) throw new Error('The brief came back without any headlines.');
  const item = i => i && typeof i.headline === 'string';
  j.sections = j.sections.filter(s => s && s.name && Array.isArray(s.items)).map(s => ({ name: String(s.name), items: s.items.filter(item) }));
  j.competitors = Array.isArray(j.competitors) ? j.competitors.filter(c => c && c.name) : [];
  j.top_stories = Array.isArray(j.top_stories) ? j.top_stories.filter(item).slice(0, 3) : [];
  j.key_dates = Array.isArray(j.key_dates) ? j.key_dates.filter(k => k && k.date && k.title) : [];
  j.strategic_thought = String(j.strategic_thought || '');
  return j;
}
async function generateBrief(key, model) {
  const today = localDate(), prefs = cfg.prefs;
  status.message = 'Collecting this morning\'s headlines...'; push();
  const { items, stats } = await feeds.gather(prefs);
  if (!items.length) throw new Error('No headlines could be collected. Check the internet connection, then click Refresh.');
  status.message = `Claude is reading ${items.length} headlines...`; push();
  const byId = Object.fromEntries(items.map(i => [i.id, i]));
  const body = { model, max_tokens: 4000, system: feedSystemPrompt(prefs), messages: [{ role: 'user', content: buildFeedPrompt(today, prefs, feeds.formatForPrompt(items)) }] };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3 * 60 * 1000);
  let res;
  try { res = await fetch(`${API}/messages`, { method: 'POST', headers: headers(key), signal: ctrl.signal, body: JSON.stringify(body) }); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'The brief took too long to prepare. It will try again shortly.' : 'Could not reach the Anthropic API. Check the internet connection.'); }
  finally { clearTimeout(timer); }
  if (!res.ok) throw await apiError(res);
  const resp = await res.json();
  const text = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const j = extractJSON(text);
  // Fill in real links, sources and dates from the collected headlines; drop anything Claude could not tie to one.
  const day = i => (i.time ? localDate(new Date(i.time)) : today);
  const fromId = (x, extra) => { const src = byId[String(x && x.id)]; return src ? { headline: String(x.headline || src.title).slice(0, 120), takeaway: String(x.takeaway || '').slice(0, 220), source: src.source, url: src.link, date: day(src), ...extra } : null; };
  const brief = validateBrief({
    strategic_thought: prefs.strategicThought ? String(j.strategic_thought || '') : '',
    sections: (Array.isArray(j.sections) ? j.sections : []).map(s => ({ name: String(s.name || ''), items: (Array.isArray(s.items) ? s.items : []).map(x => fromId(x)).filter(Boolean) })).filter(s => s.name),
    competitors: (Array.isArray(j.competitors) ? j.competitors : []).map(c => {
      const hit = c.id && byId[String(c.id)];
      return hit ? { name: String(c.name), status: 'news', ...fromId(c) } : { name: String(c.name), status: 'quiet', headline: 'No material news', takeaway: String(c.takeaway || 'Nothing in this morning\'s headlines.').slice(0, 220), source: '', url: '', date: '' };
    }),
    top_stories: (Array.isArray(j.top_stories) ? j.top_stories : []).map(x => fromId(x, { art: ['crypto', 'tokenise', 'ai'].includes(x.art) ? x.art : 'ai' })).filter(Boolean),
    key_dates: (Array.isArray(j.key_dates) ? j.key_dates : []).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k.date) && k.date >= today)
  });
  const u = resp.usage || {};
  Object.assign(brief, { generated: today, generated_at: new Date().toISOString(), model, engine: 'feeds',
    usage: { input: u.input_tokens || 0, output: u.output_tokens || 0 }, headlines: items.length, failedSources: stats.failed });
  return brief;
}

/* ---------- iCal ---------- */
const normaliseUrl = u => String(u || '').trim().replace(/^webcals?:\/\//i, 'https://');
async function fetchICS(url) {
  const res = await fetch(url, { headers: { 'user-agent': "First Light" } });
  if (!res.ok) throw new Error(`The calendar link returned ${res.status}. Copy the secret iCal address again.`);
  const text = await res.text();
  if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('That link is not an iCal calendar. Use the address ending in .ics.');
  const data = ical.sync.parseICS(text);
  const { from, to } = todayRange();
  const out = [];
  let calName = '';
  for (const ev of Object.values(data)) {
    if (ev && ev.type === 'VCALENDAR' && ev['WR-CALNAME']) calName = String(ev['WR-CALNAME']);
    if (!ev || ev.type !== 'VEVENT' || ev.recurrenceid) continue;
    if (ev.status && String(ev.status).toUpperCase() === 'CANCELLED') continue;
    let inst = [];
    try { inst = ical.expandRecurringEvent(ev, { from, to, expandOngoing: true }); } catch (e) { inst = []; }
    for (const i of inst) {
      const s = new Date(i.start), e = new Date(i.end || i.start);
      if (e < from || s > to) continue;
      const summary = typeof i.summary === 'object' && i.summary ? i.summary.val : i.summary;
      const loc = typeof ev.location === 'object' && ev.location ? ev.location.val : ev.location;
      const desc = typeof ev.description === 'object' && ev.description ? ev.description.val : ev.description;
      out.push({ uid: String(ev.uid || '') + '@' + s.toISOString(), start: s.toISOString(), end: e.toISOString(), allDay: !!i.isFullDay, title: String(summary || ev.summary || 'Busy'), location: loc ? String(loc) : '', join: google.findJoinUrl(`${loc || ''} ${desc || ''} ${ev.url || ''}`) });
    }
  }
  return { events: out, calName };
}

/* ---------- accounts: fetching ---------- */
const live = {};   // id -> { messages, unread, events, calendars, error, updated }
const L = id => (live[id] = live[id] || { messages: [], unread: 0, events: [], calendars: [], error: null, updated: null });

function googleTokens(a) {
  const raw = readSecret(secretFile(a.id));
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
async function googleToken(a) {
  const t = googleTokens(a);
  if (!t) { const e = new Error('Google sign-in has expired for this account. Sign in again.'); e.code = 'invalid_grant'; throw e; }
  return google.accessToken(t, nt => saveSecret(secretFile(a.id), JSON.stringify(nt)));
}

async function refreshAccountMail(a) {
  if (a.type === 'google' && a.mail !== false) {
    const tok = await googleToken(a);
    const r = await google.gmailInbox(tok);
    Object.assign(L(a.id), { messages: r.messages, unread: r.unread });
  } else if (a.type === 'imap') {
    const pass = readSecret(secretFile(a.id));
    if (!pass) throw new Error('The app password for this mailbox is missing. Remove the account and add it again.');
    const r = await mail.fetchInbox({ host: a.host, port: a.port || 993, secure: true, user: a.email, pass });
    Object.assign(L(a.id), { messages: r.messages, unread: r.unread });
  }
}
async function refreshAccountCalendar(a) {
  const { from, to } = todayRange();
  if (a.type === 'google' && a.calendar !== false) {
    const tok = await googleToken(a);
    const cals = await google.calendarList(tok);
    a.calendars = a.calendars || {};
    for (const c of cals) if (!(c.id in a.calendars)) a.calendars[c.id] = c.primary || c.selected;
    L(a.id).calendars = cals.map(c => ({ ...c, enabled: !!a.calendars[c.id] }));
    const on = cals.filter(c => a.calendars[c.id]);
    const lists = await Promise.all(on.map(c => google.calendarEvents(tok, c.id, from, to).then(evs => evs.map(e => ({ ...e, calendar: c.name, color: c.color }))).catch(() => [])));
    L(a.id).events = lists.flat();
  } else if (a.type === 'ical') {
    const r = await fetchICS(a.url);
    if (!a.nameSet && r.calName) a.name = r.calName;
    L(a.id).events = r.events.map(e => ({ ...e, calendar: a.name || 'Calendar', color: a.color }));
  }
}

let refreshing = false;
async function refreshAccounts(which = 'all') {
  if (refreshing || !cfg.signedIn) return;
  refreshing = true;
  await Promise.all(cfg.accounts.map(async a => {
    const st = L(a.id);
    try {
      if (which !== 'calendar') await refreshAccountMail(a);
      if (which !== 'mail') await refreshAccountCalendar(a);
      st.error = null; st.updated = new Date().toISOString();
    } catch (e) {
      st.error = e.message || String(e);
      if (e.code === 'invalid_grant') st.needsSignIn = true;
    }
  }));
  refreshing = false;
  save(); push();
}

// Priority: Gmail's own Important/Starred signal outside Promotions, Social, Forums and Updates.
// Other mailboxes: flagged mail, or unread mail that doesn't look automated.
const BULK_SENDER = /(no-?reply|do-?not-?reply|newsletter|notifications?|mailer|marketing|news@|info@|updates?@|hello@|team@|support@|billing@|receipts?@|digest|alerts?@)/i;
// Your own choices (dragging an email into Priority, or removing one) win over the automatic rules.
const msgKey = (a, m) => `${a.id}:${m.uid}`;
const senderKey = m => String(m.from.address || '').toLowerCase();
function priorityOf(m, a) {
  const k = msgKey(a, m), s = senderKey(m);
  if (k in cfg.priority.msgs) return { priority: cfg.priority.msgs[k], reason: 'you' };
  if (s && s in cfg.priority.senders) return { priority: cfg.priority.senders[s], reason: 'sender' };
  return { priority: isPriority(m, a), reason: 'auto' };
}
function isPriority(m, a) {
  if (a.type === 'google') return !!m.important && !m.bulk;
  if (m.flagged) return true;
  return !!m.unread && !BULK_SENDER.test(`${m.from.address} ${m.from.name}`);
}

function combinedInbox() {
  const all = [];
  let unread = 0;
  for (const a of cfg.accounts) {
    if (a.type === 'ical' || (a.type === 'google' && a.mail === false)) continue;
    const st = L(a.id); unread += st.unread || 0;
    for (const m of st.messages) all.push({ ...m, accountId: a.id, accountEmail: a.email, accountColor: a.color, provider: a.type === 'google' ? 'gmail' : (mail.PRESETS[a.preset] || {}).web || '', key: msgKey(a, m), ...(({ priority, reason }) => ({ priority, priorityReason: reason }))(priorityOf(m, a)) });
  }
  all.sort((x, y) => y.date.localeCompare(x.date));
  return { unread, priorityUnread: all.filter(x => x.priority && x.unread).length, messages: all.slice(0, 60) };
}
function combinedEvents() {
  const seen = new Map();
  for (const a of cfg.accounts) {
    for (const e of L(a.id).events) {
      const key = e.uid ? `${e.uid}|${e.start}` : `${e.title}|${e.start}`;
      if (seen.has(key)) { seen.get(key).also.push(e.calendar); continue; }
      seen.set(key, { ...e, accountId: a.id, also: [] });
    }
  }
  const list = [...seen.values()].sort((a, b) => (b.allDay - a.allDay) || a.start.localeCompare(b.start));
  // flag clashes between timed events
  const timed = list.filter(e => !e.allDay);
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length; j++) {
    if (timed[j].start < timed[i].end && timed[i].start < timed[j].end) { timed[i].clash = true; timed[j].clash = true; }
  }
  return list;
}

/* ---------- state ---------- */
let win = null;
let status = { busy: false, message: '', error: null };
let lastAttempt = 0;

function publicAccounts() {
  return cfg.accounts.map(a => {
    const st = L(a.id);
    return {
      id: a.id, type: a.type, email: a.email || '', name: a.name || '', color: a.color, preset: a.preset || '',
      mail: a.type === 'ical' ? false : a.mail !== false, calendar: a.type === 'imap' ? false : a.calendar !== false,
      calendars: st.calendars || [], error: st.error, needsSignIn: !!st.needsSignIn, updated: st.updated,
      unread: st.unread || 0, count: (st.messages || []).length, events: (st.events || []).length
    };
  });
}

function publicState() {
  const key = readKey();
  const inbox = combinedInbox();
  const hasMail = cfg.accounts.some(a => a.type === 'imap' || (a.type === 'google' && a.mail !== false));
  const hasCal = cfg.accounts.some(a => a.type === 'ical' || (a.type === 'google' && a.calendar !== false));
  return {
    profile: cfg.profile, signedIn: !!cfg.signedIn, hasKey: !!key,
    keyHint: key ? '•••• ' + key.slice(-4) : '',
    googleAvailable: !!google.loadClient(),
    model: cfg.model || '', models: cfg.models || [],
    prefs: cfg.prefs, defaults: DEFAULT_PREFS,
    openAtLogin: !!cfg.openAtLogin, theme: cfg.theme,
    accounts: publicAccounts(),
    mail: { connected: hasMail, unread: inbox.unread, priorityUnread: inbox.priorityUnread, messages: inbox.messages, busy: refreshing,
      errors: publicAccounts().filter(a => a.mail && a.error).map(a => `${a.email}: ${a.error}`),
      presets: Object.fromEntries(Object.entries(mail.PRESETS).map(([k, v]) => [k, { label: v.label, help: v.help, helpUrl: v.helpUrl, web: v.web, host: v.host }])) },
    calendar: { connected: hasCal, events: combinedEvents(), busy: refreshing,
      errors: publicAccounts().filter(a => a.calendar && a.error).map(a => `${a.email || a.name}: ${a.error}`) },
    brief: cfg.brief || null, today: localDate(), status,
    todos: cfg.todos, weather, weatherPlace: cfg.weather ? cfg.weather.name : '', exampleWishes: EXAMPLE_WISHES
  };
}
function push() {
  const st = publicState();
  if (win && !win.isDestroyed()) win.webContents.send('state', st);
  if (process.platform === 'darwin' && app.dock) { const n = st.mail.unread; app.dock.setBadge(n ? String(n > 99 ? '99+' : n) : ''); }
}

/* ---------- brief scheduling ---------- */
async function runBrief(manual) {
  if (status.busy) return;
  const key = readKey();
  if (!cfg.signedIn || !key) return;
  lastAttempt = Date.now();
  status = { busy: true, message: "Preparing today's brief. This usually takes a minute or two.", error: null };
  push();
  try {
    if (!cfg.model) { cfg.models = await listModels(key); cfg.model = pickDefaultModel(cfg.models); save(); }
    cfg.brief = await generateBrief(key, cfg.model);
    save();
    status = { busy: false, message: '', error: null };
    if (!manual && Notification.isSupported()) new Notification({ title: 'Your morning brief is ready', body: (cfg.brief.strategic_thought || cfg.brief.sections[0].items[0]?.headline || '').slice(0, 140) }).show();
  } catch (e) {
    status = { busy: false, message: '', error: e.message || String(e) };
  }
  push();
}
function dueNow() {
  if (!cfg.signedIn || status.busy || !readKey()) return false;
  if (cfg.brief && cfg.brief.generated === localDate()) return false;
  const now = new Date(), wd = now.getDay();
  if (cfg.prefs.days === 'weekdays' && (wd === 0 || wd === 6)) return false;
  const [h, m] = cfg.prefs.refreshTime.split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return false;
  return Date.now() - lastAttempt > (status.error ? 30 : 0) * 60 * 1000;
}
const tick = () => { if (dueNow()) runBrief(false); };

/* ---------- Google sign-in ---------- */
let googleBusy = false;
async function addGoogleAccount(loginHint) {
  if (googleBusy) throw new Error('A Google sign-in is already open in your browser.');
  googleBusy = true;
  try {
    const { tokens, profile, missing } = await google.signIn(url => (process.env.MM_GOOGLE_BASE ? fetch(url).catch(() => {}) : shell.openExternal(url)), { loginHint });
    let a = cfg.accounts.find(x => x.type === 'google' && x.email.toLowerCase() === profile.email.toLowerCase());
    if (!a) { a = { id: newId(), type: 'google', email: profile.email, name: profile.name, color: nextColor(), mail: true, calendar: true, calendars: {} }; cfg.accounts.push(a); }
    a.name = profile.name; a.picture = profile.picture;
    if (missing.includes('email')) a.mail = false;
    if (missing.includes('calendar')) a.calendar = false;
    saveSecret(secretFile(a.id), JSON.stringify(tokens));
    Object.assign(L(a.id), { error: null, needsSignIn: false });
    save();
    return { account: a, profile, missing };
  } finally { googleBusy = false; }
}

/* ---------- IPC ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ok = (x = {}) => ({ ok: true, ...x });
const fail = e => ({ ok: false, error: e && e.message ? e.message : String(e) });

ipcMain.handle('state:get', () => publicState());

// "Continue with Google": creates the profile from the Google account and connects its mail and calendar
ipcMain.handle('auth:google', async () => {
  try {
    const hint = cfg.profile && cfg.profile.via === 'google' ? cfg.profile.email : undefined;
    const { profile, missing } = await addGoogleAccount(hint);
    if (!cfg.profile) cfg.profile = { name: profile.name || profile.email.split('@')[0], email: profile.email, picture: profile.picture, via: 'google' };
    cfg.signedIn = true; save(); applyLoginItem(); push();
    refreshAccounts(); setTimeout(tick, 1000);
    return ok({ missing });
  } catch (e) { return fail(e); }
});

ipcMain.handle('auth:email', async (_e, { name, email }) => {
  email = String(email || '').trim();
  if (!EMAIL.test(email)) return fail('Enter a valid email address.');
  if (cfg.profile) {
    if (cfg.profile.email.toLowerCase() !== email.toLowerCase()) return fail('That email does not match the account on this Mac.');
  } else {
    cfg.profile = { name: String(name || '').trim() || email.split('@')[0], email, picture: '', via: 'email' };
  }
  cfg.signedIn = true; save(); applyLoginItem(); push();
  refreshAccounts(); setTimeout(tick, 1000);
  return ok();
});

ipcMain.handle('auth:signOut', () => { cfg.signedIn = false; save(); push(); return ok(); });

ipcMain.handle('auth:reset', async () => {
  for (const a of cfg.accounts) { if (a.type === 'google') { const t = googleTokens(a); if (t) await google.revoke(t); } saveSecret(secretFile(a.id), null); delete live[a.id]; }
  saveKey(null);
  try { fs.unlinkSync(CONFIG()); } catch (e) {}
  loadConfig(); push();
  return ok();
});

ipcMain.handle('key:set', async (_e, apiKey) => {
  apiKey = String(apiKey || '').trim();
  if (!/^sk-ant-/.test(apiKey)) return fail('Paste an Anthropic API key. It starts with sk-ant-.');
  try { cfg.models = await listModels(apiKey); } catch (e) { return fail(e); }
  if (!cfg.models.some(m => m.id === cfg.model)) cfg.model = pickDefaultModel(cfg.models);
  saveKey(apiKey); save(); push(); setTimeout(tick, 500);
  return ok();
});

ipcMain.handle('accounts:addGoogle', async () => {
  try { await addGoogleAccount(); push(); refreshAccounts(); return ok(); } catch (e) { return fail(e); }
});
ipcMain.handle('accounts:reconnect', async (_e, id) => {
  const a = cfg.accounts.find(x => x.id === id);
  if (!a || a.type !== 'google') return fail('Account not found.');
  try { await addGoogleAccount(a.email); push(); refreshAccounts(); return ok(); } catch (e) { return fail(e); }
});
ipcMain.handle('accounts:addImap', async (_e, { preset, host, email, password }) => {
  const p = mail.PRESETS[preset] || mail.PRESETS.other;
  email = String(email || '').trim();
  password = String(password || '').replace(/\s+/g, '');
  host = String(p.host || host || '').trim();
  if (!EMAIL.test(email)) return fail('Enter the email address for this mailbox.');
  if (!password) return fail('Paste the app password.');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return fail('Enter the IMAP server, for example imap.example.com.');
  if (cfg.accounts.some(a => a.type !== 'ical' && a.email.toLowerCase() === email.toLowerCase())) return fail('That address is already connected.');
  let r;
  try { r = await mail.fetchInbox({ host, port: 993, secure: true, user: email, pass: password }); } catch (e) { return fail(e); }
  const a = { id: newId(), type: 'imap', email, host, port: 993, preset: mail.PRESETS[preset] ? preset : 'other', color: nextColor() };
  saveSecret(secretFile(a.id), password);
  cfg.accounts.push(a);
  Object.assign(L(a.id), { messages: r.messages, unread: r.unread, error: null, updated: new Date().toISOString() });
  save(); push();
  return ok();
});
ipcMain.handle('accounts:addIcal', async (_e, { url, name }) => {
  url = normaliseUrl(url);
  if (!/^https:\/\//i.test(url)) return fail('Paste the full calendar address, starting with https:// or webcal://.');
  if (cfg.accounts.some(a => a.type === 'ical' && a.url === url)) return fail('That calendar is already connected.');
  let r;
  try { r = await fetchICS(url); } catch (e) { return fail(e); }
  const a = { id: newId(), type: 'ical', url, name: String(name || '').trim() || r.calName || 'Calendar', nameSet: !!String(name || '').trim(), color: nextColor() };
  cfg.accounts.push(a);
  Object.assign(L(a.id), { events: r.events.map(e => ({ ...e, calendar: a.name, color: a.color })), error: null, updated: new Date().toISOString() });
  save(); push();
  return ok();
});
ipcMain.handle('accounts:remove', async (_e, id) => {
  const a = cfg.accounts.find(x => x.id === id);
  if (!a) return fail('Account not found.');
  if (a.type === 'google') { const t = googleTokens(a); if (t) await google.revoke(t); }
  saveSecret(secretFile(id), null);
  cfg.accounts = cfg.accounts.filter(x => x.id !== id);
  delete live[id];
  save(); push();
  return ok();
});
ipcMain.handle('accounts:update', async (_e, { id, patch }) => {
  const a = cfg.accounts.find(x => x.id === id);
  if (!a) return fail('Account not found.');
  if (a.type === 'google') {
    if (typeof patch.mail === 'boolean') a.mail = patch.mail;
    if (typeof patch.calendar === 'boolean') a.calendar = patch.calendar;
    if (patch.calendarId && typeof patch.enabled === 'boolean') { a.calendars = a.calendars || {}; a.calendars[patch.calendarId] = patch.enabled; }
  }
  if (a.type === 'ical' && typeof patch.name === 'string' && patch.name.trim()) { a.name = patch.name.trim().slice(0, 60); a.nameSet = true; }
  if (typeof patch.color === 'string' && /^#[0-9a-f]{6}$/i.test(patch.color)) a.color = patch.color;
  if (a.type === 'google' && !a.mail) Object.assign(L(a.id), { messages: [], unread: 0 });
  save(); push();
  refreshAccounts();
  return ok();
});
ipcMain.handle('accounts:refresh', async () => { await refreshAccounts(); return ok(); });

ipcMain.handle('brief:refresh', () => { runBrief(true); return ok(); });

ipcMain.handle('prefs:set', (_e, patch) => {
  cfg.prefs = normalisePrefs(Object.assign({}, cfg.prefs, patch || {}));
  save(); push();
  return ok({ prefs: cfg.prefs });
});
// Turns the free-text description into sections and a watchlist with one small Haiku request
ipcMain.handle('prefs:customise', async (_e, wishes) => {
  wishes = String(wishes || '').trim();
  if (wishes.length < 10) return fail('Describe what you want to hear about in a sentence or two.');
  const key = readKey();
  if (!key) return fail('Connect Claude in Settings first. It turns your description into a plan.');
  try {
    if (!cfg.model) { cfg.models = await listModels(key); cfg.model = pickDefaultModel(cfg.models); }
    const res = await fetch(`${API}/messages`, { method: 'POST', headers: headers(key), body: JSON.stringify({ model: cfg.model, max_tokens: 1500, system: PLAN_SYSTEM, messages: [{ role: 'user', content: planPrompt(wishes) }] }) });
    if (!res.ok) throw await apiError(res);
    const j = await res.json();
    const plan = cleanPlan(extractJSON((j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')));
    cfg.prefs = normalisePrefs(Object.assign({}, cfg.prefs, { wishes, plan }));
    save(); push();
    return ok({ prefs: cfg.prefs });
  } catch (e) { return fail(e); }
});

/* ---------- to-do list ---------- */
const todoPatch = (t, p) => {
  if (typeof p.text === 'string' && p.text.trim()) t.text = p.text.trim().slice(0, 300);
  if (typeof p.done === 'boolean') { t.done = p.done; t.doneAt = p.done ? new Date().toISOString() : null; }
  if (p.due === null || p.due === '' || /^\d{4}-\d{2}-\d{2}$/.test(p.due || '')) t.due = p.due || null;
  if (typeof p.starred === 'boolean') t.starred = p.starred;
};
ipcMain.handle('mail:setPriority', (_e, { key, sender, value, scope }) => {
  value = !!value;
  const s = String(sender || '').toLowerCase();
  if (scope === 'sender') {
    if (!s) return fail('This email has no sender address.');
    cfg.priority.senders[s] = value;
    // the sender rule now decides, so drop per-message choices for that sender that agree with it
    for (const a of cfg.accounts) for (const msg of L(a.id).messages) if (senderKey(msg) === s && cfg.priority.msgs[msgKey(a, msg)] === value) delete cfg.priority.msgs[msgKey(a, msg)];
  } else {
    if (!/^[a-f0-9]{12}:.+$/.test(String(key || ''))) return fail('Email not found.');
    cfg.priority.msgs[key] = value;
    if (!value && s && cfg.priority.senders[s] === true) delete cfg.priority.senders[s];
  }
  // keep the list of remembered emails from growing forever
  const keys = Object.keys(cfg.priority.msgs); if (keys.length > 2000) for (const k of keys.slice(0, keys.length - 2000)) delete cfg.priority.msgs[k];
  save(); push();
  return ok();
});

ipcMain.handle('todos:add', (_e, p) => {
  const text = String((p && p.text) || '').trim();
  if (!text) return fail('Type a task first.');
  const t = { id: newId(), text: text.slice(0, 300), done: false, due: null, starred: false, created: new Date().toISOString(), link: /^https:\/\//.test((p && p.link) || '') ? p.link : '', from: String((p && p.from) || '').slice(0, 120) };
  todoPatch(t, p || {});
  cfg.todos.unshift(t); save(); push();
  return ok({ id: t.id });
});
ipcMain.handle('todos:update', (_e, { id, patch }) => {
  const t = cfg.todos.find(x => x.id === id); if (!t) return fail('Task not found.');
  todoPatch(t, patch || {}); save(); push(); return ok();
});
ipcMain.handle('todos:remove', (_e, id) => { cfg.todos = cfg.todos.filter(x => x.id !== id); save(); push(); return ok(); });
ipcMain.handle('todos:clearDone', () => { cfg.todos = cfg.todos.filter(x => !x.done); save(); push(); return ok(); });

/* ---------- weather (Open-Meteo, free, no key) ---------- */
let weather = null;
async function refreshWeather() {
  const w = cfg.weather; if (!w) { weather = null; return; }
  try {
    const q = new URLSearchParams({ latitude: w.lat, longitude: w.lon, current: 'temperature_2m,weather_code,is_day', daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone: 'auto', forecast_days: '1' });
    const res = await fetch(`${process.env.MM_WEATHER_BASE || 'https://api.open-meteo.com'}/v1/forecast?${q}`);
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    weather = { place: w.name, temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, day: !!j.current.is_day,
      hi: Math.round(j.daily.temperature_2m_max[0]), lo: Math.round(j.daily.temperature_2m_min[0]), rain: j.daily.precipitation_probability_max[0] };
  } catch (e) { /* keep the last reading */ }
  push();
}
ipcMain.handle('weather:set', async (_e, name) => {
  name = String(name || '').trim();
  if (!name) { cfg.weather = null; weather = null; save(); push(); return ok(); }
  try {
    const res = await fetch(`${process.env.MM_WEATHER_BASE || 'https://geocoding-api.open-meteo.com'}/v1/search?${new URLSearchParams({ name, count: '1', language: 'en' })}`);
    const j = await res.json();
    const r = j.results && j.results[0];
    if (!r) return fail(`Couldn't find "${name}". Try a city name.`);
    cfg.weather = { name: r.name + (r.country_code ? `, ${r.country_code}` : ''), lat: r.latitude, lon: r.longitude };
    save(); await refreshWeather();
    return ok();
  } catch (e) { return fail('Could not look up that place. Check the internet connection.'); }
});

ipcMain.handle('settings:set', (_e, patch) => {
  if (patch.model && (cfg.models || []).some(m => m.id === patch.model)) cfg.model = patch.model;
  if (typeof patch.openAtLogin === 'boolean') { cfg.openAtLogin = patch.openAtLogin; applyLoginItem(); }
  if (['system', 'light', 'dark'].includes(patch.theme)) { cfg.theme = patch.theme; nativeTheme.themeSource = patch.theme; }
  if (typeof patch.name === 'string' && patch.name.trim() && cfg.profile) cfg.profile.name = patch.name.trim().slice(0, 80);
  save(); push();
  return ok();
});

ipcMain.handle('open:external', (_e, url) => { if (/^https:\/\//i.test(String(url))) shell.openExternal(url); });

function applyLoginItem() {
  if (process.platform === 'darwin' && app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!cfg.openAtLogin, openAsHidden: true });
}

/* ---------- window ---------- */
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 640, title: "First Light",
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 26, y: 26 },
    vibrancy: 'under-window', visualEffectState: 'active', roundedCorners: true, backgroundColor: '#00000000', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
}

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } else createWindow(); });

function buildMenu() {
  const send = ch => () => { if (win && !win.isDestroyed()) win.webContents.send(ch); };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { label: 'View', submenu: [
      { label: 'Toggle Sidebar', accelerator: 'Ctrl+Cmd+S', click: send('toggle-sidebar') },
      { type: 'separator' },
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }
    ] },
    { role: 'windowMenu' }
  ]));
}

app.whenReady().then(() => {
  loadConfig();
  if (process.platform === 'darwin') buildMenu();
  nativeTheme.themeSource = cfg.theme;
  const hidden = process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden;
  if (!hidden) createWindow();
  refreshAccounts();
  refreshWeather();
  setInterval(refreshWeather, 30 * 60 * 1000);
  setTimeout(tick, 3000);
  setInterval(() => refreshAccounts('mail'), 5 * 60 * 1000);
  setInterval(() => refreshAccounts('calendar'), 15 * 60 * 1000);
  setInterval(tick, 5 * 60 * 1000);
  powerMonitor.on('resume', () => { refreshAccounts(); refreshWeather(); setTimeout(tick, 5000); });
  app.on('activate', () => { if (!win) createWindow(); });
});

// Keep running in the background on macOS so the morning refresh still happens
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
