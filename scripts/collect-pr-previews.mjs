#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function safePreviewPath(name) {
  return typeof name === 'string' && name.length > 0 && !name.startsWith('/') &&
    !name.includes('\\') && name.split('/').every(p => p && p !== '..' && p !== '.' && p !== '.git');
}
export function validatePreview(root) {
  for (const entry of fs.readdirSync(root, {withFileTypes:true})) {
    if (!safePreviewPath(entry.name) || entry.isSymbolicLink()) throw Error('Unsafe preview entry');
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) validatePreview(target);
    else if (!entry.isFile()) throw Error('Unsupported preview file');
  }
  return true;
}
export function matchesPreview(meta, pr) {
  return pr.state === 'open' && meta.pr_number === pr.number && meta.head_sha === pr.head.sha;
}
function git(...args) {return execFileSync('git', args, {maxBuffer:64*1024*1024});}
function collect(output) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw Error('GITHUB_REPOSITORY required');
  const prs = JSON.parse(execFileSync('gh',['api','--paginate','--slurp','repos/'+repo+'/pulls?state=open&per_page=100'],{encoding:'utf8'})).flat();
  fs.rmSync(path.join(output,'pr-preview'),{recursive:true,force:true});
  for (const pr of prs) {
    if (pr.head.repo?.full_name !== repo) continue;
    const branch = 'pr-preview-'+pr.number;
    try {
      git('fetch','--quiet','origin','refs/heads/'+branch+':refs/remotes/origin/'+branch);
      const ref = 'refs/remotes/origin/'+branch;
      const meta = JSON.parse(git('show',ref+':preview-meta.json').toString());
      if (!matchesPreview(meta,pr)) {console.log('Skip outdated preview:',pr.number);continue;}
      const tree = git('ls-tree','-r','-z',ref).toString().split('\0').filter(Boolean);
      for (const row of tree) {
        const [description,name] = row.split('\t');
        if (!description.startsWith('100644 blob ') || !safePreviewPath(name)) throw Error('Unsafe preview tree');
      }
      const target = path.join(output,'pr-preview','pr-'+pr.number);
      for (const row of tree) {
        const name = row.split('\t')[1], dest = path.join(target,name);
        fs.mkdirSync(path.dirname(dest),{recursive:true});
        fs.writeFileSync(dest,git('show',ref+':'+name));
      }
      console.log('Included preview:',pr.number,meta.head_sha);
    } catch(error) {console.log('Preview unavailable:',pr.number,error.message.split('\n')[0]);}
  }
  const robots = path.join(output,'robots.txt');
  fs.appendFileSync(robots,'\nUser-agent: *\nDisallow: /pr-preview/\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) collect(path.resolve(process.argv[2] || 'dist'));
