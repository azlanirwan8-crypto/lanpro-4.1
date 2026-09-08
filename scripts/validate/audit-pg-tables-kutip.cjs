/**
 * #471 — Gerbang: tabel PascalCase di pg-migrate yang TIDAK ada di pgTables (db.ts)
 * wajib dikutip manual di setiap call site SQL di server/.
 *
 * JANGAN menambah tabel ke pgTables lewat skrip ini — AGENTS.md melarang
 * menyentuh db.ts tanpa izin. Gerbang hanya mendeteksi landmine kelas #469.
 *
 * Pakai: node scripts/validate/audit-pg-tables-kutip.cjs
 * Atau lewat tes: src/lib/pg-migrate-kutip-471.test.ts
 */

const fs = require("fs");
const path = require("path");

const AKAR = path.resolve(__dirname, "..", "..");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

/** CREATE TABLE IF NOT EXISTS "PascalCase" di migrate. */
function ekstrakTabelPascalMigrate(sumber) {
  const hasil = new Set();
  const re = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"([A-Z][A-Za-z0-9]*)"/g;
  let m;
  while ((m = re.exec(sumber))) hasil.add(m[1]);
  return [...hasil].sort();
}

/** Daftar pgTables di db.ts (baca saja — jangan diubah). */
function ekstrakPgTables(sumber) {
  const blok = sumber.match(/const\s+pgTables\s*=\s*\[([\s\S]*?)\];/);
  if (!blok) throw new Error("pgTables tidak ditemukan di src/lib/db.ts");
  return [...blok[1].matchAll(/"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
}

/**
 * Referensi SQL tanpa kutip: FROM/INTO/UPDATE/JOIN/TABLE TableName
 * (bukan "TableName"). Identifier TS biasa (nama fungsi/tipe) diabaikan
 * selama tidak mengikuti kata kunci SQL.
 */
function temukanReferensiTanpaKutip(teks, tabel) {
  const re = new RegExp(
    String.raw`(?:FROM|INTO|UPDATE|JOIN|TABLE|EXISTS)\s+${tabel}\b(?!")`,
    "gi"
  );
  const temuan = [];
  let m;
  while ((m = re.exec(teks))) {
    const sebelum = teks.slice(Math.max(0, m.index - 80), m.index);
    // Lewati komentar baris yang memuat contoh anti-pola
    const barisAwal = teks.lastIndexOf("\n", m.index) + 1;
    const baris = teks.slice(barisAwal, teks.indexOf("\n", m.index));
    if (/^\s*\/\//.test(baris) || /^\s*\*/.test(baris)) continue;
    if (sebelum.includes("//")) {
      const potong = sebelum.split("\n").pop() || "";
      if (potong.includes("//")) continue;
    }
    temuan.push({ index: m.index, cuplikan: m[0] });
  }
  return temuan;
}

function jalanBerkas(dir, akumulator = []) {
  if (!fs.existsSync(dir)) return akumulator;
  for (const nama of fs.readdirSync(dir)) {
    const penuh = path.join(dir, nama);
    const st = fs.statSync(penuh);
    if (st.isDirectory()) {
      if (nama === "node_modules" || nama === "dist" || nama === "coverage") continue;
      jalanBerkas(penuh, akumulator);
    } else if (/\.(ts|js|cjs|mjs)$/.test(nama) && !/\.test\./.test(nama) && !/\.spec\./.test(nama)) {
      akumulator.push(penuh);
    }
  }
  return akumulator;
}

/**
 * @returns {{ ok: boolean, tanpaAutoQuote: string[], pelanggaran: { tabel: string, berkas: string, cuplikan: string }[] }}
 */
function auditPgTablesKutip(opsi = {}) {
  const migratePath = opsi.migratePath || path.join(AKAR, "src", "lib", "pg-migrate.ts");
  const dbPath = opsi.dbPath || path.join(AKAR, "src", "lib", "db.ts");
  const serverDir = opsi.serverDir || path.join(AKAR, "server");

  const migrate = fs.readFileSync(migratePath, "utf8");
  const db = fs.readFileSync(dbPath, "utf8");

  const pascalMigrate = ekstrakTabelPascalMigrate(migrate);
  const pgTables = new Set(ekstrakPgTables(db));
  const tanpaAutoQuote = pascalMigrate.filter((t) => !pgTables.has(t));

  const berkas = jalanBerkas(serverDir);
  // Service/skrip di akar yang menulis SQL ke tabel non-pgTables
  const ekstra = [
    path.join(AKAR, "server.ts"),
    path.join(AKAR, "scripts", "doctor.cjs"),
  ].filter((p) => fs.existsSync(p));

  const pelanggaran = [];
  for (const tabel of tanpaAutoQuote) {
    for (const berkasPath of [...berkas, ...ekstra]) {
      const teks = fs.readFileSync(berkasPath, "utf8");
      // Sudah dikutip di berkas ini → OK; cari yang tanpa kutip
      const temuan = temukanReferensiTanpaKutip(teks, tabel);
      for (const t of temuan) {
        pelanggaran.push({
          tabel,
          berkas: path.relative(AKAR, berkasPath).replace(/\\/g, "/"),
          cuplikan: t.cuplikan,
        });
      }
    }
  }

  return {
    ok: pelanggaran.length === 0,
    pascalMigrate,
    pgTables: [...pgTables].sort(),
    tanpaAutoQuote,
    pelanggaran,
  };
}

function main() {
  console.log("\n\x1b[1m#471 Gerbang pgTables ↔ migrate PascalCase\x1b[0m");
  const hasil = auditPgTablesKutip();
  console.log(
    warna.redup(
      `  PascalCase migrate: ${hasil.pascalMigrate.length} · di pgTables: ${hasil.pgTables.length} · wajib kutip manual: ${hasil.tanpaAutoQuote.length}`
    )
  );
  if (hasil.tanpaAutoQuote.length) {
    console.log(warna.redup(`  Non-pgTables: ${hasil.tanpaAutoQuote.join(", ")}`));
  }
  if (!hasil.ok) {
    console.log("");
    for (const p of hasil.pelanggaran) {
      console.log(
        `  ${warna.merah("GAGAL")}  ${p.tabel} tanpa kutip di ${p.berkas}: ${p.cuplikan}`
      );
    }
    console.log(
      warna.redup(
        "\n  Perbaiki: kutip \"TableName\" di SQL, atau (hanya dengan izin) tambah ke pgTables."
      )
    );
    process.exit(1);
  }
  console.log(`  ${warna.hijau("OK")}  semua tabel non-pgTables dikutip di call site SQL\n`);
  process.exit(0);
}

module.exports = {
  auditPgTablesKutip,
  ekstrakTabelPascalMigrate,
  ekstrakPgTables,
  temukanReferensiTanpaKutip,
};

if (require.main === module) main();
