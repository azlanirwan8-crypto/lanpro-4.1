/**
 * MIGRASI DATA PERAN — AUDIT.md §19.8 tahap 3.
 *
 * Menyeragamkan nilai `ProjectMembers.role` dan `Users.role` ke `code` katalog
 * (§19.4 & §19.5), supaya matriks otorisasi tahap 4 punya sesuatu yang bisa
 * dicocokkan. Sebelum ini, 7 dari 10 baris `ProjectMembers` berisi `member` —
 * nilai yang tidak ada di katalog mana pun.
 *
 * PEMETAAN `member` -> `developer` DISETUJUI PEMILIK PROYEK 16 Agu 2026,
 * dengan dasar terukur di §19.18: di seluruh 6 penjaga rute tempat `member`
 * muncul, ia selalu berdampingan dengan `developer` dan hak yang sama persis.
 *
 * BAWAANNYA UJI-COBA. Tanpa `--tulis`, skrip ini TIDAK menyentuh satu baris pun;
 * ia hanya memperlihatkan apa yang AKAN berubah. Itu disengaja: §0.5 melarang
 * menyatakan sesuatu lulus tanpa menjalankannya, dan kebalikannya juga berlaku —
 * jangan menulis ke data nyata tanpa lebih dulu memperlihatkan rencananya.
 *
 * IDEMPOTEN. Dijalankan dua kali menghasilkan hal yang sama; jalannya yang kedua
 * melaporkan nol perubahan. Semua penulisan dibungkus SATU transaksi — §0.3
 * mencatat bagaimana menulis dua tabel tanpa transaksi melahirkan tautan yatim
 * yang mengunci email selamanya (#41, #42).
 *
 * ⚠️ Skrip ini TIDAK menyentuh schema. Ia hanya UPDATE nilai kolom, jadi
 * endpoint ber-`-pooler` aman dipakai — batasan `search_path` di §0.6 tidak
 * berlaku di sini.
 */

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

/**
 * Pemetaan untuk `ProjectMembers.role` — kosakata PROJECT (§19.5).
 *
 * `designer` DIBUANG atas keputusan pemilik proyek (§19.17), tetapi ia memang
 * nol baris data, jadi tidak ada yang perlu dipindahkan. Ia tetap didaftarkan
 * di sini supaya kalau suatu hari muncul, ia punya tujuan alih-alih diam-diam
 * jatuh ke penolakan.
 */
const PETA_PROYEK = {
  member: "developer",
  designer: "developer",
};

/**
 * `Users.role` — kosakata SYSTEM (§19.4). Nilainya sudah `user`/`admin`/`head`,
 * ketiganya kode katalog yang sah, jadi tidak ada pemetaan yang diperlukan.
 * Skrip tetap MEMERIKSA-nya, karena "seharusnya sudah benar" bukan pengukuran.
 */
const PERAN_SISTEM_SAH = ["admin", "head", "user", "viewer"];
const PERAN_PROYEK_SAH = [
  "owner",
  "admin",
  "manager",
  "system_analyst",
  "business_analyst",
  "developer",
  "qa",
  "viewer",
];

(async () => {
  require("dotenv").config();
  const tulis = process.argv.includes("--tulis");
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error(warna.merah("DATABASE_URL tidak ditemukan di environment."));
    process.exit(2);
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(
    tulis
      ? warna.kuning("\n  MODE TULIS — perubahan akan disimpan\n")
      : warna.redup("\n  MODE UJI-COBA — tidak ada yang ditulis. Tambahkan --tulis untuk menyimpan.\n")
  );

  let gagal = false;

  try {
    if (tulis) await client.query("BEGIN");

    // ---- ProjectMembers -------------------------------------------------
    const { rows: pmSebaran } = await client.query(
      `SELECT lower(trim(role)) AS peran, COUNT(*)::int AS n
         FROM "ProjectMembers" GROUP BY 1 ORDER BY n DESC`
    );

    console.log("  ProjectMembers.role — sebaran sekarang:");
    for (const r of pmSebaran) {
      const tujuan = PETA_PROYEK[r.peran];
      const sah = PERAN_PROYEK_SAH.indexOf(r.peran) !== -1;
      const tanda = tujuan
        ? warna.kuning(`-> ${tujuan}`)
        : sah
          ? warna.hijau("sudah sesuai katalog")
          : warna.merah("DI LUAR KATALOG, tanpa pemetaan");
      if (!tujuan && !sah) gagal = true;
      console.log(`    ${String(r.n).padStart(3)}  ${(r.peran || "(kosong)").padEnd(20)} ${tanda}`);
    }

    let diubah = 0;
    for (const [dari, ke] of Object.entries(PETA_PROYEK)) {
      const sql = `UPDATE "ProjectMembers" SET role = $1 WHERE lower(trim(role)) = $2`;
      if (tulis) {
        const r = await client.query(sql, [ke, dari]);
        diubah += r.rowCount;
      } else {
        const r = await client.query(
          `SELECT COUNT(*)::int AS n FROM "ProjectMembers" WHERE lower(trim(role)) = $1`,
          [dari]
        );
        diubah += r.rows[0].n;
      }
    }
    console.log(
      `  ${tulis ? "Diubah" : "AKAN diubah"}: ${warna.hijau(diubah)} baris ProjectMembers\n`
    );

    // ---- Users ----------------------------------------------------------
    const { rows: uSebaran } = await client.query(
      `SELECT lower(trim(role)) AS peran, COUNT(*)::int AS n
         FROM "Users" GROUP BY 1 ORDER BY n DESC`
    );

    console.log("  Users.role — sebaran sekarang:");
    for (const r of uSebaran) {
      const sah = PERAN_SISTEM_SAH.indexOf(r.peran) !== -1;
      if (!sah) gagal = true;
      console.log(
        `    ${String(r.n).padStart(3)}  ${(r.peran || "(kosong)").padEnd(20)} ` +
          (sah ? warna.hijau("sudah sesuai katalog") : warna.merah("DI LUAR KATALOG"))
      );
    }

    if (gagal) {
      console.log(
        warna.merah(
          "\n  ADA NILAI DI LUAR KATALOG TANPA PEMETAAN.\n" +
            "  Tambahkan pemetaannya di skrip ini, jangan biarkan lewat — nilai yang\n" +
            "  tidak dikenal akan DITOLAK oleh matriks tahap 4, dan pemiliknya kehilangan akses.\n"
        )
      );
      if (tulis) {
        await client.query("ROLLBACK");
        console.log(warna.merah("  Transaksi DIBATALKAN. Tidak ada yang tersimpan."));
        process.exitCode = 1;
        return;
      }
    }

    if (tulis) {
      await client.query("COMMIT");
      console.log(warna.hijau("\n  Tersimpan.\n"));
    } else {
      console.log(warna.redup("\n  Selesai (uji-coba). Jalankan ulang dengan --tulis bila benar.\n"));
    }
  } catch (e) {
    if (tulis) await client.query("ROLLBACK").catch(() => {});
    console.error(warna.merah(`\n  GAGAL: ${e.message}\n  Transaksi dibatalkan.`));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
