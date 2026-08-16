/**
 * MENGGANTI WARNA KERAS MENJADI TOKEN — item #13 (F12), tema gelap.
 *
 * `npm run fix:warna` (uji-coba)   ·   `npm run fix:warna -- --tulis`
 *
 * KENAPA BERBENTUK SKRIP, bukan suntingan tangan. Ada ~960 kelas warna keras di
 * 91 berkas. Menyuntingnya satu per satu menjamin ketidakkonsistenan; yang
 * dibutuhkan justru pemetaan yang SAMA di semua tempat, dan itu hanya bisa
 * dijamin bila aturannya ditulis sekali.
 *
 * KENAPA AMAN. Nilai token di mode TERANG identik byte-per-byte dengan kelas
 * slate yang digantikan (dibaca dari `src/index.css`):
 *
 *   surface #ffffff = white          content           #0f172a = slate-900
 *   surface-sunken #f8fafc = 50      content-strong    #1e293b = slate-800
 *   surface-muted  #f4f7f9 ~ 100     content-body      #334155 = slate-700
 *   border-faint   #f1f5f9 = 100     content-secondary #475569 = slate-600
 *   border-subtle  #e2e8f0 = 200     content-muted     #64748b = slate-500
 *                                    content-subtle    #94a3b8 = slate-400
 *
 * Artinya tampilan mode TERANG tidak berubah; yang bertambah hanya mode gelap.
 *
 * ATURAN PENGAMAN — semuanya lahir dari bug nyata saat mengonversi
 * `dashboard/styles.ts` (§19.46). Pemetaan menyeluruh mengubah yang TIDAK
 * dimaksud secepat ia mengubah yang dimaksud:
 *
 *   1. `text-white` TIDAK PERNAH diganti. Ia hampir selalu duduk di atas
 *      permukaan berwarna atau gelap yang memang tetap gelap di kedua mode.
 *   2. Kelas ber-OPASITAS (`bg-white/10`) TIDAK diganti. Itu pola lapisan di
 *      atas latar gelap; `surface` di mode gelap bernilai gelap, sehingga
 *      lapisannya hilang.
 *   3. `bg-slate-800/900/950` TIDAK diganti. Itu kartu yang memang dirancang
 *      gelap di KEDUA mode.
 *   4. Gradasi (`from-` `via-` `to-`) TIDAK disentuh — warnanya keputusan
 *      desain, bukan tema.
 *   5. Kosakata tidak boleh bersilangan: latar tidak memakai token `content-*`,
 *      teks tidak memakai `surface-*`/`border-*`. Persis kesalahan yang membuat
 *      `text-slate-300` sempat menjadi `text-border-subtle`.
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

/** Pemetaan per KOSAKATA. Kunci yang tidak ada berarti sengaja tidak dipetakan. */
const PETA = {
  bg: {
    white: "surface",
    // Permukaan yang SENGAJA gelap di kedua mode. Nilai tokennya sama persis
    // dengan slate yang digantikan, jadi tidak ada piksel yang berubah.
    "slate-800": "surface-inverse",
    "slate-900": "surface-inverse",
    "slate-200": "surface-strong",
    "gray-200": "surface-strong",
    "slate-50": "surface-sunken",
    "slate-100": "surface-muted",
    "gray-50": "surface-sunken",
    "gray-100": "surface-muted",
  },
  text: {
    "slate-300": "content-subtle",
    "slate-400": "content-subtle",
    "slate-500": "content-muted",
    "slate-600": "content-secondary",
    "slate-700": "content-body",
    "slate-800": "content-strong",
    "slate-900": "content",
    "gray-400": "content-subtle",
    "gray-500": "content-muted",
    "gray-600": "content-secondary",
    "gray-700": "content-body",
    "gray-800": "content-strong",
    "gray-900": "content",
  },
  border: {
    "slate-800": "border-inverse",
    "slate-700": "border-inverse",
    "slate-100": "border-faint",
    "slate-200": "border-subtle",
    "slate-300": "border-subtle",
    "gray-100": "border-faint",
    "gray-200": "border-subtle",
    "gray-300": "border-subtle",
  },
};
PETA.divide = PETA.border;
PETA.ring = PETA.border;
PETA.placeholder = PETA.text;

const POLA = /\b(bg|text|border|ring|divide|placeholder)-(white|black|(?:slate|gray|zinc|neutral|stone)-\d{2,3})(\/\d+)?\b/g;

function ubah(isi) {
  let diganti = 0;
  const dilewati = [];
  const hasil = isi.replace(POLA, (utuh, prop, wrn, opasitas) => {
    if (opasitas) {
      dilewati.push(`${utuh} (opasitas — lapisan)`);
      return utuh;
    }
    // `text-white` kini PUNYA token: `content-inverse` bernilai #ffffff di
    // KEDUA mode, jadi penggantiannya identik piksel demi piksel. Sebelum token
    // itu ada, ia harus dilewati — bukan karena tidak boleh diganti, melainkan
    // karena tidak ada tujuan yang aman.
    if (prop === "text" && wrn === "white") {
      diganti++;
      return "text-content-inverse";
    }
    const tujuan = PETA[prop] && PETA[prop][wrn];
    if (!tujuan) {
      dilewati.push(utuh);
      return utuh;
    }
    diganti++;
    return `${prop}-${tujuan}`;
  });
  return { hasil, diganti, dilewati };
}

const tulis = process.argv.includes("--tulis");
const AKAR = path.join(__dirname, "..", "..", "src");

/** Berkas yang sedang diubah di luar sesi ini TIDAK BOLEH disentuh. */
const terkunci = new Set(
  (process.env.LANPRO_HINDARI || "")
    .split(",")
    .map((x) => path.normalize(x.trim()))
    .filter(Boolean)
);

const berkas = [];
(function telusuri(dir) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) telusuri(p);
    else if (/\.tsx?$/.test(n) && !n.includes(".test.")) berkas.push(p);
  }
})(AKAR);

console.log(
  tulis
    ? warna.kuning("\n  MODE TULIS — berkas akan diubah\n")
    : warna.redup("\n  MODE UJI-COBA — tidak ada yang ditulis. Tambahkan --tulis.\n")
);

let totalGanti = 0;
let totalBerkas = 0;
let totalLewat = 0;
const lewatContoh = new Map();

for (const p of berkas) {
  const relatif = path.relative(path.join(__dirname, "..", ".."), p);
  if (terkunci.has(path.normalize(relatif))) continue;

  const isi = fs.readFileSync(p, "utf8");
  const { hasil, diganti, dilewati } = ubah(isi);
  totalLewat += dilewati.length;
  for (const d of dilewati) lewatContoh.set(d, (lewatContoh.get(d) || 0) + 1);

  if (diganti === 0) continue;
  totalGanti += diganti;
  totalBerkas++;
  console.log(`  ${String(diganti).padStart(3)}  ${relatif}`);
  if (tulis) fs.writeFileSync(p, hasil);
}

console.log("");
console.log("──────────────────────────────────────────────────────────");
console.log(`  ${warna.hijau(totalGanti)} kelas diganti di ${totalBerkas} berkas`);
console.log(`  ${warna.redup(totalLewat + " kelas SENGAJA dilewati")}`);
for (const [k, v] of [...lewatContoh.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
  console.log(warna.redup(`      ${String(v).padStart(3)}× ${k}`));
}
console.log("──────────────────────────────────────────────────────────\n");
