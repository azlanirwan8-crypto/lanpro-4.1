/**
 * Memindai teks anak JSX pada SELURUH ISI BERKAS, bukan per baris — item #149.
 *
 * KENAPA INI BERBEDA. Semua pemindai sebelumnya membaca berkas baris demi
 * baris. Padahal prettier memotong teks panjang menjadi beberapa baris, dan
 * tag pembukanya sering berakhir di baris sendiri:
 *
 *     <p className="...">
 *       Masukkan alamat email akun Anda. Kami akan mengirim tautan untuk
 *       mengatur ulang kata sandi.
 *     </p>
 *
 * Tidak ada satu baris pun di situ yang cocok dengan pola `>teks<`. Seluruh
 * kelas teks ini karena itu tidak pernah terlihat — dan itulah yang ditemukan
 * pemilik proyek di modal Lupa Kata Sandi.
 *
 * Di sini isinya dibaca utuh, komentar dan blok kode dibuang, lalu setiap
 * potongan teks di antara `>` dan `<` diambil betapa pun banyak barisnya.
 */
const fs = require("fs");
const path = require("path");
const { teksUntukPengguna } = require("./saring.cjs");

const AKRONIM =
  /^(?:[\s\d.,:;%/+\-–—•·|()[\]{}#*?!]*|To Do|In Progress|In Review|Done|Blocked|Backlog|Cancelled|ID|EN|OK|QA|API|UI|UX|AI|PDF|CSV|XML|JSON|SQL|SVG|PNG|JPG|MB|KB|GB|SIT|UAT|PTR|DEV|PROD|STG|BRD|FSD|TSD|PRD|WA|HP|LANPRO|LAN PRO|Miro|Neon|PostgreSQL|MySQL|Redis|Resend|WhatsApp|Google|Microsoft|Figma|Excel|Word|Vercel|GitHub|Jira)$/i;

const berkas = [];
(function telusuri(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) telusuri(p);
    } else if (/\.tsx$/.test(p) && !/\.test\./.test(p) && !/[\\/]i18n[\\/]/.test(p)) {
      berkas.push(p);
    }
  }
})("src");

const hasil = [];
for (const p of berkas) {
  let s = fs.readFileSync(p, "utf8");
  // buang komentar blok dan baris agar isinya tidak ikut terbaca sebagai teks
  s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  s = s.replace(/^[ \t]*\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));

  // Teks anak JSX: dari '>' sampai '<' atau '{', boleh melintasi baris.
  const re = />([^<>{}]+)(?=<|\{)/g;
  let m;
  while ((m = re.exec(s))) {
    const mentah = m[1];
    const teks = mentah.replace(/\s+/g, " ").trim();
    if (!teksUntukPengguna(teks)) continue;
    const baris = s.slice(0, m.index).split("\n").length;
    hasil.push({ berkas: p.split(path.sep).join("/"), baris, teks });
  }
}

fs.writeFileSync("scratch/jsx-utuh.json", JSON.stringify(hasil, null, 1));
const perBerkas = {};
for (const h of hasil) (perBerkas[h.berkas] = perBerkas[h.berkas] || []).push(h);
console.log("teks JSX ditemukan:", hasil.length, "di", Object.keys(perBerkas).length, "berkas");
for (const [b, v] of Object.entries(perBerkas).sort((a, c) => c[1].length - a[1].length).slice(0, 15))
  console.log("  " + String(v.length).padStart(3) + "  " + b.split("/").slice(-1)[0] + "  :: " + JSON.stringify(v[0].teks).slice(0, 46));
