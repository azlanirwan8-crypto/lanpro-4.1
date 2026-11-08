import fs from "node:fs";
import path from "node:path";

/**
 * #823 — bobot 500 hanya untuk penanda, bukan seluruh isi tabel.
 *
 * Setelah #821 menaikkan ukuran teks, `font-medium` borongan pada `<tbody>`
 * membuat paragraf dan sel mode baca terasa tebal dan bersaing dengan judul.
 * Penjaga ini memaku hasil penyapuan:
 *
 *  1. tidak ada `<tbody>` yang memasang `font-medium` borongan;
 *  2. jumlah `font-medium` per berkas tabel tidak bertambah melewati angka
 *     yang terukur sesudah #823 — batas ini rem, bukan target;
 *  3. `font-bold` (700) hanya tersisa di berkas yang memang memakainya untuk
 *     judul autentikasi, logo, angka KPI, atau bobot dinamis simpul diagram.
 *
 * Yang diuji adalah sumber, bukan hasil render: lolos berarti tidak ada
 * penambahan bobot borongan, bukan berarti seluruh layar sudah diperiksa.
 */
const AKAR = path.join(__dirname, "..", "..", "src");

function berkasSumber(direktori: string): string[] {
  const hasil: string[] = [];
  for (const entri of fs.readdirSync(direktori, { withFileTypes: true })) {
    const jalur = path.join(direktori, entri.name);
    if (entri.isDirectory()) hasil.push(...berkasSumber(jalur));
    else if (/\.tsx?$/.test(entri.name) && !/\.test\.tsx?$/.test(entri.name)) hasil.push(jalur);
  }
  return hasil;
}

const semua = berkasSumber(AKAR);

function hitung(namaBerkas: string, kelas: string): number {
  const isi = fs.readFileSync(path.join(AKAR, namaBerkas), "utf8");
  return isi.split(kelas).length - 1;
}

/** Batas atas `font-medium` per berkas tabel, diukur 09 Nov 2026 sesudah #827. */
const BATAS_MEDIUM: Record<string, number> = {
  "features/meeting-notes/MeetingNotes.tsx": 21,
  "features/users/UserSessionsPanel.tsx": 22,
  "features/team/TeamManagementPanel.tsx": 27,
  "features/dashboard/DashboardView.tsx": 47,
  "features/wiki/WikiView.tsx": 38,
  "features/users/AdminUserPanel.tsx": 35,
  "features/backup/BackupPanel.tsx": 16,
  "features/activity/ActivityLogPanel.tsx": 15,
  "features/flowchart/components/FlowchartDashboard.tsx": 2,
};

/** Berkas yang masih boleh memakai 700. */
const BERKAS_BOLD = new Set([
  "features/auth/components/LoginSkeletonState.tsx",
  "features/auth/LoginScreen.tsx",
  "features/auth/RegisterScreen.tsx",
  "features/flowchart/components/FlowchartNode.tsx",
  "features/sidebar/styles.ts",
  "features/users/UserDetailView.tsx",
]);

describe("#823 bobot teks isi dan sel tabel", () => {
  test("tidak ada <tbody> yang memasang font-medium borongan", () => {
    const pelanggaran = semua.flatMap((jalur) => {
      const isi = fs.readFileSync(jalur, "utf8");
      return /<tbody[^>]*font-medium/.test(isi) ? [path.relative(AKAR, jalur)] : [];
    });
    expect(pelanggaran).toEqual([]);
  });

  test.each(Object.entries(BATAS_MEDIUM))("%s tidak menambah font-medium", (berkas, batas) => {
    expect(hitung(berkas, "font-medium")).toBeLessThanOrEqual(batas);
  });

  test("font-bold hanya tersisa di berkas yang diizinkan", () => {
    const pemakai = semua
      .filter((jalur) => fs.readFileSync(jalur, "utf8").includes("font-bold"))
      .map((jalur) => path.relative(AKAR, jalur).replace(/\\/g, "/"))
      .sort();
    expect(pemakai).toEqual([...BERKAS_BOLD].sort());
  });

  test("badge dan judul kecil tidak memakai 700", () => {
    expect(hitung("components/navigation/MobileBottomNav.tsx", "font-bold")).toBe(0);
    expect(hitung("features/dashboard/DashboardView.tsx", "font-bold")).toBe(0);
    expect(hitung("features/issues/components/list/IssueMobileCardView.tsx", "font-bold")).toBe(0);
    expect(hitung("features/flowchart/components/ImportDiagramModal.tsx", "font-bold")).toBe(0);
    expect(hitung("AppContainer.tsx", "font-bold")).toBe(0);
  });
});
