#!/usr/bin/env node
/**
 * GERBANG RITME RADIUS — `npm run audit:radius`  (item #525)
 *
 * KENAPA ADA. `rounded-*` dipakai 1 749 kali di `src/` dan memakai ENAM langkah
 * sekaligus (sm 3 · default 237 · md 528 · lg 339 · xl 271 · 2xl 23) ditambah 13
 * nilai arbitrer `rounded-[...]`. Tidak ada satu pun gerbang yang melihat ini:
 * `audit:warna` hanya menghitung kelas WARNA, `tsc` dan test tidak peduli
 * sudut kartu. Artinya ritme bisa terus mengembang tanpa ada yang mengeluh —
 * persis pola yang membuat `dark:` pernah tumbuh sampai 532 (§19.46).
 *
 * Yang TIDAK dilakukan gerbang ini: mengklaim "Velzon memakai dua ritme".
 * Tidak ada sumber yang bisa dikutip di repo ini maupun di dokumentasi publik
 * Velzon, jadi gerbang tidak menegakkan angka sasaran yang tidak terbukti —
 * ia hanya mengunci supaya KEADAAN HARI INI tidak memburuk, dan menampilkan
 * distribusinya di setiap pelaksanaan agar majunya terlihat.
 *
 * DUA Pemeriksaan, keduanya RATCHET seperti `audit:warna`:
 *   1. berapa LANGKAH radius berbeda yang dipakai serentak di seluruh `src/`
 *      (global, 8 hari ini) — hanya boleh turun;
 *   2. nilai ARBITRER `rounded-[...]` per berkas: hanya yang benar-benar
 *      geometri bentuk (`IZIN_GEOMETRI`) yang boleh, dan tidak boleh bertambah.
 *
 * GARIS DASAR: `npm run audit:radius -- --perbarui`. Angka yang TURUN memang
 * harus diikuti `--perbarui` (sama seperti #288: ratchet yang tidak pernah
 * dikencangkan hanyalah ambang dengan nama yang lebih baik).
 */

const fs = require("fs");
const path = require("path");

const AKAR = path.join(__dirname, "..", "..");
const SRC = path.join(AKAR, "src");
const GARIS_DASAR = path.join(__dirname, "radius-baseline.json");

const POLA_STEP = /\brounded-?(sm|md|lg|xl|2xl|3xl|full|none)?\b/g;
const POLA_ARBITER = /\brounded(?:-[tblr]{1,2})?-\[[^\]]+\]/g;

/**
 * Radius yang bukan keputusan ritme, melainkan GEOMETRI bentuk.
 *
 * Kanvas flowchart menggambar cylinder/document/cloud: `rounded-t-[20px]`
 * adalah belahan tabung, bukan sudut kartu. Menggantinya dengan token akan
 * membuat bentuknya tidak lagi menyerupai bentuk itu.
 */
const IZIN_GEOMETRI = [
  /[/\\]features[/\\]flowchart[/\\]/,
  /[/\\]i18n[/\\]LanguageSwitcher\.tsx$/, // sudut bendera SVG 2 px
];

function telusuri(dir, keluar = []) {
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (fs.statSync(p).isDirectory()) telusuri(p, keluar);
    else if (/\.tsx?$/.test(nama) && !nama.includes(".test.")) keluar.push(p);
  }
  return keluar;
}

const LANGKAH_DIIZINKAN = new Set(["", "sm", "md", "lg", "xl", "2xl", "3xl", "full", "none"]);

const sekarang = {};
const arbitrer = {};
for (const p of telusuri(SRC)) {
  const relatif = path.relative(AKAR, p).split(path.sep).join("/");
  const isi = fs.readFileSync(p, "utf8");
  const lang = new Set();
  for (const m of isi.matchAll(POLA_STEP)) if (LANGKAH_DIIZINKAN.has(m[1] || "")) lang.add(m[1] || "default");
  if (lang.size) sekarang[relatif] = [...lang].sort();
  const liar = [...isi.matchAll(POLA_ARBITER)].filter(() => !IZIN_GEOMETRI.some((re) => re.test(p)));
  if (liar.length) arbitrer[relatif] = liar.length;
}

