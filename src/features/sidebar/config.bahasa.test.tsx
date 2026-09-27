/**
 * Regresi bahasa menu sidebar — item #132, disesuaikan oleh #134.
 *
 * Sampai #133, `sidebarSections` memuat teks Indonesia langsung dan test ini
 * memeriksanya di sana. Sejak #134 sidebar dwibahasa: config hanya memuat
 * KUNCI, dan teksnya hidup di kamus `id`/`en`.
 *
 * Jaminannya tidak berkurang, hanya pindah tempat, jadi test ini kini menjaga
 * dua hal sekaligus:
 *   1. config tidak boleh kembali menyimpan teks mentah (itu yang membuat
 *      sidebar tidak bisa berganti bahasa),
 *   2. kamus Indonesia tetap memakai padanan yang disepakati di #132,
 *      termasuk perbaikan salah ketik "DB EXplorer".
 */
import { sidebarSections } from "./config";
import { id } from "../../i18n/locales/id";
import { en } from "../../i18n/locales/en";

const semuaKunci = () => sidebarSections.flatMap((s) => [s.title, ...s.items.map((i) => i.label)]);

describe("#132/#134 menu sidebar dwibahasa", () => {
  it("config hanya memuat kunci i18n, bukan teks mentah", () => {
    for (const k of semuaKunci()) {
      expect(k).toMatch(/^sidebar\.[a-zA-Z]+$/);
    }
  });

  it("setiap kunci sidebar punya isi di kedua kamus", () => {
    for (const k of semuaKunci()) {
      const nama = k.split(".")[1] as keyof typeof id.sidebar;
      expect(id.sidebar[nama]).toBeTruthy();
      expect(en.sidebar[nama]).toBeTruthy();
    }
  });

  it("kamus Indonesia memakai padanan yang disepakati di #132", () => {
    expect(id.sidebar.collaboration).toBe("Kolaborasi");
    expect(id.sidebar.administration).toBe("Administrasi");
    expect(id.sidebar.meetingNotes).toBe("Catatan Rapat");
    expect(id.sidebar.flowchartEditor).toBe("Editor Diagram Alur");
    expect(id.sidebar.issueList).toBe("Daftar Isu");
    expect(id.sidebar.kanbanBoard).toBe("Papan Kanban");
    expect(id.sidebar.qualityAssessment).toBe("Penilaian Kualitas");
    expect(id.sidebar.roadmapTimeline).toBe("Peta Jalan & Linimasa");
    expect(id.sidebar.userManagement).toBe("Manajemen Pengguna");
    expect(id.sidebar.enterpriseAudit).toBe("Audit Perusahaan");
    expect(id.sidebar.dbExplorer).toBe("Penjelajah Basis Data");
    expect(id.sidebar.settingIntegration).toBe("Pengaturan Integrasi");
  });

  it("kamus Inggris tidak mengulang salah ketik lama", () => {
    // "DB EXplorer" dan "Kanban board" adalah salah ketik yang diperbaiki #132;
    // memanennya dari git history tidak boleh ikut membawa kesalahannya.
    const nilai = Object.values(en.sidebar);
    expect(nilai).not.toContain("DB EXplorer");
    expect(nilai).not.toContain("Kanban board");
    expect(nilai).not.toContain("User management");
    expect(nilai).not.toContain("Setting integration");
  });

  it("istilah yang memang baku tetap sama di kedua bahasa", () => {
    expect(id.sidebar.dashboard).toBe("Dashboard");
    expect(en.sidebar.dashboard).toBe("Dashboard");
    expect(id.sidebar.masterData).toBe("Master Data");
    expect(en.sidebar.masterData).toBe("Master Data");
  });
});
