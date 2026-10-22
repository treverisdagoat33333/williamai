/* williamAI language layer: any OpenAI-compatible endpoint serving Qwen (Ollama, OpenRouter, Together, DashScope, vLLM, LM Studio...) */
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
const clean=s=>String(s||'').replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
async function chat(messages){
 const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),cfg.timeoutMs);
 try{
  const headers={'Content-Type':'application/json'};
  if(cfg.key)headers.Authorization='Bearer '+cfg.key;
  const res=await fetch(cfg.baseUrl+'/chat/completions',{method:'POST',headers,signal:ctl.signal,
   body:JSON.stringify({model:cfg.model,messages,temperature:cfg.temperature,max_tokens:cfg.maxTokens,stream:false})});
  if(!res.ok)throw new Error('LLM HTTP '+res.status+' '+(await res.text()).slice(0,200));
  const d=await res.json(),out=clean(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content);
  if(!out)throw new Error('LLM returned empty reply');
  return out;
 }finally{clearTimeout(to)}
}
const info=()=>({enabled,mode:cfg.mode,model:cfg.model,host:cfg.baseUrl?new URL(cfg.baseUrl).host:null});
module.exports={chat,enabled,cfg,info};
