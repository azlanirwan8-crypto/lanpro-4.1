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
 * YANG DIHITUNG TAPI TIDAK DIHAKIMI. Keluarga kromatik (`emerald`, `rose`,
 * `amber`, …) ikut dicetak sebagai HITUNGAN sejak #719, lengkap dengan
 * selisihnya terhadap rekaman terakhir — tetapi tidak memengaruhi kode keluar.
 * Baca blok komentar `KELUARGA_KROMATIK` di bawah untuk alasannya.
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

/**
 * #719 — KELUARGA KROMATIK: HITUNGAN, BUKAN KELULUSAN.
 *
 * POLA di atas hanya mengenali warna NETRAL (white/black/slate/gray/zinc/
 * neutral/stone). Akibatnya gerbang ini pernah menulis LULUS di atas 147 kelas
 * kromatik di Flowchart dan 29 di layar rincian Isu: bagi POLA, `bg-emerald-500`
 * sama tidak adanya dengan `bg-teal-300` yang sudah dihapus. Padahal keduanya
 * sama-sama warna keras yang tidak ikut berpindah saat tema berubah — sebab yang
 * sama sudah tercatat di #696.
 *
 * Angka di bawah SENGAJA tidak ikut memutuskan lulus/gagal. Menyalakan ratchet
 * pada ±976 kelas sekaligus membuat gerbang merah di menit pertama, dan gerbang
 * yang merah tanpa jalan keluar akan dimatikan orang (pelajaran #688). Yang
 * dibeli hitungan ini adalah KETERLIHATAN: ia dicetak setiap pelaksanaan,
 * direkam di `warna-kromatik.json`, dan selisihnya terhadap rekaman terakhir
 * ikut ditampilkan — jadi kenaikannya tidak bisa lagi bersembunyi di balik kata
 * LULUS. Memindahkannya menjadi ratchet per berkas adalah keputusan tersendiri
 * (AUDIT.md #719 catatan ii).
 *
 * Berbeda dari ratchet netral, gradasi (`from-/via-/to-`) IKUT dihitung di sini.
 * Pengecualian di sana ada karena gradasi tidak boleh diratakan ke token, bukan
 * karena warnanya tidak keras.
 */
const KELUARGA_KROMATIK = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
];
const POLA_KROMATIK = new RegExp(
  `\\b(?:bg|text|border|ring|divide|placeholder|from|via|to)-` +
    `(?:${KELUARGA_KROMATIK.join("|")})-\\d{2,3}(?:/\\d+)?\\b`,
  "g"
);
/** Lubang yang sama lewat pintu lain: nilai hex/rgb arbitrer, bukan palet bernama. */
const POLA_HEX_ARBITRER =
  /\b(?:bg|text|border|ring|divide|from|via|to|shadow|fill|stroke)-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^]\s]*\)|hsla?\([^]\s]*\))\]/g;
const REKAMAN_KROMATIK = path.join(__dirname, "warna-kromatik.json");

function telusuri(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) telusuri(p, keluar);
    else if (/\.tsx?$/.test(nama) && !nama.includes(".test.")) keluar.push(p);
  }
  return keluar;
}

const sekarang = {};
const kromatik = { keluarga: {}, perBerkas: {}, hexArbitrer: {} };

for (const p of telusuri(SRC)) {
  const relatif = path.relative(AKAR, p).split(path.sep).join("/");
  const isi = fs.readFileSync(p, "utf8");

  const cocok = (isi.match(POLA) || []).filter((k) => !dikecualikan(k));
  if (cocok.length) sekarang[relatif] = cocok.length;

  const krom = isi.match(POLA_KROMATIK) || [];
  if (krom.length) {
    kromatik.perBerkas[relatif] = krom.length;
    for (const k of krom) {
      const fam = KELUARGA_KROMATIK.find((f) => k.includes(`-${f}-`));
      kromatik.keluarga[fam] = (kromatik.keluarga[fam] || 0) + 1;
    }
  }
  const hexLiar = isi.match(POLA_HEX_ARBITRER) || [];
  if (hexLiar.length) kromatik.hexArbitrer[relatif] = hexLiar.length;
}

const jumlah = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const totalKromatik = jumlah(kromatik.perBerkas);
const totalHex = jumlah(kromatik.hexArbitrer);

/**
 * Dicetak di SETIAP jalur keluar — termasuk `--perbarui` — supaya tidak ada
 * keadaan di mana gerbang ini berbicara tanpa menyebut angka yang dulu tidak
 * bisa dilihatnya. Rekaman dibuat sendiri bila belum ada; menghapus berkasnya
 * hanya menghapus pembanding, tidak meloloskan apa pun.
 */
function laporKromatik() {
  const ada = fs.existsSync(REKAMAN_KROMATIK);
  const lama = ada ? JSON.parse(fs.readFileSync(REKAMAN_KROMATIK, "utf8")) : null;
  if (!lama) fs.writeFileSync(REKAMAN_KROMATIK, JSON.stringify(kromatik, null, 2) + "\n");
  const totalLama = lama ? jumlah(lama.perBerkas || {}) : null;

  console.log(warna.kuning(`\x1b[1mHitungan warna kromatik — #719, LAPORAN SAJA\x1b[0m`));
  console.log(
    warna.redup(
      `  ${totalKromatik} kelas kromatik di ${Object.keys(kromatik.perBerkas).length} berkas · ` +
        `${totalHex} hex/rgb arbitrer di ${Object.keys(kromatik.hexArbitrer).length} berkas`
    )
  );
  console.log(
    warna.redup(
      `  keluarga: ` +
        Object.entries(kromatik.keluarga)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ")
    )
  );
  console.log(
    warna.redup(
      `  terberat: ` +
        Object.entries(kromatik.perBerkas)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k, v]) => `${k.split("/").pop()} ${v}`)
          .join(" · ")
    )
  );
  if (totalLama === null) {
    console.log(warna.redup(`  rekaman pertama dibuat di scripts/validate/warna-kromatik.json`));
  } else if (totalKromatik !== totalLama) {
    const arah = totalKromatik > totalLama ? "NAIK" : "turun";
    const cetak = totalKromatik > totalLama ? warna.kuning : warna.hijau;
    console.log(cetak(`  ${arah} ${totalLama} → ${totalKromatik} sejak rekaman terakhir`));
  } else {
    console.log(warna.redup(`  tidak berubah sejak rekaman terakhir (${totalLama})`));
  }
  console.log(
    warna.redup(
      `  Angka ini TIDAK memutuskan lulus/gagal — dengan sengaja, lihat #719 catatan (ii).`
    )
  );
  console.log("");
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
  if (perbarui) fs.writeFileSync(REKAMAN_KROMATIK, JSON.stringify(kromatik, null, 2) + "\n");
  laporKromatik();
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

laporKromatik();

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
