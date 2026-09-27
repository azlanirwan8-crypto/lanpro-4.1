/**
 * GERBANG TEMA — `npm run audit:tema`
 *
 * KENAPA ADA. Tema terang/gelap repo ini pernah dirusak oleh perkakas AI yang
 * mengerjakannya tanpa mengetahui kosakata tokennya, dan **tidak ada satu pun
 * gerbang yang menangkapnya**. `tsc`, 404 test, dan `build` seluruhnya hijau
 * sementara tampilannya rusak — kelas Tailwind hanyalah string bagi kompilator.
 *
 * `audit:warna` pun tidak cukup: ia hanya menghitung kelas warna KERAS yang
 * bertambah. Tiga cara paling umum merusak tema lolos begitu saja darinya:
 *
 *   1. mengubah NILAI token di `src/index.css`,
 *   2. menambah override `dark:` bertumpuk,
 *   3. menyilangkan kosakata (`bg-content-*`, `text-surface-*`).
 *
 * Gerbang ini menutup ketiganya.
 *
 * ⚠️ YANG TIDAK BISA DILAKUKAN GERBANG INI. Ia menangkap tema yang rusak
 * secara STRUKTURAL. Ia tidak bisa menilai tema yang jelek secara rasa, tidak
 * mengukur kontras, dan tidak tahu apakah halamannya tampil. Verifikasi di tab
 * peramban yang bersih tetap WAJIB (§15.3, §16) dan tidak tergantikan skrip.
 *
 * ── PEMERIKSAAN 1: NILAI TOKEN DIKUNCI ────────────────────────────────────
 *
 * Seluruh `--color-*` di `src/index.css` direkam beserta nilainya. Perubahan
 * apa pun — satu digit hex sekalipun — membuat gerbang MERAH.
 *
 * Kenapa sekeras itu: satu token dipakai ratusan tempat. Mengubah nilainya
 * untuk memperbaiki SATU layar akan mengubah seluruh aplikasi sekaligus, dan
 * kerusakannya muncul di layar yang bahkan tidak dibuka orang yang mengubahnya.
 * Bila token memang perlu berubah, itu keputusan sadar: `-- --perbarui`.
 *
 * ── PEMERIKSAAN 2 & 3: RATCHET PER BERKAS ─────────────────────────────────
 *
 * `dark:` dan kosakata bersilangan dibatasi PER BERKAS lewat `tema-baseline.json`:
 * turun -> lulus, naik -> GAGAL, berkas baru -> GAGAL. Sama seperti
 * `audit:warna`, dan alasannya sama: ambang tunggal mengizinkan satu berkas
 * memburuk selama berkas lain membaik.
 *
 * `dark:` tersisa 21 kemunculan di SATU berkas, turun dari puncak 532. Mode
 * gelap kini ditangani token, bukan override. Angka 21 itu utang yang dikunci —
 * bukan izin untuk menambah yang ke-22.
 *
 * KOSAKATA BERSILANGAN yang masih ada (20 kemunculan) TIDAK seluruhnya cacat.
 * `bg-border-subtle` misalnya dipakai untuk garis pemisah yang digambar sebagai
 * `div` — warnanya memang warna garis. Karena itu ia diratchet, bukan ditolak
 * mentah: yang ada dibiarkan, yang baru dilarang.
 *
 * MEMPERBARUI GARIS DASAR: `npm run audit:tema -- --perbarui`. Menjalankannya
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
const CSS = path.join(SRC, "index.css");
const GARIS_DASAR = path.join(__dirname, "tema-baseline.json");

/** `dark:` — override manual. Mode gelap seharusnya datang dari token. */
const POLA_DARK = /\bdark:/g;

/**
 * Kosakata yang tidak boleh bersilangan.
 *
 * Latar memakai `surface-*`, teks memakai `content-*`, garis memakai
 * `border-*`. Menyilangkannya bukan gaya penulisan alternatif — di mode gelap
 * nilainya berkebalikan, sehingga `text-content-inverse` di atas latar
 * `bg-content-*` menjadi terang-di-atas-terang alias hilang. Persis kesalahan
 * yang membuat `text-slate-300` sempat menjadi `text-border-subtle`.
 */
const POLA_SILANG = new RegExp(
  [
    "\\b(?:bg|from|via|to)-(?:content|border)-[a-z0-9-]+",
    "\\b(?:text|placeholder)-(?:surface|border)-[a-z0-9-]+",
    "\\b(?:border|ring|divide)-(?:content|surface)-[a-z0-9-]+",
  ].join("|"),
  "g"
);

function telusuri(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) telusuri(p, keluar);
    else if (/\.tsx?$/.test(nama) && !nama.includes(".test.")) keluar.push(p);
  }
  return keluar;
}

/**
 * Token direkam sebagai `nama#N` — kemunculan ke-N.
 *
 * Nama saja tidak cukup: token yang sama muncul di blok terang DAN gelap dengan
 * nilai berbeda. Tanpa nomor urut, menukar kedua nilainya akan lolos.
 */
function bacaToken() {
  const isi = fs.readFileSync(CSS, "utf8");
  const hitung = {};
  const token = {};
  const pola = /--(color-[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = pola.exec(isi))) {
    const nama = m[1];
    hitung[nama] = (hitung[nama] || 0) + 1;
    token[`${nama}#${hitung[nama]}`] = m[2].trim();
  }
  return token;
}

