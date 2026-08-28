/**
 * Regresi Item #190 — admin tidak boleh bisa menghapus akunnya sendiri.
 *
 * DILAPORKAN 26 Agu 2026 dari menu User Management: kartu ringkasan
 * menunjukkan `ADMINISTRATOR: 1`, dan mengklik ikon hapus pada baris
 * "Administrator" tetap memunculkan dialog konfirmasi yang berfungsi normal.
 * Risikonya bukan teoretis: baris akun sendiri ada di urutan TERATAS tabel,
 * jadi salah klik pada baris pertama adalah kesalahan yang paling mungkin
 * terjadi, bukan yang paling tidak mungkin. Bila ia satu-satunya admin,
 * seluruh administrasi sistem terkunci tanpa jalan pemulihan lewat UI.
 *
 * AKAR MASALAHNYA TIDAK SEPERTI YANG TERLIHAT, dan ini yang paling penting
 * dijaga. Tombolnya SUDAH punya penjaga: `disabled={user.role === "admin"}`.
 * Penjaga itu tidak bekerja karena perbandingannya peka huruf besar-kecil,
 * sedangkan `src/types/roles.ts` mencatat data lama menyimpan campuran
 * `Admin`/`admin`/`ADMIN` dan mewajibkan SETIAP pembanding peran lewat
 * `normalkanPeran()` lebih dulu. Pada baris yang perannya tersimpan `Admin`,
 * penjaganya menghasilkan `false` dan tombolnya aktif.
 *
 *   Penjaga yang ADA tetapi tidak berlaku lebih berbahaya daripada penjaga
 *   yang tidak ada — sebab pembacanya menyimpulkan kasus itu sudah tertutup.
 *
 * Jalur hapus MASSAL sudah menolak keduanya sejak dulu
 * (`cannotBulkDeleteAdmin`, `cannotBulkDeleteSelf`); tombol per baris satu-
 * satunya yang tertinggal. Jadi #190 adalah ketidakkonsistenan antara dua
 * jalur di layar yang sama, bukan fitur yang belum dibuat.
 *
 * CATATAN JUJUR SOAL BATAS TEST INI: pemeriksaan STATIS terhadap teks sumber.
 * Ia menangkap penjaga yang dilonggarkan kembali atau dikembalikan ke
 * perbandingan mentah — kegagalan yang paling mungkin terjadi. Ia TIDAK
 * membuktikan server sungguh menolak permintaannya; pembuktian itu menuntut
 * database hidup dan akun admin kedua.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const baca = (...b: string[]) => fs.readFileSync(path.join(AKAR, ...b), "utf8");

const rute = baca("server", "routes", "user.routes.ts");
const panelMentah = baca("src", "features", "users", "AdminUserPanel.tsx");

/**
 * Kode saja, tanpa komentar.
 *
 * Blok penjelasan di atas tombol hapus MENGUTIP bentuk lama
 * (`disabled={user.role === "admin"}`) supaya pembaca berikutnya tahu apa yang
 * dulu salah. Memeriksa berkas mentah membuat kutipan itu terbaca sebagai
 * pelanggaran, dan test merah karena alasan yang keliru — persis yang terjadi
 * saat test ini pertama dijalankan.
 */
const panel = panelMentah.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * Isi handler `router.delete("/api/users/:id", ...)`, TANPA komentar.
 *
 * Komentar dibuang karena alasan yang sama seperti pada `panel` di atas, dan
 * di sini akibatnya lebih halus: blok penjelasan di dalam handler menyebut
 * `userRepository.delete()` saat menerangkan kenapa penolakan 404 perlu ada.
 * Pemeriksaan URUTAN di bawah membandingkan posisi teks, sehingga penyebutan
 * di komentar itu terbaca sebagai "penghapusan terjadi lebih dulu" dan
 * membuat test merah padahal kodenya benar. Pemindaian berbasis teks harus
 * selalu memisahkan kode dari prosa tentang kode.
 */
const blokHapus = (): string => {
  const bersih = rute.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const i = bersih.indexOf("router.delete(");
  expect(i).toBeGreaterThan(-1);
  const potong = bersih.slice(i, i + 4000);
  expect(potong).toContain('"/api/users/:id"');
  return potong;
};

