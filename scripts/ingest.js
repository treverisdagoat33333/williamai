#!/usr/bin/env node
/* williamAI ingest tool. Feeds Wikipedia articles and web pages into knowledge/wiki/*.json
   Usage:
     node scripts/ingest.js wiki "Photosynthesis" "Black hole"      ingest specific Wikipedia articles
     node scripts/ingest.js wiki --file scripts/topics.txt           ingest a list (one title per line)
     node scripts/ingest.js category "Category:Physics" [limit]      ingest the members of a category
     node scripts/ingest.js url https://example.com/page ...         ingest plain web pages (robots.txt respected)
     node scripts/ingest.js urls --file urls.txt                     ingest a list of pages
   Wikipedia text is CC BY-SA 4.0. williamAI shows the source and license with every answer. */
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','knowledge','wiki');fs.mkdirSync(OUT,{recursive:true});
const UA='williamAI-ingest/1.0 (https://github.com/treverisdagoat33333/williamai; educational bot)';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'page';
function passages(text,max=550){const out=[];for(const para of text.split(/\n{1,}/).map(s=>s.trim()).filter(s=>s.length>40&&!/^==/.test(s))){
  if(para.length<=max){out.push(para);continue}
  let cur='';for(const sn of para.split(/(?<=[.!?])\s+/)){if((cur+' '+sn).length>max&&cur){out.push(cur.trim());cur=sn}else cur+=' '+sn}if(cur.trim())out.push(cur.trim())}
  return out.slice(0,14)}
async function getJSON(u){const r=await fetch(u,{headers:{'User-Agent':UA}});if(!r.ok)throw new Error(r.status+' '+u);return r.json()}
async function wiki(title){
  const u='https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&redirects=1&exsectionformat=plain&titles='+encodeURIComponent(title);
  const j=await getJSON(u),pg=Object.values(j.query.pages)[0];
  if(!pg||pg.missing!==undefined||!pg.extract){console.log('  skip (not found):',title);return false}
  const ps=passages(pg.extract.replace(/\n=+[^=\n]+=+\n/g,'\n'));
  if(!ps.length)return false;
  fs.writeFileSync(path.join(OUT,'wiki-'+slug(pg.title)+'.json'),JSON.stringify({title:pg.title,url:'https://en.wikipedia.org/wiki/'+encodeURIComponent(pg.title.replace(/ /g,'_')),license:'CC BY-SA 4.0',fetched:new Date().toISOString().slice(0,10),passages:ps}));
  console.log('  ok',pg.title,ps.length+' passages');return true}
async function category(cat,limit=100){let cont='',n=0;const titles=[];
  while(titles.length<limit){const j=await getJSON('https://en.wikipedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtype=page&cmlimit=50&cmtitle='+encodeURIComponent(cat)+cont);
   j.query.categorymembers.forEach(m=>titles.push(m.title));if(!j.continue)break;cont='&cmcontinue='+encodeURIComponent(j.continue.cmcontinue)}
  return titles.slice(0,limit)}
const robotsCache={};
async function allowed(u){const o=new URL(u);if(!(o.origin in robotsCache)){try{const r=await fetch(o.origin+'/robots.txt',{headers:{'User-Agent':UA}});robotsCache[o.origin]=r.ok?await r.text():''}catch(e){robotsCache[o.origin]=''}}
  let on=false;for(const line of robotsCache[o.origin].split('\n')){const l=line.trim();if(/^user-agent:\s*\*/i.test(l))on=true;else if(/^user-agent:/i.test(l))on=false;else if(on&&/^disallow:/i.test(l)){const p=l.split(':').slice(1).join(':').trim();if(p&&o.pathname.startsWith(p))return false}}return true}
async function page(u){if(!(await allowed(u))){console.log('  blocked by robots.txt:',u);return false}
  const r=await fetch(u,{headers:{'User-Agent':UA}});if(!r.ok){console.log('  fail',r.status,u);return false}
  let h=await r.text();const t=(h.match(/<title[^>]*>([^<]*)/i)||[,''])[1].trim()||u;
  h=h.replace(/<(script|style|nav|footer|header|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi,' ').replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/[ \t]+/g,' ');
  const ps=passages(h);if(!ps.length)return false;
  fs.writeFileSync(path.join(OUT,'web-'+slug(new URL(u).hostname+'-'+t)+'.json'),JSON.stringify({title:t,url:u,license:'check the site terms',fetched:new Date().toISOString().slice(0,10),passages:ps}));
  console.log('  ok',t,ps.length+' passages');return true}
const readList=f=>fs.readFileSync(f,'utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
(async()=>{const [cmd,...a]=process.argv.slice(2);let ok=0,n=0;
 const run=async(items,fn)=>{for(const x of items){n++;try{if(await fn(x))ok++}catch(e){console.log('  error',x,e.message)}await sleep(250)}};
 if(cmd==='wiki'){const fi=a.indexOf('--file');await run(fi>=0?readList(a[fi+1]):a,wiki)}
 else if(cmd==='category'){const t=await category(a[0],+a[1]||100);console.log(t.length,'articles in',a[0]);await run(t,wiki)}
 else if(cmd==='url'){await run(a,page)}
 else if(cmd==='urls'){await run(readList(a[a.indexOf('--file')+1]),page)}
 else{console.log(fs.readFileSync(__filename,'utf8').split('*/')[0]);return}
 console.log('\nDone:',ok+'/'+n,'ingested. Restart williamAI (npm start) to load them.')})();
