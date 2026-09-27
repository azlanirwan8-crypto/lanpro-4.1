/**
 * Regresi Item #162 — `GET /api/users` tidak boleh membocorkan field sensitif.
 *
 * DITEMUKAN saat menutup #161. Penjaga yang dipasang di sana menutup LAYARNYA
 * (cabang `users` di AppContainer), bukan DATANYA: siapa pun yang membawa JWT
 * sah tetap bisa memanggil endpoint ini langsung dan memperoleh `email`,
 * `phone`, dan `permissions` SELURUH pengguna. Yang terakhir itu peta RBAC —
 * siapa memegang akses apa — tanpa perlu ditebak.
 *
 * KENAPA BUKAN SEKADAR DIKUNCI ADMIN. Endpoint ini mengisi `allUsers`
 * (`src/hooks/useAuth.ts:133`), yang dipakai lima fitur non-admin: penyebutan
 * di obrolan, status daring, avatar header, pemilih penerima tugas, dan
 * peserta rapat. `verifyGlobalAdmin` di sini akan mematikan kelimanya. Maka
 * yang dipersempit ISI-nya, bukan siapa yang boleh memanggil.
 *
 * KENAPA TIDAK ADA GERBANG LAIN YANG MELIHATNYA. `tsc` hijau sebab kolomnya
 * cuma string SQL; eslint tidak tahu kolom mana yang sensitif; dan
 * `rute-tanpa-penjaga` berangkat dari daftar penjaga — rute ini PUNYA penjaga
 * (`authenticateJWT` global), hanya penjaganya menjawab pertanyaan yang salah:
 * "sudah login?" bukan "boleh lihat apa?".
 *
 * Diperiksa statis terhadap teks sumber. Menjalankan kueri sungguhan menuntut
 * database hidup, sedangkan yang dijaga di sini justru DAFTAR KOLOMNYA — teks,
 * bukan hasil.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const baca = (...b: string[]) => fs.readFileSync(path.join(AKAR, ...b), "utf8");

const repo = baca("server", "repositories", "user.repository.ts");
const rute = baca("server", "routes", "user.routes.ts");

/** Field yang tidak boleh sampai ke pengguna non-admin. */
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

describe("#162 findAllRingkas tidak memuat field sensitif", () => {
  it.each(SENSITIF)("kolom %s tidak diseleksi", (kolom) => {
    expect(kolomDari("findAllRingkas")).not.toContain(kolom);
  });

  it("tetap memulangkan yang dibutuhkan lima fitur non-admin", () => {
    const kolom = kolomDari("findAllRingkas");
    for (const wajib of ["id", "uid", "username", "displayName", "avatar", "role"]) {
      expect(kolom).toContain(wajib);
    }
  });

  it("menyeleksi kolom secara eksplisit, bukan SELECT *", () => {
    // `SELECT *` akan diam-diam memulangkan kolom baru apa pun yang kelak
    // ditambahkan ke tabel Users, termasuk yang sensitif.
    expect(kolomDari("findAllRingkas")).not.toContain("*");
  });
});

describe("#162 findAll penuh tetap ada untuk admin", () => {
  it("masih memuat ketiga field sensitif", () => {
    const kolom = kolomDari("findAll");
    for (const s of SENSITIF) {
      expect(kolom).toContain(s);
    }
  });
});

describe("#162 rute memilih berdasarkan peran", () => {
  const blok = (() => {
    const i = rute.indexOf('router.get("/api/users"');
    return rute.slice(i, rute.indexOf("});", i));
  })();

  it("non-admin dilayani findAllRingkas", () => {
    expect(blok).toContain("findAllRingkas()");
  });

  it("hanya peran admin yang mendapat findAll penuh", () => {
    expect(blok).toContain('req.user?.role === "admin"');
    expect(blok).toContain("findAll()");
  });

  it("memakai kosakata peran yang SAMA dengan verifyGlobalAdmin", () => {
    // Dua pemeriksaan admin yang berbeda bunyi adalah cara paling umum
    // otorisasi meleset diam-diam.
    const mw = baca("server", "middleware", "auth.ts");
    const i = mw.indexOf("verifyGlobalAdmin");
    expect(mw.slice(i, i + 200)).toContain('role === "admin"');
  });
});
