// WilliamCore v1 - backend engine (original, no external AI)
const fs=require('fs'),path=require('path');
const crypto=require('crypto').webcrypto;
const F='`'.repeat(3);
const store={get(){return null},set(){}};
let ctx={};
const stop=new Set('what how explain define tell about does why a an the is are to of and or in on for me my you it be can do please i'.split(' '));
const tok=s=>{const a=s.toLowerCase().replace(/[^a-z0-9+#\s]/g,' ').split(/\s+/).filter(Boolean),b=a.filter(w=>!stop.has(w));return (b.length?b:a).map(w=>w.replace(/(ing|ed|s)$/,''))};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const intents=[
{id:'greet',ex:['hello','hi','hey','yo','sup','good morning','whats up'],r:()=>pick([`Hey${ctx.name?' '+ctx.name:''}! William here. What are we building today?`,`Yo${ctx.name?' '+ctx.name:''}. Ready to code, chat, or solve something.`])},
{id:'who',ex:['who are you','what are you','your name','who made you','who created you','are you chatgpt','are you claude','are you gemini'],r:()=>'I am williamAI, built from scratch. My brain is a custom TF-IDF intent engine, a skill router, a math parser, a code template generator and a memory module, all written in plain JavaScript. No API, no borrowed model.'},
{id:'can',ex:['what can you do','help','features','abilities','skills','commands'],r:()=>'I can:\n**Code** in Python, JS and HTML (try "write a todo app in html")\n**Math** (try "what is 12*(8+3)^2")\n**Remember** your name ("my name is ...")\n**Tools**: time, date, coin flip, dice, random picks, password maker, reverse text, word count\n**Talk**: jokes, advice, motivation, tech explainers'},
{id:'joke',ex:['tell joke','make me laugh','funny','joke'],r:()=>pick(['Why do programmers prefer dark mode? Because light attracts bugs.','There are 10 kinds of people: those who understand binary and those who do not.','A SQL query walks into a bar, sees two tables and asks: can I join you?','I would tell you a UDP joke, but you might not get it.'])},
{id:'motivate',ex:['motivate me','i feel sad','i am tired','inspire me','im stressed','i give up','feeling down'],r:()=>pick(['Every expert shipped broken code once. Take a breath, fix one small thing, and keep moving.','Progress beats perfection. Pick the smallest next step and do only that.','You are allowed to rest. Just do not quit.'])},
{id:'thanks',ex:['thanks','thank you','appreciate it','nice','cool','awesome','great job'],r:()=>pick(['Anytime.','Got you.','Glad it helped. Want to build something else?'])},
{id:'bye',ex:['bye','goodbye','see you','later','cya'],r:()=>'Later! I will be here.'},
{id:'ai',ex:['what is ai','explain artificial intelligence','how do you work','how does ai work','explain machine learning','how do neural network work'],r:()=>'AI is software that finds patterns and acts on them. Big models learn billions of weights from data. I use a different approach: I turn your words into weighted vectors (TF-IDF), compare them to what I know with cosine similarity, then route you to a skill. It is smaller, but fully transparent and fully mine.'},
{id:'js',ex:['what is javascript','explain javascript','what is js'],r:()=>'JavaScript is the language of the web. It runs in every browser, handles events, updates the page, and with Node it runs servers too.'},
{id:'py',ex:['what is python','explain python'],r:()=>'Python is a readable general-purpose language, loved for scripting, data science, automation and backend work.'},
{id:'html',ex:['what is html','explain html','what is css'],r:()=>'HTML is the structure of a webpage, CSS is the style. Together with JS they make every site you use.'},
{id:'idea',ex:['give me project idea','what should i build','app ideas','startup idea'],r:()=>pick(['Build a habit tracker with streaks and a heatmap. Great for learning state and storage.','Make a tiny Markdown note app that saves to localStorage.','Create a multiplayer tic-tac-toe with a simple server.','Build a Pomodoro timer with ambient sounds.'])}
];
const feats=t=>t.concat(t.slice(1).map((w,i)=>t[i]+'_'+w));
const syn={hey:'hello',hi:'hello',yo:'hello',howdy:'hello',thx:'thanks',ty:'thanks',cya:'bye',wanna:'want',gonna:'going'};
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const m=[];for(let i=0;i<=a.length;i++){m[i]=[i];for(let j=1;j<=b.length;j++)m[i][j]=i?Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1)):j}return m[a.length][b.length]}
function fix(t){return t.map(w=>{w=syn[w]||w;if(df[w]||w.length<4)return w;let b=w,bd=w.length>=6?3:2;for(const k in df){if(k.includes('_'))continue;const d=lev(w,k);if(d<bd){bd=d;b=k}}return b})}
let docs=[],df={};
const idf=w=>Math.log(1+docs.length/(1+(df[w]||0)));
const vec=t=>{const v={};t.forEach(w=>v[w]=(v[w]||0)+idf(w));return v};
const norm=v=>Math.sqrt(Object.values(v).reduce((a,b)=>a+b*b,0))||1;
function build(){docs=intents.flatMap(i=>i.ex.map(e=>({id:i.id,t:feats(tok(e).map(w=>syn[w]||w))})));df={};
 docs.forEach(d=>new Set(d.t).forEach(w=>df[w]=(df[w]||0)+1));docs.forEach(d=>{d.v=vec(d.t);d.n=norm(d.v)})}
