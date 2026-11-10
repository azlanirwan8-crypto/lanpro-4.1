#!/usr/bin/env node
/**
 * #685 — mengambil build draw.io yang DIPATOK ke `public/drawio/`.
 *
 * KENAPA BERKAS INI ADA.
 *
 * Penerimaan B #685 menuntut tampilan yang "sama dengan draw.io", dan satu-satunya
 * cara jujur mencapainya adalah menjalankan build draw.io itu sendiri — bukan
 * meniru perilakunya. Build tidak masuk git (ratusan MB), jadi ia diunduh saat
 * `predev`/`prebuild` dari rilis resmi yang versinya dikunci di sini.
 *
 * ATURAN YANG TIDAK BOLEH DILONGGARKAN.
 *
 * 1. Versi DAN SHA-256 dikunci. URL rilis bisa berubah isinya tanpa mengubah
 *    nomor versi; tanpa hash, "patok" hanya nama.
 * 2. `WEB-INF/` dan `META-INF/` TIDAK PERNAH diekstrak. Di dalamnya ada
 *    konfigurasi server dan kredensial klien OAuth draw.io; menaruhnya di
 *    `public/` berarti membagikannya ke setiap pengunjung.
 * 3. Berkas yang ditulis hanya yang dibutuhkan editor web. Bundel `viewer*`
 *    dan `integrate*` tidak pernah dimuat `index.html`, dan sourcemap/README
 *    bukan bagian dari aplikasi.
 * 4. Nama berkas dari ZIP adalah input tidak dipercaya: path absolut, `..`,
 *    backslash, dan symlink ditolak. Total byte yang diekstrak dibatasi supaya
 *    ZIP yang membengkak tidak menghabiskan disk.
 *
 * Pemakaian:
 *   node scripts/ambil-drawio.cjs            # unduh/ekstrak bila belum ada
 *   node scripts/ambil-drawio.cjs --paksa    # ekstrak ulang
 *   DRAWIO_WAR=/path/draw.war node scripts/ambil-drawio.cjs   # pakai berkas lokal
 */
const { createHash } = require("node:crypto");
const { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } =
  require("node:fs");
const { dirname, join, resolve, sep } = require("node:path");
const { inflateRawSync } = require("node:zlib");
const { pipeline } = require("node:stream/promises");
const { Readable } = require("node:stream");

const VERSI = "32.6.10";
const URL_UNDUH = `https://github.com/jgraph/drawio/releases/download/v${VERSI}/draw.war`;
const SHA256 =
  "a57b06b3b6a876a351dacfe65d027d9509319cd030e9bacf6ae04a034d66a38f";
const UKURAN_WAR = 49729549;

const AKAR = resolve(__dirname, "..");
const TUJUAN = join(AKAR, "public", "drawio");
const CACHE = join(AKAR, ".cache", "drawio");
const WAR_CACHE = join(CACHE, `draw-${VERSI}.war`);
const PENANDA = join(TUJUAN, ".sumber-drawio.json");

/** Bundel yang tidak pernah dimuat `index.html` editor (lihat header berkas). */
const LEWATI_BERKAS = new Set(["js/integrate.min.js", "js/viewer.min.js", "js/viewer-static.min.js"]);
const LEWATI_AWALAN = ["WEB-INF/", "META-INF/"];
const BATAS_EKSTRAK_BYTE = 160 * 1024 * 1024;

const catat = (...args) => console.log("[drawio]", ...args);

const argumen = new Set(process.argv.slice(2));
const paksa = argumen.has("--paksa");

/**
 * Nama dari ZIP tidak boleh menentukan lokasi tulis di luar `TUJUAN`.
 * Satu entri jahat sudah cukup untuk menulis ke mana saja.
 */
function namaAman(nama) {
  if (!nama || nama.endsWith("/")) return null;
  if (nama.includes("\\") || nama.startsWith("/") || /^[a-zA-Z]:/.test(nama)) return null;
  if (nama.split("/").includes("..")) return null;
  if (LEWATI_AWALAN.some((awalan) => nama.startsWith(awalan))) return null;
  if (LEWATI_BERKAS.has(nama)) return null;
  if (nama.endsWith(".map") || nama.endsWith(".md")) return null;
  return nama;
}

function bacaMarker() {
  try {
    return JSON.parse(readFileSync(PENANDA, "utf8"));
  } catch {
    return null;
  }
}

function sudahSiap() {
  const marker = bacaMarker();
  return Boolean(
    !paksa && marker && marker.versi === VERSI && marker.sha256 === SHA256 && existsSync(TUJUAN)
  );
}

async function unduh() {
  if (process.env.DRAWIO_WAR) {
    const lokal = resolve(process.env.DRAWIO_WAR);
    if (!existsSync(lokal)) throw new Error(`DRAWIO_WAR tidak ditemukan: ${lokal}`);
    catat(`memakai berkas lokal ${lokal}`);
    return readFileSync(lokal);
  }
  if (existsSync(WAR_CACHE)) {
    catat(`memakai cache ${WAR_CACHE}`);
    return readFileSync(WAR_CACHE);
  }
  catat(`mengunduh draw.io v${VERSI} …`);
  const respons = await fetch(URL_UNDUH, {
    redirect: "follow",
    signal: AbortSignal.timeout(180_000),
    headers: { "user-agent": "lanpro-drawio-vendor/1" },
  });
  if (!respons.ok || !respons.body) {
    throw new Error(`unduhan gagal: HTTP ${respons.status} ${respons.statusText}`);
  }
  mkdirSync(CACHE, { recursive: true });
  await pipeline(Readable.fromWeb(respons.body), createWriteStream(WAR_CACHE));
  catat(`tersimpan di cache (${(Number(readFileSync(WAR_CACHE).length) / 1048576).toFixed(1)} MB)`);
  return readFileSync(WAR_CACHE);
}

