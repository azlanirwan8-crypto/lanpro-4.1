/** Alat bantu #135: kumpulkan kandidat string UI dari sebuah berkas .tsx.
 *  Menangkap teks JSX, atribut placeholder/title/aria-label, dan option.
 *  Sengaja longgar — hasilnya disaring manusia, bukan diterapkan otomatis. */
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");
const out = new Set();

// Teks di antara tag, mis. >Simpan Perubahan<
for (const m of src.matchAll(/>\s*([A-Z][A-Za-z0-9 ,.'&/()\-?!:]{2,70})\s*</g)) out.add(m[1].trim());
// Atribut teks
for (const m of src.matchAll(/(?:placeholder|title|aria-label|label)="([^"{}]{3,70})"/g)) out.add(m[1].trim());
// <option>
for (const m of src.matchAll(/<option[^>]*>\s*([^<{][^<]{2,60})</g)) out.add(m[1].trim());

const inggris = /\b(the|and|or|of|to|in|for|with|by|no|not|all|new|add|edit|delete|save|cancel|search|filter|select|loading|error|success|failed|create|update|remove|view|show|hide|open|close|back|next|previous|submit|confirm|yes|task|tasks|user|users|project|projects|team|member|members|status|priority|assign|assigned|due|date|name|title|description|comment|comments|file|files|upload|download|export|import|settings|profile|role|roles|permission|permissions|active|inactive|pending|approved|rejected|total|list|board|sprint|issue|issues|report|reports|manage|management|access|invite|invites|empty|none|day|days|hour|hours|week|month|year)\b/i;

const hasil = [...out].filter((s) => inggris.test(s) && !/^[A-Z0-9_]+$/.test(s));
console.log(JSON.stringify(hasil.sort(), null, 1));
