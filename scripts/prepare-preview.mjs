#!/usr/bin/env node
// Make production-SEO HTML pages browsable offline and inside /pr-preview/pr-N/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const escapeRegex = value => value.replace(/[.*+?^$()|[\]{}]/g, '\\$&');
function htmlFiles(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(target);
  }
  return found;
}

// The preview bundle is mounted under a nested directory on the production
// domain. Relative links must resolve inside that directory, not from '/'.
function previewURL(root, renderedPage, suffix, attribute) {
  let target = suffix.split(/[?#]/)[0];
  const fragment = suffix.slice(target.length);
  // The loader appends "<category>.json" or "<id>/" to these directory URLs.
  const directoryPrefix = attribute === 'data-search-cards' || attribute === 'data-service-base';
  if (!directoryPrefix && (!target || target.endsWith('/'))) target += 'index.html';
  let relative = path.relative(path.dirname(renderedPage), path.join(root, target))
    .split(path.sep).join('/');
  if (directoryPrefix && !relative.endsWith('/')) relative += '/';
  return relative + fragment;
}

export function prepare(site, baseURL) {
  const root = path.resolve(site);
  const pages = htmlFiles(root);
  if (!pages.length || !fs.existsSync(path.join(root, 'assets/site.css'))) {
    throw Error('Missing generated site or stylesheet');
  }
  const attributes = 'href|src|action|data-search-index|data-search-cards|' +
    'data-compare-url|data-service-base|data-catalog-url';
  const localLinks = new RegExp('((?:' + attributes + ')=")' +
    escapeRegex(baseURL) + '([^"]*)(")', 'g');
  const rewrite = (markup, renderedPage) => markup.replace(localLinks,
    (_match, prefix, suffix, closing) => {
      const attribute = prefix.slice(0, -2);
      return prefix + previewURL(root, renderedPage, suffix, attribute) + closing;
    });

  for (const page of pages) {
    let content = fs.readFileSync(page, 'utf8');
    const canonical = content.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    content = rewrite(content, page);
    // Legacy service aliases also redirect via meta refresh and inline JS.
    // Only preview links are rewritten; the canonical remains production.
    content = content.replace(/(<meta http-equiv="refresh" content="0;url=)([^"]+)(")>/g,
      (_match, prefix, url, closing) => prefix +
        (url.startsWith(baseURL) ? previewURL(root, page, url.slice(baseURL.length), 'href') : url) +
        closing + '>');
    content = content.replace(/(window\.location\.replace\()("([^"]+)")(\);)/g,
      (_match, prefix, literal, url, suffix) => prefix +
        JSON.stringify(url.startsWith(baseURL)
          ? previewURL(root, page, url.slice(baseURL.length), 'href') : url) + suffix);
    if (canonical) {
      content = content.replace(/<link rel="canonical" href="[^"]+">/,
        '<link rel="canonical" href="' + canonical + '">');
    }
    content = content.replace(
      /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-9YPGG0XEZV"><\/script>/g,
      '');
    content = content.replace(
      /<script>window\.dataLayer=window\.dataLayer\|\|\[\];.*?gtag\('config','G-9YPGG0XEZV'\);<\/script>/gs,
      '');
    content = content.replace(/<meta name="fth-analytics" content="[^"]*">/g, '');
    content = content.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex,nofollow">');
    fs.writeFileSync(page, content);
  }

  // Home lazily injects raw HTML from JSON card fragments. Those fragments
  // render in Home's document URL, NOT their search/cards/ file location.
  // The first HTML-only pass left their links pointing at production.
  const cardsDirectory = path.join(root, 'search/cards');
  if (fs.existsSync(cardsDirectory)) {
    const home = path.join(root, 'index.html');
    for (const name of fs.readdirSync(cardsDirectory)) {
      if (!name.endsWith('.json')) continue;
      const filename = path.join(cardsDirectory, name);
      const cards = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (!cards || Array.isArray(cards) || typeof cards !== 'object') {
        throw Error('Invalid preview card fragments: ' + name);
      }
      for (const [id, html] of Object.entries(cards)) {
        if (typeof html !== 'string') throw Error('Invalid preview card: ' + id);
        cards[id] = rewrite(html, home);
      }
      fs.writeFileSync(filename, JSON.stringify(cards) + '\n');
    }
  }
  return pages.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = name => {
    const index = args.indexOf(name);
    return index < 0 ? null : args[index + 1];
  };
  const site = value('--site');
  const baseURL = value('--base-url');
  if (!site || !baseURL) {
    console.error('Usage: node scripts/prepare-preview.mjs --site dist --base-url https://example.com/');
    process.exitCode = 2;
  } else {
    try {
      console.log('Prepared', prepare(site, baseURL), 'offline preview pages');
    } catch (error) {
      console.error('FAIL: ' + error.message);
      process.exitCode = 1;
    }
  }
}
