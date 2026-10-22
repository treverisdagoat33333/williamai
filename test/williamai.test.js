const test=require('node:test'),assert=require('node:assert/strict');
const {mockLLM,mockUpstash,startApp}=require('./helpers');
const Q='why do cats purr when happy';

test('exact skills never reach Qwen; unsure questions do; <think> is hidden',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url,LLM_MODEL:'qwen-test'});
 try{
  const a=await app.chat('what is 25*4');assert.equal(a.skill,'math');assert.equal(m.state.calls,0);
  const b=await app.chat(Q);assert.match(b.skill,/^llm:qwen-test/);assert.equal(b.out,'Qwen answer to: '+Q);assert.equal(m.state.calls,1);
  const sys=m.state.last.messages[0];assert.equal(sys.role,'system');assert.match(sys.content,/untrusted input/);
  assert.equal(m.state.last.messages.at(-1).content,Q,'user text only ever goes in the user role');
 }finally{await app.stop();await m.close()}});

test('streaming sends deltas then a final event',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url});
 try{const r=await app.stream(Q);assert.ok(r.deltas.length>2);assert.equal(r.deltas.join(''),'Qwen answer to: '+Q);assert.equal(r.done.out,'Qwen answer to: '+Q);assert.match(r.done.skill,/^llm:/);
  const b=await app.stream('what is 2+2');assert.equal(b.deltas.length,0);assert.equal(b.done.skill,'math');
 }finally{await app.stop();await m.close()}});

test('LLM down -> brain answers instead (no crash)',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url});m.state.fail=true;
 try{const r=await app.chat(Q);assert.ok(r.out&&!/^llm:/.test(r.skill));const s=await app.stream(Q);assert.ok(s.done.out&&!/^llm:/.test(s.done.skill));
 }finally{await app.stop();await m.close()}});

test('daily cap switches to brain-only',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url,LLM_DAILY_CAP:'2'});
 try{await app.chat('why do cats purr when happy');await app.chat('why is the ocean salty and deep');
  const r=await app.chat('how do volcanoes form underground');assert.ok(!/^llm:/.test(r.skill));assert.equal(m.state.calls,2);
 }finally{await app.stop();await m.close()}});

test('per-IP hourly cap',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url,LLM_IP_HOURLY:'1'});
 try{await app.chat('why do cats purr when happy');const r=await app.chat('why is the ocean salty and deep');assert.ok(!/^llm:/.test(r.skill));assert.equal(m.state.calls,1);
 }finally{await app.stop();await m.close()}});

test('learn loop: thumbs-up teaches the brain, thumbs-down un-teaches it, forged feedback is ignored',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url});
 try{
  const a=await app.chat(Q);assert.match(a.skill,/^llm:/);
  const forged=await app.fb('up',Q,'Totally fake answer');assert.equal(forged.result,'ignored');
  const other=await app.fb('up',Q,a.out,'someone-else');assert.equal(other.result,'ignored','another session cannot teach an answer it never received');
  assert.equal((await app.fb('up',Q,a.out)).result,'learned');
  const calls=m.state.calls,b=await app.chat(Q);assert.match(b.skill,/^intent:taught/);assert.equal(b.out,a.out);assert.equal(m.state.calls,calls,'learned answers cost nothing');
  assert.equal((await app.fb('down',Q,a.out)).result,'unlearned');
  const c=await app.chat(Q);assert.match(c.skill,/^llm:/);
 }finally{await app.stop();await m.close()}});

test('context-dependent questions are not learned',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url});
 try{const q='why did you say that about cats',a=await app.chat(q);assert.match(a.skill,/^llm:/);assert.equal((await app.fb('up',q,a.out)).result,'ignored');
 }finally{await app.stop();await m.close()}});

test('LEARN_MIN_UPS=2 needs two different sessions',async()=>{
 const m=await mockLLM(),app=await startApp({LLM_BASE_URL:m.url,LEARN_MIN_UPS:'2'});
 try{const a=await app.chat(Q,'s1');assert.equal((await app.fb('up',Q,a.out,'s1')).result,'pending');
  const b=await app.chat(Q,'s2');assert.equal(b.out,a.out);assert.equal((await app.fb('up',Q,b.out,'s2')).result,'learned');
 }finally{await app.stop();await m.close()}});

test('persistence: learned answers survive a restart (files) and a wiped disk (Upstash)',async()=>{
 const m=await mockLLM(),up=await mockUpstash(),dir1=require('fs').mkdtempSync(require('path').join(require('os').tmpdir(),'wai1-'));
 const env={LLM_BASE_URL:m.url,UPSTASH_REDIS_REST_URL:up.url,UPSTASH_REDIS_REST_TOKEN:'t'};
 let app=await startApp({...env,DATA_DIR:dir1});
 try{
  const a=await app.chat(Q);await app.fb('up',Q,a.out);await app.stop();
  assert.ok(up.kv['williamai:learned'],'written to the remote store');
  app=await startApp({...env,DATA_DIR:require('fs').mkdtempSync(require('path').join(require('os').tmpdir(),'wai2-'))}); // brand new empty disk
  const b=await app.chat(Q);assert.match(b.skill,/^intent:taught/);assert.equal(b.out,a.out);
 }finally{await app.stop();await m.close();await up.close()}});

test('no LLM configured = original brain-only behaviour',async()=>{
 const app=await startApp();
 try{const r=await app.chat(Q);assert.ok(!/^llm:/.test(r.skill));const h=await fetch(app.base+'/api/health').then(r=>r.json());assert.equal(h.llm.enabled,false);
 }finally{await app.stop()}});

test('fallback models: a rate-limited main model falls through to the next one (normal + streaming)',async()=>{
 const m=await mockLLM();m.state.bad.add('main-free');
 const app=await startApp({LLM_BASE_URL:m.url,LLM_MODEL:'main-free',LLM_FALLBACK_MODELS:'second-free, third-free'});
 try{
  const a=await app.chat(Q);assert.match(a.skill,/^llm:/);assert.equal(a.out,'Qwen answer to: '+Q);
  const s=await app.stream('why is the ocean salty and deep');assert.equal(s.done.out,'Qwen answer to: why is the ocean salty and deep');
  assert.ok(m.state.models.includes('main-free')&&m.state.models.includes('second-free'));assert.ok(!m.state.models.includes('third-free'));
 }finally{await app.stop();await m.close()}});
