const http=require('http'),fs=require('fs'),path=require('path');
try{require("fs").mkdirSync(process.env.DATA_DIR||require("path").join(__dirname,"data"),{recursive:true})}catch(e){}
const {respond,stats}=require('./engine');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public'),DD=process.env.DATA_DIR||path.join(__dirname,'data'),SF=path.join(DD,'sessions.json');
let sessions={};try{sessions=JSON.parse(fs.readFileSync(SF,'utf8'))}catch(e){}
const DF=f=>path.join(DD,f),rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(DF(f),'utf8'))}catch(e){return d}},wr=(f,o)=>{try{fs.writeFileSync(DF(f),JSON.stringify(o))}catch(e){}};
let st=rd('stats.json',{total:0,skills:{},up:0,down:0});setInterval(()=>wr('stats.json',st),5000);
const E=x=>String(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let dirty=false;setInterval(()=>{if(dirty){dirty=false;try{fs.writeFileSync(SF,JSON.stringify(sessions))}catch(e){}}},5000);
const hits={};setInterval(()=>{for(const k in hits)delete hits[k]},60000);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const json=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(req.method==='GET'&&url==='/api/health')return json(res,200,{ok:true,engine:'WilliamCore v2',...stats()});
 if(req.method==='POST'&&url==='/api/chat'){
  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;hits[ip]=(hits[ip]||0)+1;
  if(hits[ip]>60)return json(res,429,{out:'Slow down a little.',skill:'limit',conf:1});
  let body='';req.on('data',c=>{body+=c;if(body.length>5000)req.destroy()});
  req.on('end',()=>{try{const {text,sid}=JSON.parse(body);
   if(typeof text!=='string'||!text.trim()||typeof sid!=='string'||sid.length>64)return json(res,400,{out:'Bad request',skill:'error',conf:0});
   const s=sessions[sid]||(sessions[sid]={name:null,last:null,turns:0});
   const r=respond(text.slice(0,4000),s);dirty=true;st.total++;const sk=String(r.skill).split(':')[0];st.skills[sk]=(st.skills[sk]||0)+1;json(res,200,r)}catch(e){json(res,400,{out:'Bad request',skill:'error',conf:0})}});return}
 if(req.method==='POST'&&url==='/api/feedback'){let b='';req.on('data',c=>{b+=c;if(b.length>8000)req.destroy()});req.on('end',()=>{try{const d=JSON.parse(b);
  if(d.kind==='up')st.up++;else if(d.kind==='down'){st.down++;const f=rd('feedback.json',[]);f.push({q:String(d.text).slice(0,200),a:String(d.out).slice(0,200)});wr('feedback.json',f.slice(-300))}
  json(res,200,{ok:true})}catch(e){json(res,400,{ok:false})}});return}
if(url==='/admin'){const k=process.env.ADMIN_KEY;if(!k||new URL(req.url,'http://x').searchParams.get('key')!==k){res.writeHead(403);return res.end('Forbidden')}
  const un=rd('unknown.json',[]).slice(-40).reverse(),fb=rd('feedback.json',[]).slice(-20).reverse(),sk=Object.entries(st.skills).sort((a,b)=>b[1]-a[1]);
  res.writeHead(200,{'Content-Type':'text/html'});
  return res.end('<meta name=viewport content="width=device-width,initial-scale=1"><body style="background:#0a0b10;color:#e8eaf2;font:15px system-ui;max-width:700px;margin:auto;padding:16px"><h1>williamAI admin</h1><p>Messages: <b>'+st.total+'</b> &middot; Sessions: <b>'+Object.keys(sessions).length+'</b> &middot; Thumbs up: <b>'+st.up+'</b> &middot; Thumbs down: <b>'+st.down+'</b></p><p>Brain: '+JSON.stringify(stats())+'</p><h3>Skills used</h3>'+sk.map(x=>E(x[0])+': '+x[1]).join('<br>')+'<h3>Unanswered questions (teach these!)</h3>'+un.map(x=>'&bull; '+E(x)).join('<br>')+'<h3>Thumbs-down replies</h3>'+fb.map(x=>'&bull; <b>'+E(x.q)+'</b> &rarr; '+E(x.a)).join('<br>'))}
let f=path.normalize(url==='/'?'/index.html':url);if(f.includes('..'))return json(res,403,{});
 fs.readFile(path.join(PUB,f),(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(d)})
}).listen(PORT,()=>console.log('williamAI running on http://localhost:'+PORT));
