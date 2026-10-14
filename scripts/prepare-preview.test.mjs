import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepare } from './prepare-preview.mjs';

const URL = 'https://free-tier.eplus.dev/';

test('preview localizes nested links, keeps production canonical, removes analytics', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'free-tier-hub-preview-'));
  try {
    const assets = path.join(root, 'assets');
    const detail = path.join(root, 'service/vercel');
    fs.mkdirSync(assets, { recursive: true });
    fs.mkdirSync(detail, { recursive: true });
    fs.writeFileSync(path.join(assets, 'site.css'), 'body{}');
    fs.writeFileSync(path.join(root, 'index.html'),
      '<meta name="robots" content="index,follow">' +
      '<link rel="canonical" href="' + URL + '">' +
      '<link rel="stylesheet" href="' + URL + 'assets/site.css">' +
      '<script src="' + URL + 'assets/site.js"></script>' +
      '<a href="' + URL + 'service/vercel/">Vercel</a>' +
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-9YPGG0XEZV"></script>');
    fs.writeFileSync(path.join(detail, 'index.html'),
      '<link rel="canonical" href="' + URL + 'service/vercel/">' +
      '<a href="' + URL + '">Home</a>' +
      '<link rel="stylesheet" href="' + URL + 'assets/site.css">' +
      "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-9YPGG0XEZV');</script>");
    assert.equal(prepare(root, URL), 2);
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const page = fs.readFileSync(path.join(detail, 'index.html'), 'utf8');
    assert.match(home, /href="assets\/site\.css"/);
    assert.match(home, /src="assets\/site\.js"/);
    assert.match(home, /href="service\/vercel\/index\.html"/);
    assert.match(home, /rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/"/);
    assert.match(page, /href="\.\.\/\.\.\/assets\/site\.css"/);
    assert.match(page, /href="\.\.\/\.\.\/index\.html"/);
    assert.match(page, /rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/service\/vercel\/"/);
    assert.match(home, /name="robots" content="noindex,nofollow"/);
    assert.doesNotMatch(home, /googletagmanager\.com/);
    assert.doesNotMatch(page, /gtag\('config'/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
