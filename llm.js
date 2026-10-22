/* williamAI language layer: any OpenAI-compatible endpoint serving Qwen (or anything else): Groq, Cerebras, OpenRouter, Gemini, Together, DashScope, Ollama...
   Several providers can be chained (LLM_*, LLM2_*, LLM3_* ...): if one is rate limited or down, the next one answers. Stack free tiers for more capacity. */
require('./env');
const env=process.env;
function provider(p){
 const base=(env[p+'BASE_URL']||(p==='LLM_'&&env.LLM_API_KEY?'https://openrouter.ai/api/v1':'')).replace(/\/+$/,'');
 if(!base)return null;
 const model=env[p+'MODEL']||(p==='LLM_'?(base.includes('11434')?'qwen2.5:7b-instruct':'qwen/qwen-2.5-72b-instruct'):'');
 if(!model)return null;
 const fb=(env[p+'FALLBACK_MODELS']||'').split(',').map(x=>x.trim()).filter(Boolean);
 return {baseUrl:base,key:env[p+'API_KEY']||'',models:[model,...fb.filter(m=>m!==model)]};
}
const providers=['LLM_','LLM2_','LLM3_','LLM4_','LLM5_'].map(provider).filter(Boolean);
const targets=providers.flatMap(p=>p.models.map(m=>({baseUrl:p.baseUrl,key:p.key,model:m})));
const first=providers[0]||{baseUrl:'',models:['']};
const cfg={
 baseUrl:first.baseUrl,model:first.models[0],key:first.key,targets,
 mode:(env.LLM_MODE||'smart').toLowerCase(), // smart (default): Qwen does the thinking/coding, brain keeps exact tools + facts | fallback: Qwen only when the brain is unsure | off
 temperature:+(env.LLM_TEMPERATURE||0.5),codeTemperature:+(env.LLM_CODE_TEMPERATURE||0.2),
 maxTokens:+(env.LLM_MAX_TOKENS||1500),codeMaxTokens:+(env.LLM_CODE_MAX_TOKENS||3500),
 timeoutMs:+(env.LLM_TIMEOUT_MS||45000)
};
const enabled=targets.length>0&&cfg.mode!=='off';
/* Qwen3-style reasoning models wrap thoughts in <think>...</think>: hide them (also while streaming, even if a tag is split across chunks) */
function visible(raw){
 let v=raw.replace(/<think>[\s\S]*?<\/think>/gi,'');
 const i=v.search(/<think>/i);
 if(i>=0)v=v.slice(0,i);else{const m=v.match(/<(t(h(i(n(k)?)?)?)?)?$/i);if(m)v=v.slice(0,m.index)}
 return v.replace(/^\s+/,'');
}
const clean=s=>visible(String(s||'')).trim();
function req(t,stream,messages,o={}){
 const headers={'Content-Type':'application/json'};
 if(t.key)headers.Authorization='Bearer '+t.key;
 if(t.baseUrl.includes('openrouter'))headers['X-Title']='williamAI';
 return {url:t.baseUrl+'/chat/completions',headers,body:JSON.stringify({model:t.model,messages,temperature:o.temperature??cfg.temperature,max_tokens:o.maxTokens||cfg.maxTokens,stream})};
}
const label=t=>t.model+' @ '+new URL(t.baseUrl).host;
async function chatOne(t,messages,o,signal){
 const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),cfg.timeoutMs);
 if(signal)signal.addEventListener('abort',()=>ctl.abort(),{once:true});
 try{
  const r=req(t,false,messages,o),res=await fetch(r.url,{method:'POST',headers:r.headers,signal:ctl.signal,body:r.body});
  if(!res.ok)throw new Error('LLM HTTP '+res.status+' '+(await res.text()).slice(0,200));
  const d=await res.json(),out=clean(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content);
  if(!out)throw new Error('LLM returned empty reply');
  return out;
 }finally{clearTimeout(to)}
}
async function chat(messages,signal,o){
 let err;
 for(const t of targets){
  try{return await chatOne(t,messages,o,signal)}catch(e){err=e;if(signal&&signal.aborted)break;console.error('[llm] '+label(t)+' failed: '+e.message.slice(0,120))}
 }
 throw err||new Error('no LLM configured');
}
/* async generator yielding visible text pieces as they arrive (OpenAI-style server-sent events) */
async function* stream(messages,signal,o){
 let err;
 for(const t of targets){
  let any=false;
  try{for await(const d of streamOne(t,messages,o,signal)){any=true;yield d}return}
  catch(e){err=e;if(any||(signal&&signal.aborted))throw e;console.error('[llm] '+label(t)+' failed: '+e.message.slice(0,120))}
 }
 throw err||new Error('no LLM configured');
}
async function* streamOne(t,messages,o,signal){
 const ctl=new AbortController();let to;const arm=()=>{clearTimeout(to);to=setTimeout(()=>ctl.abort(),cfg.timeoutMs)};
 if(signal)signal.addEventListener('abort',()=>ctl.abort(),{once:true});
 arm();
 try{
  const r=req(t,true,messages,o),res=await fetch(r.url,{method:'POST',headers:r.headers,signal:ctl.signal,body:r.body});
  if(!res.ok)throw new Error('LLM HTTP '+res.status+' '+(await res.text()).slice(0,200));
  const reader=res.body.getReader(),dec=new TextDecoder();let buf='',raw='',sent=0,any=false;
  for(;;){
   const {done,value}=await reader.read();arm();
   if(done)break;
   buf+=dec.decode(value,{stream:true});
   let i;
   while((i=buf.indexOf('\n'))>=0){
    const line=buf.slice(0,i).trim();buf=buf.slice(i+1);
    if(!line.startsWith('data:'))continue;
    const p=line.slice(5).trim();if(p==='[DONE]')continue;
    let j;try{j=JSON.parse(p)}catch(e){continue}
    const d=j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content;
    if(!d)continue;
    raw+=d;const v=visible(raw);
    if(v.length>sent){any=true;const piece=v.slice(sent);sent=v.length;yield piece}
   }
  }
  if(!any)throw new Error('LLM returned empty reply');
 }finally{clearTimeout(to)}
}
const info=()=>({enabled,mode:cfg.mode,model:cfg.model,host:cfg.baseUrl?new URL(cfg.baseUrl).host:null,providers:providers.length,models:targets.length});
module.exports={chat,stream,visible,enabled,cfg,info};
