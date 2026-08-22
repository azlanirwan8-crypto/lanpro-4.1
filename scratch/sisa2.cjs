/** #135 v2 — tangkap SEMUA literal UI yang belum lewat t():
 *  1. baris JSX yang isinya murni teks (tidak ada tag/kurung kurawal)
 *  2. atribut placeholder/title/aria-label
 *  3. pola >teks< inline
 *  4. string di dalam array/objek label */
const fs=require("fs");
const path=process.argv[2];
const lines=fs.readFileSync(path,"utf8").split("\n");
const out=new Set();
lines.forEach((l,i)=>{
  const st=l.trim();
  // 1. baris teks murni di JSX
  if(/^[A-Za-zÀ-ÿ][^<>{}]*$/.test(st) && /[A-Za-zÀ-ÿ]{3}/.test(st) && st.length<=80
     && !/^(import|export|const|let|var|return|if|else|function|type|interface|await|async)\b/.test(st)
     && !st.endsWith(";") && !st.endsWith(",") && !st.endsWith("=") && !st.includes("=>"))
    out.add(`L${i+1} TEXT: ${st}`);
  // 3. inline
  for(const m of l.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}\n]{2,70})\s*</g)){
    const t=m[1].trim();
    if(/[A-Za-zÀ-ÿ]{3}/.test(t)) out.add(`L${i+1} INLINE: ${t}`);
  }
  // 2. atribut
  for(const m of l.matchAll(/(?:placeholder|title|aria-label)="([^"]{2,80})"/g))
    out.add(`L${i+1} ATTR: ${m[1].trim()}`);
});
if(out.size){console.log("### "+path.split(/[\/]/).pop());[...out].forEach(x=>console.log("  "+x));}
