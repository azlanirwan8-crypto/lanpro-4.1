/**
 * MEMBERSIHKAN RUJUKAN AVATAR YATIM — #128.
 *
 * Basis data menyimpan `avatar_url` yang menunjuk ke berkas di `/uploads`,
 * sementara berkasnya sudah tidak ada. Setiap avatar semacam itu menghasilkan
 * 404 di konsol peramban dan memaksa antarmuka menggambar inisial sebagai
 * cadangan. #122 sudah membuat kegagalannya diingat lintas instance sehingga
 * satu berkas hilang tidak lagi memicu lima permintaan, tetapi rujukan yang
 * menunjuk ke ruang kosong itu sendiri masih tersimpan.
 *
 * BAWAANNYA UJI-COBA. Tanpa `--tulis`, ia hanya memperlihatkan apa yang AKAN
 * dikosongkan. Pola yang sama dipakai `db:hapus-kolom-kembar` dan
 * `db:migrasi-peran`, dan alasannya sama: rencana harus terlihat sebelum
 * dijalankan.
 *
 * YANG TIDAK DISENTUH:
 *
 *   - URL absolut (`http://`, `https://`). Avatar dari Google SSO dilayani
 *     host lain dan keberadaannya tidak bisa disimpulkan dari disk ini.
 *   - Data URI (`data:`), yang tidak merujuk berkas apa pun.
 *   - Baris yang `avatar_url`-nya memang sudah kosong.
 *
 * PERINGATAN YANG LEBIH BESAR DARIPADA SKRIP INI: selama #30 belum selesai,
 * `uploads/` adalah penyimpanan lokal yang isinya hilang bersama kontainer.
 * Membersihkan rujukan hari ini TIDAK mencegahnya kotor lagi besok — setiap
 * avatar yang diunggah sesudah ini akan menjadi yatim pada restart berikutnya.
 * Skrip ini merapikan akibat, bukan sebab.
 */

const path = require("path");
const fs = require("fs");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

/** Benar bila nilainya menunjuk berkas lokal yang seharusnya ada di `uploads/`. */
function berkasLokal(url) {
  if (!url || typeof url !== "string") return null;
  const bersih = url.trim();
  if (!bersih) return null;
  if (/^(https?:)?\/\//i.test(bersih)) return null; // dilayani host lain
  if (/^data:/i.test(bersih)) return null; // tidak merujuk berkas
  const cocok = bersih.match(/\/?uploads\/([^?#]+)/i);
  return cocok ? cocok[1] : null;
}

(async () => {
  require("dotenv").config();
  const tulis = process.argv.includes("--tulis");
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error(warna.merah("DATABASE_URL tidak ditemukan di environment."));
    process.exit(2);
  }

  const dirUploads = path.resolve(__dirname, "..", "..", "uploads");
  const adaDir = fs.existsSync(dirUploads);

  const { Client } = require("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log(
    tulis
      ? warna.merah("\n  MODE TULIS — rujukan yatim AKAN dikosongkan.\n")
      : warna.redup("\n  MODE UJI-COBA — tidak ada yang diubah. Tambahkan --tulis untuk menjalankan.\n")
  );
  console.log(warna.redup(`  Direktori uploads: ${dirUploads}${adaDir ? "" : "  (TIDAK ADA)"}`));

  const { rows } = await client.query(
    'SELECT id, username, COALESCE(avatar_url, "photoURL", "avatarUrl") AS avatar FROM "Users"'
  );

  const yatim = [];
  let eksternal = 0;
  let kosong = 0;
  let utuh = 0;

  for (const r of rows) {
    const berkas = berkasLokal(r.avatar);
    if (!r.avatar || !String(r.avatar).trim()) {
      kosong++;
      continue;
    }
    if (!berkas) {
      eksternal++;
      continue;
    }
    if (adaDir && fs.existsSync(path.join(dirUploads, berkas))) {
      utuh++;
      continue;
    }
    yatim.push({ id: r.id, username: r.username, avatar: r.avatar });
  }

  console.log(
    `\n  ${warna.tebal("Users")}  total ${rows.length} · kosong ${kosong} · eksternal ${eksternal} · berkas utuh ${utuh} · ${warna.kuning(`yatim ${yatim.length}`)}\n`
  );

  for (const y of yatim.slice(0, 20)) {
    console.log(`    ${y.username || y.id}  ->  ${y.avatar}`);
  }
  if (yatim.length > 20) console.log(warna.redup(`    ... dan ${yatim.length - 20} lagi`));

  if (!yatim.length) {
    console.log(warna.hijau("\n  Tidak ada rujukan yatim. Tidak ada yang perlu dikerjakan.\n"));
    await client.end();
    return;
  }

  if (!tulis) {
    console.log(
      warna.redup("\n  Jalankan ulang dengan --tulis untuk mengosongkan rujukan di atas.\n")
    );
    await client.end();
    return;
  }

  let diubah = 0;
  for (const y of yatim) {
    const hasil = await client.query(
      'UPDATE "Users" SET avatar_url = NULL, "photoURL" = NULL, "avatarUrl" = NULL WHERE id = $1',
      [y.id]
    );
    diubah += hasil.rowCount || 0;
  }

  console.log(warna.hijau(`\n  ${diubah} baris dikosongkan.\n`));
  console.log(
    warna.kuning(
      "  Ingat: selama #30 belum selesai, uploads/ hilang bersama kontainer,\n" +
        "  jadi rujukan baru akan menjadi yatim lagi pada restart berikutnya.\n"
    )
  );
  await client.end();
})().catch((e) => {
  console.error(warna.merah("Gagal: " + (e && e.message ? e.message : e)));
  process.exit(1);
});
