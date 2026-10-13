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
 * ── PERLUASAN #719: KELAS LAIN YANG TIDAK MENGHASILKAN CSS ──────────────────
 *
 * Aturan di atas hanya melihat GARIS. Empat bentuk lain gagal dengan cara yang
 * persis sama — senyap, tanpa satu pun perkakas mengeluh — dan keempatnya
 * pernah duduk di layar rincian Isu sekaligus (#720):
 *
 *   1. TOKEN PALSU. Utilitas warna memakai kosakata token (`surface-`,
 *      `content-`, `primary-`, …) tetapi nama lengkapnya tidak ada di
 *      `index.css`: `text-primary-foreground`, `border-danger-border/30`,
 *      `text-content-base`, `hover:border-border`. Akarnya benar, ekornya
 *      karangan — CSS-nya nol.
 *   2. OPASITAS GANDA. `bg-surface-sunken/70/40`: dua modifier alpha dalam satu
 *      kelas. Tailwind hanya membaca yang pertama sebagai pecahan, sisanya
 *      membuat seluruh kelas tidak cocok dengan utilitas apa pun.
 *   3. SKALA TIPUAN. `tracking-normalr`, `tracking-normalst`: satu dua huruf
 *      lebih panjang dari nilai skala yang sah, jadi bukan utilitas apa pun.
 *   4. WARNA NEGATIF. `-content-x-1/2`: imbuhan minus menempel pada kosakata
 *      warna. Tailwind hanya menegatifkan sumbu (margin, inset, translate,
 *      rotate, z, order), tidak pernah warna.
 *
 * Keempatnya RATCHET terhadap `kelas-cacat-baseline.json`, bukan nol-toleransi,
 * sebab 46 kemunculan sudah lebih dulu ada sebelum aturannya ditulis dan
 * memperbaikinya berarti mengubah layar — itu item tersendiri (#733), bukan
 * bagian dari memperluas gerbang. Yang dikunci di sini: tidak boleh bertambah.
 * Dua dari empat bentuk itu (opasitas ganda, warna negatif) bernol temuan hari
 * ini; aturannya tetap dipasang supaya bentuk yang sudah pernah merusak layar
 * tidak bisa pulang tanpa diketahui.
 *
 * Berkas `.test.` DIKECUALIKAN dari keempat aturan ini. Penjaga seperti
 * `gayaForm-721.test.ts` memang MENYIMPAN bentuk cacat sebagai string dan
 * regex untuk menguncinya; menghitungnya di sana berarti menghukum penjaganya.
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
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const AKAR = path.resolve(__dirname, "..", "..");
const SUMBER_TOKEN = path.join(AKAR, "src", "index.css");
const DIPINDAI = path.join(AKAR, "src");
const GARIS_DASAR_CACAT = path.join(__dirname, "kelas-cacat-baseline.json");

// Keluarga utilitas yang mewarnai GARIS. `bg-` dan `text-` sengaja tidak ikut:
// tokennya tidak diawali kata "border", jadi pemangkasan yang sama tidak
// mungkin terjadi di sana.
const KELUARGA = ["border", "divide", "ring", "outline"];

/**
 * Keluarga utilitas yang mewarnai apa pun — dipakai aturan #719, yang
 * pemeriksaannya berbeda: bukan "namanya terpotong", melainkan "akarnya
 * kosakata token tetapi nama lengkapnya tidak ada".
 */
const UTILITAS_WARNA = [
  "bg", "text", "border", "ring", "divide", "outline", "placeholder",
  "from", "via", "to", "shadow", "accent", "caret", "fill", "stroke",
];
const POLA_TOKEN_PALSU = new RegExp(`\\b(?:${UTILITAS_WARNA.join("|")})-([a-z0-9-]+)`, "g");

/**
 * Dua modifier alpha dalam satu kelas. Hanya utilitas warna yang diperiksa,
 * supaya pecahan sungguhan di dalam kode (`lebar / 2 / 3`) tidak ikut tertangkap.
 */
const POLA_OPASITAS_GANDA = new RegExp(
  `\\b(?:${UTILITAS_WARNA.join("|")})-[a-z0-9-]+(?:/[0-9.]+){2,}`,
  "g"
);

/**
 * Skala `tracking-` dan `leading-` adalah daftar TERTUTUP di Tailwind, jadi
 * nilai di luarnya (plus bentuk arbitrer `[...]`) pasti bukan utilitas.
 * `font-` sengaja tidak ikut: `font-family` dan `font-weight` muncul sebagai
 * properti CSS di dalam string gaya Flowchart, dan membedakannya dari kelas
 * `font-*` menuntut pembaca yang jauh lebih pintar dari gerbang ini.
 */
const SKALA_TRACKING = new Set(["tighter", "tight", "normal", "wide", "wider", "widest"]);
const SKALA_LEADING = new Set(["none", "tight", "snug", "normal", "relaxed", "loose"]);
const POLA_SKALA = /\b(tracking|leading)-([a-z0-9]+|\[[^\]\s]*\])(?![\w-])/g;

/** Batas awal kelas: spasi, pembuka string, atau pembuka template/objek. */
const POLA_AWALAN = "(?:^|[\\s\"'`{])";

function bacaSufiksBorder() {
  const css = fs.readFileSync(SUMBER_TOKEN, "utf8");
  const sufiks = new Set();
  for (const m of css.matchAll(/--color-border-([a-z0-9-]+)\s*:/g)) {
    sufiks.add(m[1]);
  }
  return sufiks;
}

/**
 * Seluruh nama token warna beserta AKAR kosakatanya (`surface`, `content`,
 * `primary`, …). Dibaca dari `index.css`, bukan didaftar di sini, supaya
 * menambah token tidak menuntut menyunting berkas ini.
 */
function bacaKosakata() {
  const css = fs.readFileSync(SUMBER_TOKEN, "utf8");
  const token = new Set();
  for (const m of css.matchAll(/--color-([a-z0-9-]+)\s*:/g)) token.add(m[1]);
  const akar = new Set([...token].map((t) => t.split("-")[0]));
  return { token, akar };
}

/** `-<akar warna>-<ekor>`: warna tidak pernah bisa dinegatifkan. */
function buatPolaNegatif(akar) {
  return new RegExp(`${POLA_AWALAN}(-(?:${[...akar].join("|")})-[a-z0-9[\\]/-]+)`, "g");
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

const berkasPenjaga = (nama) => /\.test\.[cm]?[jt]sx?$/.test(nama);

function main() {
  const sufiks = bacaSufiksBorder();
  if (sufiks.size === 0) {
    console.error(warna.merah("GAGAL: nol token --color-border-* di src/index.css."));
    console.error(warna.redup("  Gerbang ini tidak boleh lulus tanpa sumber token."));
    process.exit(1);
  }
  const { token, akar } = bacaKosakata();

  // Contoh pola: (^|[^-\w])(border|divide|ring|outline)-(subtle|faint|inverse)(?![\w-])
  // Penjaga di depan mencegah `border-border-subtle` ikut tertangkap; penjaga
  // di belakang mencegah `border-subtle-foo` yang bukan urusan kita. Pecahan
  // opasitas (`/80`) berada SESUDAH batas kata, jadi tetap tertangkap.
  const pola = new RegExp(
    `(^|[^-\\w])(${KELUARGA.join("|")})-(${[...sufiks].join("|")})(?![\\w-])`,
    "g"
  );
  const polaNegatif = buatPolaNegatif(akar);

  const temuan = [];
  const cacat = [];

  for (const berkas of berkasSumber(DIPINDAI)) {
    // Garis miring POSIX, bukan `path.sep`: nama berkas ini menjadi KUNCI di
    // `kelas-cacat-baseline.json`. Dengan `\` khas Windows, garis dasar yang
    // direkam di mesin ini tidak akan cocok di CI Linux dan seluruh temuan akan
    // terbaca sebagai "berkas baru".
    const relatif = path.relative(AKAR, berkas).split(path.sep).join("/");
    const dijaga = berkasPenjaga(path.basename(berkas));
    const baris = fs.readFileSync(berkas, "utf8").split("\n");
    baris.forEach((isi, i) => {
      let m;
      pola.lastIndex = 0;
      while ((m = pola.exec(isi))) {
        temuan.push({
          berkas: relatif,
          baris: i + 1,
          salah: `${m[2]}-${m[3]}`,
          benar: `${m[2]}-border-${m[3]}`,
        });
      }

      // Penjaga mengunci bentuk cacat sebagai string/regex; menghitungnya di
      // sana berarti menghukum penjaganya sendiri.
      if (dijaga) return;

      POLA_TOKEN_PALSU.lastIndex = 0;
      while ((m = POLA_TOKEN_PALSU.exec(isi))) {
        const nama = m[1];
        if (token.has(nama) || !akar.has(nama.split("-")[0])) continue;
        cacat.push({
          berkas: relatif,
          baris: i + 1,
          aturan: "token palsu",
          kelas: m[0],
          sebab: `--color-${nama} tidak ada di index.css`,
        });
      }

      POLA_OPASITAS_GANDA.lastIndex = 0;
      while ((m = POLA_OPASITAS_GANDA.exec(isi))) {
        cacat.push({
          berkas: relatif,
          baris: i + 1,
          aturan: "opasitas ganda",
          kelas: m[0],
          sebab: "dua modifier alpha; Tailwind tidak menghasilkan aturan apa pun",
        });
      }

      POLA_SKALA.lastIndex = 0;
      while ((m = POLA_SKALA.exec(isi))) {
        const [, utilitas, nilai] = m;
        const sah =
          utilitas === "tracking"
            ? SKALA_TRACKING.has(nilai) || nilai.startsWith("[")
            : SKALA_LEADING.has(nilai) || /^\d+$/.test(nilai) || nilai.startsWith("[");
        if (sah) continue;
        cacat.push({
          berkas: relatif,
          baris: i + 1,
          aturan: "skala tipuan",
          kelas: `${utilitas}-${nilai}`,
          sebab: `${utilitas}- tidak punya nilai "${nilai}" di skala Tailwind`,
        });
      }

      polaNegatif.lastIndex = 0;
      while ((m = polaNegatif.exec(isi))) {
        cacat.push({
          berkas: relatif,
          baris: i + 1,
          aturan: "negatif warna",
          kelas: m[1],
          sebab: "yang bisa dinegatifkan hanya sumbu (margin, inset, translate), bukan warna",
        });
      }
    });
  }

  const perBerkas = {};
  for (const c of cacat) perBerkas[c.berkas] = (perBerkas[c.berkas] || 0) + 1;

  const perbarui = process.argv.includes("--perbarui");
  let dasarCacat;
  let baruDirekam = false;
  if (perbarui || !fs.existsSync(GARIS_DASAR_CACAT)) {
    baruDirekam = !perbarui;
    fs.writeFileSync(GARIS_DASAR_CACAT, JSON.stringify(perBerkas, null, 2) + "\n");
    dasarCacat = perBerkas;
  } else {
    dasarCacat = JSON.parse(fs.readFileSync(GARIS_DASAR_CACAT, "utf8"));
  }

  const naik = [];
  const baru = [];
  const turun = [];
  for (const [b, n] of Object.entries(perBerkas)) {
    if (!(b in dasarCacat)) baru.push([b, n]);
    else if (n > dasarCacat[b]) naik.push([b, dasarCacat[b], n]);
    else if (n < dasarCacat[b]) turun.push([b, dasarCacat[b], n]);
  }
  const bersih = Object.keys(dasarCacat).filter((b) => !(b in perBerkas));

  const garis = "─".repeat(58);
  console.log(`\n${warna.tebal("Gerbang kelas token")}`);
  console.log(
    warna.redup(
      `  ${sufiks.size} token border · ${KELUARGA.length} keluarga garis · ${token.size} token warna`
    )
  );

  if (baruDirekam) {
    console.log(
      warna.kuning(
        `\n  Garis dasar kelas cacat DIBUAT: ${cacat.length} temuan lama direkam apa adanya.`
      )
    );
    console.log(
      warna.redup("  Itu utang yang sudah ada sebelum aturannya ditulis (#733), bukan izin menambah.")
    );
  }

  if (temuan.length) {
    console.log("");
    for (const t of temuan) {
      console.log(`  ${warna.merah("CACAT")}  ${t.berkas}:${t.baris}`);
      console.log(warna.redup(`         ${t.salah}  ->  ${t.benar}`));
    }
  } else {
    console.log(warna.redup("  garis: nol kelas warna yang terpotong"));
  }

  console.log(`\n${warna.tebal("Kelas tanpa CSS (#719)")}`);
  console.log(
    warna.redup(
      `  ${cacat.length} temuan di ${Object.keys(perBerkas).length} berkas ` +
        `(garis dasar ${Object.values(dasarCacat).reduce((a, b) => a + b, 0)})`
    )
  );
  const perAturan = {};
  for (const c of cacat) (perAturan[c.aturan] = perAturan[c.aturan] || []).push(c);
  for (const aturan of ["token palsu", "opasitas ganda", "skala tipuan", "negatif warna"]) {
    const daftar = perAturan[aturan] || [];
    const unik = new Map();
    for (const c of daftar) if (!unik.has(c.kelas)) unik.set(c.kelas, c);
    console.log(
      `  ${daftar.length ? warna.kuning(aturan.padEnd(14)) : warna.redup(aturan.padEnd(14))}` +
        warna.redup(
          `${String(daftar.length).padStart(3)}  ` +
            [...unik.values()]
              .map((c) => `${c.kelas} (${c.berkas.split("/").pop()}:${c.baris} — ${c.sebab})`)
              .join(" · ")
        )
    );
  }
  for (const [b, d, n] of naik)
    console.log(`  ${warna.merah("NAIK  ")} ${b} — ${d} → ${n}`);
  for (const [b, n] of baru) console.log(`  ${warna.merah("BARU  ")} ${b} — ${n}`);
  for (const [b, d, n] of turun)
    console.log(`  ${warna.hijau("turun ")} ${b} — ${d} → ${n}`);
  for (const b of bersih) console.log(`  ${warna.hijau("bersih")} ${b}`);

  const gagalCacat = naik.length || baru.length;
  const kunci = !gagalCacat && (turun.length || bersih.length);

  console.log(`\n${garis}`);
  if (temuan.length) {
    console.log(warna.merah(warna.tebal(`${temuan.length} kelas garis tidak menghasilkan CSS apa pun.`)));
    console.log(
      warna.redup("Tailwind v4 tidak memberi border warna bawaan, jadi garisnya jatuh ke")
    );
    console.log(warna.redup("`currentColor` — warna teks. Di latar terang itu terbaca hitam pekat."));
    console.log(`${garis}\n`);
    process.exit(1);
  }
  if (gagalCacat) {
    console.log(warna.merah(warna.tebal("GAGAL — kelas tanpa CSS BERTAMBAH.")));
    console.log(warna.redup("Kelas seperti ini tidak melempar galat; ia hanya tidak ada."));
    console.log(warna.redup("Layarnya tetap tergambar, jadi satu-satunya yang mengeluh gerbang ini."));
    console.log(warna.redup("Perbaiki namanya (token dari index.css, nilai skala Tailwind yang"));
    console.log(warna.redup("sah) — jangan perbarui garis dasarnya."));
    console.log(`${garis}\n`);
    process.exit(1);
  }
  if (kunci) {
    console.log(warna.kuning(warna.tebal("KUNCI KEMAJUANNYA — kelas tanpa CSS BERKURANG.")));
    console.log(warna.redup("Jalankan, lalu ikutkan berkasnya dalam commit:"));
    console.log("");
    console.log("  npm run audit:kelas -- --perbarui");
    console.log("  git add scripts/validate/kelas-cacat-baseline.json");
    console.log(`${garis}\n`);
    process.exit(1);
  }
  console.log(warna.hijau(warna.tebal("LULUS — tidak ada kelas baru yang gagal menghasilkan CSS.")));
  console.log(warna.redup("Ini BUKAN bukti warnanya benar, hanya bukti kelasnya menghasilkan CSS."));
  console.log(`${garis}\n`);
}

main();
