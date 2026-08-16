#!/usr/bin/env node
/**
 * GERBANG KELUAR F0 — perintah pembuktiannya, bukan sekadar kalimat syaratnya.
 *
 * AUDIT.md menetapkan gerbang F0: "`npm run db:migrate` pada database bersih
 * menghasilkan schema yang identik dengan production". Gerbang itu sempat
 * dinyatakan LULUS pada 16 Agu 2026 — padahal saat diukur, 13 tabel dan 54
 * kolom berbeda (item #79). Ia lolos karena tidak ada cara mudah menjalankannya:
 * satu-satunya pembuktian adalah membuat database kosong lalu membandingkan,
 * dan itu tidak pernah dilakukan.
 *
 * Skrip ini menutup celah itu. Pelajarannya berlaku umum: gerbang yang menuntut
 * lingkungan bersih HARUS punya perintah, atau ia akan dinyatakan lulus tanpa
 * dijalankan.
 *
 * CARA KERJA. Migrasi dijalankan pada SCHEMA TERPISAH di database yang sama,
 * lalu hasilnya dibandingkan kolom per kolom dengan `public`. Schema uji dihapus
 * di akhir, termasuk bila terjadi galat.
 *
 * KENAPA schema terpisah, bukan database terpisah: Neon tidak selalu mengizinkan
 * `CREATE DATABASE` dari koneksi aplikasi, dan schema terpisah sudah cukup —
 * `search_path` membuat seluruh perintah migrasi mendarat di sana.
 *
 * KEAMANAN — dan satu jebakan yang sempat menjebak skrip ini sendiri.
 *
 * Versi pertama mengarahkan schema lewat `SET search_path`. Itu SALAH dan
 * berbahaya: di balik connection pooler Neon, `SET` berlaku per-sesi backend dan
 * TIDAK dijamin bertahan antar perintah. Gejalanya terlihat sebagai kegagalan
 * acak — dua dari enam percobaan menghasilkan schema uji separuh jadi (11 atau
 * 16 tabel alih-alih 30), karena sebagian perintah mendarat di backend lain.
 * Risiko sesungguhnya lebih besar daripada hasil yang salah: perintah migrasi
 * bisa mendarat di `public`.
 *
 * Perbaikannya: schema uji disetel lewat parameter `options` pada STARTUP
 * koneksi. Nilai itu ikut di paket startup dan melekat pada koneksi, bukan
 * dititipkan sebagai perintah yang bisa tercecer.
 *
 * Lapisan pengaman lain: nama schema uji dipagari konstanta dengan penjaga yang
 * menolak nilai `public`, dan sesudah migrasi dijalankan skrip MEMASTIKAN
 * tabel benar-benar terbentuk di schema uji — bila nol, ia berhenti dengan galat
 * alih-alih membandingkan hasil yang menyesatkan.
 *
 * Skrip ini hanya MEMBACA `public`.
 */

const fs = require("fs");
const path = require("path");

const SCHEMA_UJI = "uji_migrasi_sementara";

if (SCHEMA_UJI === "public") {
  console.error("MENOLAK BERJALAN: schema uji tidak boleh 'public'.");
  process.exit(2);
}

