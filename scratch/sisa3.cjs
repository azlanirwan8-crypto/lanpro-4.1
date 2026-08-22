/** #135 v3 — literal UI yang belum lewat t(), dibatasi ke isi tag JSX.
 *  Baris teks murni dihitung hanya bila baris sebelumnya membuka tag (berakhir '>')
 *  DAN baris sesudahnya menutup tag (diawali '</'). */
const fs=require("fs");
const p=process.argv[2];
const L=fs.readFileSync(p,"utf8").split("\n");
const out=new Set();
const kode=/^(import|export|const|let|var|return|if|else|function|type|interface|await|async|case|default|break|new |throw)\b|[=;{}()[\]]|\.\w+\(|=>|\|\||&&/;
L.forEach((l,i)=>{
  const st=l.trim();
  const prev=(L[i-1]||"").trim(), next=(L[i+1]||"").trim();
  if(/^[A-Za-zÀ-ÿ][^<>{}]*$/.test(st) && /[A-Za-zÀ-ÿ]{3}/.test(st) && st.length<=80
     && !kode.test(st) && prev.endsWith(">") && next.startsWith("</"))
    out.add(`L${i+1} TEXT: ${st}`);
  for(const m of l.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}\n]{2,70})\s*</g)){
    const t=m[1].trim(); if(/[A-Za-zÀ-ÿ]{3}/.test(t)&&!kode.test(t)) out.add(`L${i+1} INLINE: ${t}`);
  }
  for(const m of l.matchAll(/(?:placeholder|title|aria-label)="([^"]{2,80})"/g))
    out.add(`L${i+1} ATTR: ${m[1].trim()}`);
});
if(out.size){console.log("### "+p.split(/[\/]/).pop());[...out].forEach(x=>console.log("  "+x));}
