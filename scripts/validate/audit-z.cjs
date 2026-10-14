/**
 * GERBANG TANGGA Z — `npm run audit:z`
 *
 * KENAPA ADA. Item #672 memindahkan menu topbar ke portal z-[44] karena bar
 * header membentuk stacking context sendiri — panel z-50 di dalamnya tetap
 * berlangit-langitkan z-40. Tangga z itu (#729: bar 40, scrim 45, modal 50,
 * kepala tabel 30, menu portaled 44) adalah KEPUTUSAN, bukan kebetulan angka.
 * Sebelum gerbang ini, siapa pun bisa menambah `z-[37]` atau `z-[70]` baru di
 * berkas mana pun dan tidak ada satu pun perkakas yang melihatnya — kelas
 * Tailwind hanyalah string bagi kompilator.
 *
 * Gerbang ini membekukan dua hal:
 *
 *   1. HIMPUNAN NILAI. Setiap nilai z di src — kelas `z-<n>`, kelas arbitrer
 *      `z-[<n>]`, dan `zIndex: <n>` inline — harus sudah ada di garis dasar.
 *      Nilai baru (z-[37], z-[999], apa pun) = GAGAL. Menambah nilai berarti
 *      memutuskan tempatnya di tangga (#729) — itu keputusan sadar, bukan
 *      sampingan commit.
 *
 *   2. JUMLAH PER BERKAS. Total kemunculan z di tiap berkas diratchet lewat
 *      `z-baseline.json`: turun -> lulus, naik atau berkas baru -> GAGAL.
 *      Sama seperti audit:warna/audit:tema: ambang tunggal mengizinkan satu
 *      berkas memburuk selama berkas lain membaik.
 *
 * ⚠️ YANG TIDAK BISA DILAKUKAN GERBANG INI. Ia membekukan angka, tidak
 * membuktikan angkanya benar. Ia tidak tahu apakah panel benar-benar tampil
 * di atas scrim, tidak mengukur stacking context, dan tidak tahu apakah
 * halamannya rusak. Verifikasi di tab peramban yang bersih tetap WAJIB
 * (AUDIT.md §15.3, §16) dan tidak tergantikan skrip.
 *
 * Yang dipindai hanya `.ts`/`.tsx` (test tidak dipindai). z-index yang
 * ditulis di CSS murni tidak terlihat gerbang ini — itu batas yang disengaja.
 *
 * MEMPERBARUI GARIS DASAR: `npm run audit:z -- --perbarui`. Menjalankannya
 * untuk "membuat gerbang hijau" berarti mematikan gerbangnya sendiri.
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const AKAR = path.join(__dirname, "..", "..");
const SRC = path.join(AKAR, "src");
const GARIS_DASAR = path.join(__dirname, "z-baseline.json");

/** Kelas z-* biasa: z-10, z-40, hover:z-50, dst. */
const POLA_KELAS = /\bz-(\d+)\b/g;
/** Kelas arbitrer: z-[44], z-[9999], dst. */
const POLA_ARBITRER = /\bz-\[(\d+)\]/g;
/** Inline style: zIndex: 10000 — angka literal saja, variabel tidak terlihat. */
const POLA_INLINE = /\bzIndex\s*:\s*(\d+)\b/g;

function telusuri(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) telusuri(p, keluar);
    else if (/\.tsx?$/.test(nama) && !nama.includes(".test.")) keluar.push(p);
  }
  return keluar;
}

function kosongKomentar(isi) {
  return isi.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "");
}

const berkas = telusuri(SRC);
const himpunanNilai = new Set();
const perBerkas = {};
const totalPerNilai = {};

for (const p of berkas) {
  const relatif = path.relative(AKAR, p).split(path.sep).join("/");
  const isi = kosongKomentar(fs.readFileSync(p, "utf8"));
  let n = 0;
  for (const m of isi.matchAll(POLA_KELAS)) {
    himpunanNilai.add(m[1]);
    totalPerNilai[m[1]] = (totalPerNilai[m[1]] || 0) + 1;
    n++;
  }
  for (const m of isi.matchAll(POLA_ARBITRER)) {
    himpunanNilai.add(`[${m[1]}]`);
    totalPerNilai[`[${m[1]}]`] = (totalPerNilai[`[${m[1]}]`] || 0) + 1;
    n++;
  }
  for (const m of isi.matchAll(POLA_INLINE)) {
    himpunanNilai.add(`js:${m[1]}`);
    totalPerNilai[`js:${m[1]}`] = (totalPerNilai[`js:${m[1]}`] || 0) + 1;
    n++;
  }
  if (n) perBerkas[relatif] = n;
}

