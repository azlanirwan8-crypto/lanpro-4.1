/**
 * GERBANG WARNA KERAS — `npm run audit:warna`
 *
 * KENAPA ADA, dan kenapa ia lebih penting daripada konversi berikutnya.
 *
 * 606 kelas warna keras sudah diganti token (§19.46). Seluruhnya lolos `tsc`,
 * 404 test, dan `build` — dan ketiganya **akan tetap hijau seandainya seluruh
 * konversi itu salah**, sebab kelas Tailwind hanyalah string bagi kompilator
 * maupun Jest.
 *
 * Artinya sebelum gerbang ini ada, tidak ada apa pun yang mencegah warna keras
 * masuk kembali besok. Itu bukan kekhawatiran teoretis: kelas `dark:` di repo
 * ini pernah tumbuh sampai **532** tanpa ada yang menghentikannya.
 *
 * CARA KERJANYA: RATCHET, BUKAN AMBANG.
 *
 * Gerbang berambang tunggal ("maksimal 336") punya cacat halus: ia mengizinkan
 * satu berkas memburuk selama berkas lain membaik. Yang dipakai di sini adalah
 * batas PER BERKAS yang direkam di `warna-baseline.json`:
 *
 *   - jumlah TURUN  -> lulus, dan angkanya boleh diperbarui
 *   - jumlah NAIK   -> GAGAL, sekecil apa pun
 *   - berkas BARU   -> GAGAL
 *
 * Dengan begitu kemajuan tidak pernah bisa tergerus diam-diam oleh penambahan
 * di tempat lain.
 *
 * YANG SENGAJA TIDAK DIHITUNG. Beberapa bentuk memang belum punya tujuan token
 * yang aman, dan menghitungnya sebagai pelanggaran hanya akan membuat gerbang
 * ini dimatikan orang. Daftarnya ada di `DIKECUALIKAN` beserta alasannya —
 * bukan supaya lolos, melainkan supaya alasannya tertulis dan bisa dibantah.
 *
 * MEMPERBARUI GARIS DASAR: `npm run audit:warna -- --perbarui`. Itu tindakan
 * SADAR. Menjalankannya untuk "membuat gerbang hijau" berarti mematikan
 * gerbangnya sendiri.
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
const GARIS_DASAR = path.join(__dirname, "warna-baseline.json");

const POLA =
  /\b(?:bg|text|border|ring|divide|placeholder|from|via|to)-(?:white|black|(?:slate|gray|zinc|neutral|stone)-\d{2,3})(?:\/\d+)?\b/g;

/**
 * Bentuk yang belum punya tujuan token yang aman.
 *
 * `from-`/`via-`/`to-` dikecualikan seluruhnya: gradasi adalah keputusan
 * desain, bukan tema, dan memetakannya ke token akan meratakan gradasinya.
 */
const DIKECUALIKAN = [
  { pola: /^(?:from|via|to)-/, alasan: "gradasi — keputusan desain, bukan tema" },
];

const dikecualikan = (kelas) => DIKECUALIKAN.some((d) => d.pola.test(kelas));

function telusuri(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) telusuri(p, keluar);
    else if (/\.tsx?$/.test(nama) && !nama.includes(".test.")) keluar.push(p);
  }
  return keluar;
}

const sekarang = {};
for (const p of telusuri(SRC)) {
  const relatif = path.relative(AKAR, p).split(path.sep).join("/");
  const cocok = (fs.readFileSync(p, "utf8").match(POLA) || []).filter((k) => !dikecualikan(k));
  if (cocok.length) sekarang[relatif] = cocok.length;
}

const totalSekarang = Object.values(sekarang).reduce((a, b) => a + b, 0);
const perbarui = process.argv.includes("--perbarui");

if (perbarui || !fs.existsSync(GARIS_DASAR)) {
  fs.writeFileSync(GARIS_DASAR, JSON.stringify(sekarang, null, 2) + "\n");
  console.log(
    warna.kuning(
      `\n  Garis dasar ${fs.existsSync(GARIS_DASAR) ? "DIPERBARUI" : "dibuat"}: ` +
        `${totalSekarang} kelas di ${Object.keys(sekarang).length} berkas.\n`
    )
  );
  console.log(warna.redup("  Memperbarui garis dasar untuk membuat gerbang hijau"));
  console.log(warna.redup("  berarti mematikan gerbangnya sendiri.\n"));
  process.exit(0);
}