build();
function classify(text,pool=docs){const t=Array.isArray(text)?text:feats(fix(tok(text)));if(!t.length)return{id:null,s:0};const v=vec(t),n=norm(v);let best={id:null,s:0};
 for(const d of pool){let dot=0;for(const w in v)if(d.v[w])dot+=v[w]*d.v[w];const sc=dot/(n*d.n);if(sc>best.s)best={id:d.id,s:sc}}return best}

/* ---------- Code generator ---------- */
const C={
fizzbuzz:{py:`for i in range(1, 101):\n    if i % 15 == 0: print("FizzBuzz")\n    elif i % 3 == 0: print("Fizz")\n    elif i % 5 == 0: print("Buzz")\n    else: print(i)`,js:`for (let i = 1; i <= 100; i++) {\n  console.log(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : i);\n}`},
fibonacci:{py:`def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint(list(fib(15)))`,js:`function* fib(n) {\n  let [a, b] = [0, 1];\n  for (let i = 0; i < n; i++) { yield a; [a, b] = [b, a + b]; }\n}\nconsole.log([...fib(15)]);`},
palindrome:{py:`def is_pal(s):\n    s = "".join(c.lower() for c in s if c.isalnum())\n    return s == s[::-1]\n\nprint(is_pal("A man, a plan, a canal: Panama"))`,js:`const isPal = s => {\n  s = s.toLowerCase().replace(/[^a-z0-9]/g, "");\n  return s === [...s].reverse().join("");\n};\nconsole.log(isPal("Racecar"));`},
reverse:{py:`text = "williamAI"\nprint(text[::-1])`,js:`const rev = s => [...s].reverse().join("");\nconsole.log(rev("williamAI"));`},
prime:{py:`def is_prime(n):\n    if n < 2: return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0: return False\n    return True\n\nprint([n for n in range(50) if is_prime(n)])`,js:`const isPrime = n => {\n  if (n < 2) return false;\n  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;\n  return true;\n};\nconsole.log([...Array(50).keys()].filter(isPrime));`},
sort:{py:`def quicksort(a):\n    if len(a) < 2: return a\n    p, *rest = a\n    return quicksort([x for x in rest if x < p]) + [p] + quicksort([x for x in rest if x >= p])\n\nprint(quicksort([5, 2, 9, 1, 7]))`,js:`const quicksort = a => a.length < 2 ? a : [\n  ...quicksort(a.slice(1).filter(x => x < a[0])), a[0],\n  ...quicksort(a.slice(1).filter(x => x >= a[0]))\n];\nconsole.log(quicksort([5, 2, 9, 1, 7]));`},
factorial:{py:`def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\n\nprint(fact(10))`,js:`const fact = n => n <= 1 ? 1 : n * fact(n - 1);\nconsole.log(fact(10));`},
fetch:{js:`async function getData(url) {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error("HTTP " + res.status);\n  return res.json();\n}\ngetData("https://api.github.com/users/octocat").then(console.log).catch(console.error);`,py:`import requests\n\nres = requests.get("https://api.github.com/users/octocat", timeout=10)\nres.raise_for_status()\nprint(res.json())`},
hello:{py:`print("Hello, world!")`,js:`console.log("Hello, world!");`,html:`<!DOCTYPE html>\n<html><body><h1>Hello, world!</h1></body></html>`},
todo:{html:`<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>Todo</title>\n<style>body{font-family:sans-serif;background:#111;color:#eee;max-width:420px;margin:40px auto}li{cursor:pointer;padding:6px}li.done{text-decoration:line-through;opacity:.5}</style></head>\n<body><h2>Todo</h2><input id="i" placeholder="New task"><button onclick="add()">Add</button><ul id="l"></ul>\n<script>\nfunction add(){const v=i.value.trim();if(!v)return;const li=document.createElement("li");li.textContent=v;li.onclick=()=>li.classList.toggle("done");l.append(li);i.value=""}\n<\/script></body></html>`},
counter:{html:`<!DOCTYPE html>\n<html><body style="text-align:center;font-family:sans-serif">\n<h1 id="n">0</h1><button onclick="n.textContent=+n.textContent+1">+1</button>\n</body></html>`},
landing:{html:`<!DOCTYPE html>\n<html><head><meta name="viewport" content="width=device-width,initial-scale=1">\n<style>body{margin:0;font-family:sans-serif;background:#0a0b10;color:#fff;text-align:center}.h{padding:90px 20px}h1{font-size:44px}a{background:#7c5cff;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none}</style></head>\n<body><div class="h"><h1>Your Product</h1><p>One sentence that sells it.</p><a href="#">Get started</a></div></body></html>`}
};
const topicKeys={fizzbuzz:['fizzbuzz','fizz'],fibonacci:['fibonacci','fib'],palindrome:['palindrome'],reverse:['reverse'],prime:['prime'],sort:['sort','quicksort'],factorial:['factorial'],fetch:['fetch','api request','http request','get request'],hello:['hello world'],todo:['todo','to-do','task list'],counter:['counter','click counter'],landing:['landing','homepage','website']};
Object.assign(C,{
binsearch:{py:`def bsearch(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x: return mid\n        if a[mid] < x: lo = mid + 1\n        else: hi = mid - 1\n    return -1\n\nprint(bsearch([1, 3, 5, 7, 9], 7))`,js:`function bsearch(a, x) {\n  let lo = 0, hi = a.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (a[mid] === x) return mid;\n    a[mid] < x ? lo = mid + 1 : hi = mid - 1;\n  }\n  return -1;\n}\nconsole.log(bsearch([1, 3, 5, 7, 9], 7));`},
gcd:{py:`def gcd(a, b):\n    while b: a, b = b, a % b\n    return a\n\nprint(gcd(48, 18))`,js:`const gcd = (a, b) => b ? gcd(b, a % b) : a;\nconsole.log(gcd(48, 18));`},
anagram:{py:`def is_anagram(a, b):\n    return sorted(a.lower()) == sorted(b.lower())\n\nprint(is_anagram("listen", "silent"))`,js:`const isAnagram = (a, b) =>\n  [...a.toLowerCase()].sort().join("") === [...b.toLowerCase()].sort().join("");\nconsole.log(isAnagram("listen", "silent"));`},
debounce:{js:`function debounce(fn, ms = 300) {\n  let t;\n  return (...args) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n}\nconst onType = debounce(v => console.log("search", v), 400);`},
flask:{py:`from flask import Flask, jsonify, request\n\napp = Flask(__name__)\n\n@app.get("/api/hello")\ndef hello():\n    return jsonify(message="Hello from Flask")\n\n@app.post("/api/echo")\ndef echo():\n    return jsonify(request.get_json())\n\nif __name__ == "__main__":\n    app.run(port=5000)`},
express:{js:`const express = require("express");\nconst app = express();\napp.use(express.json());\n\napp.get("/api/hello", (req, res) => res.json({ message: "Hello from Express" }));\napp.post("/api/echo", (req, res) => res.json(req.body));\n\napp.listen(3000, () => console.log("http://localhost:3000"));`},
class:{py:`class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return f"{self.name} makes a sound"\n\nclass Dog(Animal):\n    def speak(self):\n        return f"{self.name} says woof"\n\nprint(Dog("Rex").speak())`,js:`class Animal {\n  constructor(name) { this.name = name; }\n  speak() { return this.name + " makes a sound"; }\n}\nclass Dog extends Animal {\n  speak() { return this.name + " says woof"; }\n}\nconsole.log(new Dog("Rex").speak());`}
});
Object.assign(topicKeys,{binsearch:['binary search'],gcd:['gcd','greatest common'],anagram:['anagram'],debounce:['debounce'],flask:['flask','python server','python api'],express:['express','node server','node api'],class:['class','oop','inheritance']});
function codeSkill(text){const l=text.toLowerCase();
 if(!/(write|code|make|build|create|show|generate|program|script|function|example|how (do|to))/.test(l)&&!/\b(python|javascript|js|html)\b/.test(l))return null;
 let topic=null;for(const k in topicKeys)if(topicKeys[k].some(w=>l.includes(w))){topic=k;break}
 if(!topic)return null;
 let lang=/python|\bpy\b/.test(l)?'py':/html|website|webpage|page/.test(l)?'html':/\bjs\b|javascript|node/.test(l)?'js':null;
 const o=C[topic];if(!lang||!o[lang])lang=o.py&&lang!=='js'&&!o.html?'py':(o.js?'js':Object.keys(o)[0]);
 const nm={py:'python',js:'javascript',html:'html'}[lang];
 ctx.last={topic,lang};
 return `Here is **${topic}** in ${nm}:\n${F}${nm}\n${o[lang]}\n${F}\nWant it in another language? Just say "in ${lang==='py'?'js':'python'}".`}

