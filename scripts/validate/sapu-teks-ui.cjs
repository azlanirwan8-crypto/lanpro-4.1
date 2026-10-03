/**
 * PEMINDAI TEKS UI YANG TIDAK LEWAT KAMUS — `node scripts/validate/sapu-teks-ui.cjs`
 *
 * KENAPA ADA. #536 mencatat empat teks chrome papan gambar dirakit di luar i18n,
 * #590 menyapu warna + bahasa di seluruh layar, dan #559 menemukan kalimat
 * Indonesia muncul di mode English. Tidak satu pun dari itu meninggalkan
 * penjaga, jadi pada 03 Okt pemindaian ini menemukan puluhan kalimat Indonesia
 * yang masih tertulis langsung di komponen — pengguna English melihatnya apa
 * adanya. Standar papan sudah jelas (AUDIT.md §12: teks layar lewat kamus);
 * yang belum ada adalah pintunya.
 *
 * CARA BACA HASILNYA. Ini RATCHET, bukan vonis nol. `teks-ui-baseline.json`
 * berisi daftar yang MASIH ada alasannya (teks yang memang ISI data, nama produk,
 * atau string yang belum dipindahkan). Yang boleh berubah hanya mengecil.
 *
 *   node scripts/validate/sapu-teks-ui.cjs            # laporkan + bandingkan
 *   node scripts/validate/sapu-teks-ui.cjs --lengkap  # cetak daftar penuh
 *   node scripts/validate/sapu-teks-ui.cjs --perbarui # tulis ulang garis dasar
 *
 * YANG TIDAK DILIHAT. Ia membaca teks, bukan render. Kalimat yang benar-benar
 * muncul dua kali, atau kunci kamus yang isinya salah bahasa, lolos semuanya —
 * itu dijaga terpisah oleh `paritas-kamus.test.ts` dan test komponen berbahasa.
 */

const fs = require("fs");
const path = require("path");

const AKAR = path.resolve(__dirname, "..", "..");
const SRC = path.join(AKAR, "src");
const GARIS_DASAR = path.join(__dirname, "teks-ui-baseline.json");
const args = process.argv.slice(2);
const CETAK = args.includes("--lengkap");
const PERBARUI = args.includes("--perbarui");

const KECUALI = [/i18n[\\/]locales/, /\.test\./, /\.d\.ts$/, /__mocks__/, /[\\/]test[\\/]/];

