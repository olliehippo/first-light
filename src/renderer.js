(function () {
  'use strict';
  const ICONS = {
    today: '<path d="M3.5 10.5 12 3.8l8.5 6.7V20a1 1 0 0 1-1 1H15v-6.2H9V21H4.5a1 1 0 0 1-1-1z" fill="currentColor" stroke="none"/>',
    brief: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M11 13.5h1v4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    tasks: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12.2 2.7 2.7L16 9.4"/>',
    sidebar: '<rect x="3" y="4.5" width="18" height="15" rx="3.5"/><path d="M9.5 4.5v15"/>',
    sparkle: '<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9Z"/><path d="M18.5 3.5v3M17 5h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
    video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5.5-3v9l-5.5-3"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.5 7"/>'
  };
  const icon = (n, sw) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 1.75}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const NAV = [{ id: 'today', label: 'Today' }, { id: 'mail', label: 'Mail' }, { id: 'tasks', label: 'Tasks' }, { id: 'brief', label: 'Brief' }, { id: 'calendar', label: 'Calendar' }];
  const TINTS = ['lavender', 'mint', 'sky', 'peach', 'rose'];
  const KINDS = ['blue', 'coral', 'green'];
  const DAY = 86400000;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https:\/\//i.test(u || '') ? esc(u) : '';
  const safeColor = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#408cff';
  const initials = s => { const w = String(s).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); if (!w.length) return '·'; return (w[0][0] + (w[1] ? w[1][0] : (w[0][1] || ''))).toUpperCase(); };
  const parse = d => { const [y, m, dd] = String(d).split('-').map(Number); return new Date(y, (m || 1) - 1, dd || 1); };
  const shortDate = d => parse(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const tintFor = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TINTS[h % TINTS.length]; };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  let S = null, view = 'today', query = '', screen = null, pendingRender = false;
  let draft = null;          // unsaved brief preferences
  let addForm = null;        // 'imap' | 'ical' | null
  let mailFilter = 'all';
  let expanded = {};         // account id -> calendars list open
  let welcomeMode = 'main';  // 'main' | 'email' | 'waiting'
  const root = document.getElementById('root');
  document.documentElement.classList.add(window.mm.platform === 'darwin' ? 'vibrant' : 'no-vibrancy');

  function rel(d) {
    if (!d) return '';
    const base = parse(S.today), t = parse(d), diff = Math.round((base - t) / DAY);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff > 1 && diff < 7) return t.toLocaleDateString('en-GB', { weekday: 'short' });
    return shortDate(d);
  }
  function duration(e) {
    if (e.allDay) return 'All day';
    const mins = Math.round((new Date(e.end) - new Date(e.start)) / 60000);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h && m ? `${h} hr ${m} min` : h ? `${h} hr` : `${m} min`;
  }
  function mailTime(iso) {
    const d = new Date(iso), t = new Date(), y = new Date(t); y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return time(iso);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    if (t - d < 6 * DAY) return d.toLocaleDateString('en-GB', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  const allItems = () => (S.brief ? S.brief.sections.flatMap(s => s.items.map(i => ({ ...i, section: s.name }))) : []);
  const setError = (id, msg) => { const el = document.getElementById(id); if (el) { el.textContent = msg || ''; el.hidden = !msg; } };
  const busyBtn = (btn, on, label) => { if (!btn) return; btn.disabled = on; if (label) btn.textContent = label; };

  /* ---------- sign in ---------- */
  const glyph = name => name === 'sun' ? '<img class="app-logo" src="logo.png" alt="" width="64" height="64">' : `<div class="app-glyph">${icon(name, 1.9)}</div>`;
  function welcomeScreen() {
    const P = S.profile, returning = !!P;
    const first = P ? (P.name || '').split(/\s+/)[0] : '';
    if (welcomeMode === 'waiting') return `<div class="welcome"><div class="sheet">
      ${glyph('sun')}<h1>Finish signing in in your browser</h1>
      <p class="lede">Choose your Google account and allow access to read your email and calendar. You'll come straight back here.</p>
      <div class="waiting"><span class="spinner" aria-hidden="true"></span>Waiting for Google</div>
      <p class="form-error" id="f-error" role="alert" hidden></p>
      <div class="sheet-actions"><button type="button" class="btn" data-action="welcome-back">Back</button></div></div></div>`;
    if (welcomeMode === 'email' || (returning && P.via === 'email')) return `<div class="welcome"><form class="sheet" id="emailform" novalidate>
      ${glyph('sun')}<h1>${returning ? `Welcome back${first ? ', ' + esc(first) : ''}` : "First Light"}</h1>
      <p class="lede">${returning ? "Sign in with the email address for this Mac's account." : 'Set up with your name and email. You can connect email and calendars afterwards in Settings.'}</p>
      ${returning ? '' : '<div class="field"><label for="f-name">Name</label><input id="f-name" type="text" autocomplete="name" placeholder="Your name"></div>'}
      <div class="field"><label for="f-email">Email</label><input id="f-email" type="email" autocomplete="email" placeholder="you@example.com"></div>
      <p class="form-error" id="f-error" role="alert" hidden></p>
      <div class="sheet-actions">${returning ? '<button type="button" class="btn" data-action="reset-account" id="reset-btn">Use a different account</button>' : '<button type="button" class="btn" data-action="welcome-back">Back</button>'}<button class="btn primary lg" type="submit">Continue</button></div>
    </form></div>`;
    return `<div class="welcome"><div class="sheet">
      ${glyph('sun')}<h1>${returning ? `Welcome back${first ? ', ' + esc(first) : ''}` : "First Light"}</h1>
      <p class="lede">${returning ? 'Sign in to open your morning dashboard.' : 'Your email, calendar and a morning market brief in one calm view. Sign in with Google to connect your inbox and calendar in one step.'}</p>
      ${S.googleAvailable ? `<button type="button" class="btn primary lg block" data-action="google-signin">Continue with Google</button>` : ''}
      <p class="form-error" id="f-error" role="alert" hidden></p>
      <div class="or"><span>or</span></div>
      <button type="button" class="btn lg block" data-action="email-mode">${returning ? 'Use a different account' : 'Continue with email'}</button>
      <p class="fine">Everything stays on this Mac. First Light only reads your email and calendar; it never sends, changes or deletes anything.</p>
    </div></div>`;
  }

  function keyScreen() {
    return `<div class="welcome"><form class="sheet" id="keyform" novalidate>
      ${glyph('key')}<h1>Connect Claude</h1>
      <p class="lede">Claude reads the morning news and writes your brief. Paste an API key from your Anthropic account.</p>
      <div class="field"><label for="f-key">Anthropic API key</label><input id="f-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-...">
        <span class="hint">Create one at <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a> and add some credit. Each brief costs about a cent or two. The key is kept in this Mac's keychain.</span></div>
      <p class="form-error" id="f-error" role="alert" hidden></p>
      <div class="sheet-actions"><button type="button" class="btn" data-action="skip-key">Skip for now</button><button class="btn primary lg" type="submit" id="f-submit">Connect</button></div>
    </form></div>`;
  }

  /* ---------- app shell ---------- */
  function shell() {
    return `<div class="desktop"><div class="app-window ${store.get('mm-sidebar') === 'hidden' ? 'sidebar-hidden' : ''}" id="app-window">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" data-action="toggle-sidebar" title="Hide sidebar (⌃⌘S)" aria-label="Toggle sidebar" aria-expanded="${store.get('mm-sidebar') !== 'hidden'}">${icon('sidebar', 1.7)}</button>
      <aside class="sidebar" aria-label="Sidebar"><div class="titlebar-space"></div>
        <nav class="sidebar-nav" id="nav" aria-label="Sections"></nav><div class="sidebar-footer" id="nav-footer"></div></aside>
      <main class="content-area" id="content">
        <header class="toolbar">
          <div class="greeting"><h1 id="greeting"></h1><p id="date-line"></p></div>
          <div class="toolbar-actions">
            <label class="search-field" for="search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
              <input id="search" type="search" placeholder="Search..." autocomplete="off" aria-label="Search the brief">
              <span class="keyboard-hint" aria-hidden="true">&#8984; K</span>
            </label>
            <button class="profile" id="profile" type="button" title="Settings"></button>
          </div>
        </header>
        <section class="view" id="view" aria-live="polite"></section>
      </main></div></div>`;
  }
  function renderNav() {
    const n = allItems().length;
    document.getElementById('nav').innerHTML = NAV.map(x => `
      <button class="sidebar-item" type="button" data-view="${x.id}" title="${x.label}" ${view === x.id ? 'aria-current="page"' : ''}>
        ${icon(x.id, x.id === 'today' ? 0 : 1.75)}<span class="sidebar-label">${x.label}</span>
        ${x.id === 'brief' && n ? `<span class="sidebar-count">${n}</span>` : ''}
        ${x.id === 'mail' && S.mail.unread ? `<span class="sidebar-count">${S.mail.unread}</span>` : ''}
        ${x.id === 'tasks' && openTodos().length ? `<span class="sidebar-count">${openTodos().length}</span>` : ''}
        ${x.id === 'calendar' && S.calendar.connected ? `<span class="sidebar-count">${S.calendar.events.length}</span>` : ''}
      </button>`).join('');
    document.getElementById('nav-footer').innerHTML = `<button class="sidebar-item" type="button" data-view="settings" title="Settings" ${view === 'settings' ? 'aria-current="page"' : ''}>${icon('settings', 1.6)}<span class="sidebar-label">Settings</span></button>`;
  }

  const ART = {
    crypto: `<svg viewBox="0 0 104 72" aria-hidden="true"><rect width="104" height="72" fill="#10192e"/><g stroke="#23324f" stroke-width="1"><path d="M0 18h104M0 36h104M0 54h104M26 0v72M52 0v72M78 0v72"/></g><path d="M0 60 L12 55 L22 58 L32 47 L42 50 L52 38 L62 41 L72 27 L82 30 L92 16 L104 12 L104 72 L0 72Z" fill="#f7931a" fill-opacity=".18"/><path d="M0 60 L12 55 L22 58 L32 47 L42 50 L52 38 L62 41 L72 27 L82 30 L92 16 L104 12" fill="none" stroke="#f7a23a" stroke-width="2.2" stroke-linejoin="round"/><circle cx="92" cy="16" r="3" fill="#ffd28a"/></svg>`,
    tokenise: `<svg viewBox="0 0 104 72" aria-hidden="true"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a5bd1"/><stop offset="1" stop-color="#132a66"/></linearGradient></defs><rect width="104" height="72" fill="url(#g1)"/>${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<circle cx="${(52 + Math.cos(a) * 22).toFixed(1)}" cy="${(36 + Math.sin(a) * 22).toFixed(1)}" r="2.4" fill="#ffd84a"/>`; }).join('')}<g fill="none" stroke="#9fc1ff" stroke-width="1.6"><rect x="44" y="28" width="16" height="16" rx="2.5"/><path d="M52 28v-5M52 44v5"/></g></svg>`,
    ai: `<svg viewBox="0 0 104 72" aria-hidden="true"><rect width="104" height="72" fill="#0f1116"/>${Array.from({ length: 40 }, (_, i) => { const x = 8 + (i % 8) * 12.5, y = 9 + Math.floor(i / 8) * 13.5, on = [3, 10, 12, 19, 21, 26, 29, 35].includes(i); return `<circle cx="${x}" cy="${y}" r="${on ? 2.6 : 1.3}" fill="${on ? '#8fd3ff' : '#3a4150'}"/>`; }).join('')}<path d="M45.5 9 L33 22.5 L58 22.5 L33 36 L83 36 L58 49.5 L45.5 63" fill="none" stroke="#8fd3ff" stroke-opacity=".55" stroke-width="1.2"/></svg>`
  };

  function statusLine() {
    const st = S.status;
    if (st.busy) return `<div class="status-line"><span class="spinner" aria-hidden="true"></span>${esc(st.message)}</div>`;
    if (st.error) return `<div class="status-line error">${esc(st.error)}</div>`;
    if (!S.hasKey) return `<div class="status-line">Connect Claude in <a class="link" href="#" data-view="settings">Settings</a> to get a fresh brief each morning.</div>`;
    if (S.brief && S.brief.generated !== S.today) return `<div class="status-line">Showing the brief from ${esc(parse(S.brief.generated).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}. Today's is prepared at ${esc(S.prefs.refreshTime)}.</div>`;
    return '';
  }
  const noBrief = () => `<section class="panel"><div class="empty"><h3>${S.status.busy ? "Preparing today's brief" : 'No brief yet'}</h3><p>${S.status.busy ? 'Claude is reading the morning news. This usually takes a minute or two.' : 'The first brief is prepared shortly after signing in.'}</p>${S.status.busy || !S.hasKey ? '' : '<button class="btn primary" type="button" data-action="refresh">Prepare now</button>'}</div></section>`;

  /* ---------- mail ---------- */
  const acct = id => S.accounts.find(a => a.id === id) || {};
  const senderName = m => m.from.name || (m.from.address || '').split('@')[0] || 'Unknown sender';
  function webLink(m) {
    const a = acct(m.accountId);
    if (m.provider === 'gmail') return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(a.email || '')}#inbox/${encodeURIComponent(m.threadId || m.uid)}`;
    if (m.provider === 'outlook') return 'https://outlook.live.com/mail/0/inbox';
    if (m.provider === 'icloud') return 'https://www.icloud.com/mail';
    return '';
  }
  function mailRow(m) {
    const url = webLink(m), tag = url ? 'a' : 'div', name = senderName(m), multi = S.accounts.filter(a => a.mail).length > 1;
    return `<${tag} class="content-row mail-row ${m.unread ? 'is-unread' : ''} ${m.priority ? 'is-priority' : ''}" draggable="true" data-key="${esc(m.key)}" data-sender="${esc(m.from.address)}" data-name="${esc(name)}" data-prio="${m.priority ? 1 : 0}" ${url ? `href="${esc(url)}" target="_blank" rel="noopener"` : ''} title="${esc(m.from.address)} to ${esc(m.accountEmail)}${m.priority ? '' : ' \u00B7 drag onto Priority to keep it on Today'}">
      <span class="unread-dot ${m.unread ? '' : 'read'}"></span>
      <span class="avatar av-${tintFor(name)}" aria-hidden="true">${esc(initials(name))}</span>
      <span class="mail-text">
        <span class="mail-top"><span class="sender">${esc(name)}</span><span class="stamp">${m.priority ? `<button type="button" class="mail-task unprio" data-action="unprioritise" data-key="${esc(m.key)}" data-sender="${esc(m.from.address)}" data-reason="${esc(m.priorityReason)}" title="Remove from Priority" aria-label="Remove from Priority">${icon('x', 2)}Priority</button>` : ''}<button type="button" class="mail-task" data-action="mail-to-task" data-subject="${esc(m.subject)}" data-from="${esc(name)}" data-link="${esc(url)}" title="Add to tasks" aria-label="Add to tasks">${icon('plus', 2)}Task</button>${multi ? `<span class="acct-dot" style="background:${safeColor(m.accountColor)}" title="${esc(m.accountEmail)}"></span>` : ''}${mailTime(m.date)}</span></span>
        <span class="subject">${esc(m.subject)}</span>
        <span class="preview">${esc(m.preview || ' ')}</span>
      </span></${tag}>`;
  }
  const mailErrors = () => S.mail.errors.length ? `<div class="status-line error">${S.mail.errors.map(esc).join('<br>')} <a class="link" href="#" data-view="settings">Fix in Settings</a></div>` : '';

  /* ---------- calendar ---------- */
  function eventRowsFrom(events) {
    return events.map((e, n) => ({ left: e.allDay ? 'All day' : time(e.start), title: e.title, color: e.color, kind: e.color ? '' : KINDS[n % 3],
      detail: [duration(e), e.location, S.accounts.filter(a => a.calendar).length > 1 || (e.also || []).length ? e.calendar : ''].filter(Boolean).join(' · '), clash: e.clash }));
  }
  function keyDateRows(limit) {
    const base = parse(S.today);
    return ((S.brief && S.brief.key_dates) || []).filter(k => parse(k.date) >= base).slice(0, limit).map(k => ({
      left: parse(k.date).getFullYear() === base.getFullYear() ? shortDate(k.date) : parse(k.date).toLocaleDateString('en-GB', { month: 'short' }) + " '" + String(parse(k.date).getFullYear()).slice(2),
      title: k.title, detail: k.detail, kind: KINDS.includes(k.kind) ? k.kind : 'blue'
    }));
  }
  const eventHtml = rows => rows.map(e => `<div class="event-row"><span class="event-time">${esc(e.left)}</span>
    <div class="calendar-event ${e.color ? 'custom' : e.kind}" ${e.color ? `style="--ev:${safeColor(e.color)}"` : ''}><span class="event-title">${esc(e.title)}</span><span class="event-detail">${e.clash ? '<b class="clash">Clash</b> · ' : ''}${esc(e.detail)}</span></div></div>`).join('');
  function calNote() {
    if (S.calendar.errors.length) return `<p class="panel-note" style="color:var(--event-coral)">${S.calendar.errors.map(esc).join('<br>')}</p>`;
    if (!S.calendar.connected) return '<p class="panel-note">Key dates from the brief. <a class="link" href="#" data-view="settings">Connect a calendar</a> to see meetings here.</p>';
    if (!S.calendar.events.length) return '<p class="panel-note">Nothing on the calendar today. Key dates from the brief are shown instead.</p>';
    return '';
  }

  /* ---------- tasks ---------- */
  const openTodos = () => (S.todos || []).filter(t => !t.done);
  const addDays = n => { const d = parse(S.today); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function dueLabel(t) {
    if (!t.due) return '';
    if (t.due < S.today) return `<span class="due overdue">Overdue · ${esc(shortDate(t.due))}</span>`;
    if (t.due === S.today) return '<span class="due today">Today</span>';
    if (t.due === addDays(1)) return '<span class="due">Tomorrow</span>';
    return `<span class="due">${esc(parse(t.due).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</span>`;
  }
  const sortTodos = list => list.slice().sort((a, b) => (a.done - b.done) || (b.starred - a.starred) || ((a.due || '9999') .localeCompare(b.due || '9999')) || b.created.localeCompare(a.created));
  function todoRow(t, compact) {
    return `<div class="content-row todo-row ${t.done ? 'done' : ''}" data-todo="${t.id}">
      <button type="button" class="todo-check" role="checkbox" aria-checked="${t.done}" data-action="todo-toggle" data-id="${t.id}" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}">${t.done ? icon('tasks', 2) : ''}</button>
      <span class="todo-main"><span class="todo-text">${esc(t.text)}</span>
        <span class="todo-meta">${t.done ? "" : dueLabel(t)}${t.from ? `<span>${t.link ? `<a class="link" href="${safeUrl(t.link)}" target="_blank" rel="noopener">${esc(t.from)}</a>` : esc(t.from)}</span>` : ''}</span></span>
      <span class="todo-tools">
        <button type="button" class="icon-btn ${t.starred ? 'on' : ''}" data-action="todo-star" data-id="${t.id}" title="${t.starred ? 'Unstar' : 'Star'}" aria-label="Star">${icon('star', 1.7)}</button>
        ${compact ? '' : `<select class="due-select" data-todo-due="${t.id}" aria-label="Due date"><option value="">No date</option><option value="${S.today}" ${t.due === S.today ? 'selected' : ''}>Today</option><option value="${addDays(1)}" ${t.due === addDays(1) ? 'selected' : ''}>Tomorrow</option><option value="${addDays(7)}" ${t.due === addDays(7) ? 'selected' : ''}>Next week</option>${t.due && ![S.today, addDays(1), addDays(7)].includes(t.due) ? `<option value="${esc(t.due)}" selected>${esc(shortDate(t.due))}</option>` : ''}</select>`}
        <button type="button" class="icon-btn" data-action="todo-remove" data-id="${t.id}" title="Delete" aria-label="Delete">${icon('trash', 1.7)}</button>
      </span></div>`;
  }
  const todoInput = (id, placeholder) => `<form class="todo-add" data-todo-form="${id}"><span class="todo-plus">${icon('plus', 2)}</span><input id="${id}" type="text" placeholder="${esc(placeholder)}" autocomplete="off" maxlength="300"><button class="btn" type="submit">Add</button></form>`;

  /* ---------- weather and next meeting ---------- */
  const WX = { sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>', moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>', cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 9.5 4.3 4.3 0 0 0 7 18z"/>', rain: '<path d="M7 15h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 6.5 4.3 4.3 0 0 0 7 15zM9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>', snow: '<path d="M7 15h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 6.5 4.3 4.3 0 0 0 7 15zM9 19h.01M12 20.5h.01M15 19h.01"/>', storm: '<path d="M7 14h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 5.5 4.3 4.3 0 0 0 7 14zM12.5 14l-2 4h3l-2 4"/>', fog: '<path d="M4 9h16M6 13h12M4 17h16"/>' };
  function wxKind(code, day) {
    if (code === 0 || code === 1) return [day ? 'sun' : 'moon', code === 0 ? 'Clear' : 'Mostly clear'];
    if (code === 2) return ['cloud', 'Partly cloudy'];
    if (code === 3) return ['cloud', 'Cloudy'];
    if (code === 45 || code === 48) return ['fog', 'Fog'];
    if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return ['rain', code >= 61 ? 'Rain' : 'Drizzle'];
    if (code >= 71 && code <= 77 || code === 85 || code === 86) return ['snow', 'Snow'];
    if (code >= 95) return ['storm', 'Thunderstorms'];
    return ['cloud', 'Cloudy'];
  }
  function weatherHtml() {
    const w = S.weather; if (!w) return '';
    const [k, label] = wxKind(w.code, w.day);
    return `<span class="wx" title="${esc(w.place)}: high ${w.hi}°, low ${w.lo}°${w.rain != null ? `, ${w.rain}% chance of rain` : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WX[k]}</svg>${w.temp}° ${esc(label.toLowerCase())} · H ${w.hi}° L ${w.lo}°${w.rain >= 40 ? ` · ${w.rain}% rain` : ''}</span>`;
  }
  function nextUp() {
    const now = Date.now();
    const e = S.calendar.events.filter(x => !x.allDay && new Date(x.end) > now).sort((a, b) => a.start.localeCompare(b.start))[0];
    if (!e) return '';
    const mins = Math.round((new Date(e.start) - now) / 60000);
    const when = mins <= 0 ? 'Now' : mins < 60 ? `In ${mins} min` : `At ${time(e.start)}`;
    return `<div class="next-up"><span class="next-when">${esc(when)}</span><span class="next-title">${esc(e.title)}</span>${e.join ? `<a class="btn primary join" href="${safeUrl(e.join)}" target="_blank" rel="noopener">${icon('video', 1.8)}Join</a>` : ''}</div>`;
  }

  /* ---------- views ---------- */
  function todayView() {
    const base = parse(S.today), mon = new Date(+base - ((base.getDay() + 6) % 7) * DAY);
    const week = Array.from({ length: 7 }, (_, i) => new Date(+mon + i * DAY));
    const M = S.mail;
    const prio = M.messages.filter(m => m.priority);
    const inboxBody = M.connected
      ? (prio.length ? prio.slice(0, 4).map(mailRow).join('') : `<div class="empty"><p>${M.busy ? 'Loading the inbox...' : M.messages.length ? 'Nothing important right now.' : 'The inbox is empty.'}</p>${M.messages.length ? '<button class="btn" type="button" data-view="mail">See All Mail</button>' : ''}</div>`)
      : `<div class="empty"><h3>Email is not connected</h3><p>Connect Gmail, iCloud, Outlook or any other mailbox to see the latest messages here.</p><button class="btn primary" type="button" data-view="settings">Connect Email</button></div>`;
    const cal = S.calendar.events.length ? eventRowsFrom(S.calendar.events.slice(0, 3)) : keyDateRows(3);
    return `<div class="dashboard-grid">
      <div class="left-column">
      <section class="panel" aria-labelledby="inbox-title">
        <div class="panel-header"><h2 class="panel-title" id="inbox-title">Inbox ${M.priorityUnread ? `<span class="badge" title="${M.priorityUnread} important unread">${M.priorityUnread}</span>` : ''}${M.connected ? '<span class="prio-tag">Priority</span>' : ''}</h2>
          <button class="panel-action" type="button" data-view="mail">View All ${icon('chevron', 2.2)}</button></div>
        ${mailErrors()}
        <div class="panel-divider"></div>
        <div class="panel-body">${inboxBody}</div>
      </section>
      <section class="panel tasks-panel" aria-labelledby="tasks-title">
        <div class="panel-header"><h2 class="panel-title" id="tasks-title">To-do ${openTodos().length ? `<span class="count-soft">${openTodos().length}</span>` : ''}</h2><button class="panel-action" type="button" data-view="tasks">All Tasks ${icon('chevron', 2.2)}</button></div>
        ${todoInput('todo-quick', 'Add a task for today')}
        <div class="panel-body">${openTodos().length ? sortTodos(openTodos()).slice(0, 5).map(t => todoRow(t, true)).join('') : '<div class="empty" style="padding-top:10px"><p>Nothing on your list. Add a task above, or turn an email into one with the Task button.</p></div>'}</div>
      </section>
      </div>
      <div class="right-column">
        <section class="panel" aria-labelledby="cal-title">
          <div class="panel-header"><h2 class="panel-title" id="cal-title">Today</h2><button class="panel-action" type="button" data-view="calendar">Open Calendar ${icon('chevron', 2.2)}</button></div>
          ${nextUp()}
          <div class="week" role="list">${week.map(d => `<div class="day ${+d === +base ? 'current' : ''}" role="listitem"><span class="dname">${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span><span class="dnum">${d.getDate()}</span></div>`).join('')}</div>
          <div class="panel-body"><div class="events">${eventHtml(cal)}</div></div>
          ${calNote()}
        </section>
        <section class="panel" aria-labelledby="news-title">
          <div class="panel-header"><h2 class="panel-title" id="news-title">Top Stories</h2><button class="panel-action" type="button" data-view="brief">See More ${icon('chevron', 2.2)}</button></div>
          ${S.status.busy || S.status.error ? statusLine() : ''}
          <div class="panel-body">${S.brief && S.brief.top_stories.length ? S.brief.top_stories.map(s => `
              <a class="content-row news-row" href="${safeUrl(s.url)}" target="_blank" rel="noopener"><span class="thumb">${ART[s.art] || ART.ai}</span>
                <span class="news-text"><span class="headline">${esc(s.headline)}</span><span class="meta">${esc(s.source)} · ${rel(s.date)}</span></span></a>`).join('')
              : '<div class="empty"><p>Stories appear once the brief is ready.</p></div>'}</div>
          ${S.brief && S.brief.strategic_thought ? `<div class="panel-divider"></div><div class="thought"><p class="thought-label">Thought for the day</p><p>${esc(S.brief.strategic_thought)}</p></div>` : ''}
        </section>
      </div></div>`;
  }

  function itemRow(i) {
    const url = safeUrl(i.url);
    const inner = `<span><span class="headline">${esc(i.headline)}</span><div class="takeaway">${esc(i.takeaway)}</div>${i.source ? `<div class="meta">${esc(i.source)}</div>` : ''}</span><span class="stamp">${rel(i.date)}</span>`;
    return url ? `<a class="content-row item-row" href="${url}" target="_blank" rel="noopener">${inner}</a>` : `<div class="content-row item-row">${inner}</div>`;
  }
  function briefView() {
    if (!S.brief) return noBrief();
    const q = query.trim().toLowerCase();
    const match = i => !q || [i.headline, i.takeaway, i.source, i.section, i.name].join(' ').toLowerCase().includes(q);
    const sections = S.brief.sections.map(s => ({ ...s, items: s.items.map(i => ({ ...i, section: s.name })).filter(match) })).filter(s => s.items.length);
    const comps = S.brief.competitors.filter(match);
    const total = sections.reduce((n, s) => n + s.items.length, 0) + comps.length;
    const updated = S.brief.generated_at ? new Date(S.brief.generated_at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return `${q ? `<p class="search-summary">${total} result${total === 1 ? '' : 's'} for “${esc(query)}” <button type="button" id="clear-search">Clear</button></p>` : ''}
      <div class="page-grid">
        <section class="panel" aria-labelledby="h-news">
          <div class="panel-header"><h2 class="panel-title" id="h-news">Headlines</h2>
            <span class="header-tools">${updated ? `<span class="stamp" style="font-size:13px">Updated ${esc(updated)}</span>` : ''}<button class="btn" type="button" data-view="settings" data-scroll="brief-prefs">Customise</button><button class="btn" type="button" data-action="refresh" ${S.status.busy || !S.hasKey ? 'disabled' : ''}>Refresh</button></span></div>
          ${statusLine()}
          ${sections.length ? sections.map(s => `<p class="group-label">${esc(s.name)}</p><div>${s.items.map(itemRow).join('')}</div>`).join('') : '<div class="empty"><h3>No headlines match</h3><p>Try a company, sector or regulator.</p></div>'}
          <div style="height:10px"></div>
        </section>
        <div class="stack">
          ${q || !S.brief.strategic_thought ? '' : `<section class="panel"><div class="panel-header"><h2 class="panel-title small">Thought for the day</h2></div><p class="prose">${esc(S.brief.strategic_thought)}</p></section>`}
          ${S.brief.competitors.length ? `<section class="panel"><div class="panel-header"><h2 class="panel-title small">Watchlist</h2></div>
            ${comps.length ? comps.map(c => { const url = safeUrl(c.url), tag = url ? 'a' : 'div'; return `<${tag} class="content-row comp-row" ${url ? `href="${url}" target="_blank" rel="noopener"` : ''}>
                <span class="avatar av-${tintFor(c.name)}" aria-hidden="true">${esc(initials(c.name))}</span>
                <span style="min-width:0;display:grid;gap:3px">
                  <span class="mail-top"><span class="comp-name">${esc(c.name)} <span class="state ${c.status === 'news' ? 'news' : ''}">${c.status === 'news' ? 'News' : 'Quiet'}</span></span><span class="stamp" style="font-size:13px">${rel(c.date)}</span></span>
                  <span class="headline" style="font-size:15px;font-weight:500">${esc(c.headline)}</span>
                  <span style="font-size:14px;line-height:1.45;color:var(--mac-text-secondary)">${esc(c.takeaway)}</span></span></${tag}>`; }).join('') : '<div class="empty"><p>Nothing on your watchlist matches.</p></div>'}
          </section>` : ''}
        </div></div>`;
  }

  function mailView() {
    const M = S.mail;
    if (!M.connected) return `<div style="max-width:620px"><section class="panel"><div class="empty"><h3>No email connected</h3><p>Add Gmail with one click, or any other mailbox with an app password. Messages from every account appear together here.</p><button class="btn primary" type="button" data-view="settings" data-scroll="accounts">Connect Email</button></div></section></div>`;
    const accts = S.accounts.filter(a => a.mail);
    if (!['all', 'priority'].includes(mailFilter) && !accts.some(a => a.id === mailFilter)) mailFilter = 'all';
    const list = M.messages.filter(m => mailFilter === 'all' || (mailFilter === 'priority' ? m.priority : m.accountId === mailFilter));
    const prioN = M.messages.filter(m => m.priority && m.unread).length;
    return `<div style="max-width:960px"><section class="panel mail-panel">
      <div class="panel-header"><h2 class="panel-title">Inbox ${M.unread ? `<span class="badge">${M.unread}</span>` : ''}</h2>
        <span class="header-tools"><button class="btn" type="button" data-action="accounts-refresh" ${M.busy ? 'disabled' : ''}>${M.busy ? 'Refreshing...' : 'Refresh'}</button></span></div>
      ${`<div class="filters" role="group" aria-label="Show inbox"><button type="button" class="filter" data-filter="all" aria-pressed="${mailFilter === 'all'}">${accts.length > 1 ? 'All inboxes' : 'All mail'}</button><button type="button" class="filter" data-filter="priority" data-drop="priority" title="Drag emails here to add them to Priority" aria-pressed="${mailFilter === 'priority'}">Priority${prioN ? ` <span class="filter-count">${prioN}</span>` : ''}</button>${accts.length > 1 ? '<span class="filter-sep"></span>' : ''}${accts.length > 1 ? accts.map(a => `<button type="button" class="filter" data-filter="${a.id}" aria-pressed="${mailFilter === a.id}"><span class="acct-dot" style="background:${safeColor(a.color)}"></span>${esc(a.email)}${a.unread ? ` <span class="filter-count">${a.unread}</span>` : ''}</button>`).join('') : ''}</div>`}
      ${mailErrors()}
      <div class="prio-drop" data-drop="priority" aria-hidden="true">${icon('star', 1.8)}Drop here to add to Priority</div>
      <div class="panel-divider"></div>
      ${list.length ? list.map(mailRow).join('') : `<div class="empty"><p>${M.busy ? 'Loading...' : 'Nothing here.'}</p></div>`}
      <div style="height:8px"></div></section></div>`;
  }

  function tasksView() {
    const all = S.todos || [], open = sortTodos(all.filter(t => !t.done)), done = sortTodos(all.filter(t => t.done)).slice(0, 30);
    const overdue = open.filter(t => t.due && t.due < S.today), today = open.filter(t => t.due === S.today), later = open.filter(t => !t.due || t.due > S.today);
    const group = (label, list) => list.length ? `<p class="group-label">${label}</p>${list.map(t => todoRow(t)).join('')}` : '';
    return `<div style="max-width:880px"><section class="panel">
      <div class="panel-header"><h2 class="panel-title">To-do ${open.length ? `<span class="badge">${open.length}</span>` : ''}</h2>${done.length ? '<span class="header-tools"><button class="btn" type="button" data-action="todo-clear-done">Clear Completed</button></span>' : ''}</div>
      ${todoInput('todo-main', 'Add a task and press Return')}
      ${open.length ? group('Overdue', overdue) + group('Today', today) + group('Later', later) : '<div class="empty"><p>You are all caught up.</p></div>'}
      ${done.length ? `<p class="group-label">Completed</p>${done.map(t => todoRow(t)).join('')}` : ''}
      <div style="height:10px"></div></section></div>`;
  }

  function calendarView() {
    const ev = S.calendar.events;
    const today = S.calendar.connected
      ? (ev.length ? eventHtml(eventRowsFrom(ev)) : '<div class="empty" style="padding:8px 0 4px"><p>Nothing on the calendar today.</p></div>')
      : `<div class="empty" style="padding:4px 0"><h3>No calendar connected</h3><p>Sign in with Google, or paste any calendar's iCal link, and today's meetings from every calendar appear here together.</p><button class="btn primary" type="button" data-view="settings" data-scroll="accounts">Connect Calendar</button></div>`;
    const keys = ((S.brief && S.brief.key_dates) || []).filter(k => parse(k.date) >= parse(S.today)).map(k => ({ left: shortDate(k.date), title: k.title, detail: `${k.detail || ''} · ${parse(k.date).getFullYear()}`, kind: KINDS.includes(k.kind) ? k.kind : 'blue' }));
    return `<div class="page-grid">
      <section class="panel"><div class="panel-header"><h2 class="panel-title">${esc(parse(S.today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</h2></div>
        <div class="events">${today}</div>${S.calendar.errors.length ? `<p class="panel-note" style="color:var(--event-coral)">${S.calendar.errors.map(esc).join('<br>')}</p>` : ''}</section>
      <section class="panel"><div class="panel-header"><h2 class="panel-title small">Key dates</h2></div>
        <div class="events">${keys.length ? eventHtml(keys) : '<div class="empty" style="padding:4px 0"><p>No upcoming dates in the brief.</p></div>'}</div></section></div>`;
  }

  /* ---------- settings ---------- */
  const row = (name, sub, controls, cls) => `<div class="content-row setting-row ${cls || ''}"><span class="setting-name">${name}${sub ? `<span class="setting-sub">${sub}</span>` : ''}</span><span class="setting-controls">${controls}</span></div>`;
  const P = () => draft || S.prefs;
  const dirty = () => !!draft && JSON.stringify(draft) !== JSON.stringify(S.prefs);

  function accountRow(a) {
    const what = [a.mail ? (a.type === 'google' ? 'Gmail' : 'Email') : '', a.calendar ? (a.type === 'google' ? 'Google Calendar' : 'Calendar') : ''].filter(Boolean).join(' and ') || 'Nothing selected';
    const label = a.type === 'ical' ? (a.name || 'Calendar') : a.email;
    const info = a.error ? `<span class="acct-error">${esc(a.error)}</span>` : `${what}${a.mail && a.count ? ` · ${a.unread} unread` : ''}${a.calendar && a.updated ? ` · ${a.events} event${a.events === 1 ? '' : 's'} today` : ''}`;
    const kind = a.type === 'google' ? 'Google' : a.type === 'imap' ? ((S.mail.presets[a.preset] || {}).label || 'IMAP') : 'iCal link';
    const controls = `${a.type === 'google' && a.needsSignIn ? `<button class="btn primary" type="button" data-action="reconnect" data-id="${a.id}">Sign In Again</button>` : ''}
      ${a.type === 'google' ? `<button class="btn" type="button" data-action="toggle-cals" data-id="${a.id}" aria-expanded="${!!expanded[a.id]}">Options</button>` : ''}
      <button class="btn danger" type="button" data-action="remove-account" data-id="${a.id}">Remove</button>`;
    const opts = a.type === 'google' && expanded[a.id] ? `<div class="acct-options">
        <label class="check"><input type="checkbox" data-acct-toggle="mail" data-id="${a.id}" ${a.mail ? 'checked' : ''}> Show this inbox</label>
        <label class="check"><input type="checkbox" data-acct-toggle="calendar" data-id="${a.id}" ${a.calendar ? 'checked' : ''}> Show calendars</label>
        ${a.calendar && a.calendars.length ? `<div class="cal-list"><span class="setting-sub">Calendars to include</span>${a.calendars.map(c => `<label class="check"><input type="checkbox" data-cal="${esc(c.id)}" data-id="${a.id}" ${c.enabled ? 'checked' : ''}><span class="acct-dot" style="background:${safeColor(c.color)}"></span>${esc(c.name)}</label>`).join('')}</div>` : ''}
      </div>` : '';
    return `<div class="acct-block"><div class="content-row setting-row acct-row"><span class="setting-name"><span class="acct-dot big" style="background:${safeColor(a.color)}"></span><span><span class="acct-title">${esc(label)}</span><span class="setting-sub">${esc(kind)} · ${info}</span></span></span><span class="setting-controls">${controls}</span></div>${opts}</div>`;
  }

  function addForms() {
    if (addForm === 'imap') {
      const pre = 'gmail', PR = S.mail.presets, p = PR[pre];
      return `<div class="add-form" id="imap-form">
        <div class="form-grid">
          <div class="field"><label for="m-preset">Email provider</label><select id="m-preset">${Object.entries(PR).map(([k, v]) => `<option value="${k}" ${k === pre ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>
          <div class="field"><label for="m-email">Email address</label><input id="m-email" type="email" autocomplete="email"></div>
          <div class="field" id="m-host-field" hidden><label for="m-host">IMAP server</label><input id="m-host" type="text" spellcheck="false" placeholder="imap.example.com"></div>
          <div class="field"><label for="m-pass">App password</label><input id="m-pass" type="password" autocomplete="off" spellcheck="false" placeholder="xxxx xxxx xxxx xxxx"></div>
        </div>
        <span class="hint" id="m-help">${esc(p.help)}${p.helpUrl ? ` <a href="${esc(p.helpUrl)}" target="_blank" rel="noopener">Open that page</a>.` : ''}</span>
        <p class="form-error" id="m-error" role="alert" hidden></p>
        <div class="form-actions"><button class="btn" type="button" data-action="cancel-add">Cancel</button><button class="btn primary" type="button" data-action="save-imap">Connect</button></div></div>`;
    }
    if (addForm === 'ical') return `<div class="add-form">
        <div class="form-grid">
          <div class="field"><label for="c-url">Calendar address</label><input id="c-url" type="url" spellcheck="false" placeholder="https://... .ics"></div>
          <div class="field"><label for="c-name">Name (optional)</label><input id="c-name" type="text" placeholder="Family"></div>
        </div>
        <span class="hint">Google: calendar settings, Secret address in iCal format. Outlook: Settings, Calendar, Shared calendars, Publish. iCloud: share as Public Calendar.</span>
        <p class="form-error" id="c-error" role="alert" hidden></p>
        <div class="form-actions"><button class="btn" type="button" data-action="cancel-add">Cancel</button><button class="btn primary" type="button" data-action="save-ical">Add Calendar</button></div></div>`;
    return '';
  }

  const chipList = (d, field) => field === 'feeds' ? d.feeds : d.plan[field];
  function chips(field, items, placeholder) {
    return `<div class="chips" data-field="${field}">${items.map((t, i) => { const label = typeof t === 'string' ? t : t.name; return `<span class="chip" title="${esc(typeof t === 'string' ? t : 'Searches for: ' + t.query)}">${esc(label)}<button type="button" class="chip-x" data-chip-remove="${field}" data-index="${i}" aria-label="Remove ${esc(label)}">${icon('x', 2.2)}</button></span>`; }).join('')}
      <input class="chip-input" id="chip-${field}" type="text" placeholder="${esc(placeholder)}" data-chip-add="${field}" autocomplete="off"></div>`;
  }

  function prefsPanel() {
    const p = P();
    const times = []; for (let h = 5; h <= 10; h++) for (const m of ['00', '15', '30', '45']) times.push(`${String(h).padStart(2, '0')}:${m}`);
    const sel = (id, opts, cur) => `<select id="${id}" data-pref="${id.replace('p-', '')}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const wishesChanged = draft && draft.wishes !== S.prefs.wishes;
    return `<section class="panel" id="brief-prefs"><div class="panel-header"><h2 class="panel-title small">Customise your brief</h2>
        <span class="header-tools">${dirty() ? '<span class="unsaved">Unsaved changes</span>' : ''}<button class="btn primary" type="button" data-action="save-prefs" ${dirty() && !wishesChanged ? '' : 'disabled'}>Save</button></span></div>
      <div class="prefs">
        <div class="field wide"><label for="p-wishes">What do you want to hear about?</label>
          <textarea id="p-wishes" data-pref="wishes" rows="5" placeholder="${esc(S.exampleWishes)}">${esc(p.wishes)}</textarea>
          <span class="customise-bar"><span class="hint" style="margin:0">Write it the way you'd tell an assistant: who you are, the topics, the companies or people to watch, the regions, and how you like it written.</span>
          <button class="btn primary" type="button" data-action="customise" ${S.hasKey ? '' : 'disabled title="Connect Claude below first"'}>${icon('sparkle', 1.8)}${wishesChanged || !S.prefs.wishes ? 'Build My Brief' : 'Rebuild'}</button></span>
          <p class="form-error" id="customise-msg" hidden></p></div>
        <div class="plan wide">
          <div class="plan-head"><span class="plan-title">What your brief covers</span><span class="hint" style="margin:0">Built from your description. Add or remove anything, then Save.</span></div>
          <div class="field"><label>Sections, in order</label>${chips('sections', p.plan.sections, 'Add a section and press Return')}</div>
          <div class="field"><label>Keeping an eye on</label>${chips('watch', p.plan.watch, 'Add a company, person or team')}</div>
        </div>
        <div class="field"><label for="p-windowHours">How far back</label>${sel('p-windowHours', [[24, 'Last 24 hours'], [48, 'Last 48 hours'], [72, 'Last 3 days']], p.windowHours)}</div>
        <div class="field"><label for="p-perTopic">Stories per section</label>${sel('p-perTopic', [1, 2, 3, 4, 5, 6].map(n => [n, 'Up to ' + n]), p.perTopic)}</div>
        <div class="field"><label>Thought for the day</label><span class="toggle-row"><button class="toggle" type="button" role="switch" aria-checked="${p.plan.strategicThought}" data-pref-toggle="strategicThought" aria-label="Include a thought for the day"></button><span class="hint" style="margin:0">End with the one thing to think about</span></span></div>
        <div class="field"><label for="p-refreshTime">Prepare each day at</label>${sel('p-refreshTime', times.map(t => [t, t]), p.refreshTime)}</div>
        <div class="field"><label>Which days</label><span class="segmented" role="group" aria-label="Which days">${[['weekdays', 'Weekdays'], ['daily', 'Every day']].map(([v, l]) => `<button type="button" data-pref-days="${v}" aria-pressed="${p.days === v}">${l}</button>`).join('')}</span></div>
        <details class="field wide more"${p.feeds.length ? ' open' : ''}><summary>Extra news sources</summary>${chips('feeds', p.feeds, 'Paste an RSS feed address and press Return')}<span class="hint">Every section and watchlist entry is searched on Google News. Add a publication's RSS feed here to include it too.</span></details>
      </div>
    </section>`;
  }

  function settingsView() {
    const pr = S.profile;
    return `<div class="stack settings" style="max-width:880px">
      <section class="panel"><div class="panel-header"><h2 class="panel-title small">Account</h2></div>
        ${row(esc(pr.name || pr.email), esc(pr.email) + (pr.via === 'google' ? ' · signed in with Google' : ''), '<button class="btn" type="button" data-action="signout">Sign Out</button>')}
        ${row('Remove from this Mac', 'Signs out every account and deletes the saved key, connections and brief', '<button class="btn danger" type="button" data-action="reset-account" id="reset-btn">Remove</button>')}
        <p class="form-error" id="reset-msg" style="padding:0 24px 12px" hidden></p>
      </section>
      <section class="panel" id="accounts"><div class="panel-header"><h2 class="panel-title small">Email and calendars</h2>
          <span class="header-tools"><button class="btn" type="button" data-action="accounts-refresh" ${S.mail.busy ? 'disabled' : ''}>Refresh</button></span></div>
        ${S.accounts.length ? S.accounts.map(accountRow).join('') : '<p class="setting-sub" style="padding:0 24px 8px">Nothing connected yet. Add as many accounts as you like; they are combined into one inbox and one calendar.</p>'}
        <p class="form-error" id="acct-msg" style="padding:0 24px" hidden></p>
        ${addForms()}
        <div class="add-buttons">${S.googleAvailable ? '<button class="btn primary" type="button" data-action="add-google">Add Google Account</button>' : ''}<button class="btn" type="button" data-action="add-imap">Add Other Email</button><button class="btn" type="button" data-action="add-ical">Add Calendar Link</button></div>
      </section>
      ${prefsPanel()}
      <section class="panel"><div class="panel-header"><h2 class="panel-title small">Claude</h2></div>
        ${row('Anthropic API key', S.hasKey ? esc(S.keyHint) : 'Not connected. The brief needs a key.', `<input id="s-key" type="password" placeholder="${S.hasKey ? 'Paste a new key' : 'sk-ant-...'}" spellcheck="false"><button class="btn ${S.hasKey ? '' : 'primary'}" type="button" data-action="save-key">${S.hasKey ? 'Replace' : 'Connect'}</button>`)}
        ${S.brief && S.brief.usage ? row('Last brief', `${S.brief.headlines} headlines read \u00B7 ${S.brief.usage.input.toLocaleString('en-GB')} tokens in, ${S.brief.usage.output.toLocaleString('en-GB')} out${S.brief.failedSources && S.brief.failedSources.length ? ` \u00B7 ${S.brief.failedSources.length} source${S.brief.failedSources.length === 1 ? '' : 's'} unavailable` : ''}`, '<a class="link" href="https://platform.claude.com/usage" target="_blank" rel="noopener">See usage</a>') : ''}
        ${row('Model', 'Haiku is the cheapest and is plenty for a headline brief', `<select id="s-model">${S.models.map(m => `<option value="${esc(m.id)}" ${m.id === S.model ? 'selected' : ''}>${esc(m.name)}</option>`).join('') || `<option>${esc(S.model || 'Chosen when a key is added')}</option>`}</select>`)}
        ${row('Prepare now', 'Uses your saved preferences', `<button class="btn" type="button" data-action="refresh" ${S.status.busy || !S.hasKey ? 'disabled' : ''}>${S.status.busy ? 'Preparing...' : 'Prepare Brief'}</button>`)}
        <p class="form-error" id="key-msg" style="padding:0 24px 12px" hidden></p>
      </section>
      <section class="panel"><div class="panel-header"><h2 class="panel-title small">General</h2></div>
        ${row('Weather', S.weatherPlace ? esc(S.weatherPlace) : 'Off', `<input id="s-weather" type="text" placeholder="City" value="${esc((S.weatherPlace || '').split(',')[0])}"><button class="btn" type="button" data-action="save-weather">Set</button>`)}
        <p class="form-error" id="weather-msg" style="padding:0 24px 8px" hidden></p>
        ${row('Open at login', 'Keeps the morning brief on schedule', `<button class="toggle" type="button" role="switch" aria-checked="${S.openAtLogin}" data-action="login" aria-label="Open at login"></button>`)}
        ${row('Appearance', '', `<span class="segmented" role="group" aria-label="Appearance">${['system', 'light', 'dark'].map(t => `<button type="button" data-theme-set="${t}" aria-pressed="${S.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</span>`)}
      </section>
    </div>`;
  }

  /* ---------- render ---------- */
  function wantScreen() {
    if (!S.signedIn) return 'welcome';
    if (!S.hasKey && store.get('mm-key-skipped') !== '1') return 'key';
    return 'app';
  }
  function render(force) {
    const want = wantScreen();
    if (want !== screen || force || want === 'welcome' && root.dataset.mode !== welcomeMode) {
      screen = want;
      if (want === 'welcome') { root.dataset.mode = welcomeMode; root.innerHTML = welcomeScreen(); const f = root.querySelector('input'); if (f) f.focus(); return; }
      if (want === 'key') { root.innerHTML = keyScreen(); document.getElementById('f-key').focus(); return; }
      root.innerHTML = shell();
      bindShell();
    }
    if (screen !== 'app') return;
    const active = document.activeElement;
    const keep = active && active.closest && active.closest('.todo-add') ? { id: active.id, val: active.value } : null;
    if (!keep && active && active.closest && active.closest('#view') && /INPUT|SELECT|TEXTAREA/.test(active.tagName)) { pendingRender = true; return; }
    pendingRender = false;
    const first = ((S.profile && S.profile.name) || '').split(/\s+/)[0] || 'there';
    const h = new Date().getHours();
    document.getElementById('greeting').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${first}`;
    document.getElementById('date-line').innerHTML = esc(parse(S.today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + (S.weather ? ' <span class="sep">\u00B7</span> ' + weatherHtml() : '');
    document.getElementById('profile').textContent = initials((S.profile && (S.profile.name || S.profile.email)) || '');
    renderNav();
    const v = document.getElementById('view');
    v.innerHTML = view === 'today' ? todayView() : view === 'brief' ? briefView() : view === 'calendar' ? calendarView() : view === 'mail' ? mailView() : view === 'tasks' ? tasksView() : settingsView();
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.value = keep.val; el.focus(); } }
  }
  function renderView() { renderNav(); const v = document.getElementById('view'); v.innerHTML = view === 'brief' ? briefView() : view === 'settings' ? settingsView() : view === 'mail' ? mailView() : view === 'tasks' ? tasksView() : view === 'calendar' ? calendarView() : todayView(); }

  function go(id, scroll) {
    view = id;
    if (id !== 'brief') { query = ''; const s = document.getElementById('search'); if (s) s.value = ''; }
    render();
    const c = document.getElementById('content');
    if (c) { const t = scroll && document.getElementById(scroll); c.scrollTop = t ? t.offsetTop - 12 : 0; }
  }
  function bindShell() {
    const search = document.getElementById('search');
    search.addEventListener('input', () => { query = search.value; view = 'brief'; renderView(); });
    document.getElementById('profile').addEventListener('click', () => go('settings'));
  }

  /* ---------- chips + draft prefs ---------- */
  function editDraft(fn) { draft = draft || JSON.parse(JSON.stringify(S.prefs)); fn(draft); }
  function refreshPrefsPanel(focusId) {
    const el = document.getElementById('brief-prefs'); if (!el) return;
    const top = document.getElementById('content').scrollTop;
    el.outerHTML = prefsPanel();
    document.getElementById('content').scrollTop = top;
    if (focusId) { const f = document.getElementById(focusId); if (f) f.focus(); }
  }
  function addChip(field, input) {
    const v = input.value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!v) return;
    editDraft(d => {
      const list = chipList(d, field);
      const name = x => (typeof x === 'string' ? x : x.name).toLowerCase();
      if (list.some(x => name(x) === v.toLowerCase())) return;
      list.push(field === 'feeds' ? v : field === 'watch' ? { name: v, query: `"${v}"` } : { name: v, query: v });
    });
    refreshPrefsPanel('chip-' + field);
  }

  /* ---------- events ---------- */
  document.addEventListener('focusout', () => { setTimeout(() => { if (pendingRender) render(); }, 0); });

  document.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('[type=submit]');
    if (f.dataset.todoForm) {
      const inp = document.getElementById(f.dataset.todoForm);
      const text = inp.value.trim(); if (!text) return;
      await window.mm.addTodo({ text, due: f.dataset.todoForm === 'todo-quick' ? S.today : null });
      const again = document.getElementById(f.dataset.todoForm); if (again) { again.value = ''; again.focus(); }
      return;
    }
    if (f.id === 'emailform') {
      busyBtn(btn, true, 'Signing In...');
      const r = await window.mm.signInWithEmail({ name: (document.getElementById('f-name') || {}).value, email: document.getElementById('f-email').value });
      busyBtn(btn, false, 'Continue');
      if (!r.ok) setError('f-error', r.error);
    }
    if (f.id === 'keyform') {
      busyBtn(btn, true, 'Checking...');
      const r = await window.mm.setKey(document.getElementById('f-key').value);
      busyBtn(btn, false, 'Connect');
      if (!r.ok) setError('f-error', r.error);
    }
  });

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(html, ms) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 6000);
  }

  /* ---------- drag emails into Priority ---------- */
  let dragMail = null;
  document.addEventListener('dragstart', e => {
    const row = e.target.closest && e.target.closest('.mail-row');
    if (!row) return;
    dragMail = { key: row.dataset.key, sender: row.dataset.sender, name: row.dataset.name, prio: row.dataset.prio === '1' };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', row.querySelector('.subject')?.textContent || 'Email');
    document.body.classList.add('dragging-mail');
    row.classList.add('drag-source');
  });
  document.addEventListener('dragend', () => {
    dragMail = null;
    document.body.classList.remove('dragging-mail');
    document.querySelectorAll('.drag-source, .drop-over').forEach(el => el.classList.remove('drag-source', 'drop-over'));
  });
  document.addEventListener('dragover', e => {
    if (dragMail) e.preventDefault(); // stop a stray drop from opening the email link
    const z = dragMail && e.target.closest && e.target.closest('[data-drop=priority]');
    if (!z) { if (dragMail) e.dataTransfer.dropEffect = 'none'; return; }
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    document.querySelectorAll('.drop-over').forEach(el => { if (el !== z) el.classList.remove('drop-over'); });
    z.classList.add('drop-over');
  });
  document.addEventListener('dragleave', e => {
    const z = e.target.closest && e.target.closest('[data-drop=priority]');
    if (z && !z.contains(e.relatedTarget)) z.classList.remove('drop-over');
  });
  document.addEventListener('drop', async e => {
    if (dragMail) e.preventDefault();
    const z = e.target.closest && e.target.closest('[data-drop=priority]');
    if (!z || !dragMail) return;
    const d = dragMail;
    document.body.classList.remove('dragging-mail');
    await window.mm.setPriority({ key: d.key, sender: d.sender, value: true, scope: 'message' });
    toast(`<span>Added to Priority</span>${d.sender ? `<button type="button" class="toast-btn" data-action="prio-sender" data-sender="${esc(d.sender)}">Always for ${esc(d.name)}</button>` : ''}`);
  });

  function toggleSidebar() {
    const w = document.getElementById('app-window'); if (!w) return;
    const hidden = w.classList.toggle('sidebar-hidden');
    store.set('mm-sidebar', hidden ? 'hidden' : 'shown');
    const b = document.getElementById('sidebar-toggle');
    if (b) { b.setAttribute('aria-expanded', String(!hidden)); b.title = `${hidden ? 'Show' : 'Hide'} sidebar (\u2303\u2318S)`; }
  }
  if (window.mm.onToggleSidebar) window.mm.onToggleSidebar(toggleSidebar);

  document.addEventListener('keydown', e => {
    const add = e.target.dataset && e.target.dataset.chipAdd;
    if (add && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); addChip(add, e.target); return; }
    if (add && e.key === 'Backspace' && !e.target.value) { editDraft(d => chipList(d, add).pop()); refreshPrefsPanel('chip-' + add); return; }
    const search = document.getElementById('search');
    if (!search) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.focus(); search.select(); }
    if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; query = ''; search.blur(); render(); }
  });

  document.addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.pref;
    if (k && e.target.tagName === 'TEXTAREA') {
      editDraft(d => { d[k] = e.target.value; });
      const hdr = document.querySelector('#brief-prefs .header-tools');
      if (hdr) { const save = hdr.querySelector('[data-action=save-prefs]'); save.disabled = !dirty() || (draft && draft.wishes !== S.prefs.wishes); if (!hdr.querySelector('.unsaved') && dirty()) hdr.insertAdjacentHTML('afterbegin', '<span class="unsaved">Unsaved changes</span>'); }
    }
  });

  document.addEventListener('change', async e => {
    const t = e.target;
    const k = t.dataset && t.dataset.pref;
    if (k && t.tagName === 'SELECT') { editDraft(d => { d[k] = /^\d+$/.test(t.value) ? Number(t.value) : t.value; }); t.blur(); refreshPrefsPanel(); return; }
    if (t.dataset.todoDue) { await window.mm.updateTodo(t.dataset.todoDue, { due: t.value || null }); t.blur(); return; }
    if (t.id === 's-model') { await window.mm.setSettings({ model: t.value }); t.blur(); return; }
    if (t.id === 'm-preset') {
      const p = S.mail.presets[t.value];
      document.getElementById('m-host-field').hidden = t.value !== 'other';
      document.getElementById('m-help').innerHTML = `${esc(p.help)}${p.helpUrl ? ` <a href="${esc(p.helpUrl)}" target="_blank" rel="noopener">Open that page</a>.` : ''}`;
      return;
    }
    if (t.dataset.acctToggle) { await window.mm.updateAccount(t.dataset.id, { [t.dataset.acctToggle]: t.checked }); return; }
    if (t.dataset.cal) { await window.mm.updateAccount(t.dataset.id, { calendarId: t.dataset.cal, enabled: t.checked }); return; }
  });

  document.addEventListener('click', async e => {
    const mt = e.target.closest('[data-action=mail-to-task], [data-action=unprioritise]');
    if (mt) e.preventDefault();
    const nav = e.target.closest('[data-view]');
    if (nav) { e.preventDefault(); go(nav.dataset.view, nav.dataset.scroll); return; }
    const th = e.target.closest('[data-theme-set]');
    if (th) { await window.mm.setSettings({ theme: th.dataset.themeSet }); return; }
    const fl = e.target.closest('[data-filter]');
    if (fl) { mailFilter = fl.dataset.filter; renderView(); return; }
    if (e.target.id === 'clear-search') { query = ''; document.getElementById('search').value = ''; renderView(); return; }
    const cr = e.target.closest('[data-chip-remove]');
    if (cr) { const f = cr.dataset.chipRemove; editDraft(d => chipList(d, f).splice(Number(cr.dataset.index), 1)); refreshPrefsPanel(); return; }
    const pt = e.target.closest('[data-pref-toggle]');
    if (pt) { editDraft(d => { d.plan.strategicThought = !d.plan.strategicThought; }); refreshPrefsPanel(); return; }
    const pd = e.target.closest('[data-pref-days]');
    if (pd) { editDraft(d => { d.days = pd.dataset.prefDays; }); refreshPrefsPanel(); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action, id = a.dataset.id;
    if (act === 'toggle-sidebar') { toggleSidebar(); return; }
    if (act === 'prio-sender') { await window.mm.setPriority({ sender: a.dataset.sender, value: true, scope: 'sender' }); toast('<span>Every email from this sender will now show in Priority.</span>', 4000); return; }
    if (act === 'unprioritise') {
      e.preventDefault(); e.stopPropagation();
      await window.mm.setPriority({ key: a.dataset.key, sender: a.dataset.sender, value: false, scope: 'message' });
      toast(`<span>Removed from Priority</span>${a.dataset.sender ? `<button type="button" class="toast-btn" data-action="unprio-sender" data-sender="${esc(a.dataset.sender)}">Never for this sender</button>` : ''}`);
      return;
    }
    if (act === 'unprio-sender') { await window.mm.setPriority({ sender: a.dataset.sender, value: false, scope: 'sender' }); toast('<span>Emails from this sender won\'t show in Priority.</span>', 4000); return; }

    if (act === 'google-signin') {
      welcomeMode = 'waiting'; render();
      const r = await window.mm.continueWithGoogle();
      welcomeMode = 'main';
      if (!r.ok) { render(true); setError('f-error', r.error); }
      else render(true);
      return;
    }
    if (act === 'email-mode') { welcomeMode = 'email'; render(true); return; }
    if (act === 'welcome-back') { welcomeMode = 'main'; render(true); return; }
    if (act === 'skip-key') { store.set('mm-key-skipped', '1'); render(true); return; }
    if (act === 'reset-account') {
      if (!a.dataset.armed) { a.dataset.armed = '1'; a.textContent = 'Click Again to Confirm'; setError(document.getElementById('reset-msg') ? 'reset-msg' : 'f-error', 'This signs out every account and removes everything First Light saved on this Mac.'); return; }
      a.disabled = true; welcomeMode = 'main'; draft = null; await window.mm.reset(); store.set('mm-key-skipped', ''); render(true); return;
    }
    if (act === 'refresh') { a.disabled = true; await window.mm.refreshBrief(); return; }
    if (act === 'signout') { await window.mm.signOut(); return; }
    if (act === 'accounts-refresh') { a.disabled = true; a.textContent = 'Refreshing...'; await window.mm.refreshAccounts(); return; }
    if (act === 'add-google') {
      busyBtn(a, true, 'Finish in your browser...');
      const r = await window.mm.addGoogle();
      busyBtn(a, false, 'Add Google Account');
      setError('acct-msg', r.ok ? '' : r.error); return;
    }
    if (act === 'reconnect') { busyBtn(a, true, 'Finish in your browser...'); const r = await window.mm.reconnect(id); if (!r.ok) setError('acct-msg', r.error); return; }
    if (act === 'add-imap' || act === 'add-ical') { addForm = act.slice(4); renderView(); const f = document.querySelector('.add-form input'); if (f) f.focus(); return; }
    if (act === 'cancel-add') { addForm = null; renderView(); return; }
    if (act === 'save-imap') {
      busyBtn(a, true, 'Connecting...');
      const r = await window.mm.addImap({ preset: document.getElementById('m-preset').value, host: document.getElementById('m-host').value, email: document.getElementById('m-email').value, password: document.getElementById('m-pass').value });
      busyBtn(a, false, 'Connect');
      if (!r.ok) { setError('m-error', r.error); return; }
      addForm = null; if (document.activeElement) document.activeElement.blur(); renderView(); return;
    }
    if (act === 'save-ical') {
      busyBtn(a, true, 'Adding...');
      const r = await window.mm.addIcal({ url: document.getElementById('c-url').value, name: document.getElementById('c-name').value });
      busyBtn(a, false, 'Add Calendar');
      if (!r.ok) { setError('c-error', r.error); return; }
      addForm = null; if (document.activeElement) document.activeElement.blur(); renderView(); return;
    }
    if (act === 'remove-account') {
      if (!a.dataset.armed) { a.dataset.armed = '1'; a.textContent = 'Confirm Remove'; return; }
      await window.mm.removeAccount(id); return;
    }
    if (act === 'toggle-cals') { expanded[id] = !expanded[id]; renderView(); return; }
    if (act === 'save-prefs') {
      busyBtn(a, true, 'Saving...');
      const r = await window.mm.setPrefs(draft);
      if (r.ok) { draft = null; if (document.activeElement) document.activeElement.blur(); S.prefs = r.prefs; refreshPrefsPanel(); setError('prefs-msg', ''); const m = document.getElementById('prefs-msg'); if (m) { m.hidden = false; m.style.color = 'var(--mac-text-secondary)'; m.textContent = 'Saved. The next brief uses these preferences.'; } }
      else busyBtn(a, false, 'Save');
      return;
    }
    if (act === 'customise') {
      const wishes = (document.getElementById('p-wishes') || {}).value || '';
      busyBtn(a, true, 'Building...');
      const r = await window.mm.customise(wishes);
      if (r.ok) { draft = null; S.prefs = r.prefs; if (document.activeElement) document.activeElement.blur(); refreshPrefsPanel(); const m = document.getElementById('customise-msg'); if (m) { m.hidden = false; m.style.color = 'var(--mac-text-secondary)'; m.textContent = 'Done. Check the sections below, then Refresh your brief to see it.'; } }
      else { busyBtn(a, false, 'Build My Brief'); setError('customise-msg', r.error); }
      return;
    }
    if (act === 'todo-toggle') { const t = S.todos.find(x => x.id === id); if (t) await window.mm.updateTodo(id, { done: !t.done }); return; }
    if (act === 'todo-star') { const t = S.todos.find(x => x.id === id); if (t) await window.mm.updateTodo(id, { starred: !t.starred }); return; }
    if (act === 'todo-remove') { await window.mm.removeTodo(id); return; }
    if (act === 'todo-clear-done') { await window.mm.clearDoneTodos(); return; }
    if (act === 'mail-to-task') {
      e.preventDefault(); e.stopPropagation();
      await window.mm.addTodo({ text: a.dataset.subject, from: 'Email from ' + a.dataset.from, link: a.dataset.link, due: S.today });
      a.classList.add('added'); a.innerHTML = 'Added'; return;
    }
    if (act === 'save-weather') {
      busyBtn(a, true, 'Finding...');
      const r = await window.mm.setWeather(document.getElementById('s-weather').value);
      busyBtn(a, false, 'Set'); setError('weather-msg', r.ok ? '' : r.error);
      if (r.ok && document.activeElement) document.activeElement.blur();
      return;
    }
    if (act === 'save-key') {
      busyBtn(a, true, 'Checking...');
      const r = await window.mm.setKey(document.getElementById('s-key').value);
      busyBtn(a, false, S.hasKey ? 'Replace' : 'Connect');
      setError('key-msg', r.ok ? '' : r.error);
      if (r.ok) { document.getElementById('s-key').value = ''; if (document.activeElement) document.activeElement.blur(); render(); }
      return;
    }
    if (act === 'login') { await window.mm.setSettings({ openAtLogin: a.getAttribute('aria-checked') !== 'true' }); return; }
  });

  window.mm.onState(s => { S = s; render(); });
  window.mm.getState().then(s => { S = s; render(); });
  setInterval(() => { window.mm.getState().then(s => { S = s; render(); }); }, 10 * 60 * 1000);
})();
