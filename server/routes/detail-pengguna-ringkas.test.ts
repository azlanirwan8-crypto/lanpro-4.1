/**
 * Regresi Item #243 — `GET /api/users/:id` tidak boleh membocorkan field sensitif.
 *
 * DITEMUKAN 29 Agu 2026 lewat audit CRUD per modul `/qa` (AUDIT.md §13.16).
 * Kelas yang sama dengan #162, berkas yang sama, sisa yang tidak ikut tersapu:
 * #162 memasang redaksi di endpoint DAFTAR (`GET /api/users`, `user.routes.ts`)
 * lengkap dengan komentar panjang tentang alasannya, sementara endpoint DETAIL
 * dua puluh empat baris di bawahnya memanggil `findByIdOrUid()` tanpa memeriksa
 * peran sama sekali — dan kueri itu menyeleksi `email`, `phone`, dan
 * `permissions` secara eksplisit.
 *
 * DAMPAKNYA. Id-nya tidak perlu ditebak. `findAllRingkas()` yang melayani
 * non-admin tetap memulangkan `id` SEMUA pengguna; jadi urutannya: ambil
 * daftarnya, lalu panggil detailnya satu per satu. Hasilnya email dan nomor
 * telepon seluruh organisasi, ditambah `permissions` — peta RBAC, siapa
 * memegang akses apa. Persis data yang #162 anggap layak ditutup.
 *
 * KENAPA BUKAN DIKUNCI ADMIN SAJA. Ada satu pemanggil non-admin yang memang
 * berhak atas isi penuh: pemilik akunnya sendiri, yang perlu membaca email dan
 * nomornya di halaman profil. Karena itu rutenya memilih tiga arah, bukan dua.
 *
 * KENAPA REPOSITORINYA TIDAK IKUT DIPERSEMPIT. `findByIdOrUid()` melayani
 * belasan pemanggil internal — login, ganti sandi, penjaga proyek, notifikasi —
 * yang benar-benar butuh `email` dan `permissions`. Mempersempit sumbernya akan
 * mematikan mereka. Yang dipersempit karena itu jalur TAMPILAN-nya, lewat
 * method kedua, sama seperti pasangan `findAll()`/`findAllRingkas()` di #162.
 *
 * KENAPA TIDAK ADA GERBANG LAIN YANG MELIHATNYA. Alasan yang sama seperti #162
 * dan #241: `tsc` hijau sebab kolomnya cuma string SQL; eslint tidak tahu kolom
 * mana yang sensitif; dan `rute-tanpa-penjaga` berangkat dari daftar penjaga —
 * rute ini PUNYA penjaga (`authenticateJWT` global), hanya penjaganya menjawab
 * "sudah login?" bukan "boleh lihat apa?". Tiga kali pola yang sama sekarang,
 * jadi test ini juga mengunci PASANGANNYA: setiap kali sebuah field pindah dari
 * `findAllRingkas()` ke daftar sensitif, pasangan per-id-nya harus ikut.
 *
 * Diperiksa statis terhadap teks sumber, alasan yang sama seperti
 * `pengguna-ringkas.test.ts` dan `hash-sandi-bocor.test.ts`: yang dijaga di
 * sini adalah DAFTAR KOLOMNYA dan CABANG PEMILIHANNYA — teks, bukan hasil
 * kueri. Membuktikannya dengan kueri sungguhan menuntut database hidup.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const baca = (...b: string[]) => fs.readFileSync(path.join(AKAR, ...b), "utf8");

const repo = baca("server", "repositories", "user.repository.ts");
const rute = baca("server", "routes", "user.routes.ts");

/** Field yang tidak boleh sampai ke pengguna non-admin. Sama dengan #162. */
const SENSITIF = ["email", "phone", "permissions"];

/**
 * Nama kolom yang benar-benar diseleksi sebuah metode repositori.
 *
 * Diurai jadi DAFTAR NAMA, bukan dicocokkan sebagai substring: nama kolom
 * muncul juga di dalam kata lain dan di komentar, jadi pencocokan teks polos
 * bisa hijau maupun merah karena alasan yang salah. Alias `... AS x` diambil
 * nama aliasnya, sebab itulah yang sampai ke klien.
 */
