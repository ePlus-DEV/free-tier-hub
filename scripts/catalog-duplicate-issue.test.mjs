import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { processDuplicateCandidateIssue } from './catalog-duplicate-issue.mjs';
import { renderCandidateIssue } from './catalog-issue-format.mjs';

const HEAD = 'main-sha-abc';
const candidate = {
  id:'fillout-forms-free', name:'Fillout Forms Free',
  category:'forms-surveys',plan:'ongoing',
  pricing_url:'https://www.fillout.com/pricing',
  free_limit:'1,000 responses per month, unlimited free forms',
  watch_out:'Branded forms and usage restrictions apply',
  credit_card:'check',commercial_use:'check',last_checked:'2026-11-17'
};
const listed = {...candidate,id:'fillout-free-forms',name:'Fillout Free Forms'};

function mockGitHub({original=candidate,existing=[listed],closed=false,
  association='OWNER',mainSha=HEAD,postFails=false,changeAfterPost=false,
  preexistingComment=false}={}) {
  const calls=[];
  let state=closed?'closed':'open';
  let body=renderCandidateIssue(original);
  const comments=preexistingComment
    ? [{body:'<!-- free-tier-hub:duplicate-candidate:v1:' + original.id + ' -->'}] : [];
  const exec=(program,args)=>{
    assert.equal(program,'gh');
    calls.push([...args]);
    if(args[0]!=='api') throw Error('Unexpected GitHub command');
    const endpoint='repos/ePlus-DEV/free-tier-hub/issues/2506';
    if(args.includes('--paginate')) return JSON.stringify([comments]);
    if(args.includes('--method') && args.includes('POST')) {
      if(postFails) throw Error('POST comment denied');
      const comment=args.find(x=>x.startsWith('body=')).slice(5);
      comments.push({body:comment});
      if(changeAfterPost) body=renderCandidateIssue({...original,name:'Changed product'});
      return '{}';
    }
    if(args.includes('--method') && args.includes('PATCH')) {
      assert.ok(args.includes('state=closed'));
      assert.ok(args.includes('state_reason=duplicate'));
      state='closed';
      return '{}';
    }
    if(args[1]===endpoint) return JSON.stringify({
      number:2506,state,author_association:association,
      title:'[catalog-candidate] '+original.id,body
    });
    if(args[1]==='repos/ePlus-DEV/free-tier-hub/git/ref/heads/main') {
      return JSON.stringify({object:{sha:mainSha}});
    }
    throw Error('Unexpected API: '+args.join(' '));
  };
  const run=() => processDuplicateCandidateIssue('ePlus-DEV/free-tier-hub',
    2506,existing,HEAD,exec);
  return {run,calls,comments,get state(){return state;}};
}

test('confirmed Fillout duplicate comments and closes with duplicate reason',()=>{
  const github=mockGitHub();
  assert.equal(github.run(),'duplicate');
  assert.equal(github.state,'closed');
  assert.equal(github.comments.length,1);
  assert.match(github.comments[0].body,/fillout-free-forms\.json/);
  assert.match(github.comments[0].body,/No new PR is needed/);
  assert.ok(github.calls.some(c=>c.includes('state_reason=duplicate')));
});

test('already closed or commented Issue is safely idempotent',()=>{
  const done=mockGitHub({closed:true});
  assert.equal(done.run(),'closed');
  assert.equal(done.comments.length,0);
  const pending=mockGitHub({preexistingComment:true});
  assert.equal(pending.run(),'duplicate');
  assert.equal(pending.comments.length,1);
});

test('shared URL for a distinct product stays open for human review',()=>{
  const github=mockGitHub({original:{...candidate,name:'Different product'}});
  assert.equal(github.run(),'review');
  assert.equal(github.run(),'review');
  assert.equal(github.state,'open');
  assert.equal(github.comments.length,1);
  assert.match(github.comments[0].body,/Potential catalog overlap/);
  assert.ok(!github.calls.some(c=>c.includes('state=closed')));
});

test('same name with a different URL is review-only',()=>{
  const github=mockGitHub({original:{...candidate,name:listed.name,
    pricing_url:'https://different.example/pricing'}});
  assert.equal(github.run(),'review');
  assert.equal(github.state,'open');
});

test('unrelated new service is unaffected',()=>{
  const github=mockGitHub({existing:[]});
  assert.equal(github.run(),'new');
  assert.equal(github.comments.length,0);
  assert.equal(github.state,'open');
});

test('multiple matching records require human review',()=>{
  const github=mockGitHub({existing:[listed,{...listed,id:'second-listing'}]});
  assert.equal(github.run(),'review');
  assert.equal(github.state,'open');
});

test('untrusted Issue never closes',()=>{
  const github=mockGitHub({association:'NONE'});
  assert.throws(github.run,/Untrusted/);
  assert.equal(github.comments.length,0);
});

test('stale main snapshot fails without comment or closing Issue',()=>{
  const github=mockGitHub({mainSha:'newer-main-sha'});
  assert.throws(github.run,/main changed/);
  assert.equal(github.state,'open');
  assert.equal(github.comments.length,0);
});

test('failed comment does not close Issue',()=>{
  const github=mockGitHub({postFails:true});
  assert.throws(github.run,/POST comment denied/);
  assert.equal(github.state,'open');
});

test('candidate modified during comment is not closed',()=>{
  const github=mockGitHub({changeAfterPost:true});
  assert.throws(github.run,/Candidate changed during review/);
  assert.equal(github.state,'open');
});

test('queue classifies duplicates before deployment and never sends them to PR creation',()=>{
  const wf=fs.readFileSync(new URL('../.github/workflows/catalog-candidate-queue.yml',
    import.meta.url),'utf8');
  assert.ok(wf.indexOf('- name: Classify and close confirmed duplicates') <
    wf.indexOf('- name: Resolve deployment evidence'));
  assert.match(wf,/if: steps\.identity\.outputs\.outcome == 'new'/);
  assert.match(wf,/run: node scripts\/catalog-duplicate-issue\.mjs/);
  assert.match(wf,/GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
});
