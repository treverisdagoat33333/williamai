/* Tiny .env loader (zero dependencies). Real environment variables always win over .env. */
const fs=require('fs'),path=require('path');
try{
 fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/).forEach(l=>{
  const m=l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(!m||l.trim().startsWith('#'))return;
  let v=m[2];if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);
  if(process.env[m[1]]===undefined)process.env[m[1]]=v;
 });
}catch(e){}
