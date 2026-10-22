const http=require('http'),fs=require('fs'),path=require('path');
const {respond,stats}=require('./engine');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public'),SF=path.join(__dirname,'data','sessions.json');
let sessions={};try{sessions=JSON.parse(fs.readFileSync(SF,'utf8'))}catch(e){}
let dirty=false;setInterval(()=>{if(dirty){dirty=false;try{fs.writeFileSync(SF,JSON.stringify(sessions))}catch(e){}}},5000);
const hits={};setInterval(()=>{for(const k in hits)delete hits[k]},60000);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const json=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(req.method==='GET'&&url==='/api/health')return json(res,200,{ok:true,engine:'WilliamCore v1',...stats()});
 if(req.method==='POST'&&url==='/api/chat'){
  const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;hits[ip]=(hits[ip]||0)+1;
  if(hits[ip]>60)return json(res,429,{out:'Slow down a little.',skill:'limit',conf:1});
  let body='';req.on('data',c=>{body+=c;if(body.length>5000)req.destroy()});
  req.on('end',()=>{try{const {text,sid}=JSON.parse(body);
   if(typeof text!=='string'||!text.trim()||typeof sid!=='string'||sid.length>64)return json(res,400,{out:'Bad request',skill:'error',conf:0});
   const s=sessions[sid]||(sessions[sid]={name:null,last:null,turns:0});
   const r=respond(text.slice(0,500),s);dirty=true;json(res,200,r)}catch(e){json(res,400,{out:'Bad request',skill:'error',conf:0})}});return}
 let f=path.normalize(url==='/'?'/index.html':url);if(f.includes('..'))return json(res,403,{});
 fs.readFile(path.join(PUB,f),(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(d)})
}).listen(PORT,()=>console.log('williamAI running on http://localhost:'+PORT));
