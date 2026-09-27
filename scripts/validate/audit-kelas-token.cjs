/**
 * GERBANG KELAS TOKEN — `npm run audit:kelas`
 *
 * KENAPA ADA.
 *
 * Item #157. Tabel Daftar Isu memakai `border border-subtle/80`, dan garisnya
 * terbaca HITAM PEKAT sementara seluruh layar lain lembut. Sebabnya bukan
 * pilihan warna, melainkan kelas yang TIDAK PERNAH ADA:
 *
 *   token di index.css  ->  --color-border-subtle
 *   kelas yang sah      ->  border-border-subtle   (prefix utilitas + nama token)
 *   yang tertulis       ->  border-subtle          (nama tokennya terpotong)
 *
 * Nama token keluarga border sudah diawali kata "border", jadi kelasnya
 * terbaca ganda dan tangan otomatis memangkas satu. Hasilnya kelas yang tidak
 * menghasilkan aturan CSS apa pun.
 *
 * KENAPA GAGALNYA SENYAP, DAN KENAPA BUTUH GERBANG SENDIRI.
 *
 * Tailwind v4 tidak lagi memberi `border` warna bawaan: preflight-nya menulis
 * `border: 0 solid`, tanpa `border-color`. Bila kelas warnanya tidak ada, yang
 * berlaku adalah nilai bawaan CSS untuk `border-color`, yaitu `currentColor` —
 * warna TEKS elemen itu. Di kartu berlatar terang, teksnya nyaris hitam.
 *
 * Jadi salah ketik satu kata menghasilkan garis hitam pekat, bukan garis yang
 * hilang. Dan tidak satu pun perkakas yang ada menangkapnya:
 *
 *   - `tsc` melihat string biasa
 *   - eslint tidak tahu kosakata Tailwind
 *   - `audit:warna` mencari warna KERAS (`slate-200`), ini justru kebalikannya
 *   - `audit:tema` menghitung pergeseran struktur token, bukan kelas cacat
 *   - Jest tidak pernah menghitung CSS
 *
 * CARA KERJANYA.
 *
 * Nama token dibaca dari `src/index.css` — bukan didaftar ulang di sini, supaya
 * menambah token tidak menuntut menyunting berkas ini. Untuk setiap token
 * bernama `border-X`, kelas `<prefix>-X` dinyatakan CACAT pada keluarga
 * utilitas yang memang mewarnai garis (`border`, `divide`, `ring`, `outline`).
 *
 * Aturan itu sempit dengan sengaja: `border-X` hanya diteriaki bila `border-X`
 * benar-benar potongan dari sebuah nama token. `border-slate-200` atau
 * `border-transparent` tidak tersentuh, sehingga nol temuan palsu.
 *
 * Gerbang ini TIDAK membuktikan warnanya enak dipandang. Yang dibuktikannya
 * satu hal: setiap kelas warna garis yang ditulis benar-benar menghasilkan
 * aturan CSS, bukan diam-diam jatuh ke `currentColor`.
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const AKAR = path.resolve(__dirname, "..", "..");
const SUMBER_TOKEN = path.join(AKAR, "src", "index.css");
const DIPINDAI = path.join(AKAR, "src");

// Keluarga utilitas yang mewarnai GARIS. `bg-` dan `text-` sengaja tidak ikut:
// tokennya tidak diawali kata "border", jadi pemangkasan yang sama tidak
// mungkin terjadi di sana.
const KELUARGA = ["border", "divide", "ring", "outline"];

function bacaSufiksBorder() {
  const css = fs.readFileSync(SUMBER_TOKEN, "utf8");
  const sufiks = new Set();
  for (const m of css.matchAll(/--color-border-([a-z0-9-]+)\s*:/g)) {
    sufiks.add(m[1]);
  }
  return sufiks;
}

function berkasSumber(dir, keluar = []) {
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      if (entri.name !== "node_modules") berkasSumber(p, keluar);
    } else if (/\.(ts|tsx|css)$/.test(entri.name)) {
      keluar.push(p);
    }
  }
  return keluar;
}

function main() {
  const sufiks = bacaSufiksBorder();
  if (sufiks.size === 0) {
    console.error(warna.merah("GAGAL: nol token --color-border-* di src/index.css."));
    console.error(warna.redup("  Gerbang ini tidak boleh lulus tanpa sumber token."));
    process.exit(1);
  }

  // Contoh pola: (^|[^-\w])(border|divide|ring|outline)-(subtle|faint|inverse)(?![\w-])
  // Penjaga di depan mencegah `border-border-subtle` ikut tertangkap; penjaga
  // di belakang mencegah `border-subtle-foo` yang bukan urusan kita. Pecahan
  // opasitas (`/80`) berada SESUDAH batas kata, jadi tetap tertangkap.
  const pola = new RegExp(
    `(^|[^-\\w])(${KELUARGA.join("|")})-(${[...sufiks].join("|")})(?![\\w-])`,
    "g"
  );

  const temuan = [];
  for (const berkas of berkasSumber(DIPINDAI)) {
    const baris = fs.readFileSync(berkas, "utf8").split("\n");
    baris.forEach((isi, i) => {
      pola.lastIndex = 0;
      let m;
      while ((m = pola.exec(isi))) {
        temuan.push({
          berkas: path.relative(AKAR, berkas),
          baris: i + 1,
          salah: `${m[2]}-${m[3]}`,
          benar: `${m[2]}-border-${m[3]}`,
        });
      }
    });
  }

  const garis = "─".repeat(58);
  console.log(`\n${warna.tebal("Gerbang kelas token")}`);
  console.log(warna.redup(`  ${sufiks.size} token border · ${KELUARGA.length} keluarga utilitas`));

  if (temuan.length === 0) {
    console.log(`\n${garis}`);
    console.log(warna.hijau(warna.tebal("LULUS — tidak ada kelas warna garis yang cacat.")));
    console.log(warna.redup("Ini BUKAN bukti warnanya benar, hanya bukti kelasnya menghasilkan CSS."));
    console.log(`${garis}\n`);
    return;
  }

  console.log("");
  for (const t of temuan) {
    console.log(`  ${warna.merah("CACAT")}  ${t.berkas}:${t.baris}`);
    console.log(warna.redup(`         ${t.salah}  ->  ${t.benar}`));
  }
  console.log(`\n${garis}`);
  console.log(warna.merah(warna.tebal(`${temuan.length} kelas tidak menghasilkan CSS apa pun.`)));
  console.log(
    warna.redup("Tailwind v4 tidak memberi border warna bawaan, jadi garisnya jatuh ke")
  );
  console.log(warna.redup("`currentColor` — warna teks. Di latar terang itu terbaca hitam pekat."));
  console.log(`${garis}\n`);
  process.exit(1);
}

main();
