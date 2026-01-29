import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

import { canonicalizeText } from './text.js';

const BLOCKED_HOSTS = new Set(['localhost']);

function normalizeHostname(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
}

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip) {
  const value = String(ip || '').toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fe80:')) return true; // link-local
  if (value.startsWith('fc') || value.startsWith('fd')) return true; // unique local
  if (value.startsWith('::ffff:')) {
    const ipv4 = value.slice('::ffff:'.length);
    if (net.isIP(ipv4) === 4) return isPrivateIpv4(ipv4);
  }
  return false;
}

function isPrivateIp(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true;
}

async function assertSafeHostname(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) throw new Error('Invalid hostname');
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) {
    throw new Error('Blocked host');
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Blocked IP');
    return;
  }

  const resolved = await lookup(host, { all: true });
  if (!Array.isArray(resolved) || resolved.length === 0) throw new Error('DNS lookup failed');
  for (const record of resolved) {
    if (record?.address && isPrivateIp(record.address)) {
      throw new Error('Blocked IP');
    }
  }
}

async function assertSafeUrl(rawUrl) {
  const url = rawUrl instanceof URL ? rawUrl : new URL(String(rawUrl || '').trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported protocol');
  }
  if (url.username || url.password) {
    throw new Error('Credentials not allowed in URL');
  }
  await assertSafeHostname(url.hostname);
  return url;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchHtml(url, { timeoutMs, maxBytes, userAgent }) {
  let currentUrl = String(url || '').trim();
  const maxRedirects = 5;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': userAgent,
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without location');
      const nextUrl = new URL(location, currentUrl).toString();
      await assertSafeUrl(nextUrl);
      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) throw new Error(`Fetch failed (${response.status})`);

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const allowed = !contentType
      || contentType.includes('text/html')
      || contentType.includes('application/xhtml+xml')
      || contentType.includes('text/plain');
    if (!allowed) throw new Error('Unsupported content type');

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > maxBytes) throw new Error('Content too large');

    if (!response.body) throw new Error('Empty response body');
    const chunks = [];
    let received = 0;
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      received += buffer.length;
      if (received > maxBytes) throw new Error('Content too large');
      chunks.push(buffer);
    }

    return {
      html: Buffer.concat(chunks).toString('utf8'),
      contentType,
      finalUrl: response.url || currentUrl
    };
  }

  throw new Error('Too many redirects');
}

export async function extractArticleFromUrl(rawUrl, { timeoutMs = 8000, maxBytes = 8_000_000, userAgent = '' } = {}) {
  const url = await assertSafeUrl(rawUrl);
  const { html, contentType, finalUrl } = await fetchHtml(url.toString(), { timeoutMs, maxBytes, userAgent });

  const resolvedUrl = new URL(finalUrl || url.toString());
  const fallbackTitle = resolvedUrl.hostname || 'Untitled';

  if (contentType.includes('text/plain')) {
    const text = canonicalizeText(html);
    if (!text) throw new Error('No readable text found');
    return {
      title: fallbackTitle,
      content: text,
      rawHtml: `<pre>${escapeHtml(text)}</pre>`
    };
  }

  const dom = new JSDOM(html, { url: resolvedUrl.toString() });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = canonicalizeText(article?.textContent || '');
  if (!text) throw new Error('No readable text found');

  return {
    title: String(article?.title || fallbackTitle).trim() || fallbackTitle,
    content: text,
    rawHtml: String(article?.content || '')
  };
}
