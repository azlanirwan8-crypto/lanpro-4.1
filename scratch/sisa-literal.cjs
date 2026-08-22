/** #135 — cari string literal yang MASIH hardcoded (belum lewat t()).
 *  Menangkap teks JSX, placeholder/title/aria-label, dan <option>. */
const fs=require("fs");
const src=fs.readFileSync(process.argv[2],"utf8");
const out=new Set();
for(const m of src.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}\n]{2,70})\s*</g)){
  const t=m[1].trim();
  if(/^[\s\d.,:;|/\-–—•*+()%]+$/.test(t)) continue;
  out.add("TEXT: "+t);
}
for(const m of src.matchAll(/(?:placeholder|title|aria-label)="([^"]{2,70})"/g)) out.add("ATTR: "+m[1].trim());
const hasil=[...out].filter(s=>/[A-Za-z]{3}/.test(s));
if(hasil.length) { console.log("### "+process.argv[2].split(/[\/]/).pop()); hasil.forEach(h=>console.log("  "+h)); }
