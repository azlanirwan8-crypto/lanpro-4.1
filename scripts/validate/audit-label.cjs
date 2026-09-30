/**
 * GERBANG LABEL — `npm run audit:label`
 *
 * KENAPA ADA.
 *
 * Item #564 menemukan 16 fungsi pemetaan status→warna yang berbeda untuk
 * kosakata yang sama, dan item #565/#566 menemukan judul tugas yang dipotong
 * `truncate max-w-[320px]` di layar yang sama. Keduanya bukan kesalahan
 * sekali jadi: keduanya adalah pola yang berulang karena tidak ada yang
 * menjaganya. Standarnya sudah ada (`src/lib/warnaLabel.ts` + `.label-chip`),
 * tapi standar tanpa gerbang akan membusuk — ia sudah pernah membusuk enam
 * belas kali.
 *
 * Gerbang ini menutup dua pintu masuk regresi:
 *
 *   R1  Membandingkan label status/jenis/prioritas dengan sebuah kata, lalu
 *       memberi WARNA pada jarak tiga baris di bawahnya. Itu pemetaan manual
 *       ke-17. Yang sah: `warnaLabel()` / `warnaDariMaster()` / `cariMaster()`.
 *
 *   R2  `truncate` berpasangan dengan `max-w-[NNpx]` pada satu baris kelas —
 *       pola yang membuat "Pengaturan kasir di wo…" dan bukan teksnya yang
 *       hilang. Yang sah: satu baris + wadahnya menggulir.
 *
 * MEKANISMENYA RATCHET, BUKAN DITOLAK MENTAH.
 *
 * Sisa domain yang memang belum dimigrasikan (QA, sprint, planning, catatan
 * rapat, ekspor PDF) tercatat di `label-baseline.json`. Jumlah per berkas
 * boleh TURUN, tidak boleh NAIK, dan berkas baru langsung gagal. Jadi gerbang
 * ini hijau hari ini tanpa pura-pura seluruh aplikasi sudah rapi — dan tiap
 * langkah migrasi membuat garis dasarnya menyusut.
 *
 * MEMPERBARUI GARIS DASAR: `npm run audit:label -- --perbarui`. Jalankan hanya
 * bila Anda memang MENAMBAH utang baru yang disengaja; memakainya supaya
 * gerbang hijau berarti mematikannya.
 *
 * YANG TIDAK BISA DILIHAT GERBANG INI. Ia membaca teks, bukan hasil render:
 * warna yang salah tapi tertulis rapi di `warnaLabel.ts`, kontras yang jelek,
 * atau kolom yang tetap sempit secara visual lolos semuanya. Verifikasi di tab
 * peramban yang bersih tetap wajib (AUDIT.md §15.3).
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const AKAR = path.resolve(__dirname, "..", "..");
const SRC = path.join(AKAR, "src");
const GARIS_DASAR = path.join(__dirname, "label-baseline.json");
const PERBARUI = process.argv.includes("--perbarui");

/** Berkas yang justru menjadi rumah standar — tidak boleh dihitung sebagai pelanggar. */
const DIKECUALIKAN = [
  path.join("lib", "warnaLabel.ts"),
  path.join("lib", "statusSelesai.ts"),
  path.join("lib", "statusKolom.ts"),
];

