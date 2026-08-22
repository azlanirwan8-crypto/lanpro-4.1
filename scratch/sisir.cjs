const fs=require('fs'),path=require('path');
const KATA=/[A-Za-zÀ-ÿ]{2,}/;
const ABAIKAN=/^(To Do|In Progress|Done|Blocked|Backlog|ID|EN|OK|QA|API|URL|UI|AI|PDF|CSV|JSON|SVG|PNG|JPG|LANPRO|LAN PRO)$/i;
const files=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|__|dist/.test(f.name))w(p);}
 else if(/\.tsx?$/.test(f.name)&&!/\.test\.|i18n\//.test(p))files.push(p);}})('src');
const hasil={};
for(const p of files){
 const src=fs.readFileSync(p,'utf8');const lines=src.split('\n');const temuan=[];
 lines.forEach((ln,i)=>{
  if(/^\s*(\/\/|\*|\/\*)/.test(ln))return;
  // 1. teks JSX antar tag pada satu baris:  >Teks<
  let m;const re1=/>([^<>{}\n]{3,})</g;
  while((m=re1.exec(ln))){const s=m[1].trim();
   if(s&&KATA.test(s)&&!ABAIKAN.test(s)&&!/^[\d\s.,:%/+-]+$/.test(s))temuan.push([i+1,'teks',s]);}
  // 2. atribut yang tampil ke pengguna
  const re2=/\b(placeholder|title|aria-label|alt|label)=("([^"{}]{3,})"|'([^'{}]{3,})')/g;
  while((m=re2.exec(ln))){const s=(m[3]||m[4]).trim();
   if(KATA.test(s)&&!ABAIKAN.test(s))temuan.push([i+1,m[1],s]);}
 });
 if(temuan.length)hasil[p]=temuan;
}
const total=Object.values(hasil).reduce((a,b)=>a+b.length,0);
console.log('BERKAS',Object.keys(hasil).length,'TEMUAN',total);
const urut=Object.entries(hasil).sort((a,b)=>b[1].length-a[1].length);
for(const [p,t] of urut.slice(0,40))console.log(t.length.toString().padStart(3),p);
fs.writeFileSync('scratch/sisir.json',JSON.stringify(hasil,null,1));
