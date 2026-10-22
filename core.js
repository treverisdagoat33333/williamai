/* williamAI core: WilliamCore (engine.js) is the brain, Qwen (llm.js) is its language layer.
   The brain always runs first. Exact skills (tools, math, code gen, code analyzer, context, teach) are never handed to the LLM.
   Qwen is used when the brain is unsure (or for every knowledge answer when LLM_MODE=always), grounded in what the brain knows. */
const E=require('./engine'),llm=require('./llm');
const SOFT=/^(fallback|did-you-mean|free-form|empathy)$/;
const SYSTEM=`You are williamAI, a friendly, direct and capable assistant. Your brain (WilliamCore) supplies BRAIN NOTES below: treat them as trusted facts when they are relevant and ignore them when they are not. Never mention the notes, your brain, or the underlying model. Be concise. Use markdown, and put code in fenced blocks with a language tag. If you do not know something, say so plainly instead of guessing.`;
const clip=(s,n)=>String(s).length>n?String(s).slice(0,n):String(s);
function remember(s,text,out){const h=s.hist||(s.hist=[]);h.push({role:'user',content:clip(text,1500)},{role:'assistant',content:clip(out,1500)});if(h.length>12)h.splice(0,h.length-12)}
async function respond(text,session){
 const r=E.respond(text,session),sk=String(r.skill);
 const useLLM=llm.enabled&&(SOFT.test(sk)||(llm.cfg.mode==='always'&&/^intent:/.test(sk)));
 if(!useLLM){remember(session,text,r.out);return r}
 const notes=E.retrieve(text,3);
 if(/^intent:/.test(sk)&&!notes.includes(r.out))notes.unshift(r.out);
 const sys=SYSTEM+'\n\nBRAIN NOTES:\n'+(notes.length?notes.map((n,i)=>(i+1)+'. '+clip(n,1200)).join('\n'):'(none for this question)');
 try{
  const out=await llm.chat([{role:'system',content:sys},...(session.hist||[]),{role:'user',content:text}]);
  session.lastAns=out;remember(session,text,out);
  return{out,skill:'llm:'+llm.cfg.model,conf:Math.max(r.conf,.8)};
 }catch(e){console.error('[llm] falling back to brain:',e.message);remember(session,text,r.out);return r}
}
module.exports={respond,stats:E.stats,evaluate:E.evaluate,llm:llm.info};
