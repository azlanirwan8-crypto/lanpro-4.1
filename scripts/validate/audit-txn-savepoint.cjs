/**
 * #479 — Gerbang: di dalam beginTransaction, jangan bungkus connection/client.query
 * dengan try/catch tanpa SAVEPOINT (regresi #469: error SQL abort txn → 25P02).
 *
 * Pola yang diizinkan: SAVEPOINT … try { query } catch { ROLLBACK TO SAVEPOINT }.
 * Pola luar try { beginTransaction … commit } catch { rollback } diizinkan
 * karena try membungkus begin, bukan nested setelah begin.
 *
 * Pakai: node scripts/validate/audit-txn-savepoint.cjs
 */

const fs = require("fs");
const path = require("path");

const AKAR = path.resolve(__dirname, "..", "..");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

function matchingBrace(teks, bukaIdx) {
  let depth = 0;
  for (let i = bukaIdx; i < teks.length; i++) {
    const c = teks[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function barisKe(teks, index) {
  return teks.slice(0, index).split("\n").length;
}

/**
 * Cari blok try { … } yang berisi .query( di dalam wilayah setelah beginTransaction.
 */
function temukanTryQueryTanpaSavepoint(teks) {
  const pelanggaran = [];
  const beginRe = /\.beginTransaction\s*\(/g;
  let bm;
  while ((bm = beginRe.exec(teks))) {
    const mulaiWilayah = bm.index + bm[0].length;
    // Wilayah sampai commit / release / fungsi berikutnya yang jelas menutup txn
    const sisa = teks.slice(mulaiWilayah);
    const akhirRel =
      sisa.search(/\.commit\s*\(|\.release\s*\(|async\s+\w+\s*\(/);
    const wilayah = sisa.slice(0, akhirRel === -1 ? sisa.length : akhirRel);
    const wilayahAbs = mulaiWilayah;

    let cari = 0;
    while (cari < wilayah.length) {
      const potong = wilayah.slice(cari);
      const tm = potong.match(/\btry\s*\{/);
      if (!tm || tm.index === undefined) break;
      const tryRel = cari + tm.index;
      const braceRel = tryRel + tm[0].length - 1;
      const braceAbs = wilayahAbs + braceRel;
      const tutupAbs = matchingBrace(teks, braceAbs);
      if (tutupAbs < 0) break;
      const tryBody = teks.slice(braceAbs + 1, tutupAbs);
      const sebelumTry = wilayah.slice(Math.max(0, tryRel - 280), tryRel);
      const punyaQuery =
        /\.(?:query|execute)\s*\(/.test(tryBody) ||
        /\b(?:connection|client|conn)\.query\s*\(/.test(tryBody);
      const punyaSavepoint =
        /SAVEPOINT/i.test(tryBody) || /SAVEPOINT/i.test(sebelumTry);

      if (punyaQuery && !punyaSavepoint) {
        // Lewati komentar-only / test stub yang tidak nyata
        if (!/^\s*\/\//.test(tryBody.trim().split("\n")[0] || "")) {
          pelanggaran.push({
            index: wilayahAbs + tryRel,
            baris: barisKe(teks, wilayahAbs + tryRel),
            cuplikan: tryBody.trim().slice(0, 120).replace(/\s+/g, " "),
          });
        }
      }
      cari = braceRel + 1;
      // majukan ke setelah blok try di wilayah
      const tutupRel = tutupAbs - wilayahAbs;
      cari = Math.max(cari, tutupRel + 1);
    }
  }
  return pelanggaran;
}

function jalanBerkas(dir, akumulator = []) {
  if (!fs.existsSync(dir)) return akumulator;
  for (const nama of fs.readdirSync(dir)) {
    const penuh = path.join(dir, nama);
    const st = fs.statSync(penuh);
    if (st.isDirectory()) {
      if (nama === "node_modules" || nama === "dist" || nama === "coverage") continue;
      jalanBerkas(penuh, akumulator);
    } else if (/\.(ts|js)$/.test(nama) && !/\.test\./.test(nama) && !/\.spec\./.test(nama)) {
      akumulator.push(penuh);
    }
  }
  return akumulator;
}

/**
 * @returns {{ ok: boolean, pelanggaran: { berkas: string, baris: number, cuplikan: string }[] }}
 */
function auditTxnSavepoint(opsi = {}) {
  const dirs = opsi.dirs || [path.join(AKAR, "server")];
  const ekstra = (opsi.ekstra || []).filter((p) => fs.existsSync(p));
  const berkas = [...dirs.flatMap((d) => jalanBerkas(d)), ...ekstra];
  const pelanggaran = [];

  for (const berkasPath of berkas) {
    const teks = fs.readFileSync(berkasPath, "utf8");
    if (!teks.includes("beginTransaction")) continue;
    for (const p of temukanTryQueryTanpaSavepoint(teks)) {
      pelanggaran.push({
        berkas: path.relative(AKAR, berkasPath).replace(/\\/g, "/"),
        baris: p.baris,
        cuplikan: p.cuplikan,
      });
    }
  }

  return { ok: pelanggaran.length === 0, pelanggaran };
}

function main() {
  console.log("\n\x1b[1m#479 Gerbang try/catch query dalam txn wajib SAVEPOINT\x1b[0m");
  const hasil = auditTxnSavepoint();
  if (!hasil.ok) {
    for (const p of hasil.pelanggaran) {
      console.log(
        `  ${warna.merah("GAGAL")}  ${p.berkas}:${p.baris} — try+query tanpa SAVEPOINT`
      );
      console.log(warna.redup(`         ${p.cuplikan}`));
    }
    console.log(
      warna.redup(
        "\n  Perbaiki: pakai SAVEPOINT + ROLLBACK TO SAVEPOINT (lihat hapusAnakOpsional)."
      )
    );
    process.exit(1);
  }
  console.log(`  ${warna.hijau("OK")}  tidak ada try/catch query dalam txn tanpa SAVEPOINT\n`);
  process.exit(0);
}

module.exports = {
  auditTxnSavepoint,
  temukanTryQueryTanpaSavepoint,
};

if (require.main === module) main();
