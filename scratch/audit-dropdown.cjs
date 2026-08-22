const fs=require('fs'),path=require('path');
const files=[];
(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(!/node_modules|dist/.test(f.name))w(p);}
 else if(/\.tsx$/.test(f.name)&&!/\.test\./.test(p))files.push(p);}})('src');

const hasil=[];
for(const p of files){
  const s=fs.readFileSync(p,'utf8'); const L=s.split('\n');
  // 1. <select> ... </select>
  let i=0;
  while(i<L.length){
    if(/<select/.test(L[i])){
      let j=i, blok=[];
      while(j<L.length && !/<\/select>/.test(L[j])){blok.push(L[j]);j++;}
      blok.push(L[j]||'');
      const teks=blok.join('\n');
      const opsiKeras=[...teks.matchAll(/<option[^>]*>([^<{][^<]*)</g)].map(m=>m[1].trim()).filter(Boolean);
      const dariMaster=/masterData|mArr|master\b|MasterData/.test(teks);
      hasil.push({berkas:p,baris:i+1,jenis:'select',dariMaster,opsiKeras});
      i=j+1;
    } else i++;
  }
  // 2. StyledDropdown options={[...]}
  const re=/<StyledDropdown[\s\S]{0,1400}?\/>/g; let m;
  while((m=re.exec(s))){
    const blok=m[0];
    const ln=s.slice(0,m.index).split('\n').length;
    const dariMaster=/masterData|mArr|\bmaster\b/.test(blok);
    const labels=[...blok.matchAll(/label:\s*"([^"]+)"/g)].map(x=>x[1]);
    hasil.push({berkas:p,baris:ln,jenis:'StyledDropdown',dariMaster,opsiKeras:labels});
  }
}
fs.writeFileSync('scratch/audit-dropdown.json',JSON.stringify(hasil,null,1));
const keras=hasil.filter(h=>!h.dariMaster && h.opsiKeras.length);
console.log('total dropdown terdeteksi:',hasil.length);
console.log('bersumber master data   :',hasil.filter(h=>h.dariMaster).length);
console.log('opsi keras (perlu ditinjau):',keras.length);
console.log('');
for(const k of keras) console.log(k.berkas+':'+k.baris+' ['+k.jenis+'] '+k.opsiKeras.slice(0,6).join(' | '));
