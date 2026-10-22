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
const tri=t=>{const x=' '+t.filter(w=>!w.includes('_')).join(' ')+' ',g=new Set();for(let i=0;i<x.length-2;i++)g.add(x.slice(i,i+3));return g};
let docs=[],df={};
const idf=w=>Math.log(1+docs.length/(1+(df[w]||0)));
const vec=t=>{const v={};t.forEach(w=>v[w]=(v[w]||0)+idf(w));return v};
const norm=v=>Math.sqrt(Object.values(v).reduce((a,b)=>a+b*b,0))||1;
function build(){docs=intents.flatMap(i=>i.ex.map(e=>({id:i.id,t:feats(tok(e).map(w=>syn[w]||w))})));df={};
 docs.forEach(d=>new Set(d.t).forEach(w=>df[w]=(df[w]||0)+1));docs.forEach(d=>{d.v=vec(d.t);d.n=norm(d.v);d.g=tri(d.t)})}
build();
function classify(text,pool=docs){const t=Array.isArray(text)?text:feats(fix(tok(text)));if(!t.length)return{id:null,s:0,alt:{}};const v=vec(t),n=norm(v),g=tri(t);let best={id:null,s:0},alt={id:null,s:0};
 for(const d of pool){let dot=0;for(const w in v)if(d.v[w])dot+=v[w]*d.v[w];let ov=0;for(const x of g)if(d.g.has(x))ov++;const sc=.75*dot/(n*d.n)+.25*ov/(g.size+d.g.size-ov||1);
  if(sc>best.s){if(best.id!==d.id)alt=best;best={id:d.id,s:sc}}else if(sc>alt.s&&d.id!==best.id)alt={id:d.id,s:sc}}
 best.alt=alt;return best}

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
Object.assign(C,{
sqlite:{py:`import sqlite3\n\ndb = sqlite3.connect("app.db")\ndb.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")\ndb.execute("INSERT INTO users (name) VALUES (?)", ("William",))\ndb.commit()\nprint(db.execute("SELECT * FROM users").fetchall())`},
email:{py:`import re\n\npattern = r"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$"\nprint(bool(re.match(pattern, "me@site.com")))`,js:`const isEmail = s => /^[\\w.+-]+@[\\w-]+\\.[\\w.]+$/.test(s);\nconsole.log(isEmail("me@site.com"));`},
readfile:{py:`with open("notes.txt", encoding="utf-8") as f:\n    for line in f:\n        print(line.strip())`,js:`const fs = require("fs");\nconst text = fs.readFileSync("notes.txt", "utf8");\ntext.split("\\n").forEach(l => console.log(l.trim()));`},
crud:{js:`const express = require("express");\nconst app = express();\napp.use(express.json());\nlet items = [], id = 1;\n\napp.get("/items", (req, res) => res.json(items));\napp.post("/items", (req, res) => { const it = { id: id++, ...req.body }; items.push(it); res.status(201).json(it); });\napp.put("/items/:id", (req, res) => {\n  const it = items.find(i => i.id == req.params.id);\n  if (!it) return res.sendStatus(404);\n  Object.assign(it, req.body); res.json(it);\n});\napp.delete("/items/:id", (req, res) => { items = items.filter(i => i.id != req.params.id); res.sendStatus(204); });\napp.listen(3000);`},
card:{html:`<!DOCTYPE html>\n<html><head><style>\n.card{max-width:300px;margin:40px auto;padding:20px;border-radius:16px;background:#14161f;color:#eee;font-family:sans-serif;box-shadow:0 10px 30px #0008}\n.card button{background:#7c5cff;color:#fff;border:0;padding:10px 16px;border-radius:10px}\n</style></head>\n<body style="background:#0a0b10">\n<div class="card"><h3>Card title</h3><p>Short description goes here.</p><button>Action</button></div>\n</body></html>`},
notes:{html:`<!DOCTYPE html>\n<html><body>\n<textarea id="t" rows="8" cols="40"></textarea>\n<script>\nt.value = localStorage.getItem("note") || "";\nt.oninput = () => localStorage.setItem("note", t.value);\n<\/script></body></html>`}
});
Object.assign(topicKeys,{sqlite:['sqlite','database in python'],email:['email regex','validate email','email validation'],readfile:['read file','read a file','open a file'],crud:['crud','rest api'],card:['ui card','card component'],notes:['notes app','note app','localstorage']});
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
 else{const c=classify(text);const tt=fix(tok(text)),unk=tt.filter(w=>!df[w]&&!w.includes('_')).length;
  if(c.id&&c.s>.27&&!(c.s<.55&&tt.length&&unk/tt.length>=.5)){const it=intents.find(i=>i.id===c.id);
   if(c.s<.8&&c.id.startsWith("kb:")&&unk){const w=wikiAnswer(text);if(w&&w.conf>.2){ctx.lastMore=w.more;return{out:w.out,skill:'wiki',conf:w.conf}}}
   out=it.r();skill='intent:'+c.id;conf=c.s}}
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
const DATA=process.env.DATA_DIR||path.join(__dirname,'data');try{fs.mkdirSync(DATA,{recursive:true})}catch(e){}
const GH={tok:process.env.GH_TOKEN,repo:process.env.GH_REPO,br:process.env.GH_BRANCH||'learned-data'};
const LF=GH.tok?path.join(__dirname,'learned','learned.json'):path.join(DATA,'learned.json');
let learned=[];try{learned=JSON.parse(fs.readFileSync(LF,'utf8'))}catch(e){}
function addLearned(q,a){intents.push({id:'taught:'+q.slice(0,20),ex:[q],r:()=>a})}
const pickA=a=>Array.isArray(a)?pick(a):a;
const KBE=[];try{const kd=path.join(__dirname,'knowledge');fs.readdirSync(kd).filter(f=>f.endsWith('.json')&&f!=='facts.json').sort().forEach(f=>{try{JSON.parse(fs.readFileSync(path.join(kd,f),'utf8')).forEach(e=>{if(e&&Array.isArray(e.q)&&e.q.length&&e.a)KBE.push({...e,cat:f.replace('.json','')})})}catch(err){console.error('knowledge load error',f,err.message)}})}catch(e){}
const KB=KBE.map(e=>[e.q.join('|'),Array.isArray(e.a)?e.a[0]:e.a]);
KBE.forEach(e=>intents.push({id:'kb:'+e.q[0],ex:e.q,r:()=>{ctx.lastMore=e.more||null;return pickA(e.a)}}));
const chain2={};KB.forEach(([q,a])=>{const w=a.replace(/\*\*/g,'').split(/\s+/);for(let i=0;i<w.length-3;i++){const k=(w[i]+' '+w[i+1]+' '+w[i+2]).toLowerCase();(chain2[k]=chain2[k]||[]).push(w[i+3])}});
learned.forEach(l=>addLearned(l.q,l.a));build();
function learn(q,a){learned.push({q,a});addLearned(q,a);build();
 try{fs.mkdirSync(path.dirname(LF),{recursive:true});fs.writeFileSync(LF,JSON.stringify(learned,null,1))}catch(e){}ghSave()}