const berkas = telusuri(SRC);
const hitungPola = (pola) => {
  const keluar = {};
  for (const p of berkas) {
    const relatif = path.relative(AKAR, p).split(path.sep).join("/");
    const n = (fs.readFileSync(p, "utf8").match(pola) || []).length;
    if (n) keluar[relatif] = n;
  }
  return keluar;
};

const sekarang = {
  token: bacaToken(),
  dark: hitungPola(POLA_DARK),
  silang: hitungPola(POLA_SILANG),
};

const jumlah = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const perbarui = process.argv.includes("--perbarui");

if (perbarui || !fs.existsSync(GARIS_DASAR)) {
  const adaSebelumnya = fs.existsSync(GARIS_DASAR);
  fs.writeFileSync(GARIS_DASAR, JSON.stringify(sekarang, null, 2) + "\n");
  console.log(
    warna.kuning(
      `\n  Garis dasar tema ${adaSebelumnya ? "DIPERBARUI" : "dibuat"}: ` +
        `${Object.keys(sekarang.token).length} token · ` +
        `${jumlah(sekarang.dark)} dark: · ${jumlah(sekarang.silang)} silang.\n`
    )
  );
  console.log(warna.redup("  Memperbarui garis dasar untuk membuat gerbang hijau"));
  console.log(warna.redup("  berarti mematikan gerbangnya sendiri.\n"));
  process.exit(0);
}

const dasar = JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"));

/** Ratchet: naik atau berkas baru = gagal. Turun = lulus, dan boleh dikunci. */
function bandingRatchet(kini, dulu) {
  const naik = [];
  const baru = [];
  let turun = 0;
  for (const [b, n] of Object.entries(kini)) {
    if (!(b in dulu)) baru.push([b, n]);
    else if (n > dulu[b]) naik.push([b, dulu[b], n]);
    else if (n < dulu[b]) turun++;
  }
  return { naik, baru, turun };
}

const tokenBerubah = [];
const tokenHilang = [];
const tokenBaru = [];
for (const [k, v] of Object.entries(sekarang.token)) {
  if (!(k in dasar.token)) tokenBaru.push([k, v]);
  else if (dasar.token[k] !== v) tokenBerubah.push([k, dasar.token[k], v]);
}
for (const k of Object.keys(dasar.token)) if (!(k in sekarang.token)) tokenHilang.push(k);

const rDark = bandingRatchet(sekarang.dark, dasar.dark);
const rSilang = bandingRatchet(sekarang.silang, dasar.silang);

console.log("\n\x1b[1mGerbang tema\x1b[0m");
console.log(
  warna.redup(
    `  ${Object.keys(sekarang.token).length} token · ` +
      `${jumlah(sekarang.dark)} dark: · ${jumlah(sekarang.silang)} kosakata bersilangan`
  )
);
console.log("");

for (const [k, d, n] of tokenBerubah)
  console.log(`  ${warna.merah("NILAI ")} --${k.split("#")[0]} — ${d} → ${n}`);
for (const k of tokenHilang) console.log(`  ${warna.merah("HILANG")} --${k.split("#")[0]}`);
for (const [k, v] of tokenBaru) console.log(`  ${warna.merah("BARU  ")} --${k.split("#")[0]} = ${v}`);
for (const [b, n] of rDark.baru) console.log(`  ${warna.merah("dark: BARU")} ${b} — ${n}`);
for (const [b, d, n] of rDark.naik) console.log(`  ${warna.merah("dark: NAIK")} ${b} — ${d} → ${n}`);
for (const [b, n] of rSilang.baru) console.log(`  ${warna.merah("silang BARU")} ${b} — ${n}`);
for (const [b, d, n] of rSilang.naik)
  console.log(`  ${warna.merah("silang NAIK")} ${b} — ${d} → ${n}`);

const turun = rDark.turun + rSilang.turun;
if (turun) console.log(`  ${warna.hijau("turun ")} ${turun} berkas membaik`);

console.log("");
console.log("──────────────────────────────────────────────────────────");

const gagalToken = tokenBerubah.length || tokenHilang.length || tokenBaru.length;
const gagalRatchet = rDark.naik.length || rDark.baru.length || rSilang.naik.length || rSilang.baru.length;

if (gagalToken) {
  console.log(warna.merah("\x1b[1mGAGAL — nilai token BERUBAH.\x1b[0m"));
  console.log(warna.redup("Satu token dipakai ratusan tempat. Mengubahnya untuk memperbaiki"));
  console.log(warna.redup("satu layar akan mengubah seluruh aplikasi sekaligus."));
  console.log(warna.redup("Baca AUDIT.md §22 lebih dulu. Bila memang disengaja: -- --perbarui."));
}
if (gagalRatchet) {
  if (gagalToken) console.log("");
  console.log(warna.merah("\x1b[1mGAGAL — override tema BERTAMBAH.\x1b[0m"));
  console.log(warna.redup("Mode gelap ditangani TOKEN, bukan `dark:`. Kosakata tidak boleh"));
  console.log(warna.redup("bersilangan: latar `surface-*`, teks `content-*`, garis `border-*`."));
  console.log(warna.redup("Aturannya AUDIT.md §22."));
}

if (gagalToken || gagalRatchet) {
  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(1);
}

console.log(warna.hijau("\x1b[1mLULUS — tema tidak bergeser secara struktural.\x1b[0m"));
console.log(warna.redup("Ini BUKAN bukti tampilannya benar. Buka tab peramban yang bersih (§15.3)."));
console.log("──────────────────────────────────────────────────────────\n");
