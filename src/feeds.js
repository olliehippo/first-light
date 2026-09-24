'use strict';
// Collects headlines for the brief from news feeds, for free, on this Mac.
// Claude then only reads these headlines instead of searching the web.
const { XMLParser } = require('fast-xml-parser');

// Curated publisher feeds, used alongside a Google News search per topic and per competitor.
const DEFAULT_FEEDS = [
  'https://www.fintechfutures.com/feed/',
  'https://www.finextra.com/rss/headlines.aspx',
  'https://fintech.global/feed/',
  'https://www.fca.org.uk/news/rss.xml',
  'https://www.bankofengland.co.uk/rss/news',
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://www.theblock.co/rss.xml'
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text', cdataPropName: false, processEntities: true, htmlEntities: true, trimValues: true });

const text = v => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object') return text(v['#text'] ?? '');
  return '';
};
const decode = s => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&[a-z]+;/gi, ' ');
const strip = s => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const arr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const hostName = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

function parseFeed(xml, fallbackSource) {
  const doc = parser.parse(xml);
  const out = [];
  if (doc.rss || doc['rdf:RDF']) {
    const ch = doc.rss ? doc.rss.channel : doc['rdf:RDF'];
    const feedTitle = strip(text(ch && ch.title));
    const items = arr((ch && ch.item) || (doc['rdf:RDF'] && doc['rdf:RDF'].item));
    for (const it of items) {
      let title = strip(text(it.title));
      let source = strip(text(it.source)) || '';
      const gn = /news\.google\.com/.test(text(it.link));
      if (gn && source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
      let summary = gn ? '' : strip(text(it.description) || text(it['content:encoded'])).replace(/The post .* appeared first on .*$/i, '').trim();
      out.push({ title, link: text(it.link).trim(), date: text(it.pubDate) || text(it['dc:date']), source: source || feedTitle || fallbackSource, summary });
    }
  } else if (doc.feed) {
    const feedTitle = strip(text(doc.feed.title));
    for (const e of arr(doc.feed.entry)) {
      const links = arr(e.link);
      const alt = links.find(l => l && (l['@rel'] === 'alternate' || !l['@rel'])) || links[0] || {};
      out.push({ title: strip(text(e.title)), link: (alt['@href'] || text(alt)).trim(), date: text(e.published) || text(e.updated), source: feedTitle || fallbackSource, summary: strip(text(e.summary) || text(e.content)) });
    }
  }
  return out.filter(i => i.title && /^https?:\/\//.test(i.link)).map(i => {
    const t = Date.parse(i.date);
    return { ...i, time: Number.isFinite(t) ? t : 0, summary: i.summary.length > 240 ? i.summary.slice(0, 237).replace(/\s+\S*$/, '') + '...' : i.summary };
  });
}

async function fetchText(url, timeoutMs = 15000) {
  if (process.env.MM_FEEDS_BASE) url = `${process.env.MM_FEEDS_BASE}/feed?u=${encodeURIComponent(url)}`; // tests only
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': "Mozilla/5.0 (Macintosh) First Light", accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' } });
    if (!res.ok) throw new Error(String(res.status));
    return await res.text();
  } finally { clearTimeout(t); }
}

const googleNewsUrl = (q, days) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=en-GB&gl=GB&ceid=GB:en`;
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Gathers headlines. Returns { items, stats } where each item has a short id Claude refers to.
 */
async function gather(prefs, { fetcher = fetchText, now = Date.now() } = {}) {
  const days = Math.max(1, Math.round(prefs.windowHours / 24));
  const cutoff = now - Math.max(prefs.windowHours, 24) * 3600 * 1000 - 6 * 3600 * 1000;
  const compCutoff = now - Math.max(prefs.windowHours, 72) * 3600 * 1000 * 2; // quiet competitors: allow older, dated items
  const jobs = [];
  for (const t of prefs.plan.sections) jobs.push({ url: googleNewsUrl(t.query || t.name, days), group: 'section', tag: t.name, max: 14, cutoff });
  for (const c of prefs.plan.watch) jobs.push({ url: googleNewsUrl(c.query || `"${c.name}"`, Math.max(days, 7)), group: 'watch', tag: c.name, max: 8, cutoff: compCutoff });
  for (const f of prefs.feeds || []) jobs.push({ url: f, group: 'feed', tag: hostName(f), max: 15, cutoff });

  const stats = { sources: jobs.length, failed: [] };
  const results = await Promise.all(jobs.map(async j => {
    try {
      const items = parseFeed(await fetcher(j.url), j.tag).filter(i => !i.time || i.time >= j.cutoff).sort((a, b) => b.time - a.time).slice(0, j.max);
      return items.map(i => ({ ...i, group: j.group, tag: j.tag }));
    } catch (e) { stats.failed.push(j.group === 'feed' ? j.tag : `${j.group}: ${j.tag}`); return []; }
  }));

  // de-duplicate the same story reported by several outlets or feeds
  const seen = new Map();
  for (const it of results.flat()) {
    const key = norm(it.title).slice(0, 70);
    if (!key) continue;
    const prev = seen.get(key);
    if (prev) { if (!prev.tags.includes(it.tag)) prev.tags.push(it.tag); if (!prev.summary && it.summary) prev.summary = it.summary; continue; }
    seen.set(key, { ...it, tags: [it.tag] });
  }
  const items = [...seen.values()].sort((a, b) => b.time - a.time).slice(0, 220).map((it, n) => ({ ...it, id: 'n' + (n + 1) }));
  stats.items = items.length;
  return { items, stats };
}

function formatForPrompt(items) {
  return items.map(i => {
    const d = i.time ? new Date(i.time).toISOString().slice(0, 10) : 'undated';
    return `[${i.id}] ${i.title} | ${i.source} | ${d} | found via: ${i.tags.join(', ')}${i.summary ? ` | ${i.summary}` : ''}`;
  }).join('\n');
}

module.exports = { DEFAULT_FEEDS, parseFeed, gather, formatForPrompt, googleNewsUrl };
