/**
 * Regresi bahasa menu sidebar — item #132.
 * Ditemukan oleh /qa pada 22 Agustus 2026.
 *
 * Sidebar tampil di SETIAP halaman, jadi label Inggris di sini adalah teks
 * paling sering dilihat pengguna. Sebelumnya seluruh menu masih Inggris,
 * dengan kapitalisasi tidak konsisten ("Kanban board", "User management",
 * "Setting integration") dan satu salah ketik: "DB EXplorer".
 *
 * Empat istilah SENGAJA dipertahankan karena sudah baku di lingkungan kerja
 * Indonesia: Dashboard, Sprint, Kanban, Master Data. "Dashboard" juga dipakai
 * dua test AppContainer sebagai penanda layar sudah termuat.
 */
import { sidebarSections } from "./config";

const semuaLabel = () => sidebarSections.flatMap((s) => [s.title, ...s.items.map((i) => i.label)]);

describe("#132 menu sidebar berbahasa Indonesia", () => {
  it("tidak menyisakan label Inggris yang sudah diterjemahkan", () => {
    const terlarang = [
      "Collaboration",
      "Administration",
      "Meeting Notes",
      "Documentation",
      "Flowchart Editor",
      "Issue List",
      "Planning & Sprint",
      "Kanban board",
      "Quality Assessment",
      "Roadmap & Timeline",
      "Team",
      "User management",
      "Enterprise Audit",
      "DB EXplorer",
      "Setting integration",
    ];
    const label = semuaLabel();
    for (const t of terlarang) {
      expect(label).not.toContain(t);
    }
  });

  it("memakai padanan Indonesia yang disepakati", () => {
    const label = semuaLabel();
    for (const w of [
      "Kolaborasi",
      "Administrasi",
      "Catatan Rapat",
      "Dokumentasi",
      "Editor Diagram Alur",
      "Daftar Isu",
      "Perencanaan & Sprint",
      "Papan Kanban",
      "Penilaian Kualitas",
      "Peta Jalan & Linimasa",
      "Tim",
      "Manajemen Pengguna",
      "Audit Perusahaan",
      "Penjelajah Basis Data",
      "Pengaturan Integrasi",
    ]) {
      expect(label).toContain(w);
    }
  });

  it("mempertahankan istilah yang memang sudah baku", () => {
    const label = semuaLabel();
    // Mengubah "Dashboard" akan memerahkan dua test AppContainer yang
    // memakainya sebagai penanda layar sudah termuat.
    expect(label).toContain("Dashboard");
    expect(label).toContain("Master Data");
  });

  it("tidak ada label yang tersisa berupa kalimat Inggris", () => {
    // Jaring pengaman: pola kata Inggris yang lazim muncul di label menu.
    const polaInggris = /\b(list|board|management|settings?|audit log|overview|report)\b/i;
    const tersangka = semuaLabel().filter((l) => polaInggris.test(l));
    expect(tersangka).toEqual([]);
  });
});
