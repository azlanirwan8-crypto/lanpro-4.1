/**
 * Memastikan sebuah komponen benar-benar tak dirujuk dari mana pun.
 *
 * Berbeda dari kode-mati.cjs yang hanya melihat src/, di sini korpusnya
 * SELURUH repo di luar node_modules dan dist: skrip, konfigurasi, test, dan
 * dokumentasi ikut dibaca. Nama komponen DAN nama berkasnya sama-sama dicari,
 * supaya impor dinamis berbasis jalur juga tertangkap.
 */
const fs = require("fs");
const path = require("path");

const kandidat = [
  "src/components/HeaderNetworkStatus.tsx",
  "src/components/ui/IssueTypeDropdown.tsx",
  "src/components/ui/SimpleModal.tsx",
  "src/components/ui/StatusSelect.tsx",
  "src/features/dashboard/components/DashboardCharts.tsx",
  "src/features/dashboard/components/KpiMetricsRow.tsx",
  "src/features/dashboard/components/MetricCard.tsx",
  "src/features/dashboard/components/SdlcBoard.tsx",
  "src/features/dashboard/components/SprintBanner.tsx",
  "src/features/dashboard/components/SprintPhaseAnalysis.tsx",
  "src/features/dashboard/components/TeamLeadMonitorCenter.tsx",
  "src/features/dashboard/components/TodayTaskSummary.tsx",
  "src/features/kanban/components/KanbanAlertBanner.tsx",
  "src/features/timeline/TimelineView.tsx",
  "src/features/wiki/components/WikiEmptyState.tsx",
  "src/test/mocks/reactMarkdown.tsx",
];

const berkas = [];
(function telusuri(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/^(node_modules|dist|\.git|uploads)$/.test(f.name)) telusuri(p);
    } else if (/\.(tsx?|jsx?|cjs|mjs|json|md)$/.test(p)) {
      berkas.push(p);
    }
  }
})(".");

for (const k of kandidat) {
  const nama = path.basename(k, ".tsx");
  const jejak = [];
  for (const p of berkas) {
    if (path.resolve(p) === path.resolve(k)) continue;
    const s = fs.readFileSync(p, "utf8");
    if (s.includes(nama)) jejak.push(p);
  }
  const label = jejak.length ? "DIPAKAI" : "MATI   ";
  console.log(label + "  " + nama + (jejak.length ? "  <- " + jejak.slice(0, 2).join(", ") : ""));
}
