/**
 * Menguji bahwa SETIAP modul yang dimuat malas benar-benar bisa dimuat, dan
 * benar-benar mengekspor nama yang dirujuk `AppRoutes.tsx`.
 *
 * KENAPA TEST INI ADA. `React.lazy` menerima janji yang baru dijalankan saat
 * komponennya pertama kali dirender. Salah menulis nama export tidak akan
 * membuat `tsc` maupun `npm run build` gagal — kegagalannya baru muncul ketika
 * pengguna membuka tampilan itu, sebagai layar kosong. Untuk tujuh belas
 * tampilan, memeriksanya satu per satu di peramban tidak berkelanjutan.
 *
 * Test ini memuat modulnya sungguhan dan memeriksa nilai ekspornya berupa
 * komponen. Ia tidak me-render — perendaran butuh puluhan prop dan konteks —
 * tetapi ia menutup persis kegagalan yang paling mungkin terjadi: nama yang
 * meleset dan jalur import yang salah.
 */

/** Pasangan (nama export, pemuat) HARUS cerminan dari AppRoutes.tsx. */
const modulMalas: [string, () => Promise<any>][] = [
  ["DashboardView", () => import("../features/dashboard")],
  ["IssueListView", () => import("../features/issues")],
  ["PlanningView", () => import("../features/planning")],
  ["BoardView", () => import("../features/kanban/index")],
  ["TestQAPanel", () => import("../features/qa/TestQAPanel")],
  ["WikiView", () => import("../features/wiki")],
  ["MeetingNotes", () => import("../features/meeting-notes/MeetingNotes")],
  ["NotebookLM", () => import("../features/notebook-lm")],
  ["FlowchartView", () => import("../features/flowchart")],
  ["MasterDataPanel", () => import("../features/master/MasterDataPanel")],
  ["ConnectPanel", () => import("../features/connect/ConnectPanel")],
  [
    "EnterpriseAuditDashboard",
    () => import("../features/enterprise-audit/EnterpriseAuditDashboard"),
  ],
  ["ActivityLogPanel", () => import("../features/activity/ActivityLogPanel")],
  ["TimelinePanel", () => import("../features/timeline/index")],
  ["TeamManagementPanel", () => import("../features/team/TeamManagementPanel")],
  ["DbExplorerPanel", () => import("../features/explorer/DbExplorerPanel")],
  ["SettingsPage", () => import("../features/settings/SettingsPage")],
];

describe("AppRoutes — modul yang dimuat malas", () => {
  it("mendaftarkan tujuh belas tampilan", () => {
    expect(modulMalas).toHaveLength(17);
  });

  it.each(modulMalas)("%s dapat dimuat dan mengekspor komponen", async (nama, muat) => {
    const modul = await muat();

    expect(modul).toBeDefined();
    expect(modul[nama]).toBeDefined();

    // React menerima fungsi maupun objek (memo, forwardRef) sebagai komponen.
    const jenis = typeof modul[nama];
    expect(jenis === "function" || jenis === "object").toBe(true);
  });
});
