/* npm run check:llm  ->  verifies your Qwen endpoint: auth, model name, latency and streaming */
const llm=require('../llm');
(async()=>{
 const i=llm.info();console.log('Config:',JSON.stringify(i));
 if(!llm.cfg.baseUrl){console.log('\nNo LLM configured. Set LLM_BASE_URL (and LLM_API_KEY / LLM_MODEL) in your environment or in a .env file. See .env.example.');process.exit(1)}
 if(llm.cfg.mode==='off'){console.log('\nLLM_MODE is off.');process.exit(1)}
 const hint=m=>/401|403/.test(m)?'Auth failed: check LLM_API_KEY.':/404/.test(m)?'Not found: check LLM_BASE_URL (must end in /v1) and LLM_MODEL spelling.':/429/.test(m)?'Rate limited or out of credit on the provider.':/ECONNREFUSED|fetch failed/.test(m)?'Cannot reach the endpoint. Is Ollama running / is the URL right?':/abort/i.test(m)?'Timed out. First Ollama request can be slow while the model loads; raise LLM_TIMEOUT_MS.':'';
 const msgs=[{role:'user',content:'Reply with exactly one word: ready'}];
 try{const t=Date.now(),out=await llm.chat(msgs);console.log('\n[1/2] normal reply OK in '+(Date.now()-t)+'ms ->',JSON.stringify(out.slice(0,80)))}
 catch(e){console.log('\n[1/2] normal reply FAILED:',e.message);console.log(hint(e.message));process.exit(1)}
 try{const t=Date.now();let n=0,first=0,txt='';for await(const d of llm.stream(msgs)){if(!n)first=Date.now()-t;n++;txt+=d}console.log('[2/2] streaming OK: '+n+' chunks, first one after '+first+'ms ->',JSON.stringify(txt.slice(0,80)))}
 catch(e){console.log('[2/2] streaming FAILED:',e.message,'(chat still works, replies just will not appear word by word)');process.exit(2)}
 console.log('\nAll good. Start williamAI with: npm start');
})();