const sekarang = {
  nilai: [...himpunanNilai].sort(),
  totalPerNilai,
  berkas: perBerkas,
};

const jumlah = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const perbarui = process.argv.includes("--perbarui");

if (perbarui || !fs.existsSync(GARIS_DASAR)) {
  const adaSebelumnya = fs.existsSync(GARIS_DASAR);
  fs.writeFileSync(GARIS_DASAR, JSON.stringify(sekarang, null, 2) + "\n");
  console.log(
    warna.kuning(
      `\n  Garis dasar z ${adaSebelumnya ? "DIPERBARUI" : "dibuat"}: ` +
        `${sekarang.nilai.length} nilai · ${jumlah(sekarang.berkas)} kemunculan di ` +
        `${Object.keys(sekarang.berkas).length} berkas.\n`
    )
  );
  console.log(warna.redup("  Memperbarui garis dasar untuk membuat gerbang hijau"));
  console.log(warna.redup("  berarti mematikan gerbangnya sendiri.\n"));
  process.exit(0);
}

const dasar = JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"));
const nilaiDasar = new Set(dasar.nilai);

/** Ratchet: naik atau berkas baru = gagal. Turun = lulus. */
const naik = [];
const baru = [];
let turun = 0;
for (const [b, n] of Object.entries(sekarang.berkas)) {
  if (!(b in dasar.berkas)) baru.push([b, n]);
  else if (n > dasar.berkas[b]) naik.push([b, dasar.berkas[b], n]);
  else if (n < dasar.berkas[b]) turun++;
}

const nilaiBaru = sekarang.nilai.filter((v) => !nilaiDasar.has(v));
const nilaiHilang = dasar.nilai.filter((v) => !himpunanNilai.has(v));

console.log("\n\x1b[1mGerbang tangga z\x1b[0m");
console.log(
  warna.redup(
    `  ${sekarang.nilai.length} nilai · ${jumlah(sekarang.berkas)} kemunculan di ` +
      `${Object.keys(sekarang.berkas).length} berkas`
  )
);
console.log("");

for (const v of nilaiBaru) console.log(`  ${warna.merah("NILAI BARU")} z-${v} — tidak ada di garis dasar`);
for (const v of nilaiHilang) console.log(`  ${warna.hijau("nilai hilang")} z-${v} — utang berkurang`);
for (const [b, n] of baru) console.log(`  ${warna.merah("NAIK BERKAS BARU")} ${b} — ${n} kemunculan`);
for (const [b, d, n] of naik) console.log(`  ${warna.merah("NAIK")} ${b} — ${d} → ${n}`);
if (turun) console.log(`  ${warna.hijau("turun ")} ${turun} berkas membaik`);

console.log("");
console.log("──────────────────────────────────────────────────────────");

const gagalNilai = nilaiBaru.length;
const gagalRatchet = naik.length || baru.length;

if (gagalNilai) {
  console.log(warna.merah("\x1b[1mGAGAL — nilai z baru muncul.\x1b[0m"));
  console.log(warna.redup("Setiap angka di tangga z adalah keputusan (#729): bar 40,"));
  console.log(warna.redup("menu portaled 44, scrim 45, modal 50, kepala tabel 30."));
  console.log(warna.redup("Bila nilai baru memang disengaja: -- --perbarui."));
}
if (gagalRatchet) {
  if (gagalNilai) console.log("");
  console.log(warna.merah("\x1b[1mGAGAL — pemakaian z BERTAMBAH.\x1b[0m"));
  console.log(warna.redup("Tangga z hanya boleh menyusut per berkas, tidak bertambah."));
}

if (gagalNilai || gagalRatchet) {
  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(1);
}

console.log(warna.hijau("\x1b[1mLULUS — tangga z tidak bergeser.\x1b[0m"));
console.log(warna.redup("Ini BUKAN bukti stacking benar. Buka tab peramban yang bersih (§15.3)."));
console.log("──────────────────────────────────────────────────────────\n");
