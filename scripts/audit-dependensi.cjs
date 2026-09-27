#!/usr/bin/env node
/**
 * Gerbang rantai pasok — §18.9 langkah 3.
 *
 * Menjalankan `npm audit`, lalu MEMBLOKIR bila ada kerentanan berat.
 *
 * Kenapa ambangnya `high`, bukan `moderate`:
 * per 16 Agu 2026 repo ini punya 4 kerentanan `moderate` yang HANYA bisa
 * ditutup lewat `npm audit fix --force`, dan itu berarti kenaikan versi mayor
 * pada react-router, exceljs, dan uuid. Memasang ambang di `moderate` hari ini
 * membuat CI merah tanpa jalan keluar yang aman, dan gerbang yang selalu merah
 * cepat dimatikan orang.
 *
 * Ambangnya dinaikkan ke `moderate` setelah item #77 dituntaskan. Sampai saat
 * itu, keempatnya tercatat sebagai risiko yang ditanggung di §18.7 — bukan
 * disembunyikan.
 *
 * Keluaran ringkasnya sengaja dibuat sama bentuknya dengan `npm run doctor`
 * supaya terbaca oleh orang yang sama.
 */

const { execSync } = require("child_process");

const AMBANG = process.env.AUDIT_AMBANG || "high";
const URUTAN = ["info", "low", "moderate", "high", "critical"];

const warna = {
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

let mentah;
try {
  // `execSync` dipakai, bukan `execFileSync`: di Windows `npm` adalah berkas
  // .cmd yang menuntut shell, dan tanpa shell keluarannya kosong tanpa pesan.
  mentah = execSync("npm audit --json", {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch (err) {
  // `npm audit` keluar dengan kode non-nol saat menemukan kerentanan.
  // Itu bukan kegagalan menjalankan; keluarannya tetap dipakai.
  mentah = err.stdout;
}

if (!mentah) {
  console.error(warna.merah("GAGAL menjalankan `npm audit` — tidak ada keluaran."));
  process.exit(2);
}

let data;
try {
  data = JSON.parse(mentah);
} catch {
  console.error(warna.merah("GAGAL membaca keluaran `npm audit` sebagai JSON."));
  process.exit(2);
}

const ringkas = (data.metadata && data.metadata.vulnerabilities) || {};
const totalDependensi =
  (data.metadata && data.metadata.dependencies && data.metadata.dependencies.total) || "?";

console.log("");
console.log(warna.tebal("Audit rantai pasok dependensi"));
console.log(warna.redup(`  ${totalDependensi} dependensi · ambang blokir: ${AMBANG}`));
console.log("");

const ambangIdx = URUTAN.indexOf(AMBANG);
let jumlahMemblokir = 0;
let jumlahDilaporkan = 0;

for (const tingkat of [...URUTAN].reverse()) {
  const n = ringkas[tingkat] || 0;
  if (n === 0) continue;
  jumlahDilaporkan += n;
  const memblokir = URUTAN.indexOf(tingkat) >= ambangIdx;
  if (memblokir) jumlahMemblokir += n;
  const label = memblokir ? warna.merah("BLOKIR") : warna.kuning("catat ");
  console.log(`  ${label}  ${tingkat.padEnd(9)} ${n}`);
}

if (jumlahDilaporkan === 0) {
  console.log(warna.hijau("  OK    tidak ada kerentanan yang dilaporkan"));
}

const rincian = data.vulnerabilities || {};
const berat = Object.entries(rincian).filter(
  ([, v]) => URUTAN.indexOf(v.severity) >= ambangIdx
);

if (berat.length > 0) {
  console.log("");
  console.log(warna.tebal("Yang memblokir:"));
  for (const [nama, v] of berat) {
    const via = Array.isArray(v.via) ? v.via : [];
    const judul = via.find((x) => x && typeof x === "object" && x.title);
    console.log(`  ${v.severity.padEnd(9)} ${nama}`);
    if (judul) console.log(warna.redup(`            ${judul.title}`));
  }
}

console.log("");
console.log("──────────────────────────────────────────────────────────");
if (jumlahMemblokir > 0) {
  console.log(
    warna.merah(warna.tebal(`GAGAL — ${jumlahMemblokir} kerentanan pada atau di atas '${AMBANG}'.`))
  );
  console.log(warna.redup("Perbaiki, atau turunkan risikonya dan catat di AUDIT.md §18.7."));
  console.log("──────────────────────────────────────────────────────────");
  process.exit(1);
}

console.log(warna.hijau(warna.tebal(`LULUS — tidak ada kerentanan pada atau di atas '${AMBANG}'.`)));
if (jumlahDilaporkan > 0) {
  console.log(
    warna.redup(
      `${jumlahDilaporkan} kerentanan di bawah ambang tetap tercatat — lihat AUDIT.md §18.7 item #77.`
    )
  );
}
console.log("──────────────────────────────────────────────────────────");
process.exit(0);
