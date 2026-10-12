#!/usr/bin/env node
// Make production-SEO HTML pages browsable offline for isolated PR previews.
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

export function prepare(site, baseURL) {
  const root = path.resolve(site);
  const pages = htmlFiles(root);
  if (!pages.length || !fs.existsSync(path.join(root, 'assets/site.css'))) {
    throw Error('Missing generated site or stylesheet');
  }
  const localLinks = new RegExp('((?:href|src)=")' + escapeRegex(baseURL) + '([^"]*)(")', 'g');
  for (const page of pages) {
    let content = fs.readFileSync(page, 'utf8');
    const canonical = content.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    content = content.replace(localLinks, (_match, prefix, url, suffix) => {
      let target = url.split(/[?#]/)[0];
      const fragment = url.slice(target.length);
      if (!target || target.endsWith('/')) target += 'index.html';
      const relative = path.relative(path.dirname(page), path.join(root, target))
        .split(path.sep).join('/');
      return prefix + relative + fragment + suffix;
    });
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
    fs.writeFileSync(page, content);
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
