/* Persistence. Files in DATA_DIR (default ./data) always; plus Upstash Redis (REST) when
   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, so data survives Render free-plan restarts.
   Sync get/set on an in-memory cache, debounced background flush. Sessions stay local-only (they are big and disposable). */
const fs=require('fs'),path=require('path');
const DIR=process.env.DATA_DIR||path.join(__dirname,'data');
const URL_=(process.env.UPSTASH_REDIS_REST_URL||'').replace(/\/+$/,''),TOK=process.env.UPSTASH_REDIS_REST_TOKEN||'';
const REMOTE=!!(URL_&&TOK),LOCAL_ONLY=new Set(['sessions']),MAX_REMOTE=900000;
const cache={},dirty=new Set();
const file=n=>path.join(DIR,n+'.json');
async function rcmd(cmd){
 const r=await fetch(URL_,{method:'POST',headers:{Authorization:'Bearer '+TOK,'Content-Type':'application/json'},body:JSON.stringify(cmd)});
 if(!r.ok)throw new Error('Upstash HTTP '+r.status);const j=await r.json();if(j.error)throw new Error(j.error);return j.result}
async function init(names){
 for(const n of names){
  let v;
  if(REMOTE&&!LOCAL_ONLY.has(n)){try{const s=await rcmd(['GET','williamai:'+n]);if(s!=null)v=JSON.parse(s)}catch(e){console.error('[store] remote read failed for',n,e.message)}}
  if(v===undefined){try{v=JSON.parse(fs.readFileSync(file(n),'utf8'));if(REMOTE&&!LOCAL_ONLY.has(n))dirty.add(n)}catch(e){}}
  if(v!==undefined)cache[n]=v;
 }}
function get(n,d){if(cache[n]===undefined)cache[n]=d;return cache[n]}
function set(n,v){cache[n]=v;dirty.add(n)}
function touch(n){dirty.add(n)}
async function flush(){
 for(const n of [...dirty]){
  dirty.delete(n);const s=JSON.stringify(cache[n]);
  try{fs.mkdirSync(DIR,{recursive:true});const t=file(n)+'.tmp';fs.writeFileSync(t,s);fs.renameSync(t,file(n))}catch(e){}
  if(REMOTE&&!LOCAL_ONLY.has(n)){
   if(s.length>MAX_REMOTE){console.error('[store] '+n+' is too big for the remote store, kept locally only');continue}
   try{await rcmd(['SET','williamai:'+n,s])}catch(e){console.error('[store] remote write failed for',n,e.message);dirty.add(n)}
  }}}
setInterval(()=>{flush().catch(()=>{})},5000).unref();
module.exports={init,get,set,touch,flush,remote:REMOTE,dir:DIR};