/* ---------- Math, tools, memory ---------- */
function mathSkill(t){let e=t.toLowerCase().replace(/what('| i)?s|what is|calculate|calc|solve|=|\?|equals/g,'').replace(/x/g,'*').replace(/\^/g,'**').replace(/plus/g,'+').replace(/minus/g,'-').replace(/times/g,'*').replace(/divided by/g,'/').trim();
 if(!/\d/.test(e)||!/^[\d\s+\-*/().%]+$/.test(e)||!/[+\-*/%]/.test(e.replace(/^-/,'')))return null;
 try{const r=Function('"use strict";return ('+e+')')();if(typeof r==='number'&&isFinite(r))return `**${t.replace(/[=?]/g,'').trim()} = ${+r.toFixed(10)}**`}catch(x){}return null}
function tools(t){const l=t.toLowerCase();let m;
 if(m=l.match(/(?:my name is|call me|i am called|i'm)\s+([a-z]+)/)){if(/^(i'm)/.test(m[0])&&/(tired|sad|bored|fine|good|ok|stressed|hungry)/.test(m[1]))return null;ctx.name=m[1][0].toUpperCase()+m[1].slice(1);store.set('wai_name',ctx.name);return `Locked in. Nice to meet you, ${ctx.name}. I will remember that.`}
 if(/what('| i)?s my name|do you know my name/.test(l))return ctx.name?`You are ${ctx.name}.`:'You have not told me yet. Say "my name is ...".';
 if(/\btime\b/.test(l)&&/(what|current|now|tell)/.test(l))return 'It is '+new Date().toLocaleTimeString()+'.';
 if(/\b(date|today|day)\b/.test(l)&&/(what|current|tell)/.test(l))return 'Today is '+new Date().toDateString()+'.';
 if(/flip.*coin|coin flip/.test(l))return pick(['Heads.','Tails.']);
 if(m=l.match(/roll.*?(?:d|a die|dice)\s*(\d+)?/))return 'Rolled: **'+(1+Math.floor(Math.random()*(+m[1]||6)))+'**';
 if(/password/.test(l)){const c='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';const a=crypto.getRandomValues(new Uint32Array(16));return 'Here is a strong one:\n'+F+'\n'+[...a].map(x=>c[x%c.length]).join('')+'\n'+F}
 if(m=t.match(/reverse(?: the)?(?: text| string)?[:\s]+["“]?(.+?)["”]?$/i))return [...m[1]].reverse().join('');
 if(m=t.match(/(?:count words|word count)[:\s]+(.+)/i))return 'That is **'+m[1].trim().split(/\s+/).length+'** words and '+m[1].length+' characters.';
 if(m=t.match(/(?:pick|choose)(?: one)?(?: from| between)?[:\s]+(.+)/i)){const o=m[1].split(/,|\bor\b/).map(s=>s.trim()).filter(Boolean);if(o.length>1)return 'I pick: **'+pick(o)+'**';}
 if(/in (python|js|javascript|html)/.test(l)&&ctx.last&&/^(and |now |same |in )/.test(l)){const lg=/python/.test(l)?'py':/html/.test(l)?'html':'js';return codeSkill('write '+ctx.last.topic+' in '+(lg==='py'?'python':lg==='js'?'js':'html'))}
 return null}

/* ---------- Brain: route the message ---------- */
function think(text){
 let skill='fallback',conf=0,out=null;
 if(out=tools(text))skill='tool',conf=.99;
 else if(out=mathSkill(text))skill='math',conf=.99;
 else if(out=codeSkill(text))skill='codegen',conf=.95;
 else{const c=classify(text);if(c.id&&c.s>.3){const it=intents.find(i=>i.id===c.id);out=it.r();skill='intent:'+c.id;conf=c.s}}
 if(!out){const k=tok(text).slice(0,3).join(', ')||'that';
  out=pick([`I am still learning about "${k}". I am strongest at code, math and tools. Try "write a todo app in html" or "what is 25*4".`,`Not in my brain yet: ${k}. Teach me by asking about code, math, or say "what can you do".`]);conf=.1}
 return{out,skill,conf}}


const UA={km:'km',kilometer:'km',kilometers:'km',mi:'mi',mile:'mi',miles:'mi',kg:'kg',lb:'lb',lbs:'lb',pound:'lb',pounds:'lb',c:'c',celsius:'c',f:'f',fahrenheit:'f',m:'m',meter:'m',meters:'m',ft:'ft',feet:'ft',cm:'cm',in:'in',inch:'in',inches:'in'};
const CV={'km>mi':x=>x*.621371,'mi>km':x=>x*1.609344,'kg>lb':x=>x*2.20462,'lb>kg':x=>x/2.20462,'c>f':x=>x*9/5+32,'f>c':x=>(x-32)*5/9,'m>ft':x=>x*3.28084,'ft>m':x=>x/3.28084,'cm>in':x=>x/2.54,'in>cm':x=>x*2.54};
const U='km|kilometers?|miles?|mi|kg|lbs?|pounds?|celsius|fahrenheit|c|f|meters?|m|ft|feet|cm|inch(?:es)?|in';
function extra(t){const l=t.toLowerCase().replace(/[?!]+$/,'');let m;
 if(m=l.match(new RegExp('(-?\\d+(?:\\.\\d+)?)\\s*('+U+')\\s+(?:to|in|into)\\s+('+U+')\\b'))){const f=CV[UA[m[2]]+'>'+UA[m[3]]];if(f)return '**'+m[1]+' '+m[2]+' = '+(+f(+m[1]).toFixed(4))+' '+m[3]+'**'}
 if(m=l.match(/(\d+)\s+(?:to|in|into)\s+(binary|hex|hexadecimal|octal)/)){const n=+m[1],b={binary:2,hex:16,hexadecimal:16,octal:8}[m[2]];return '**'+n+' in '+m[2]+' = '+n.toString(b).toUpperCase()+'**'}
 if(m=l.match(/(binary|hex|octal)\s+([0-9a-f]+)\s+to\s+(?:decimal|number)/)){const b={binary:2,hex:16,octal:8}[m[1]],n=parseInt(m[2],b);if(!isNaN(n))return '**'+m[1]+' '+m[2]+' = '+n+'**'}
 if(m=l.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/))return '**'+m[1]+'% of '+m[2]+' = '+(+(m[1]*m[2]/100).toFixed(4))+'**';
 if(m=l.match(/(mean|average|median|sum|max|min|largest|smallest)\s+(?:of\s+)?([\d\s,.\-]{3,})$/)){const a=m[2].split(/[\s,]+/).filter(Boolean).map(Number).filter(x=>!isNaN(x));if(a.length){const o=[...a].sort((x,y)=>x-y),sum=a.reduce((p,q)=>p+q,0);const r={mean:sum/a.length,average:sum/a.length,sum,max:o[o.length-1],largest:o[o.length-1],min:o[0],smallest:o[0],median:o.length%2?o[(o.length-1)/2]:(o[o.length/2-1]+o[o.length/2])/2}[m[1]];return '**'+m[1]+' = '+(+r.toFixed(4))+'**'}}
 if(m=l.match(/random number\D+(\d+)\D+(\d+)/)){const lo=+m[1],hi=+m[2];return 'Your number: **'+(lo+Math.floor(Math.random()*(hi-lo+1)))+'**'}
 if(m=t.match(/base64\s+(encode|decode)[:\s]+(.+)/i)){try{return m[1].toLowerCase()==='encode'?Buffer.from(m[2]).toString('base64'):Buffer.from(m[2],'base64').toString()}catch(e){}}
 if(m=t.match(/(uppercase|lowercase)[:\s]+(.+)/i))return m[1].toLowerCase()==='uppercase'?m[2].toUpperCase():m[2].toLowerCase();
 return null}
/* ---------- Learning (persistent) ---------- */
const LF=path.join(__dirname,'data','learned.json');
let learned=[];try{learned=JSON.parse(fs.readFileSync(LF,'utf8'))}catch(e){}
function addLearned(q,a){intents.push({id:'taught:'+q.slice(0,20),ex:[q],r:()=>a})}
require('./knowledge').forEach(([q,a])=>{const qs=q.split('|');intents.push({id:'kb:'+qs[0],ex:qs,r:()=>a})});
learned.forEach(l=>addLearned(l.q,l.a));build();
function learn(q,a){learned.push({q,a});addLearned(q,a);build();
 try{fs.writeFileSync(LF,JSON.stringify(learned,null,1))}catch(e){}}
function respond(text,session){
 ctx=session;ctx.turns=(ctx.turns||0)+1;
 const m=text.match(/^teach[:\s]+(.+?)\s*(?:=>|->|=)\s*(.+)$/i);
 if(m&&m[1].length<200&&m[2].length<1000){learn(m[1].trim(),m[2].trim());return{out:'Learned it. Ask me "'+m[1].trim()+'" anytime.',skill:'teach',conf:1}}
 const e=extra(text);if(e)return{out:e,skill:'tool',conf:.98};
 const r=think(text);
 if(r.skill==='fallback'){
  try{const UF=path.join(__dirname,'data','unknown.json');let u=[];try{u=JSON.parse(fs.readFileSync(UF,'utf8'))}catch(x){}u.push(text.slice(0,200));fs.writeFileSync(UF,JSON.stringify(u.slice(-500)))}catch(x){}
  if(/(sad|angry|annoyed|stress|tired|frustrat|hate|stuck|anxious|lonely|depress)/i.test(text))return{out:'That sounds rough. Tell me what is going on, or paste the problem and I will help you work through it.',skill:'empathy',conf:.6}}
 return r}
function evaluate(){let ok=0,tot=0;const by={};docs.forEach(d=>by[d.id]=(by[d.id]||0)+1);
 docs.forEach(d=>{if(by[d.id]<2)return;tot++;if(classify(d.t,docs.filter(x=>x!==d)).id===d.id)ok++});return{tested:tot,correct:ok,accuracy:tot?Math.round(1000*ok/tot)/10:0}}
module.exports={respond,evaluate,stats:()=>({intents:intents.length,learned:learned.length,vocab:Object.keys(df).length})};
