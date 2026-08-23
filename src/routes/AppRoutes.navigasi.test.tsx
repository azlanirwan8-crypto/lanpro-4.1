/**
 * Regresi Item #159 — setiap tujuan navigasi harus punya cabang.
 *
 * KENAPA TEST INI ADA DI SAMPING GERBANGNYA.
 *
 * `npm run audit:navigasi` hanya bisa memeriksa `setCurrentView("literal")`.
 * Sidebar tidak menulis literal: ia memanggil `setCurrentView(item.id)`, dan
 * id-nya baru diketahui saat aplikasi berjalan. Justru jalur itulah yang
 * dipakai pengguna setiap hari.
 *
 * Yang dikunci di sini: SETIAP item sidebar yang bisa diklik punya cabang di
 * `AppRoutes.tsx`. Bila suatu saat ada menu baru yang id-nya meleset — persis
 * kesalahan yang membuat "Lihat Roadmap" mengirim `"roadmap"` padahal
 * cabangnya bernama `"timeline"` — test ini merah sebelum ada pengguna yang
 * menemukan layar kosong.
 *
 * Kenapa bukan snapshot: snapshot akan ikut hijau saat DAFTARNYA yang salah.
 * Yang diperiksa di sini hubungan antara dua berkas, bukan isi salah satunya.
 *
 * Ditemukan lewat /qa pada 24 Agu 2026, dari laporan pemilik proyek bahwa
 * beberapa menu "blank".
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");

function baca(...bagian: string[]) {
  return fs.readFileSync(path.join(AKAR, ...bagian), "utf8");
}

/** Cabang `switch` di AppRoutes, ditambah view yang dirender AppContainer sendiri. */
function viewYangDitangani(): Set<string> {
  const rute = baca("src", "routes", "AppRoutes.tsx");
  const kontainer = baca("src", "AppContainer.tsx");
  const dikenal = new Set<string>();
  for (const m of rute.matchAll(/case "([^"]+)":/g)) dikenal.add(m[1]);
  for (const m of kontainer.matchAll(/currentView\s*===\s*"([^"]+)"/g)) dikenal.add(m[1]);
  return dikenal;
}

/**
 * Item sidebar yang BISA DIKLIK.
 *
 * Judul bagian (`menu`, `collaboration`, `projects`, `administration`) juga
 * punya `id`, tetapi tidak pernah memanggil `setCurrentView`. Yang membedakan
 * keduanya adalah kehadiran `module:` — hanya item sungguhan yang punya, dan
 * itu dipakai di sini sebagai penandanya alih-alih daftar pengecualian yang
 * harus dirawat tangan.
 */
function itemSidebarBisaDiklik(): string[] {
  const cfg = baca("src", "features", "sidebar", "config.tsx");
  const ids: string[] = [];
  // Dipotong PER `id:`, lalu tiap potongan diperiksa sampai `id:` berikutnya.
  // Percobaan pertama memakai jendela sepanjang N karakter dan itu SALAH:
  // judul bagian ikut lolos karena `module:` milik item pertama di dalamnya
  // masih tertangkap di jendela yang sama.
  const potongan = cfg.split(/id:\s*"/).slice(1);
  for (const p of potongan) {
    const id = p.slice(0, p.indexOf('"'));
    const sampaiIdBerikutnya = p.split(/id:\s*"/)[0];
    if (/module:\s*"/.test(sampaiIdBerikutnya)) ids.push(id);
  }
  return ids;
}

describe("Item #159 — nol menu yang berujung layar kosong", () => {
  it("setiap item sidebar yang bisa diklik punya cabang di AppRoutes", () => {
    const dikenal = viewYangDitangani();
    const ids = itemSidebarBisaDiklik();

    // Penjaga terhadap test yang menguap: bila regex di atas suatu saat tidak
    // lagi cocok dengan bentuk config, `ids` jadi kosong dan test ini akan
    // hijau tanpa memeriksa apa pun.
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(dikenal.size).toBeGreaterThanOrEqual(10);

    const buntu = ids.filter((id) => !dikenal.has(id));
    expect(buntu).toEqual([]);
  });

  it("switch AppRoutes memang berakhir dengan default yang mengembalikan null", () => {
    // Fakta inilah yang membuat kesalahan id terbaca sebagai "blank" alih-alih
    // sebagai galat. Bila suatu saat `default` diubah jadi layar "tidak
    // ditemukan", test ini merah — dan itu KABAR BAIK: gejalanya berubah, jadi
    // penjelasan di berkas ini dan di gerbangnya harus ikut diperbarui.
    const rute = baca("src", "routes", "AppRoutes.tsx");
    expect(rute).toMatch(/default:\s*\n?\s*return null;/);
  });

  it("tiga id yang dulu meleset kini menunjuk cabang yang benar", () => {
    const dasbor = baca("src", "features", "dashboard", "DashboardView.tsx");
    const widget = baca("src", "features", "dashboard", "components", "SidebarWidgetsStack.tsx");

    expect(dasbor).not.toContain('setCurrentView("kanban")');
    expect(dasbor).not.toContain('setCurrentView("roadmap")');
    expect(widget).not.toContain('setCurrentView("meetings")');

    expect(dasbor).toContain('setCurrentView("board")');
    expect(dasbor).toContain('setCurrentView("timeline")');
    expect(widget).toContain('setCurrentView("meetingNotes")');
  });
});
