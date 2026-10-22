require('./env');
const http=require('http'),fs=require('fs'),path=require('path');
const db=require('./store'),core=require('./core');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const json=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const E=x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const hits={};setInterval(()=>{for(const k in hits)delete hits[k]},60000).unref();
let sessions,st;
const readBody=(req,max,cb)=>{let b='';req.on('data',c=>{b+=c;if(b.length>max)req.destroy()});req.on('end',()=>cb(b))};
const ipOf=req=>String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'?').split(',')[0].trim();
function pruneSessions(){const ks=Object.keys(sessions);if(ks.length>300){ks.sort((a,b)=>(sessions[a].seen||0)-(sessions[b].seen||0)).slice(0,ks.length-300).forEach(k=>delete sessions[k])}}

async function chat(req,res){
 const ip=ipOf(req);hits[ip]=(hits[ip]||0)+1;
 if(hits[ip]>60)return json(res,429,{out:'Slow down a little.',skill:'limit',conf:1});
 readBody(req,5000,async b=>{
  let d;try{d=JSON.parse(b)}catch(e){return json(res,400,{out:'Bad request',skill:'error',conf:0})}
  const {text,sid}=d;
  if(typeof text!=='string'||!text.trim()||typeof sid!=='string'||sid.length>64)return json(res,400,{out:'Bad request',skill:'error',conf:0});
  const s=sessions[sid]||(sessions[sid]={name:null,last:null,turns:0});s.seen=Date.now();
  const ac=new AbortController();res.on('close',()=>ac.abort());
  const opts={ip,signal:ac.signal};
  try{
   if(d.stream===true){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Accel-Buffering':'no'});
    opts.onDelta=t=>res.write('data: '+JSON.stringify({delta:t})+'\n\n');
    const r=await core.respond(text.slice(0,4000),s,opts);
    track(r);res.write('data: '+JSON.stringify({done:true,out:r.out,skill:r.skill,conf:r.conf})+'\n\n');return res.end();
   }
   const r=await core.respond(text.slice(0,4000),s,opts);track(r);json(res,200,r);
  }catch(e){console.error('[chat]',e.message);if(res.headersSent)return res.end();json(res,500,{out:'Something broke on my side. Try again.',skill:'error',conf:0})}
 });
}
function track(r){st.total++;const sk=String(r.skill).split(':')[0];st.skills[sk]=(st.skills[sk]||0)+1;db.touch('stats');pruneSessions();db.touch('sessions')}

function feedback(req,res){readBody(req,8000,b=>{try{
 const d=JSON.parse(b),sid=String(d.sid||'');let result='noted';
 if(d.kind==='up')st.up++;
 else if(d.kind==='down'){st.down++;const f=db.get('feedback',[]);f.push({q:String(d.text).slice(0,200),a:String(d.out).slice(0,200),skill:String(d.skill||'').slice(0,40)});db.set('feedback',f.slice(-300))}
 if(d.kind==='up'||d.kind==='down')result=core.feedback(d.kind,d.text,d.out,sid,sessions[sid]);
 db.touch('stats');db.touch('sessions');json(res,200,{ok:true,result})}catch(e){json(res,400,{ok:false})}})}

function admin(req,res){
 const k=process.env.ADMIN_KEY;if(!k||new URL(req.url,'http://x').searchParams.get('key')!==k){res.writeHead(403);return res.end('Forbidden')}
 const un=db.get('unknown',[]).slice(-40).reverse(),fb=db.get('feedback',[]).slice(-20).reverse(),sk=Object.entries(st.skills).sort((a,b)=>b[1]-a[1]);
 const u=core.usage(),ln=core.learnedList().filter(l=>l.src==='llm').slice(-15).reverse();
 const brainN=sk.filter(x=>x[0]!=='llm').reduce((n,x)=>n+x[1],0),llmN=st.skills.llm||0;
 res.writeHead(200,{'Content-Type':'text/html'});
 res.end('<meta name=viewport content="width=device-width,initial-scale=1"><body style="background:#0a0b10;color:#e8eaf2;font:15px system-ui;max-width:700px;margin:auto;padding:16px"><h1>williamAI admin</h1>'
 +'<p>Messages: <b>'+st.total+'</b> &middot; Sessions: <b>'+Object.keys(sessions).length+'</b> &middot; Thumbs up: <b>'+st.up+'</b> &middot; Thumbs down: <b>'+st.down+'</b></p>'
 +'<p>Brain: '+E(JSON.stringify(core.stats()))+'</p>'
 +'<h3>Qwen layer</h3><p>'+E(JSON.stringify(core.llm()))+'<br>Storage: '+(db.remote?'Upstash + local files':'local files only (resets on Render free plan)')+'</p>'
 +'<p>Answered by brain: <b>'+brainN+'</b> &middot; by Qwen: <b>'+llmN+'</b> (all time)<br>Today ('+u.day+'): Qwen calls <b>'+u.calls+'</b> / '+u.dailyCap+' &middot; errors <b>'+u.errors+'</b> &middot; blocked by caps <b>'+u.capped+'</b> &middot; est. tokens <b>'+u.tokens+'</b> (rough, chars/4)</p>'
 +'<h3>Learned from Qwen ('+core.learnedList().filter(l=>l.src==='llm').length+', waiting for more thumbs-up: '+core.pending()+')</h3>'+ln.map(x=>'&bull; <b>'+E(x.q)+'</b> &rarr; '+E(x.a.slice(0,120))).join('<br>')
 +'<h3>Skills used</h3>'+sk.map(x=>E(x[0])+': '+x[1]).join('<br>')
 +'<h3>Unanswered questions (teach these!)</h3>'+un.map(x=>'&bull; '+E(x)).join('<br>')
 +'<h3>Thumbs-down replies</h3>'+fb.map(x=>'&bull; <b>'+E(x.q)+'</b> &rarr; '+E(x.a)).join('<br>'))}

const server=http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(req.method==='GET'&&url==='/api/health')return json(res,200,{ok:true,engine:'WilliamCore v1',llm:core.llm(),storage:db.remote?'upstash':'local',...core.stats()});
 if(req.method==='POST'&&url==='/api/chat')return chat(req,res);
 if(req.method==='POST'&&url==='/api/feedback')return feedback(req,res);
 if(url==='/admin')return admin(req,res);
 const f=path.normalize(url==='/'?'/index.html':url);if(f.includes('..'))return json(res,403,{});
 fs.readFile(path.join(PUB,f),(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(d)})
});

(async()=>{
 await db.init(['learned','unknown','feedback','stats','usage','pending','sessions']);
 sessions=db.get('sessions',{});st=db.get('stats',{total:0,skills:{},up:0,down:0});
 core.init();
 server.listen(PORT,()=>console.log('williamAI running on http://localhost:'+PORT+' | storage: '+(db.remote?'upstash':'local')+' | llm: '+JSON.stringify(core.llm())));
})();
const bye=()=>{db.flush().finally(()=>process.exit(0))};process.on('SIGTERM',bye);process.on('SIGINT',bye);
