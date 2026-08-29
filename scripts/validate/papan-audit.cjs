/**
 * GERBANG INTEGRITAS PAPAN §1 — `npm run audit:papan`
 *
 * KENAPA ADA. Papan §1 dipecah jadi BELUM / SELESAI / DITAHAN atas permintaan
 * pemilik proyek, supaya pertanyaan "apa yang belum?" bisa dijawab tanpa
 * membaca 94 baris. Pemisahan itu memperkenalkan kegagalan yang tidak mungkin
 * terjadi pada tabel tunggal: sebuah item bisa **ada di dua tabel sekaligus**,
 * atau **hilang dari semuanya**, dan angka di judulnya bisa berhenti cocok
 * dengan isinya.
 *
 * Ketiganya sudah terjadi, dalam satu sesi:
 *
 *   - #69 dan #70 masuk tabel SELESAI **dua kali** — dipindahkan, salinan lama
 *     tidak terhapus.
 *   - #71 **tidak pernah pindah**: skrip pemindahnya mencari status `TERBUKA`
 *     sedangkan #71 berstatus `MENUNGGU keputusan`, jadi ia dilewati **diam-
 *     diam** sementara hitungannya sudah terlanjur dikurangi.
 *   - Judulnya menulis 34 sementara isinya 35.
 *
 * Ketiganya luput karena tidak ada yang menghitung ulang. §1.5 sudah
 * memperingatkan bahwa kolom basi lebih berbahaya daripada kolom kosong; ini
 * bentuk yang sama pada angka.
 *
 * Gerbang ini tidak menilai ISI temuan — hanya bahwa papannya konsisten dengan
 * dirinya sendiri. Itu sengaja: yang bisa diperiksa mesin harus diperiksa
 * mesin, supaya perhatian manusia tersisa untuk yang tidak bisa.
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

// Jalur boleh ditimpa lewat argumen — dipakai untuk MEMBUKTIKAN gerbang ini
// bisa merah, dengan menunjuknya ke salinan rusak DI LUAR repo. §0.5 aturan 4
// melarang menyabotase sumber demi pembuktian; ini jalan keluarnya.
const BERKAS = process.argv[2] || path.join(__dirname, "..", "..", "AUDIT.md");
const baris = fs.readFileSync(BERKAS, "utf8").split("\n");

const cari = (awalan) => {
  const i = baris.findIndex((l) => l.startsWith(awalan));
  if (i === -1) {
    console.error(warna.merah(`Bagian '${awalan}' tidak ada di AUDIT.md.`));
    console.error(warna.redup("Bila strukturnya sengaja diubah, perbarui gerbang ini —"));
    console.error(warna.redup("JANGAN melonggarkannya jadi 'kalau tidak ketemu, lewati'."));
    process.exit(2);
  }
  return i;
};

const i11 = cari("### 1.1 BELUM SELESAI");
const i12 = cari("### 1.2 SUDAH SELESAI");
const i13 = cari("### 1.3 DITAHAN");
const iAkhir = cari("## §1.4");

const nomorDi = (a, z) =>
  baris
    .slice(a, z)
    .map((l) => /^\|\s*(\d+)\s*\|/.exec(l))
    .filter(Boolean)
    .map((m) => Number(m[1]));

const belum = nomorDi(i11, i12);
const selesai = nomorDi(i12, i13);
const ditahan = nomorDi(i13, iAkhir);
const semua = [...belum, ...selesai, ...ditahan];

let gagal = false;
const lapor = (pesan) => {
  console.log(`  ${warna.merah("GAGAL")}  ${pesan}`);
  gagal = true;
};

console.log("\n\x1b[1mIntegritas papan §1\x1b[0m");
console.log(warna.redup(`  BELUM ${belum.length} · SELESAI ${selesai.length} · DITAHAN ${ditahan.length}`));
console.log("");

// 1. Tidak ada item yang muncul lebih dari sekali.
const hitung = new Map();
for (const n of semua) hitung.set(n, (hitung.get(n) || 0) + 1);
const ganda = [...hitung.entries()].filter(([, v]) => v > 1).map(([k]) => k);
if (ganda.length) {
  lapor(`item muncul lebih dari sekali: ${ganda.sort((a, b) => a - b).join(", ")}`);
  console.log(warna.redup("         biasanya sisa pemindahan antar tabel yang tidak dihapus"));
}

// 2. Tidak ada nomor yang hilang di antara 1..maks.
const maks = Math.max(...semua);
const hilang = [];
for (let n = 1; n <= maks; n++) if (!hitung.has(n)) hilang.push(n);
if (hilang.length) {
  lapor(`nomor hilang dari SEMUA tabel: ${hilang.join(", ")}`);
  console.log(warna.redup("         item tidak boleh lenyap; kalau dibatalkan, taruh di §1.3"));
}

// 3. Angka di judul harus sama dengan isinya.
const angkaJudul = (i, nama) => {
  const m = /—\s*(\d+)\s*item/.exec(baris[i]);
  if (!m) {
    lapor(`judul ${nama} tidak memuat jumlah item`);
    return null;
  }
  return Number(m[1]);
};
const pasangan = [
  [angkaJudul(i11, "§1.1"), belum.length, "§1.1"],
  [angkaJudul(i12, "§1.2"), selesai.length, "§1.2"],
  [angkaJudul(i13, "§1.3"), ditahan.length, "§1.3"],
];
for (const [ditulis, nyata, nama] of pasangan) {
  if (ditulis !== null && ditulis !== nyata) {
    lapor(`${nama} menulis ${ditulis} item, isinya ${nyata}`);
  }
}

// 4. Item di tabel BELUM tidak boleh berstatus SELESAI, dan sebaliknya.
const statusDi = (a, z) =>
  baris
    .slice(a, z)
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => ({
      nomor: Number(/^\|\s*(\d+)\s*\|/.exec(l)[1]),
      status: (l.split("|")[7] || "").trim(),
    }));

for (const { nomor, status } of statusDi(i11, i12)) {
  if (/SELESAI/.test(status)) lapor(`#${nomor} ada di tabel BELUM tetapi statusnya SELESAI`);
}
for (const { nomor, status } of statusDi(i12, i13)) {
  if (!/SELESAI/.test(status)) lapor(`#${nomor} ada di tabel SELESAI tetapi statusnya '${status}'`);
}

// 5. Item #255/#259 — satu karakter pipa DI DALAM sebuah baris memecahnya jadi
// lebih dari 9 sel, dan gerbang lama membaca kolom yang salah TANPA berteriak
// (ia hanya mengambil potongan ke-N secara buta, lihat statusDi di atas).
// Baris #183 dan baris #259 sempat rusak begini sebelum ketahuan lewat
// pembacaan manual. Jumlah sel yang benar SELALU 9 pada baris tabel berformat
// '| # | temuan | fase | sev | biaya | blokir | status | detail |'.
const cacatSel = [];
for (let i = i11; i < iAkhir; i++) {
  const l = baris[i];
  if (!/^\|\s*\d+\s*\|/.test(l)) continue;
  const jumlahSel = (l.match(/\|/g) || []).length;
  if (jumlahSel !== 9) {
    const nomor = /^\|\s*(\d+)\s*\|/.exec(l)[1];
    cacatSel.push({ nomor, jumlahSel });
  }
}
for (const { nomor, jumlahSel } of cacatSel) {
  lapor(`#${nomor} punya ${jumlahSel} sel, seharusnya 9 — kemungkinan karakter pipa di dalam teks`);
}
if (cacatSel.length) {
  console.log(warna.redup("         cari code span yang memuat karakter pipa; eja cara kerjanya, jangan mengutip kode"));
}

console.log("");
console.log("──────────────────────────────────────────────────────────");
if (gagal) {
  console.log(warna.merah("\x1b[1mPAPAN TIDAK KONSISTEN.\x1b[0m"));
  console.log(warna.redup("Perbaiki AUDIT.md §1 — jangan menyesuaikan gerbang ini agar lulus."));
  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(1);
}
console.log(warna.hijau("\x1b[1mLULUS — papan konsisten dengan dirinya sendiri.\x1b[0m"));
console.log(warna.redup(`${semua.length} item, tanpa duplikat, tanpa nomor hilang.`));
console.log("──────────────────────────────────────────────────────────\n");