const warna = {
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

(async () => {
  require("dotenv").config();
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error(warna.merah("DATABASE_URL tidak ditemukan di environment."));
    process.exit(2);
  }

  const akar = path.resolve(__dirname, "..");
  const sumberMigrasi = fs.readFileSync(path.join(akar, "src/lib/pg-migrate.ts"), "utf8");

  // Ambil setiap SQL di dalam client.query(`...`) sesuai urutan kemunculannya.
  const blokSql = [...sumberMigrasi.matchAll(/client\.query\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
  if (blokSql.length === 0) {
    console.error(warna.merah("Tidak ada blok SQL ditemukan di pg-migrate.ts — pola pencocokan berubah?"));
    process.exit(2);
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const bersihkan = async () => {
    try {
      await client.query("SET search_path TO public");
      await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA_UJI} CASCADE`);
    } catch {
      /* diabaikan — pembersihan tidak boleh menutupi galat aslinya */
    }
  };

  let kodeKeluar = 0;
  try {
    console.log("");
    console.log(warna.tebal("Verifikasi schema — migrasi vs production"));
    console.log(warna.redup(`  ${blokSql.length} blok SQL · schema uji: ${SCHEMA_UJI}`));
    console.log("");

    await bersihkan();
    await client.query(`CREATE SCHEMA ${SCHEMA_UJI}`);

    // Koneksi TERPISAH yang schema-nya ditetapkan di startup, bukan lewat SET.
    // Lihat catatan KEAMANAN di kepala berkas.
    //
    // Neon MENOLAK `search_path` di paket startup pada endpoint ber-pooler:
    //   "unsupported startup parameter in options: search_path.
    //    Please use unpooled connection or remove this parameter"
    //
    // Penolakan itu sekaligus menegaskan kenapa `SET search_path` tadi tidak
    // andal — koneksinya memang melewati pooler. Karena itu verifikasi memakai
    // endpoint UNPOOLED, yang pada Neon adalah host yang sama tanpa `-pooler`.
    // Aplikasi tetap memakai endpoint pooled; ini khusus untuk pemeriksaan.
    const urlUnpooled = (() => {
      try {
        const u = new URL(url);
        if (u.hostname.includes("-pooler")) {
          u.hostname = u.hostname.replace("-pooler", "");
          return u.toString();
        }
      } catch {
        /* biarkan apa adanya bila bukan URL yang bisa diurai */
      }
      return url;
    })();

    if (urlUnpooled !== url) {
      console.log(warna.redup("  memakai endpoint unpooled untuk menjalankan migrasi"));
    }

    const klienMigrasi = new Client({
      connectionString: urlUnpooled,
      ssl: { rejectUnauthorized: false },
      options: `-c search_path=${SCHEMA_UJI}`,
    });
    await klienMigrasi.connect();

    const { rows: cekJalur } = await klienMigrasi.query("SHOW search_path");
    const jalurAktif = cekJalur[0].search_path;
    if (!jalurAktif.includes(SCHEMA_UJI)) {
      throw new Error(
        `search_path koneksi migrasi bukan schema uji (terbaca: ${jalurAktif}). ` +
          `Dihentikan sebelum menyentuh apa pun.`
      );
    }

    const gagal = [];
    try {
      for (const [i, sql] of blokSql.entries()) {
        try {
          await klienMigrasi.query(sql);
        } catch (e) {
          gagal.push({ i, code: e.code, pesan: e.message.split("\n")[0], cuplik: sql.trim().slice(0, 70) });
        }
      }
    } finally {
      await klienMigrasi.end();
    }

    if (gagal.length) {
      console.log(warna.merah(`  ${gagal.length} blok SQL GAGAL dijalankan:`));
      for (const g of gagal) {
        console.log(`    [${g.i}] ${g.code} ${g.pesan}`);
        console.log(warna.redup(`         ${g.cuplik}`));
      }
      console.log("");
      kodeKeluar = 1;
    } else {
      console.log(warna.hijau(`  OK    ${blokSql.length} blok SQL berjalan tanpa galat`));
    }

    // Membandingkan nama kolom saja TIDAK cukup. `Attachments.filename` pernah
    // NOT NULL di production sementara migrasi menyatakannya nullable — beda
    // yang tidak terlihat bila hanya nama yang dibandingkan, tetapi cukup untuk
    // membuat INSERT gagal di satu tempat dan lolos di tempat lain (#78).
    // Karena itu tipe dan nullability ikut dibandingkan.
    const ambil = async (schema) => {
      const { rows } = await client.query(
        `SELECT table_name, column_name, data_type, is_nullable
         FROM information_schema.columns WHERE table_schema=$1`,
        [schema]
      );
      const peta = new Map();
      for (const r of rows) {
        if (!peta.has(r.table_name)) peta.set(r.table_name, new Map());
        peta
          .get(r.table_name)
          .set(r.column_name, { tipe: r.data_type, nullable: r.is_nullable });
      }
      return peta;
    };

    const bersih = await ambil(SCHEMA_UJI);
    const produksi = await ambil("public");

    // Penjaga terhadap hasil yang menyesatkan: bila schema uji nyaris kosong,
    // migrasinya tidak benar-benar berjalan di sana. Membandingkannya hanya akan
    // menghasilkan daftar panjang "KURANG" yang salah sebabnya.
    if (bersih.size < produksi.size / 2) {
      throw new Error(
        `Schema uji hanya berisi ${bersih.size} tabel dari ${produksi.size} — migrasi tidak berjalan ` +
          `sebagaimana mestinya. Dihentikan agar tidak melaporkan perbandingan yang menyesatkan.`
      );
    }

    console.log(warna.redup(`  tabel — bersih: ${bersih.size} · production: ${produksi.size}`));
    console.log("");

    let tabelBeda = 0;
    let kolomKurang = 0;
    let kolomLebih = 0;
    let kolomBedaBentuk = 0;

    for (const [tabel, kolProd] of produksi) {
      const kolBersih = bersih.get(tabel);
      if (!kolBersih) {
        console.log(warna.merah(`  ${tabel}: TIDAK dibuat oleh migrasi`));
        tabelBeda++;
        continue;
      }
      const kurang = [...kolProd.keys()].filter((k) => !kolBersih.has(k));
      const lebih = [...kolBersih.keys()].filter((k) => !kolProd.has(k));
      const bedaBentuk = [];
      for (const [nama, p] of kolProd) {
        const b = kolBersih.get(nama);
        if (!b) continue;
        if (b.tipe !== p.tipe || b.nullable !== p.nullable) {
          bedaBentuk.push(
            `${nama} (production: ${p.tipe}/${p.nullable === "NO" ? "NOT NULL" : "NULL"} · bersih: ${
              b.tipe
            }/${b.nullable === "NO" ? "NOT NULL" : "NULL"})`
          );
        }
      }
      if (kurang.length || lebih.length || bedaBentuk.length) {
        tabelBeda++;
        kolomKurang += kurang.length;
        kolomLebih += lebih.length;
        kolomBedaBentuk += bedaBentuk.length;
        console.log(`  ${warna.kuning(tabel)}`);
        if (kurang.length)
          console.log(warna.merah(`      KURANG di database bersih (${kurang.length}): ${kurang.join(", ")}`));
        if (lebih.length)
          console.log(warna.kuning(`      LEBIH  di database bersih (${lebih.length}): ${lebih.join(", ")}`));
        for (const b of bedaBentuk) console.log(warna.merah(`      BEDA BENTUK: ${b}`));
      }
    }

    const tabelEkstra = [...bersih.keys()].filter((t) => !produksi.has(t));
    if (tabelEkstra.length) {
      console.log(warna.kuning(`  Tabel hanya ada di database bersih: ${tabelEkstra.join(", ")}`));
      tabelBeda += tabelEkstra.length;
    }

    console.log("");
    console.log("──────────────────────────────────────────────────────────");
    if (tabelBeda === 0 && kodeKeluar === 0) {
      console.log(warna.hijau(warna.tebal("GERBANG F0 LULUS — schema database bersih IDENTIK dengan production.")));
    } else {
      console.log(
        warna.merah(
          warna.tebal(
            `GERBANG F0 GAGAL — ${tabelBeda} tabel berbeda · ${kolomKurang} kolom kurang · ${kolomLebih} kolom lebih · ${kolomBedaBentuk} kolom beda bentuk.`
          )
        )
      );
      console.log(warna.redup("Perbaiki src/lib/pg-migrate.ts, jangan perbaiki database production."));
      kodeKeluar = 1;
    }
    console.log("──────────────────────────────────────────────────────────");
    console.log("");
  } catch (e) {
    console.error(warna.merah(`GAGAL menjalankan verifikasi: ${e.message}`));
    kodeKeluar = 2;
  } finally {
    await bersihkan();
    await client.end();
  }

  process.exit(kodeKeluar);
})();