describe("#190 server menolak menghapus akun sendiri", () => {
  it("membandingkan id DAN uid, bukan salah satu saja", () => {
    // `findByIdOrUid` menerima keduanya sebagai identitas. Membandingkan hanya
    // satu membuat penjaganya meleset tanpa suara ketika yang satu uid dan
    // yang lain id.
    const b = blokHapus();
    expect(b).toMatch(/oldUser\.id/);
    expect(b).toMatch(/oldUser\.uid/);
    expect(b).toMatch(/currentUserId/);
  });

  it("memulangkan kode galat khusus, bukan diam-diam berhasil", () => {
    expect(blokHapus()).toContain("srv.tidak_bisa_hapus_akun_sendiri");
  });

  it("menolak menghapus admin terakhir yang tersisa", () => {
    expect(blokHapus()).toContain("srv.tidak_bisa_hapus_admin_terakhir");
  });

  it("menolak id yang tidak ada, bukan melapor berhasil", () => {
    // Tanpa ini `userRepository.delete()` tidak menghapus apa pun, audit log
    // tetap tertulis, dan klien menerima "User deleted" yang keliru.
    const b = blokHapus();
    expect(b).toContain("srv.user_not_found");
    expect(b).toMatch(/if\s*\(!oldUser\)/);
  });

  it("ketiga penolakan terjadi SEBELUM penghapusan dijalankan", () => {
    // Urutan menentukan segalanya di sini: penjaga yang berjalan sesudah
    // delete() tidak menjaga apa pun.
    const b = blokHapus();
    const posTolakSendiri = b.indexOf("srv.tidak_bisa_hapus_akun_sendiri");
    const posTolakAdmin = b.indexOf("srv.tidak_bisa_hapus_admin_terakhir");
    const posHapus = b.indexOf("userRepository.delete(");
    expect(posHapus).toBeGreaterThan(-1);
    expect(posTolakSendiri).toBeLessThan(posHapus);
    expect(posTolakAdmin).toBeLessThan(posHapus);
  });
});

describe("#190 UI mengunci tombol hapus pada baris yang tidak boleh dihapus", () => {
  it("membandingkan peran lewat normalkanPeran, bukan perbandingan mentah", () => {
    // Inilah cacat aslinya. `user.role === "admin"` hijau di tsc dan terlihat
    // benar saat dibaca, tetapi gagal pada data yang menyimpan `Admin`.
    expect(panel).toContain('normalkanPeran(user.role) === "admin"');
    expect(panel).not.toMatch(/disabled=\{user\.role === "admin"\}/);
  });

  it("TIDAK ADA perbandingan peran mentah yang tersisa di berkas ini", () => {
    // Satu berkas, satu aturan. Menyisakan sebagian perbandingan mentah
    // membuat pembaca berikutnya menyangka keduanya sama-sama sah, dan cacat
    // yang sama lahir lagi di baris berikutnya. `types/roles.ts` mewajibkan
    // SETIAP pembanding peran lewat normalkanPeran().
    const mentah = panel
      .split("\n")
      .map((baris, n) => ({ baris: baris.trim(), n: n + 1 }))
      .filter(({ baris }) => /\.role\s*===/.test(baris))
      .map(({ baris, n }) => `AdminUserPanel.tsx:${n} ${baris}`);
    expect(mentah).toEqual([]);
  });

  it("mengimpor normalkanPeran dari sumber peran resmi", () => {
    expect(panel).toMatch(
      /import\s*\{[^}]*normalkanPeran[^}]*\}\s*from\s*"\.\.\/\.\.\/types\/roles"/
    );
  });

  it("mengunci juga baris akun yang sedang login", () => {
    expect(panel).toContain("adalahAkunSendiri");
    expect(panel).toContain("props.currentUserId");
  });

  it("menyebutkan alasan tombolnya mati", () => {
    // Tombol mati tanpa penjelasan terbaca sebagai aplikasi rusak.
    expect(panel).toContain("users.cannotDeleteSelf");
  });
});
