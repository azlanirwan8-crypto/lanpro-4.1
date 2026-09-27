/**
 * Regresi Item #161 — tombol Kembali di detail pengguna, dan penjaga panel
 * admin.
 *
 * DILAPORKAN PEMILIK PROYEK: "klik kembali ... malah ke menu user management,
 * kan fatal ini."
 *
 * Dua kegagalan berbeda yang kebetulan bertemu di satu klik.
 *
 * 1. NAVIGASI. `onBack` di `UserDetailView` dikeraskan ke `"users"`, jadi
 *    Kembali selalu bermuara di panel admin dari mana pun layar itu dibuka.
 *    Ada TIGA jalan masuk ke `userDetail` — panel admin, footer sidebar, dan
 *    (sejak #160) layar sambutan — dan hanya satu di antaranya yang benar-
 *    benar berasal dari `"users"`.
 *
 * 2. OTORISASI, yang lebih serius. Cabang `currentView === "users"` berada
 *    DI ATAS penjaga `selectedProject` dan `AdminUserPanel` tidak memeriksa
 *    izin sama sekali di dalamnya. Menyembunyikan menunya di sidebar bukan
 *    penjaga — menu hanyalah salah satu jalan masuk, dan tombol Kembali itu
 *    membuktikannya dengan membawa pengguna biasa ke daftar SELURUH pengguna.
 *
 * Diperiksa STATIS terhadap teks sumber, sebab merender AppContainer utuh
 * menuntut seluruh tiruan jaringan, socket, dan sesi — biayanya tidak sepadan
 * untuk mengunci dua bentuk yang keduanya kasatmata di sumber.
 */
import fs from "fs";
import path from "path";

const isi = fs.readFileSync(path.resolve(__dirname, "AppContainer.tsx"), "utf8");

describe("#161 tombol Kembali di detail pengguna", () => {
  it("tidak lagi dikeraskan ke panel admin", () => {
    expect(isi).not.toContain('onBack={() => setCurrentView("users")}');
  });

  it("pulang ke view asal lewat previousView", () => {
    expect(isi).toContain("onBack={() => setCurrentView(previousView as any)}");
  });

  it("setiap jalan masuk ke userDetail merekam asalnya", () => {
    // Satu-satunya penyetel `currentView` ke "userDetail" adalah helper ini.
    const langsung = isi.match(/setCurrentView\("userDetail"/g) || [];
    expect(langsung).toHaveLength(1);
    expect(isi).toContain("const bukaDetailPengguna");
    // Ketiga pemanggil: panel admin, dropdown profil header, layar sambutan.
    expect((isi.match(/bukaDetailPengguna\(/g) || []).length).toBe(3);
  });
});

describe("#161 penjaga panel Manajemen Pengguna", () => {
  it("cabang users memeriksa izin userManagement sebelum merender panel", () => {
    const i = isi.indexOf('currentView === "users" ?');
    expect(i).toBeGreaterThan(0);
    const j = isi.indexOf("<AdminUserPanel", i);
    expect(j).toBeGreaterThan(i);
    const antara = isi.slice(i, j);
    expect(antara).toContain('"userManagement"');
    expect(antara).toContain("appShell.forbidden");
  });
});