const POLA_LABEL =
  /(?:includes|indexOf|===|==|!==)\s*\(?\s*["'](done|selesai|completed|closed|in progress|in_progress|inprogress|dikerjakan|progress|doing|blocked|terhalang|blokir|cancelled|batal|ditolak|to do|todo|backlog|rencana|in review|in_review|review|tinjau|testing|uji|uat|epic|story|task|subtask|bug|highest|high|medium|low|critical|blocker|major|minor)["']/i;

const POLA_WARNA =
  /(?:#[0-9a-fA-F]{3,8}\b|\b(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:success|danger|warning|info|primary|secondary|emerald|rose|violet|purple|sky|cyan|amber|green|red|blue|indigo|teal)\b)/;

const POLA_POTONG =
  /\btruncate\b[^"'`]*\bmax-w-\[\d+px\]|\bmax-w-\[\d+px\][^"'`]*\btruncate\b/;

function daftarBerkas(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const penuh = path.join(dir, nama);
    const stat = fs.statSync(penuh);
    if (stat.isDirectory()) {
      if (nama === "__tests__" || nama === "node_modules") continue;
      daftarBerkas(penuh, keluar);
    } else if (/\.(ts|tsx)$/.test(nama) && !/\.test\.(ts|tsx)$/.test(nama)) {
      keluar.push(penuh);
    }
  }
  return keluar;
}

function hitung(penuh) {
  const relatif = path.relative(AKAR, penuh);
  if (DIKECUALIKAN.some((k) => relatif.endsWith(k))) return { r1: 0, r2: 0 };
  const baris = fs.readFileSync(penuh, "utf8").split(/\r?\n/);
  let r1 = 0;
  let r2 = 0;
  for (let i = 0; i < baris.length; i++) {
    const teks = baris[i];
    if (teks.trimStart().startsWith("*") || teks.trimStart().startsWith("//")) continue;
    if (POLA_POTONG.test(teks)) r2++;
    if (!POLA_LABEL.test(teks)) continue;
    const sekitar = baris.slice(i, Math.min(baris.length, i + 4)).join("\n");
    if (POLA_WARNA.test(sekitar)) r1++;
  }
  return { r1, r2 };
}

const berkas = daftarBerkas(SRC);
const hasil = {};
for (const b of berkas) {
  const { r1, r2 } = hitung(b);
  if (r1 || r2) hasil[path.relative(AKAR, b).replace(/\\/g, "/")] = { r1, r2 };
}

const total = (kunci) =>
  Object.values(hasil).reduce((a, v) => a + v[kunci], 0);

if (PERBARUI) {
  fs.writeFileSync(GARIS_DASAR, JSON.stringify(hasil, null, 2) + "\n");
  console.log(
    warna.kuning(
      `Garis dasar diperbarui: R1 ${total("r1")} pemetaan manual, R2 ${total("r2")} potongan teks.`
    )
  );
  process.exit(0);
}

const lama = fs.existsSync(GARIS_DASAR)
  ? JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"))
  : {};

const temuan = [];
for (const [rel, v] of Object.entries(hasil)) {
  const l = lama[rel] || { r1: 0, r2: 0 };
  if (v.r1 > l.r1)
    temuan.push(`R1 BARU/NAIK ${rel}: ${l.r1} -> ${v.r1} pemetaan warna label manual. Pakai warnaLabel()/warnaDariMaster() dari src/lib/warnaLabel.ts.`);
  if (v.r2 > l.r2)
    temuan.push(`R2 BARU/NAIK ${rel}: ${l.r2} -> ${v.r2} teks dipotong. Satu baris + wadahnya yang menggulir (lihat #565/#566).`);
}

console.log(warna.redup("Gerbang label (#564/#565/#566)"));
console.log(
  `  R1 pemetaan warna manual: ${warna.tebal(total("r1"))} di ${Object.keys(hasil).length} berkas · ` +
    `R2 teks dipotong: ${warna.tebal(total("r2"))}`
);
console.log(
  warna.redup(
    `  garis dasar: R1 ${Object.values(lama).reduce((a, v) => a + (v.r1 || 0), 0)} · R2 ${Object.values(lama)
      .reduce((a, v) => a + (v.r2 || 0), 0)}`
  )
);

if (temuan.length) {
  console.log("");
  for (const t of temuan) console.log(warna.merah("  " + t));
  console.log("");
  console.log(warna.merah(warna.tebal("GAGAL — standar label dilanggar.")));
  console.log(warna.redup("  Jangan perbarui garis dasar untuk membuat gerbang hijau."));
  console.log("─".repeat(58));
  process.exit(1);
}

console.log("");
console.log(warna.hijau("LULUS — tidak ada pemetaan warna atau potongan teks baru."));
console.log(warna.redup("Ini BUKAN bukti warnanya benar atau layarnya terbaca."));
console.log("─".repeat(58));