const kolomDari = (nama: string): string[] => {
  const i = repo.indexOf(`async ${nama}(`);
  if (i === -1) throw new Error(`${nama} tidak ada di user.repository.ts`);
  const mulai = repo.indexOf("SELECT ", i);
  const akhir = repo.indexOf("FROM Users", mulai);
  if (mulai === -1 || akhir === -1) throw new Error(`${nama} tidak menyeleksi dari Users`);
  return repo
    .slice(mulai + "SELECT ".length, akhir)
    .split(/,(?![^(]*\))/)
    .map((bagian) => {
      const alias = bagian.match(/\sAS\s+(\w+)\s*$/i);
      return (alias ? alias[1] : bagian).trim();
    })
    .filter(Boolean);
};

describe("#243 findByIdOrUidRingkas tidak memuat field sensitif", () => {
  it.each(SENSITIF)("kolom %s tidak diseleksi", (kolom) => {
    expect(kolomDari("findByIdOrUidRingkas")).not.toContain(kolom);
  });

  it("menyaring di dalam kueri, bukan di JavaScript", () => {
    // Menyaring setelah kueri berarti datanya sudah meninggalkan database, dan
    // satu `console.log` cukup untuk membocorkannya kembali. `WHERE` wajib ada
    // supaya method ini benar-benar per-id dan bukan `findAllRingkas()` yang
    // dipotong di memori.
    const i = repo.indexOf("async findByIdOrUidRingkas(");
    const blok = repo.slice(i, repo.indexOf("\n  }", i));
    expect(blok).toContain("WHERE id = ? OR uid = ?");
  });

  it("menyeleksi kolom secara eksplisit, bukan SELECT *", () => {
    // `SELECT *` akan diam-diam memulangkan kolom baru apa pun yang kelak
    // ditambahkan ke tabel Users, termasuk yang sensitif.
    expect(kolomDari("findByIdOrUidRingkas")).not.toContain("*");
  });

  it("tetap memulangkan yang dibutuhkan tampilan non-admin", () => {
    const kolom = kolomDari("findByIdOrUidRingkas");
    for (const wajib of ["id", "uid", "username", "displayName", "avatar", "role", "status"]) {
      expect(kolom).toContain(wajib);
    }
  });

  it("kolom tampilannya SAMA PERSIS dengan pasangan daftarnya", () => {
    // Inti kunci ini: #243 lahir karena dua pintu ke data yang sama tidak
    // diredaksi dengan aturan yang sama. Kalau kelak satu field ditambahkan
    // atau dibuang di salah satunya saja, asimetri itu lahir lagi — dan test
    // inilah yang merah, bukan pengguna yang menemukannya.
    expect(kolomDari("findByIdOrUidRingkas")).toEqual(kolomDari("findAllRingkas"));
  });
});

describe("#243 findByIdOrUid penuh tetap ada untuk yang berhak", () => {
  it("masih memuat ketiga field sensitif", () => {
    // Belasan pemanggil internal — login, ganti sandi, penjaga proyek,
    // notifikasi — berhenti bekerja tanpa ini.
    const kolom = kolomDari("findByIdOrUid");
    for (const s of SENSITIF) {
      expect(kolom).toContain(s);
    }
  });
});

describe("#243 rute memilih berdasarkan peran DAN kepemilikan", () => {
  const blok = (() => {
    const i = rute.indexOf('router.get("/api/users/:id"');
    expect(i).toBeGreaterThan(-1);
    return rute.slice(i, rute.indexOf("});", i));
  })();

  it("pemanggil biasa dilayani versi ringkas", () => {
    expect(blok).toContain("findByIdOrUidRingkas(");
  });

  it("admin mendapat isi penuh", () => {
    expect(blok).toContain('req.user?.role === "admin"');
    expect(blok).toContain("findByIdOrUid(");
  });

  it("pemilik akunnya sendiri juga mendapat isi penuh", () => {
    // Tanpa cabang ini halaman profil sendiri kehilangan email dan nomornya.
    expect(blok).toContain("matchesCaller(req.user, id)");
  });

  it("memakai kosakata peran yang SAMA dengan verifyGlobalAdmin", () => {
    // Dua pemeriksaan admin yang berbeda bunyi adalah cara paling umum
    // otorisasi meleset diam-diam. Asersi yang sama dipasang #162.
    const mw = baca("server", "middleware", "auth.ts");
    const i = mw.indexOf("verifyGlobalAdmin");
    expect(mw.slice(i, i + 200)).toContain('role === "admin"');
  });

  it("kepemilikan diuji lewat helper yang sama dengan rute lain", () => {
    // `:id` boleh berupa `id` MAUPUN `uid` — membandingkannya sendiri dengan
    // `===` akan melewatkan salah satu bentuk dan menutup profil pemiliknya.
    expect(rute).toContain('import { matchesCaller } from "../services/task.service"');
  });
});
