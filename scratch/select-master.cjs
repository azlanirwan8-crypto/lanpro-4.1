const fs=require("fs"),path=require("path");
const berkas=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))w(p);}
 else if(/\.tsx$/.test(p)&&!/\.test\./.test(p))berkas.push(p);}})("src");
let n=0;
for(const p of berkas){
  const s=fs.readFileSync(p,"utf8");
  let i=0;
  while((i=s.indexOf("<select",i))!==-1){
    const j=s.indexOf("</select>",i);
    if(j===-1)break;
    const blok=s.slice(i,j);
    // opsinya berasal dari MasterData?
    if(/(masterData|mArr)[\s\S]{0,80}\.filter\([\s\S]{0,80}type ===/.test(blok)){
      const baris=s.slice(0,i).split("\n").length;
      const tipe=(blok.match(/type === "(\w+)"/)||[])[1]||"?";
      console.log("  "+tipe.padEnd(14)+p+":"+baris);
      n++;
    }
    i=j+1;
  }
}
console.log("select asli yang opsinya dari MasterData:",n);
