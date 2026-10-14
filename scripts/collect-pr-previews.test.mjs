import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {safePreviewPath,validatePreview,matchesPreview} from './collect-pr-previews.mjs';
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
