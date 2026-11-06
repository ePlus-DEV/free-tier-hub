import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {safePreviewPath,validatePreview,matchesPreview,finalizePreview} from './collect-pr-previews.mjs';
test('preview rejects traversal and symlinks and requires a current open PR head',()=>{
  for(const name of ['/index.html','../secret','a/../../secret','.git/config','a\\b']) assert.equal(safePreviewPath(name),false);
  assert.equal(safePreviewPath('service/vercel/index.html'),true);
  const pr={state:'open',number:1,head:{sha:'current'}};
  assert.equal(matchesPreview({pr_number:1,head_sha:'current'},pr),true);
  assert.equal(matchesPreview({pr_number:1,head_sha:'old'},pr),false);
  assert.equal(matchesPreview({pr_number:1,head_sha:'current'},{...pr,state:'closed'}),false);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'preview-check-'));
  try{
    fs.writeFileSync(path.join(dir,'index.html'),'preview');
    assert.equal(validatePreview(dir),true);
    fs.symlinkSync('/tmp',path.join(dir,'link'));
    assert.throws(()=>validatePreview(dir),/Unsafe/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('collector repairs navigation from older preview snapshots before deployment', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collected-preview-'));
  try {
    fs.mkdirSync(path.join(dir, 'assets'), {recursive:true});
    fs.mkdirSync(path.join(dir, 'search/cards'), {recursive:true});
    fs.writeFileSync(path.join(dir, 'assets/site.css'), 'body{}');
    fs.writeFileSync(path.join(dir, 'index.html'),
      '<link rel="canonical" href="https://free-tier.eplus.dev/">' +
      '<meta name="robots" content="index,follow">' +
      '<div data-compare-url="https://free-tier.eplus.dev/compare/"></div>');
    const card = '<a href="https://free-tier.eplus.dev/service/algolia-free/">Algolia</a>';
    fs.writeFileSync(path.join(dir, 'search/cards/search.json'), JSON.stringify({algolia:card}));
    assert.equal(finalizePreview(dir), 1);
    const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const lazy = JSON.parse(fs.readFileSync(path.join(dir, 'search/cards/search.json'), 'utf8'));
    assert.match(page, /data-compare-url="compare\/index\.html"/);
    assert.match(page, /rel="canonical" href="https:\/\/free-tier\.eplus\.dev\/"/);
    assert.match(page, /content="noindex,nofollow"/);
    assert.match(lazy.algolia, /href="service\/algolia-free\/index\.html"/);
    assert.equal(finalizePreview(dir), 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'search/cards/search.json'), 'utf8')),lazy);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