function verifikasi(buffer) {
  if (buffer.length !== UKURAN_WAR) {
    throw new Error(
      `ukuran draw.war ${buffer.length} byte, seharusnya ${UKURAN_WAR}. Artefak berbeda — berhenti.`
    );
  }
  const hash = createHash("sha256").update(buffer).digest("hex");
  if (hash !== SHA256) {
    throw new Error(`SHA-256 ${hash} tidak cocok dengan patok ${SHA256}. Artefak berbeda — berhenti.`);
  }
  return hash;
}

/** Membaca End of Central Directory; ZIP64 tidak dibutuhkan oleh artefak ini. */
function bacaDirektoriPusat(buffer) {
  const batas = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= batas; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("bukan ZIP yang sah: End of Central Directory tidak ditemukan");

  const jumlah = buffer.readUInt16LE(eocd + 10);
  const ukuran = buffer.readUInt32LE(eocd + 12);
  const offset = buffer.readUInt32LE(eocd + 16);
  if (jumlah === 0xffff || ukuran === 0xffffffff || offset === 0xffffffff) {
    throw new Error("ZIP64 tidak didukung oleh skrip ini");
  }
  if (offset + ukuran > buffer.length) throw new Error("direktori pusat ZIP melewati akhir berkas");
  return { jumlah, offset, ukuran };
}

function ekstrak(buffer, tujuan) {
  const { jumlah, offset, ukuran } = bacaDirektoriPusat(buffer);
  let posisi = offset;
  const akhir = offset + ukuran;
  let ditulis = 0;
  let total = 0;

  for (let i = 0; i < jumlah; i++) {
    if (posisi + 46 > akhir || buffer.readUInt32LE(posisi) !== 0x02014b50) {
      throw new Error(`entri direktori pusat ke-${i} rusak`);
    }
    const metode = buffer.readUInt16LE(posisi + 10);
    const ukuranPadat = buffer.readUInt32LE(posisi + 20);
    const ukuranAsli = buffer.readUInt32LE(posisi + 24);
    const panjangNama = buffer.readUInt16LE(posisi + 28);
    const panjangEkstra = buffer.readUInt16LE(posisi + 30);
    const panjangKomentar = buffer.readUInt16LE(posisi + 32);
    const offsetLokal = buffer.readUInt32LE(posisi + 42);
    const nama = buffer.toString("utf8", posisi + 46, posisi + 46 + panjangNama);
    posisi += 46 + panjangNama + panjangEkstra + panjangKomentar;

    const aman = namaAman(nama);
    if (!aman) continue;

    if (offsetLokal + 30 > buffer.length || buffer.readUInt32LE(offsetLokal) !== 0x04034b50) {
      throw new Error(`header lokal untuk ${nama} rusak`);
    }
    const namaLokal = buffer.readUInt16LE(offsetLokal + 26);
    const ekstraLokal = buffer.readUInt16LE(offsetLokal + 28);
    const mulai = offsetLokal + 30 + namaLokal + ekstraLokal;
    const selesai = mulai + ukuranPadat;
    if (selesai > buffer.length) throw new Error(`data ${nama} melewati akhir berkas`);

    let isi;
    if (metode === 0) {
      isi = buffer.subarray(mulai, selesai);
    } else if (metode === 8) {
      isi = inflateRawSync(buffer.subarray(mulai, selesai));
    } else {
      throw new Error(`metode kompresi ${metode} tidak didukung (${nama})`);
    }
    if (isi.length !== ukuranAsli) throw new Error(`ukuran ${nama} tidak sesuai direktori`);

    total += isi.length;
    if (total > BATAS_EKSTRAK_BYTE) {
      throw new Error("isi ZIP melewati batas ekstraksi — berhenti sebelum menghabiskan disk");
    }

    const jalur = resolve(tujuan, aman);
    if (jalur !== tujuan && !jalur.startsWith(tujuan + sep)) {
      throw new Error(`path ${nama} keluar dari direktori tujuan`);
    }
    mkdirSync(dirname(jalur), { recursive: true });
    writeFileSync(jalur, isi);
    ditulis++;
  }

  if (ditulis === 0) throw new Error("tidak ada berkas yang diekstrak — artefak tidak sesuai");
  return { ditulis, total };
}

async function utama() {
  if (sudahSiap()) {
    catat(`v${VERSI} sudah ada di public/drawio (patok cocok) — dilewati`);
    return;
  }

  const buffer = await unduh();
  const hash = verifikasi(buffer);

  catat("mengekstrak aset editor (tanpa WEB-INF/META-INF) …");
  rmSync(TUJUAN, { recursive: true, force: true });
  mkdirSync(TUJUAN, { recursive: true });
  const { ditulis, total } = ekstrak(buffer, TUJUAN);

  writeFileSync(
    PENANDA,
    JSON.stringify(
      { versi: VERSI, sha256: hash, url: URL_UNDUH, berkas: ditulis, byte: total },
      null,
      2
    ) + "\n"
  );
  catat(`selesai: ${ditulis} berkas, ${(total / 1048576).toFixed(1)} MB → public/drawio`);
}

if (require.main === module) {
  utama().catch((galat) => {
    console.error("[drawio] GAGAL:", galat instanceof Error ? galat.message : galat);
    console.error("[drawio] Editor draw.io tidak akan tersedia sampai artefak patok bisa diambil.");
    process.exit(1);
  });
}

// Diekspor untuk test: penjagaan path dan daftar berkas adalah bagian keamanan
// yang harus bisa dibuktikan tanpa mengunduh 50 MB.
module.exports = { VERSI, SHA256, namaAman, bacaDirektoriPusat, ekstrak };
