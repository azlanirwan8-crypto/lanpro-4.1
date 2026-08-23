/** Pesan berbahasa yang dikirim server ke klien — item #150. */
const fs=require("fs"),path=require("path");
const {teksUntukPengguna}=require("./saring.cjs");
const berkas=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))w(p);}
 else if(/\.ts$/.test(p)&&!/\.test\./.test(p))berkas.push(p);}})("server");
const hasil=[];
for(const p of berkas){
  const s=fs.readFileSync(p,"utf8");
  s.split("\n").forEach((ln,i)=>{
    if(/^\s*(\/\/|\*)/.test(ln))return;
    const re=/\b(message|error|msg|reason|detail)\s*:\s*(["'`])((?:(?!\2)[\s\S]){5,200}?)\2/g;
    let m;
    while((m=re.exec(ln))){
      const t=m[3].replace(/\$\{[^}]*\}/g,"…").trim();
      if(!teksUntukPengguna(t))continue;
      hasil.push({berkas:p.split(path.sep).join("/"),baris:i+1,teks:t});
    }
  });
}
fs.writeFileSync("scratch/server-pesan.json",JSON.stringify(hasil,null,1));
const per={};for(const h of hasil)(per[h.berkas]=per[h.berkas]||[]).push(h);
console.log("pesan server:",hasil.length,"unik:",new Set(hasil.map(h=>h.teks)).size,"di",Object.keys(per).length,"berkas");
Object.entries(per).sort((a,b)=>b[1].length-a[1].length).slice(0,10).forEach(([b,v])=>console.log("  "+String(v.length).padStart(3)+"  "+b));