const total = (o) => Object.values(o).reduce((a, b) => a + (Array.isArray(b) ? 0 : b), 0);
const distribusi = {};
for (const langkah of Object.values(sekarang)) for (const l of langkah) distribusi[l] = (distribusi[l] || 0) + 1;

const perbarui = process.argv.includes("--perbarui");
const berkas = { langkah: sekarang, arbitrer };
const totalLangkahBaru = new Set(Object.keys(distribusi)).size;

if (perbarui || !fs.existsSync(GARIS_DASAR)) {
  fs.writeFileSync(GARIS_DASAR, JSON.stringify(berkas, null, 2) + "\n");
  console.log(
    `\n  Garis dasar radius ${perbarui ? "DIPERBARUI" : "dibuat"}: ` +
      `${totalLangkahBaru} langkah berbeda, ${total(arbitrer)} nilai arbitrer liar di ${Object.keys(arbitrer).length} berkas.\n`
  );
  process.exit(0);
}

const dasar = JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"));
const dasarLangkah = dasar.langkah || {};
const dasarArbitrer = dasar.arbitrer || {};
const dasarLangkahSet = new Set(Object.values(dasarLangkah).flat());
const dasarTotal = dasarLangkahSet.size;

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

console.log("\n\x1b[1mGerbang ritme radius\x1b[0m");
console.log(
  warna.redup(
    `  ${totalLangkahBaru} langkah berbeda dipakai serentak di seluruh src/ (garis dasar ${dasarTotal}) · ` +
      `berkas yang memakai tiap langkah: ` +
      Object.entries(distribusi)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ") +
      `\n  ${total(arbitrer)} nilai arbitrer liar di luar geometri yang diizinkan (garis dasar ${total(dasarArbitrer)})`
  )
);
console.log("");

const cacat = [];
/**
 * Ratchet-nya GLOBAL untuk jumlah langkah, bukan per berkas.
 *
 * Per-berkas sempat dicoba dan hasilnya menghukum pekerjaan yang benar: menambah
 * satu tombol pil (`rounded-full`) ke berkas yang belum pernah memakainya bukan
 * kemunduran ritme — yang kemunduran adalah langkah KEDELAPAN BELAS masuk ke
 * aplikasi. Yang tetap per-berkas hanya nilai arbitrer, karena itu memang
 * keputusan lokal.
 */
if (totalLangkahBaru > dasarTotal) {
  const baru = Object.keys(distribusi).filter((l) => !dasarLangkahSet.has(l));
  cacat.push(`  ${warna.merah("LANGKAH NAIK")} ${dasarTotal} → ${totalLangkahBaru}${baru.length ? " — baru: " + baru.join(", ") : ""}`);
}
for (const [b, n] of Object.entries(arbitrer)) {
  const lama = dasarArbitrer[b] || 0;
  if (n > lama) cacat.push(`  ${warna.merah("ARBITER NAIK")} ${b} — ${lama} → ${n}`);
}

for (const c of cacat.slice(0, 12)) console.log(c);
if (cacat.length > 12) console.log(warna.redup(`  … dan ${cacat.length - 12} berkas lagi`));

console.log("──────────────────────────────────────────────────────────");
if (cacat.length) {
  console.log(warna.merah(warna.tebal("GAGAL — ritme radius BERTAMBAH.")));
  console.log(warna.redup("Pakai salah satu langkah yang sudah ada. Kalau memang langkah"));
  console.log(warna.redup("baru yang dibutuhkan, itu keputusan desain: tulis alasannya di"));
  console.log(warna.redup("AUDIT.md §1 sebelum menambahkannya."));
  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(1);
}
console.log(warna.hijau(warna.tebal("LULUS — tidak ada langkah atau nilai arbitrer baru.")));
console.log("──────────────────────────────────────────────────────────\n");
