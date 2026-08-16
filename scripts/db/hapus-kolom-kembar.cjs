/**
 * MENJATUHKAN KOLOM MENGANGGUR — #47 langkah 4 dan #81.
 *
 * ⚠️ TINDAKAN INI MERUSAK DAN TIDAK BISA DIBATALKAN. Kolom yang dijatuhkan
 * membawa serta isinya; tidak ada `undo`.
 *
 * BAWAANNYA UJI-COBA. Tanpa `--tulis`, ia hanya memperlihatkan apa yang AKAN
 * terjadi — termasuk berapa baris yang isinya akan hilang. Pola yang sama
 * dipakai `db:migrasi-peran`, dan alasannya sama: rencana harus terlihat
 * sebelum dijalankan.
 *
 * SYARAT YANG SUDAH DIPENUHI SEBELUM SKRIP INI DITULIS:
 *
 *   1. Baca diseragamkan ke camelCase — `SELECT` memakai alias eksplisit,
 *      sehingga jawabannya tidak lagi bergantung bentuk kolom di database.
 *   2. Tulis diseragamkan — `INSERT` turun dari 11 kolom jadi 6.
 *   3. Jalur tulis DIBUKTIKAN lewat komentar sungguhan dari antarmuka:
 *      baris 4 -> 5, sisi camel ikut 5, sisi snake tetap 4.
 *   4. Definisi kolomnya dicabut dari `src/lib/pg-migrate.ts`, supaya
 *      `db:verify-schema` tidak melaporkan production menyimpang dari migrasi.
 *
 * Yang TIDAK boleh dilakukan skrip ini: menjatuhkan kolom yang masih terisi
 * sementara tidak ada kolom penggantinya. Karena itu tiap kolom diperiksa
 * pasangannya lebih dulu — bila penggantinya kosong, penghapusan dibatalkan.
 */

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

/**
 * Setiap kolom yang dijatuhkan WAJIB menyebut penggantinya.
 *
 * `pengganti: null` berarti kolomnya memang tidak menggantikan apa pun — itu
 * hanya sah untuk kolom yang tidak pernah dibaca sama sekali, seperti #81.
 */
const RENCANA = [
  {
    tabel: "discussion_point_comments",
    item: "#47",
    kolom: [
      { buang: "point_id", pengganti: "pointid" },
      { buang: "user_id", pengganti: '"userId"' },
      { buang: "user_name", pengganti: "username" },
      { buang: "comment_text", pengganti: "commenttext" },
      { buang: "created_at", pengganti: '"createdAt"' },
    ],
  },
  {
    tabel: "ProjectMembers",
    item: "#81",
    kolom: [{ buang: '"parentAdminId"', pengganti: null }],
  },
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
      ? warna.merah("\n  MODE TULIS — KOLOM AKAN DIJATUHKAN. TIDAK BISA DIBATALKAN.\n")
      : warna.redup(
          "\n  MODE UJI-COBA — tidak ada yang dijatuhkan. Tambahkan --tulis untuk menjalankan.\n"
        )
  );

  let batal = false;

  try {
    if (tulis) await client.query("BEGIN");

    for (const { tabel, item, kolom } of RENCANA) {
      console.log(`  ${tabel}  ${warna.redup(item)}`);

      for (const { buang, pengganti } of kolom) {
        const nama = buang.replace(/"/g, "");

        const { rows: ada } = await client.query(
          `SELECT 1 FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2`,
          [tabel, nama]
        );
        if (ada.length === 0) {
          console.log(`    ${warna.redup("lewati ")} ${nama.padEnd(16)} sudah tidak ada`);
          continue;
        }

        const { rows: hitung } = await client.query(
          `SELECT COUNT(${buang})::int AS terisi FROM "${tabel}"`
        );
        const terisi = hitung[0].terisi;

        let catatan = "";
        if (pengganti) {
          const { rows: p } = await client.query(
            `SELECT COUNT(${pengganti})::int AS terisi FROM "${tabel}"`
          );
          // Menjatuhkan kolom terisi sementara penggantinya kosong berarti
          // kehilangan data. Diperiksa per kolom, bukan sekali di awal.
          if (terisi > 0 && p[0].terisi < terisi) {
            console.log(
              `    ${warna.merah("BATAL  ")} ${nama.padEnd(16)} terisi ${terisi}, pengganti ${pengganti} hanya ${p[0].terisi}`
            );
            batal = true;
            continue;
          }
          catatan = warna.redup(`digantikan ${pengganti} (${p[0].terisi} terisi)`);
        } else {
          catatan = warna.redup("tidak menggantikan apa pun — tidak pernah dibaca");
        }

        console.log(
          `    ${tulis ? warna.kuning("JATUHKAN") : warna.redup("akan   ")} ${nama.padEnd(16)} ${String(terisi).padStart(3)} terisi  ${catatan}`
        );

        if (tulis) {
          await client.query(`ALTER TABLE "${tabel}" DROP COLUMN ${buang}`);
        }
      }
      console.log("");
    }

    if (batal) {
      console.log(
        warna.merah(
          "  ADA KOLOM TERISI YANG PENGGANTINYA BELUM LENGKAP.\n" +
            "  Seragamkan penulisannya lebih dulu — menjatuhkan sekarang berarti kehilangan data.\n"
        )
      );
      if (tulis) {
        await client.query("ROLLBACK");
        console.log(warna.merah("  Transaksi DIBATALKAN. Tidak ada kolom yang dijatuhkan."));
      }
      process.exitCode = 1;
      return;
    }

    if (tulis) {
      await client.query("COMMIT");
      console.log(warna.hijau("  Tersimpan. Kolom telah dijatuhkan.\n"));
    } else {
      console.log(warna.redup("  Selesai (uji-coba). Jalankan ulang dengan --tulis bila benar.\n"));
    }
  } catch (e) {
    if (tulis) await client.query("ROLLBACK").catch(() => {});
    console.error(warna.merah(`\n  GAGAL: ${e.message}\n  Transaksi dibatalkan.`));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