const dasar = JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"));
const totalDasar = Object.values(dasar).reduce((a, b) => a + b, 0);

const naik = [];
const baru = [];
const turun = [];

for (const [berkas, n] of Object.entries(sekarang)) {
  if (!(berkas in dasar)) baru.push([berkas, n]);
  else if (n > dasar[berkas]) naik.push([berkas, dasar[berkas], n]);
  else if (n < dasar[berkas]) turun.push([berkas, dasar[berkas], n]);
}
const hilang = Object.keys(dasar).filter((b) => !(b in sekarang));

console.log("\n\x1b[1mGerbang warna keras\x1b[0m");
console.log(
  warna.redup(
    `  ${totalSekarang} kelas di ${Object.keys(sekarang).length} berkas ` +
      `(garis dasar ${totalDasar})`
  )
);
console.log("");

for (const [b, n] of baru) console.log(`  ${warna.merah("BARU  ")} ${b} — ${n} kelas`);
for (const [b, d, n] of naik) console.log(`  ${warna.merah("NAIK  ")} ${b} — ${d} → ${n}`);
for (const [b, d, n] of turun.slice(0, 5))
  console.log(`  ${warna.hijau("turun ")} ${b} — ${d} → ${n}`);
if (turun.length > 5) console.log(warna.redup(`         … dan ${turun.length - 5} berkas lagi`));
for (const b of hilang.slice(0, 3)) console.log(`  ${warna.hijau("bersih")} ${b}`);

console.log("");
console.log("──────────────────────────────────────────────────────────");

if (naik.length || baru.length) {
  console.log(warna.merah("\x1b[1mGAGAL — warna keras BERTAMBAH.\x1b[0m"));
  console.log(warna.redup("Pakai token dari src/index.css. Bila belum ada tujuan yang"));
  console.log(warna.redup("aman, tambahkan tokennya lebih dulu — jangan perbarui garis dasar."));
  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(1);
}

/**
 * KEMAJUAN WAJIB DIKUNCI (#288).
 *
 * Sebelum ini, penurunan hanya menghasilkan SARAN ("jalankan --perbarui").
 * Saran boleh diabaikan, dan yang diabaikan tidak pernah terjadi: garis dasar
 * tetap di angka lama, sehingga warna keras yang sudah dihapus boleh masuk
 * kembali besok tanpa satu pun gerbang mengeluh. Ratchet yang tidak pernah
 * dikencangkan hanyalah ambang batas dengan nama yang lebih baik.
 *
 * Sekarang penurunan MENGGAGALKAN gerbang sampai garis dasarnya diperbarui.
 * Ini terdengar keras untuk sebuah perbaikan, dan memang disengaja: harganya
 * satu perintah, dan yang dibelinya adalah kemajuan yang tidak bisa tergerus
 * diam-diam. Bedakan dari kegagalan di atas — yang itu berarti "Anda merusak",
 * yang ini berarti "Anda memperbaiki, kuncilah".
 */
if (turun.length || hilang.length) {
  console.log(warna.kuning("\x1b[1mKUNCI KEMAJUANNYA — warna keras BERKURANG.\x1b[0m"));
  console.log(
    warna.redup(`${totalDasar - totalSekarang} kelas berkurang, garis dasar masih di angka lama.`)
  );
  console.log(warna.redup("Jalankan perintah ini, lalu ikutkan berkasnya dalam commit:"));
  console.log("");
  console.log("  npm run audit:warna -- --perbarui");
  console.log("  git add scripts/validate/warna-baseline.json");
  console.log("");
  console.log(warna.redup("Tanpa langkah itu, kemajuan hari ini boleh hilang lagi besok"));
  console.log(warna.redup("tanpa satu pun gerbang mengeluh."));
  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(1);
}

console.log(warna.hijau("\x1b[1mLULUS — tidak ada warna keras baru.\x1b[0m"));
console.log("──────────────────────────────────────────────────────────\n");