/** Dua kata atau lebih, minimal satu di antaranya cukup panjang. */
const KALIMAT = /[A-Za-zÀ-ÿ]{3,}[ .,!'’()-]+[A-Za-zÀ-ÿ]{2,}/;
/** Bukan kalimat layar: kelas Tailwind, URL, id SVG, nama produk, kode warna. */
const BUKAN_TEKS =
  /^(w-|h-|p-|m-|px-|py-|text-|bg-|border|rounded|flex|grid|absolute|relative|hidden|opacity|shadow|z-|min-|max-|hover:|focus:|md:|sm:|lg:|xl:|url\(|#|https?:|\/\/|\d|filter |transition |transform |scale-|ring-|line-clamp|duration-|ease-|top-|left-|right-|bottom-|inset|pointer-|select-|cursor-|overflow|whitespace|tracking-|leading-|font-|gap-|space-|items-|justify-|place-|animate-|group|list-|table-|inline|block |uppercase|capitalize|italic|underline|order-|col-|row-|self-|basis-|grow|shrink)/;

/** Kunci kamus yang ditulis sebagai string (`permModul.dashboardLabel`) bukan teks keras. */
const KUNCI = /^[a-z][\w]*(\.[\w]+)+$/;

const POLA = [
  ["jsx", />([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)</g, 1],
  ["atribut", /\b(placeholder|title|aria-label|alt)=["']([^"']{6,180})["']/g, 2],
  ["notifikasi", /\b(?:toast\.\w+|alert|confirm)\(\s*["'`]([^"'`]{6,200})/g, 1],
  [
    "definisi",
    /\b(?:label|text|description|heading|emptyText|title):\s*["'`]([^"'`]{6,180})["'`]/g,
    1,
  ],
  ["ternary", /\?\s*["'`]([^"'`]{6,200})["'`]/g, 1],
  ["ternary", /:\s*["'`]([^"'`]{6,200})["'`](?![\s,.)\]}])/g, 1],
];

function buangKomentar(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function kumpulkan() {
  const temuan = [];
  const jalan = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) {
        jalan(p);
        continue;
      }
      if (!/\.tsx$/.test(p) || KECUALI.some((r) => r.test(p))) continue;
      const tanpa = buangKomentar(fs.readFileSync(p, "utf8")).split("\n");
      tanpa.forEach((baris, i) => {
        if (/^\s*(import|export type|from)\b/.test(baris)) return;
        for (const [jenis, re, grup] of POLA) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(baris))) {
            const teks = m[grup].trim();
            if (teks.length < 6 || !KALIMAT.test(teks) || BUKAN_TEKS.test(teks)) continue;
            if (KUNCI.test(teks)) continue;
            if (/["'`]/.test(teks)) continue;
            temuan.push({
              berkas: path.relative(SRC, p).replace(/\\/g, "/"),
              baris: i + 1,
              jenis,
              teks: teks.slice(0, 160),
            });
          }
        }
      });
    }
  };
  jalan(SRC);
  // Satu string bisa tertangkap dua pola pada baris yang sama.
  const unik = new Map();
  temuan.forEach((t) => unik.set(`${t.berkas}:${t.baris}:${t.teks}`, t));
  return [...unik.values()].sort((a, b) => (a.berkas + a.baris).localeCompare(b.berkas + b.baris));
}

const kunci = (t) => `${t.berkas}:${t.teks}`;
const punya = new Set();
const sekarang = kumpulkan();

if (CETAK) {
  sekarang.forEach((t) => process.stdout.write(`${t.berkas}:${t.baris} [${t.jenis}] ${t.teks}\n`));
  process.stdout.write(`\n${sekarang.length} kandidat\n`);
}

if (PERBARUI) {
  const isi = {};
  sekarang.forEach((t) => (isi[kunci(t)] = { berkas: t.berkas, teks: t.teks, jenis: t.jenis }));
  fs.writeFileSync(GARIS_DASAR, JSON.stringify(isi, null, 2) + "\n", "utf8");
  process.stdout.write(`Garis dasar diperbarui: ${Object.keys(isi).length} teks keras tercatat.\n`);
  process.exit(0);
}

if (!fs.existsSync(GARIS_DASAR)) {
  process.stdout.write("TIDAK ADA GARIS DASAR — jalankan dengan --perbarui lebih dulu.\n");
  process.exit(1);
}
const dasar = JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"));
const baru = sekarang.filter((t) => !dasar[kunci(t)]);
const selesai = Object.keys(dasar).filter((k) => !sekarang.some((t) => kunci(t) === k));

process.stdout.write(
  `  kandidat teks UI di luar kamus: ${sekarang.length} · garis dasar ${Object.keys(dasar).length}\n`
);
if (baru.length) {
  process.stdout.write(`\n  BARU (${baru.length}) — teks layar harus lewat t():\n`);
  baru.forEach((t) => process.stdout.write(`    ${t.berkas}:${t.baris} [${t.jenis}] ${t.teks}\n`));
}
if (selesai.length) {
  process.stdout.write(
    `\n  ${selesai.length} sudah tidak ditemukan — perbarui garis dasar: npm run sapu:teks -- --perbarui\n`
  );
}
if (baru.length) {
  process.stdout.write("\n──────────────────────────────────────────────────────────\nGAGAL\n");
  process.exit(1);
}
process.stdout.write("\n──────────────────────────────────────────────────────────\n");
process.stdout.write(
  selesai.length
    ? "LULUS (bersih) — tidak ada teks baru; garis dasar boleh menyusut.\n"
    : "LULUS — tidak ada teks layar baru yang dirakit di luar kamus.\n"
);
process.stdout.write("Ini BUKAN bukti kalimatnya benar — hanya bahwa semuanya lewat kamus.\n");
process.stdout.write("──────────────────────────────────────────────────────────\n");