let ghT=null;function ghSave(){if(!GH.tok||!GH.repo)return;clearTimeout(ghT);ghT=setTimeout(async()=>{try{const u='https://api.github.com/repos/'+GH.repo+'/contents/learned/learned.json',h={Authorization:'Bearer '+GH.tok,'User-Agent':'williamai'};
 const g=await fetch(u+'?ref='+GH.br,{headers:h}),sha=g.ok?(await g.json()).sha:undefined;
 await fetch(u,{method:'PUT',headers:h,body:JSON.stringify({message:'williamAI learned '+learned.length+' answers',content:Buffer.from(JSON.stringify(learned,null,1)).toString('base64'),branch:GH.br,sha})})}catch(e){}},30000)}
(async()=>{if(!GH.tok||!GH.repo)return;try{const r=await fetch('https://api.github.com/repos/'+GH.repo+'/contents/learned/learned.json?ref='+GH.br,{headers:{Authorization:'Bearer '+GH.tok,Accept:'application/vnd.github.raw','User-Agent':'williamai'}});
 if(!r.ok)return;const a=await r.json();const have=new Set(learned.map(x=>x.q));let n=0;a.forEach(x=>{if(x&&x.q&&x.a&&!have.has(x.q)){learned.push(x);addLearned(x.q,x.a);n++}});if(n)build()}catch(e){}})();
