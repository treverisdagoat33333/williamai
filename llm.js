/* williamAI language layer: any OpenAI-compatible endpoint serving Qwen (Ollama, OpenRouter, Together, DashScope, vLLM, LM Studio...) */
require('./env');
const env=process.env;
const baseUrl=(env.LLM_BASE_URL||(env.LLM_API_KEY?'https://openrouter.ai/api/v1':'')).replace(/\/+$/,'');
const cfg={
 baseUrl,
 key:env.LLM_API_KEY||'',
 model:env.LLM_MODEL||(baseUrl.includes('11434')?'qwen2.5:7b-instruct':'qwen/qwen-2.5-72b-instruct'),
 mode:(env.LLM_MODE||'fallback').toLowerCase(), // fallback = Qwen only when the brain is unsure; always = Qwen phrases every brain answer; off
 temperature:+(env.LLM_TEMPERATURE||0.5),
 maxTokens:+(env.LLM_MAX_TOKENS||700),
 timeoutMs:+(env.LLM_TIMEOUT_MS||30000)
};
const enabled=!!cfg.baseUrl&&cfg.mode!=='off';
/* Qwen3-style reasoning models wrap thoughts in <think>...</think>: hide them (also while streaming, even if a tag is split across chunks) */
function visible(raw){
 let v=raw.replace(/<think>[\s\S]*?<\/think>/gi,'');
 const i=v.search(/<think>/i);
 if(i>=0)v=v.slice(0,i);else{const m=v.match(/<(t(h(i(n(k)?)?)?)?)?$/i);if(m)v=v.slice(0,m.index)}
 return v.replace(/^\s+/,'');
}
const clean=s=>visible(String(s||'')).trim();
function req(stream){
 const headers={'Content-Type':'application/json'};
 if(cfg.key)headers.Authorization='Bearer '+cfg.key;
 return {url:cfg.baseUrl+'/chat/completions',headers,body:m=>JSON.stringify({model:cfg.model,messages:m,temperature:cfg.temperature,max_tokens:cfg.maxTokens,stream})};
}
async function chat(messages,signal){
 const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),cfg.timeoutMs);
 if(signal)signal.addEventListener('abort',()=>ctl.abort(),{once:true});
 try{
  const r=req(false),res=await fetch(r.url,{method:'POST',headers:r.headers,signal:ctl.signal,body:r.body(messages)});
  if(!res.ok)throw new Error('LLM HTTP '+res.status+' '+(await res.text()).slice(0,200));
  const d=await res.json(),out=clean(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content);
  if(!out)throw new Error('LLM returned empty reply');
  return out;
 }finally{clearTimeout(to)}
}
/* async generator yielding visible text pieces as they arrive (OpenAI-style server-sent events) */
async function* stream(messages,signal){
 const ctl=new AbortController();let to;const arm=()=>{clearTimeout(to);to=setTimeout(()=>ctl.abort(),cfg.timeoutMs)};
 if(signal)signal.addEventListener('abort',()=>ctl.abort(),{once:true});
 arm();
 try{
  const r=req(true),res=await fetch(r.url,{method:'POST',headers:r.headers,signal:ctl.signal,body:r.body(messages)});
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
const info=()=>({enabled,mode:cfg.mode,model:cfg.model,host:cfg.baseUrl?new URL(cfg.baseUrl).host:null});
module.exports={chat,stream,visible,enabled,cfg,info};
