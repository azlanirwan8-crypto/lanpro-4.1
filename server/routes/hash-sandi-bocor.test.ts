/**
 * Regresi Item #241 — `GET /api/users/:id` tidak boleh membocorkan `passwordHash`.
 *
 * DITEMUKAN 28 Agu 2026 lewat audit kode `/qa`. Rantainya tiga langkah tanpa
 * satu pun penyaring di antaranya: `findByIdOrUid()` menyertakan `passwordHash`
 * di daftar SELECT-nya, `user.routes.ts` memanggil method itu untuk melayani
 * `GET /api/users/:id`, lalu memulangkan objeknya apa adanya lewat
 * `res.json({ status: "success", data: user })`.
 *
 * DAMPAKNYA. Setiap pengguna yang membawa JWT sah — sekecil apa pun perannya —
 * bisa mengambil hash bcrypt akun mana pun termasuk admin, lalu membobolnya
 * offline tanpa batas percobaan dan tanpa jejak di server. Itu jalur naik hak
 * akses yang utuh, bukan sekadar kebocoran data.
 *
 * KENAPA BERTAHAN LAMA. Method itu melayani DUA keperluan. Satu-satunya yang
 * benar-benar butuh hash adalah alur ganti sandi, dan kebutuhan internal itulah
 * yang menentukan daftar kolomnya — lalu jalur tampilan ikut kebagian.
 * Bandingkan dengan `findAll()` tetangganya, yang daftar kolomnya sengaja TIDAK
 * memuat `passwordHash`. Asimetri itu yang menandai ini kelalaian, bukan
 * keputusan.
 *
 * KENAPA TIDAK ADA GERBANG LAIN YANG MELIHATNYA. `tsc` hijau sebab kolomnya
 * cuma string SQL; eslint tidak tahu kolom mana yang sensitif; dan
 * `rute-tanpa-penjaga` berangkat dari daftar penjaga — rute ini PUNYA penjaga
 * (`authenticateJWT` global). Penjaganya menjawab "sudah login?", bukan "boleh
 * lihat apa?". Pola kegagalan yang sama persis dengan #162.
 *
 * YANG DIKUNCI TEST INI bukan cuma satu baris yang bocor, melainkan ARAH
 * perbaikannya: `findByIdOrUid()` aman secara BAWAAN, dan hash diminta terpisah
 * oleh satu-satunya pemanggil yang memverifikasinya. Menambal `res.json` saja
 * akan menutup kebocoran hari ini sambil membiarkan pemanggil berikutnya
 * mewarisi hash tanpa memintanya.
 *
 * Diperiksa statis terhadap teks sumber, alasan yang sama seperti
 * `pengguna-ringkas.test.ts`: yang dijaga di sini adalah DAFTAR KOLOMNYA —
 * teks, bukan hasil kueri. Pembuktian bahwa verifikasi sandi masih benar ada
 * di alur ganti sandi itu sendiri.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const baca = (...b: string[]) => fs.readFileSync(path.join(AKAR, ...b), "utf8");

const repo = baca("server", "repositories", "user.repository.ts");
const rute = baca("server", "routes", "user.routes.ts");

/**
 * Nama kolom yang benar-benar diseleksi sebuah metode repositori.
 *
 * Diurai jadi DAFTAR NAMA, bukan dicocokkan sebagai substring: `passwordHash`
 * muncul juga di komentar dan di nama metode lain, jadi pencocokan teks polos
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

describe("#241 findByIdOrUid tidak memulangkan hash sandi", () => {
  it("kolom passwordHash tidak diseleksi", () => {
    expect(kolomDari("findByIdOrUid")).not.toContain("passwordHash");
  });

  it("menyeleksi kolom secara eksplisit, bukan SELECT *", () => {
    // `SELECT *` akan diam-diam memulangkan kolom baru apa pun yang kelak
    // ditambahkan ke tabel Users, termasuk yang sensitif.
    expect(kolomDari("findByIdOrUid")).not.toContain("*");
  });

  it("tetap memulangkan field yang dipakai belasan pemanggilnya", () => {
    // Sebelas pemanggil selain alur ganti sandi hanya memakai field ini.
    // Kalau salah satu hilang, perbaikan #241 merusak sesuatu yang lain.
    const kolom = kolomDari("findByIdOrUid");
    for (const wajib of ["id", "uid", "username", "email", "role", "status", "permissions"]) {
      expect(kolom).toContain(wajib);
    }
  });
});

describe("#241 jalur khusus verifikasi sandi tetap ada", () => {
  it("findPasswordHashById menyeleksi passwordHash", () => {
    expect(kolomDari("findPasswordHashById")).toContain("passwordHash");
  });

  it("memulangkan string telanjang, bukan objek pengguna", () => {
    // Bagian dari poin #241: nilai telanjang tidak bisa tanpa sengaja ikut
    // ter-res.json() bersama field lain, yang persis cara #241 lahir.
    const i = repo.indexOf("async findPasswordHashById(");
    expect(repo.slice(i, repo.indexOf("\n  }", i))).toContain("Promise<string | null>");
  });
});

describe("#241 rute tidak lagi membaca hash dari objek pengguna", () => {
  it("alur ganti sandi meminta hash lewat jalur khusus", () => {
    expect(rute).toContain("findPasswordHashById(");
  });

  it("tidak ada satu pun rute yang membaca .passwordHash dari objek pengguna", () => {
    // Inilah bentuk kebocoran aslinya: `user.passwordHash` yang ikut menumpang
    // di objek hasil findByIdOrUid.
    const pelanggaran = rute
      .split("\n")
      .map((baris, n) => ({ baris: baris.trim(), n: n + 1 }))
      .filter(({ baris }) => /\b\w+\.passwordHash\b/.test(baris) && !baris.startsWith("*"))
      .map(({ baris, n }) => `user.routes.ts:${n} ${baris}`);
    expect(pelanggaran).toEqual([]);
  });

  it("GET /api/users/:id tidak memulangkan objek repositori mentah", () => {
    const i = rute.indexOf('router.get("/api/users/:id"');
    expect(i).toBeGreaterThan(-1);
    const blok = rute.slice(i, rute.indexOf("});", i));
    // Boleh memulangkan `data: user` HANYA karena findByIdOrUid kini aman.
    // Kalau kelak hash dikembalikan ke SELECT itu, test pertama di berkas ini
    // yang merah lebih dulu — dan itu memang urutan yang diinginkan.
    expect(blok).toContain("findByIdOrUid(");
  });
});