function gen(seed){const ws=(seed.toLowerCase().match(/[a-z0-9+#]{4,}/g)||[]).filter(w=>!stop.has(w));
 for(const w of ws){const ks=Object.keys(chain2).filter(k=>k.split(' ')[0].replace(/[^a-z0-9+#]/g,'')===w);if(!ks.length)continue;
  let k=pick(ks);const o=k.split(' ');for(let i=0;i<22;i++){const n=chain2[k];if(!n)break;const x=pick(n);o.push(x);if(/[.!?]$/.test(x)&&o.length>8)break;k=o.slice(-3).join(' ').toLowerCase()}
  const t=o.join(' ');return t[0].toUpperCase()+t.slice(1)}return null}
function followup(t){const l=t.toLowerCase().trim().replace(/[?.!]+$/,''),a=ctx.lastAns,first=x=>x.split(/(?<=[.!?])\s/)[0].replace(/\*\*/g,'');let m;
 if(a&&!a.includes(F)){
  if(/^(what do you mean|wdym|what does that mean|i dont get it|i do not get it|i dont understand|still confused|huh)$/.test(l))return 'Let me put it simpler: '+first(a)+'\n\nWhich part is confusing? Say "tell me more" for details.';
  if(/^(shorter|make it shorter|tldr|short version|summarize that)$/.test(l))return first(a);
  if(/^(simpler|eli5|explain simpler|explain like i.?m 5|dumb it down)$/.test(l))return 'Simply put: '+first(a);
  if(/^(more|tell me more|go on|continue|elaborate|explain more)$/.test(l)&&ctx.prevMore)return ctx.prevMore;
  if(/^(more|tell me more|go on|continue|elaborate|explain more)$/.test(l)){const c=classify(a),it=c.alt&&c.alt.id&&c.alt.id.startsWith('kb:')&&intents.find(i=>i.id===c.alt.id);return it?'Related topic: '+it.r():'That is the core of it. Ask a narrower question and I will go deeper.'}}
 if(a&&/^(again|repeat|say that again)$/.test(l))return a;
 if(ctx.last&&/^(convert|translate|switch|now|also|and|same|do it|in|to)\b/.test(l)&&(m=l.match(/\b(?:in|to|into)\s+(python|js|javascript|html)\b/)))return codeSkill('write '+ctx.last.topic+' in '+m[1]);
 return null}
const BUGS=[['js',/[^=!<>]==[^=]/,'Use === instead of == to avoid surprise type coercion.'],['js',/\bvar\s+\w/,'Prefer let or const over var.'],['js',/\bif\s*\([^=!<>)]*[^=!<>]=[^=][^)]*\)/,'A single = inside if assigns instead of compares. Did you mean === ?'],['js',/\.innerHTML\s*=/,'innerHTML with user data allows XSS. Use textContent.'],['js',/\beval\s*\(/,'eval() is dangerous. Avoid it.'],['js',/for\s*\([^)]*<=\s*\w+\.length/,'Off-by-one: <= length reads past the end. Use <.'],['js',/parseInt\([^,)]*\)/,'parseInt without a radix. Use parseInt(x, 10).'],['js',/\bconsole\.log/,'Leftover console.log. Remove before shipping.'],
['py',/def\s+\w+\([^)]*=\s*(\[\]|\{\})/,'Mutable default argument. Use None and create the list inside.'],['py',/[=!]=\s*None/,'Use is None / is not None.'],['py',/except\s*:/,'Bare except hides real errors. Catch specific exceptions.'],['py',/^\s*print\s+[^(\s]/m,'Python 2 style print. Use print(...).'],['py',/range\(len\(/,'Use enumerate() instead of range(len(...)).'],['py',/^\s*(def|if|for|while|class|elif|else|try|except|with)\b[^:\n]*$/m,'A block line seems to be missing its colon.']];
const EX=[[/\b(function\s+\w+|def\s+\w+|=>\s*[{(\w])/,'Defines functions (reusable blocks of code)'],[/\bclass\s+\w+/,'Defines a class (a blueprint for objects)'],[/\b(for|while)\b/,'Uses a loop to repeat work'],[/\b(if|elif|else|switch)\b/,'Makes decisions with conditions'],[/\b(import|require)\b/,'Imports libraries or modules'],[/\b(fetch|axios|requests\.)/,'Makes a network request'],[/\b(await|async)\b/,'Uses async code, waiting for slow work without freezing'],[/\.(map|filter|reduce|forEach)\(/,'Transforms lists with map, filter, reduce or forEach'],[/\b(try|catch|except)\b/,'Handles errors so the program does not crash'],[/addEventListener|onclick/,'Reacts to user events like clicks'],[/document\.|getElementById|querySelector/,'Reads or changes the web page (DOM)'],[/console\.log|\bprint\(/,'Prints output'],[/\breturn\b/,'Returns a result from a function'],[/open\(|readFile|fs\./,'Reads or writes files'],[/localStorage|sessionStorage/,'Saves data in the browser'],[/<\w+[^>]*>/,'Contains HTML markup (page structure)']];
function analyze(text){
 if(!/(explain|what does|review|bug|debug|check|fix|wrong|error)/i.test(text))return null;
 const fm=text.match(/```\w*\n?([\s\S]*?)```/);
 if(!(fm||text.includes('\n')||/:\s*(const|let|var|def|function|print|for|if|import|class)\b/.test(text)))return null;
 const code=fm?fm[1]:text.includes('\n')?text.slice(text.indexOf('\n')+1):text.slice(text.search(/:\s*\S/)+1);
 if(!/[{}();=]|\bdef\b|\bimport\b|=>/.test(code)||code.trim().length<12)return null;
 const py=/\bdef\s|^\s*print\(|:\s*$/m.test(code)&&!/[{};]\s*$/m.test(code),lang=py?'py':'js';
 if(/bug|debug|review|wrong|error|fix|check/i.test(text)){
  const f=BUGS.filter(b=>b[0]===lang&&b[1].test(code)).map(b=>b[2]);
  const c=x=>(code.match(new RegExp('\\'+x,'g'))||[]).length;
  [['(',')'],['{','}'],['[',']']].forEach(([o,cl])=>{if(c(o)!==c(cl))f.push('Unbalanced '+o+cl+': '+c(o)+' opening vs '+c(cl)+' closing.')});
  if(lang==='js'&&/\bawait\b/.test(code)&&!/\basync\b/.test(code))f.push('await is used but nothing is async.');
  if(lang==='js'&&/\.then\(/.test(code)&&!/catch/.test(code))f.push('A promise has no .catch(). Errors will go unhandled.');
  return f.length?'**Bug check found '+f.length+' thing'+(f.length>1?'s':'')+':**\n'+f.map((x,i)=>(i+1)+'. '+x).join('\n'):'My checks found no obvious problems. Run it and paste any error message and I will dig in.'}
 const h=EX.filter(e=>e[0].test(code)).map(e=>'- '+e[1]);
 return '**Code breakdown** ('+code.trim().split('\n').length+' lines, '+(py?'Python':'JavaScript')+')\n'+(h.join('\n')||'- I could not spot clear patterns.')+'\nSay "find bugs:" before your code and I will check it for problems.'}
function clean(t){let c=t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,' ').replace(/\b(bro|bruh|dude|pls|plz|please|fr|ngl|tbh)\b/gi,' ').replace(/\s+/g,' ').trim();return c.length>1?c:t}
function respond(text,session){
 const raw=text,m0=text.trim().match(/^(hey|hi|hello|yo|sup|hola|howdy)\b[,!.\s]+(.{4,})$/i);let pre='';
 if(m0&&!/^(there|william|williamai|bro|man|dude|buddy|friend|everyone|guys|team|ai|again)\W*$/i.test(m0[2])&&!/^(how are you|how r u|whats up|what's up|how's it going|hows it going)/i.test(m0[2])){pre=pick(['Hey! ','Hi! ','Yo! '])+'\n\n';text=m0[2]}
 text=clean(text);
 const r=respond0(text,session);if(pre&&r&&r.out)r.out=pre+r.out;return r}
function respond0(text,session){
 ctx=session;ctx.turns=(ctx.turns||0)+1;ctx.prevMore=ctx.lastMore||null;ctx.lastMore=null;
 const m=text.match(/^teach[:\s]+(.+?)\s*(?:=>|->|=)\s*(.+)$/i);
 if(m&&m[1].length<200&&m[2].length<1000){learn(m[1].trim(),m[2].trim());return{out:'Learned it. Ask me "'+m[1].trim()+'" anytime.',skill:'teach',conf:1}}
 const O=(r)=>{ctx.lastAns=r.out;return r};let x;
 if(x=followup(text))return O({out:x,skill:'context',conf:.9});
 if(x=analyze(text))return O({out:x,skill:'code-analyzer',conf:.9});
 if(x=extra(text))return O({out:x,skill:'tool',conf:.98});
 if(x=factsSkill(text))return O({out:x,skill:'facts',conf:.97});
 const r=think(text);
 if(r.skill==='fallback'){
  const w=wikiAnswer(text);if(w){ctx.lastMore=w.more;return O({out:w.out,skill:'wiki',conf:w.conf})}
  try{const UF=path.join(DATA,'unknown.json');let u=[];try{u=JSON.parse(fs.readFileSync(UF,'utf8'))}catch(e){}u.push(text.slice(0,200));fs.writeFileSync(UF,JSON.stringify(u.slice(-500)))}catch(e){}
  if(/(sad|angry|annoyed|stress|tired|frustrat|hate|stuck|anxious|lonely|depress)/i.test(text))return O({out:'That sounds rough. Tell me what is going on, or paste the problem and I will help you work through it.',skill:'empathy',conf:.6});
  const c=classify(text);
  if(c.id&&c.s>.12){const it=intents.find(i=>i.id===c.id),al=c.alt&&c.alt.id&&c.alt.s>.1&&intents.find(i=>i.id===c.alt.id);
   try{const NF=path.join(DATA,'nearmiss.json');let u=[];try{u=JSON.parse(fs.readFileSync(NF,'utf8'))}catch(e){}u.push({q:text.slice(0,200),best:it.ex[0],s:+c.s.toFixed(2)});fs.writeFileSync(NF,JSON.stringify(u.slice(-500)))}catch(e){}
   return O({out:'Did you mean: **"'+it.ex[0]+'"**'+(al?' or **"'+al.ex[0]+'"**':'')+'? Ask me that and I will answer.',skill:'did-you-mean',conf:c.s})}
  const g=gen(text);if(g)return O({out:'Not sure, but here is a related thought: '+g,skill:'free-form',conf:.2})}
 return O(r)}
/* ---------- Facts tables ---------- */
let FACTS={capitals:{},alias:{},elements:[]};try{FACTS=JSON.parse(fs.readFileSync(path.join(__dirname,'knowledge','facts.json'),'utf8'))}catch(e){}
const ELA={aluminum:'aluminium',cesium:'caesium',sulphur:'sulfur'};
const cname=n=>{n=n.trim().toLowerCase().replace(/^the /,'');return FACTS.alias[n]||n};
const title=s=>s.replace(/\b\w/g,c=>c.toUpperCase());
function factsSkill(t){const l=t.toLowerCase().replace(/[?!.]+$/,'').trim();let m;
 if((m=l.match(/capital(?: city)? of ([a-z .'&-]+)$/))||(m=l.match(/^(?:what(?:'s| is) )?(?:the )?([a-z .'-]+?)(?:'s)? capital(?: city)?$/))){const k=cname(m[1]),c=FACTS.capitals[k];if(c)return 'The capital of **'+title(k)+'** is **'+c+'**.'}
 const E=n=>{n=n.trim().toLowerCase();n=ELA[n]||n;return FACTS.elements.find(e=>e.name.toLowerCase()===n||e.sym.toLowerCase()===n)};
 if(m=l.match(/(?:symbol|abbreviation) (?:for|of) ([a-z]+)$/)){const e=E(m[1]);if(e&&e.name.toLowerCase()===(ELA[m[1]]||m[1]))return 'The symbol for **'+e.name+'** is **'+e.sym+'** (atomic number '+e.z+').'}
 if(m=l.match(/atomic number (?:of|for) ([a-z]+)$/)){const e=E(m[1]);if(e)return '**'+e.name+'** has atomic number **'+e.z+'** and symbol '+e.sym+'.'}
 if(m=l.match(/(?:which |what )?element (?:has )?(?:atomic )?number (\d{1,3})$/)||(m=l.match(/(?:which |what )?element has atomic number (\d{1,3})$/))){const e=FACTS.elements[+m[1]-1];if(e)return 'Element **'+e.z+'** is **'+e.name+'** ('+e.sym+').'}
 if(m=l.match(/(?:what|which) element (?:is|has symbol) ([a-z]{1,2})$/)){const e=FACTS.elements.find(x=>x.sym.toLowerCase()===m[1]);if(e)return '**'+e.sym+'** is **'+e.name+'**, atomic number '+e.z+'.'}
 return null}

/* ---------- Wikipedia / ingested sources (BM25) ---------- */
const WIKI=[],wdf={};let wavg=1;const wtok=x=>tok(x).map(w=>{while(w.length>4&&/[es]$/.test(w))w=w.slice(0,-1);return w});
(function loadWiki(){const d=path.join(__dirname,'knowledge','wiki');let files=[];try{files=fs.readdirSync(d).filter(f=>f.endsWith('.json'))}catch(e){return}
 files.forEach(f=>{try{const a=JSON.parse(fs.readFileSync(path.join(d,f),'utf8'));(Array.isArray(a)?a:[a]).forEach(art=>(art.passages||[]).forEach((p,i)=>{const t=wtok(p),tf={};t.forEach(w=>tf[w]=(tf[w]||0)+1);WIKI.push({title:art.title,url:art.url,lic:art.license||'',i,p,tf,len:t.length||1,tt:new Set(wtok(art.title))})}))}catch(e){}});
 WIKI.forEach(x=>Object.keys(x.tf).forEach(w=>wdf[w]=(wdf[w]||0)+1));wavg=WIKI.reduce((s,x)=>s+x.len,0)/(WIKI.length||1)})();
const sents=p=>p.split(/(?<=[.!?])\s+/);
const srcName=d=>/wikipedia\.org/.test(d.url||'')?'Wikipedia':(()=>{try{return new URL(d.url).hostname}catch(e){return 'web'}})();
const attr=d=>'\n\n_Source: '+srcName(d)+', "'+d.title+'"'+(d.lic?' ('+d.lic+')':'')+(d.url?' - '+d.url:'')+'_';
function wikiAnswer(text){if(!WIKI.length)return null;
 const q=text.toLowerCase().replace(/\b(who|whom|when|where|which|was|were|tell|me|about|info|information|on|give|explain|define|describe|what|is|are|the|a|an|of|did|do|does|how|why|many|much|have|has|had|there|their|its|can|could|would|should|you|we|they|just|really|some|any|get|make|work|works)\b/g,' ');
 const qt=[...new Set(wtok(q))];if(!qt.length||qt.length>8)return null;let best=null,bs=0;
 for(const d of WIKI){let sc=0,hit=0;for(const w of qt){const f=d.tf[w]||0,inT=d.tt.has(w);if(f||inT)hit++;if(f){const idf=Math.log(1+(WIKI.length-wdf[w]+.5)/(wdf[w]+.5));sc+=idf*(f*2.2)/(f+1.2*(.25+.75*d.len/wavg))}if(inT)sc+=3}
  if(qt.every(w=>d.tt.has(w)))sc+=8;if(d.i===0)sc+=1;
  if(hit<(qt.length<=2?qt.length:Math.ceil(qt.length*.6)))continue;if(sc>bs){bs=sc;best=d}}
 if(!best||bs<4)return null;
 let ss=sents(best.p),out=ss.slice(0,3).join(' ');if(out.length>650)out=out.slice(0,650).replace(/\s+\S*$/,'')+'...';
 const nxt=WIKI.find(x=>x.title===best.title&&x.i===best.i+1);
 return{out:out+attr(best),more:nxt?nxt.p.slice(0,700)+attr(nxt):null,conf:Math.min(.9,bs/20)}}
/* ---------- Validation ---------- */
function validate(){const issues=[],seen={};
 KBE.forEach(e=>{if(!e.a||(Array.isArray(e.a)&&!e.a.length))issues.push('no answer: '+e.q[0]);
  if(e.q.length<3)issues.push('only '+e.q.length+' trigger(s), add more phrasings: '+e.q[0]);
  e.q.forEach(q=>{const k=tok(q).join(' ');if(!k){issues.push('empty trigger: '+q);return}
   if(seen[k]&&seen[k]!==e.q[0])issues.push('DUPLICATE trigger "'+q+'" used by "'+e.q[0]+'" and "'+seen[k]+'"');else seen[k]=e.q[0]})});
 const cats={};KBE.forEach(e=>cats[e.cat]=(cats[e.cat]||0)+1);
 return{entries:KBE.length,categories:cats,wikiPassages:WIKI.length,issues}}
function evaluate(){let ok=0,tot=0;const by={};docs.forEach(d=>by[d.id]=(by[d.id]||0)+1);
 docs.forEach(d=>{if(by[d.id]<2)return;tot++;if(classify(d.t,docs.filter(x=>x!==d)).id===d.id)ok++});return{tested:tot,correct:ok,accuracy:tot?Math.round(1000*ok/tot)/10:0}}
module.exports={respond,evaluate,validate,stats:()=>({intents:intents.length,kbEntries:KBE.length,wikiPassages:WIKI.length,learned:learned.length,vocab:Object.keys(df).length})};
