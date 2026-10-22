const http=require('http'),{spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const free=()=>new Promise(r=>{const s=http.createServer().listen(0,()=>{const p=s.address().port;s.close(()=>r(p))})});
/* fake OpenAI-compatible server (streaming + normal) */
async function mockLLM(opts={}){
 const state={calls:0,last:null,fail:false,bad:new Set(),models:[]},port=await free();
 const srv=http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  const j=JSON.parse(b);state.calls++;state.last=j;state.models.push(j.model);
  if(state.bad.has(j.model)){r.writeHead(429);return r.end('rate limited')}
  if(state.fail){r.writeHead(500);return r.end('boom')}
  const reply='<think>secret</think>Qwen answer to: '+j.messages[j.messages.length-1].content;
  if(j.stream){r.writeHead(200,{'Content-Type':'text/event-stream'});
   const parts=reply.match(/.{1,7}/g);let i=0;(function n(){if(i>=parts.length){r.write('data: [DONE]\n\n');return r.end()}
    r.write('data: '+JSON.stringify({choices:[{delta:{content:parts[i++]}}]})+'\n\n');setTimeout(n,2)})()}
  else{r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({choices:[{message:{content:reply}}]}))}})});
 await new Promise(r=>srv.listen(port,r));
 return {state,url:'http://127.0.0.1:'+port+'/v1',close:()=>new Promise(r=>srv.close(r))};
}
/* fake Upstash REST (Redis commands as JSON arrays) */
async function mockUpstash(){
 const kv={},port=await free();
 const srv=http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{const [c,k,v]=JSON.parse(b);let res=null;
  if(c==='GET')res=kv[k]===undefined?null:kv[k];else if(c==='SET'){kv[k]=v;res='OK'}
  r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({result:res}))})});
 await new Promise(r=>srv.listen(port,r));
 return {kv,url:'http://127.0.0.1:'+port,close:()=>new Promise(r=>srv.close(r))};
}
async function startApp(env={}){
 const port=await free(),dir=env.DATA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'wai-'));
 const cleanEnv={...process.env};for(const k of Object.keys(cleanEnv))if(/^(LLM_|UPSTASH_|LEARN_|ADMIN_)/.test(k))delete cleanEnv[k];
 const p=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...cleanEnv,PORT:port,DATA_DIR:dir,...env}});
 let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/health');if(r.ok)break}catch(e){}await new Promise(r=>setTimeout(r,50))}
 const post=(u,b)=>fetch(base+u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());
 return {base,dir,log:()=>log,
  chat:(text,sid='s1')=>post('/api/chat',{text,sid}),
  fb:(kind,text,out,sid='s1')=>post('/api/feedback',{kind,text,out,sid}),
  stream:async(text,sid='s1')=>{const res=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,sid,stream:true})});
   const txt=await res.text(),ev=txt.split('\n\n').filter(x=>x.startsWith('data:')).map(x=>JSON.parse(x.slice(5)));return {deltas:ev.filter(e=>e.delta).map(e=>e.delta),done:ev.find(e=>e.done)}},
  stop:()=>new Promise(r=>{p.once('exit',r);p.kill('SIGTERM')})};
}
module.exports={mockLLM,mockUpstash,startApp};
