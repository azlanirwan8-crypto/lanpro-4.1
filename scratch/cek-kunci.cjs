/** Validasi: setiap kunci t("...") yang dipakai kode HARUS ada di kamus id & en.
 *  Menangani nilai multi-baris hasil prettier (kunci: \n  "teks panjang"). */
const fs=require("fs"), path=require("path");
function bacaKamus(f){
  const lines=fs.readFileSync(f,"utf8").split("\n");
  const keys=new Set(); let area=null;
  for(const line of lines){
    const open=line.match(/^\s{2}(\w+):\s*\{/); if(open){area=open[1];continue;}
    if(/^\s{2}\},?\s*$/.test(line)){area=null;continue;}
    const kv=line.match(/^\s{4}(\w+):/); if(kv&&area)keys.add(area+"."+kv[1]);
  }
  return keys;
}
const id=bacaKamus("src/i18n/locales/id.ts"), en=bacaKamus("src/i18n/locales/en.ts");
const dipakai=new Map();
function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,f.name);
  if(f.isDirectory()){if(f.name!=="node_modules")walk(p);continue;}
  if(!/\.tsx?$/.test(f.name)||/\.test\./.test(f.name))continue;
  const s=fs.readFileSync(p,"utf8");
  for(const m of s.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)){
    if(!dipakai.has(m[1]))dipakai.set(m[1],p);
  }
}}
walk("src");
const hilangId=[...dipakai.keys()].filter(k=>!id.has(k)).sort();
const hilangEn=[...dipakai.keys()].filter(k=>!en.has(k)).sort();
console.log("kunci dipakai:",dipakai.size);
console.log("HILANG di id.ts:",hilangId.length); hilangId.forEach(k=>console.log("  "+k+"   <- "+dipakai.get(k)));
console.log("HILANG di en.ts:",hilangEn.length); hilangEn.forEach(k=>console.log("  "+k));
process.exit(hilangId.length+hilangEn.length?1:0);
