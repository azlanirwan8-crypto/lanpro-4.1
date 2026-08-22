const fs=require('fs'),path=require('path');
const files=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))w(p);}
 else if(/\.tsx?$/.test(f.name)&&!/\.test\./.test(p))files.push(p);}})('src');
const peta={};
for(const p of files){
  const s=fs.readFileSync(p,'utf8');
  // hanya filter yang jelas atas MasterData: (m) => m.type === "x" / d.type === "x" dalam konteks masterData|mArr
  const re=/(masterData|mArr|master)\s*(\.|\?\.)?\s*(filter|find)\s*\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\4\.type\s*===\s*["'](\w+)["']/g;
  let m;
  while((m=re.exec(s))){
    const tipe=m[5];const ln=s.slice(0,m.index).split('\n').length;
    (peta[tipe]=peta[tipe]||[]).push(p+':'+ln);
  }
}
console.log(JSON.stringify(peta,null,1));
