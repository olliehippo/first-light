'use strict';
const { ImapFlow } = require('imapflow');

const PRESETS = {
  gmail: { label: 'Gmail or Google Workspace', host: 'imap.gmail.com', port: 993, help: 'Google Account, Security, 2-Step Verification, then App passwords. Create one called First Light.', helpUrl: 'https://myaccount.google.com/apppasswords', web: 'gmail' },
  icloud: { label: 'iCloud Mail', host: 'imap.mail.me.com', port: 993, help: 'account.apple.com, Sign-In and Security, App-Specific Passwords.', helpUrl: 'https://account.apple.com/account/manage', web: 'icloud' },
  outlook: { label: 'Outlook.com or Hotmail', host: 'outlook.office365.com', port: 993, help: 'Microsoft account, Security, Advanced security options, App passwords (needs two-step verification).', helpUrl: 'https://account.live.com/proofs/AppPassword', web: 'outlook' },
  yahoo: { label: 'Yahoo Mail', host: 'imap.mail.yahoo.com', port: 993, help: 'Yahoo Account Security, Generate app password.', helpUrl: 'https://login.yahoo.com/account/security', web: '' },
  other: { label: 'Other (IMAP)', host: '', port: 993, help: 'Use the IMAP server and an app password from your email provider.', helpUrl: '', web: '' }
};

function detectPreset(email) {
  const d = String(email || '').split('@')[1] || '';
  if (/^(gmail|googlemail)\.com$/i.test(d)) return 'gmail';
  if (/^(icloud|me|mac)\.com$/i.test(d)) return 'icloud';
  if (/^(outlook|hotmail|live|msn)\.(com|co\.uk)$/i.test(d)) return 'outlook';
  if (/^yahoo\./i.test(d)) return 'yahoo';
  return 'gmail'; // most custom domains for executives are Google Workspace; the user can change it
}

function friendlyError(e) {
  const t = `${e && e.message} ${e && e.responseText} ${e && e.serverResponseCode}`;
  if (/AUTHENTICATIONFAILED|Invalid credentials|authenticat|LOGIN failed/i.test(t)) return 'The email address or app password was not accepted. Use an app password, not the normal account password.';
  if (/ENOTFOUND|EAI_AGAIN/i.test(t)) return 'Could not find that mail server. Check the server name.';
  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|timeout|Failed to establish|required time/i.test(t)) return 'Could not reach the mail server. Check the internet connection.';
  if (/BasicAuthBlocked|disabled/i.test(t)) return 'This mailbox does not allow app passwords. Microsoft 365 work accounts need an administrator to allow IMAP.';
  return 'Could not read the inbox: ' + (e && e.message ? e.message : 'unknown error');
}

function findTextPart(node, want) {
  if (!node) return null;
  if (node.childNodes && node.childNodes.length) {
    for (const c of node.childNodes) { const r = findTextPart(c, want); if (r) return r; }
    return null;
  }
  if (node.type === want && node.disposition !== 'attachment') return node.part || '1';
  return null;
}

function cleanPreview(text, isHtml) {
  let s = String(text || '');
  if (isHtml) {
    s = s.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"');
  }
  // drop quoted replies and signatures so the preview shows what is new
  s = s.split(/\n>|\nOn .{5,80}wrote:|\n-- \n|\nFrom: .+\nSent: /)[0];
  return s.replace(/\s+/g, ' ').trim().slice(0, 220);
}

async function streamToString(stream, max) {
  const chunks = []; let n = 0;
  for await (const c of stream) { chunks.push(c); n += c.length; if (n >= max) break; }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchInbox(acct, limit = 25) {
  const client = new ImapFlow({
    host: acct.host, port: acct.port || 993, secure: acct.secure !== false,
    auth: { user: acct.user, pass: acct.pass }, logger: false,
    connectionTimeout: 20000, greetingTimeout: 15000, socketTimeout: 60000,
    tls: acct.tls || undefined
  });
  client.on('error', () => {});
  try {
    await client.connect();
  } catch (e) { throw new Error(friendlyError(e)); }
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const exists = client.mailbox.exists || 0;
      let unread = 0;
      try { const st = await client.status('INBOX', { unseen: true }); unread = st.unseen || 0; } catch (e) {}
      if (!exists) return { unread: 0, messages: [] };
      const from = Math.max(1, exists - limit + 1);
      const list = [];
      for await (const m of client.fetch(`${from}:*`, { uid: true, envelope: true, flags: true, internalDate: true, bodyStructure: true })) {
        list.push(m);
      }
      list.sort((a, b) => new Date(b.internalDate) - new Date(a.internalDate));
      const out = [];
      for (const m of list.slice(0, limit)) {
        const env = m.envelope || {};
        const f = (env.from && env.from[0]) || {};
        let preview = '';
        try {
          let part = findTextPart(m.bodyStructure, 'text/plain'), html = false;
          if (!part) { part = findTextPart(m.bodyStructure, 'text/html'); html = !!part; }
          if (part) {
            const { content } = await client.download(String(m.uid), part, { uid: true, maxBytes: 12000 });
            preview = cleanPreview(await streamToString(content, 12000), html);
          }
        } catch (e) { preview = ''; }
        out.push({
          uid: m.uid,
          messageId: env.messageId || '',
          from: { name: f.name || '', address: f.address || '' },
          subject: env.subject || '(no subject)',
          date: new Date(env.date || m.internalDate).toISOString(),
          unread: !(m.flags && m.flags.has('\\Seen')),
          flagged: !!(m.flags && m.flags.has('\\Flagged')),
          preview
        });
      }
      return { unread, messages: out };
    } finally { lock.release(); }
  } catch (e) {
    throw new Error(e.message && /^(The email|Could not)/.test(e.message) ? e.message : friendlyError(e));
  } finally {
    try { await client.logout(); } catch (e) { try { client.close(); } catch (_) {} }
  }
}

module.exports = { PRESETS, detectPreset, fetchInbox, cleanPreview };
