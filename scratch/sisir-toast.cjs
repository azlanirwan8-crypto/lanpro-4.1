const fs=require('fs'),path=require('path');
const files=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))w(p);}
 else if(/\.tsx?$/.test(f.name)&&!/\.test\.|i18n[\\/]/.test(p))files.push(p);}})('src');
const hasil=[];
for(const p of files){
  const s=fs.readFileSync(p,'utf8'); const L=s.split('\n');
  L.forEach((ln,i)=>{
    // toast.x("teks") / alert("teks") — hanya literal, bukan t(...)
    const re=/(toast\.(success|error|info|warning|loading)|alert|confirm)\(\s*(["'`])((?:(?!\3)[\s\S]){4,150}?)\3/g;
    let m;
    while((m=re.exec(ln))){
      const teks=m[4];
      if(/^\s*$/.test(teks))continue;
      if(!/[A-Za-zÀ-ÿ]{3,}/.test(teks))continue;
      hasil.push({berkas:p,baris:i+1,teks:teks.slice(0,80)});
    }
  });
}
console.log('TOAST/ALERT literal:',hasil.length,'di',new Set(hasil.map(h=>h.berkas)).size,'berkas');
const perBerkas={};
for(const h of hasil)(perBerkas[h.berkas]=perBerkas[h.berkas]||[]).push(h);
for(const [b,v] of Object.entries(perBerkas).sort((a,c)=>c[1].length-a[1].length).slice(0,14))
  console.log(String(v.length).padStart(3),b);
fs.writeFileSync('scratch/toast.json',JSON.stringify(hasil,null,1));
