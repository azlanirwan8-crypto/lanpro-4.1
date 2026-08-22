const fs=require("fs"),path=require("path");
const berkas=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))w(p);}
 else if(/\.tsx$/.test(p)&&!/\.test\./.test(p))berkas.push(p);}})("src");

// Tipe MasterData yang benar-benar ada di basis data
const TIPE=["category","department","environment","fitur","issue_type","jabatan","jenis_dokumen",
 "methodology","priority","project_risk","project_role","project_status","qa_phase","qa_status",
 "release","resolution","sprint_status","status","surrounding","system"];

const hasil=[];
for(const p of berkas){
  const s=fs.readFileSync(p,"utf8");
  const L=s.split("\n");
  L.forEach((ln,i)=>{
    for(const t of TIPE){
      if(!ln.includes('"'+t+'"'))continue;
      // cari konteks 25 baris ke bawah: <select> atau StyledDropdown?
      const blok=L.slice(Math.max(0,i-12), i+25).join("\n");
      const jenis = /<StyledDropdown/.test(blok) ? "StyledDropdown" :
                    /<select/.test(blok) ? "select-asli" : "?";
      const ikon = /icon:/.test(blok) || /RenderIcon/.test(blok);
      hasil.push({berkas:p,baris:i+1,tipe:t,jenis,ikon});
    }
  });
}
const kunci=new Set();
const bersih=hasil.filter(h=>{const k=h.berkas+h.tipe+h.jenis;if(kunci.has(k))return false;kunci.add(k);return true;});
console.log("titik dropdown MasterData:",bersih.length);
console.log("");
for(const j of ["select-asli","StyledDropdown","?"]){
  const g=bersih.filter(h=>h.jenis===j);
  if(!g.length)continue;
  console.log("== "+j+" ("+g.length+")");
  for(const h of g) console.log("   "+(h.ikon?"ikon ":"POLOS")+"  "+h.tipe.padEnd(15)+h.berkas+":"+h.baris);
}
