/**
 * Kamus bahasa Indonesia. Bahasa BAWAAN aplikasi (item #134).
 *
 * Nilai di sini diambil dari teks yang sudah dipakai di layar setelah item
 * #132 dan #133, jadi ia bukan terjemahan baru melainkan pemindahan teks yang
 * memang sedang tampil. Padanan Inggrisnya ada di `en.ts`.
 *
 * Aturan kunci: `<area>.<nama>`, huruf kecil-camel. Satu kunci satu tempat —
 * jangan memakai ulang kunci lintas area walau teksnya kebetulan sama, karena
 * padanan Inggrisnya bisa berbeda menurut konteks.
 */
export const id = {
  sidebar: {
    menu: "Menu",
    dashboard: "Dashboard",
    collaboration: "Kolaborasi",
    meetingNotes: "Catatan Rapat",
    documentation: "Dokumentasi",
    flowchartEditor: "Editor Diagram Alur",
    projectManagement: "Manajemen Proyek",
    issueList: "Daftar Isu",
    planningSprint: "Perencanaan & Sprint",
    kanbanBoard: "Papan Kanban",
    qualityAssessment: "Penilaian Kualitas",
    roadmapTimeline: "Peta Jalan & Linimasa",
    team: "Tim",
    administration: "Administrasi",
    masterData: "Master Data",
    userManagement: "Manajemen Pengguna",
    enterpriseAudit: "Audit Perusahaan",
    dbExplorer: "Penjelajah Basis Data",
    settingIntegration: "Pengaturan Integrasi",
    badgeNew: "Baru",
    activeProjects: "Proyek Aktif",
    new: "Baru",
    collapse: "Ciutkan Bilah Sisi",
  },
  dashboard: {
    greetingMorning: "Selamat Pagi",
    greetingAfternoon: "Selamat Siang",
    greetingEvening: "Selamat Sore",
    greetingNight: "Selamat Malam",
    subtitle: "Ringkasan performa tim, progres sprint, dan alokasi tugas real-time.",
    taskSummary: "Ringkasan Tugas",
    epicExcluded: "Epic tidak dihitung",
    totalTasks: "Total Tugas",
    runningTasks: "Tugas Berjalan",
    doneTasks: "Tugas Selesai",
    blockedTasks: "Tugas Tersumbat",
    percentDone: "{{percent}}% Selesai",
    percentRate: "{{percent}}% Tuntas",
    notDoneYet: "{{count}} belum selesai",
    blockedOverdue: "{{blocked}} Tersumbat • {{overdue}} Terlambat",
    viewAllTasks: "Lihat semua tugas",
    viewActiveBoard: "Lihat papan aktif",
    viewDoneList: "Lihat daftar selesai",
    handleBlockers: "Tangani hambatan",
    allSprints: "Semua Sprint ({{count}} Tugas)",
    activeSprintChip: "Aktif: {{name}} ({{days}} hari tersisa)",
    filter: "Saring",
    rangeAll: "SEMUA",
  },
  widgets: {
    stoppersBlocked: "Tersumbat / Terhambat",
    needsAttention: "Perlu Perhatian",
    dueSoon: "Segera Jatuh Tempo (3 Hari)",
    recentMeetings: "Rapat Terbaru",
    documentation: "Dokumentasi",
    liveActivity: "Aktivitas Langsung (24 Jam)",
    noBlockedTasks: "Tidak ada tugas tersumbat.",
    noOverdueTasks: "Aman! Tidak ada tugas terlambat.",
    noUrgentDeadlines: "Tidak ada tenggat mendesak dalam 3 hari ke depan.",
    noMeetingNotes: "Belum ada catatan rapat.",
    noDocuments: "Belum ada dokumen diunggah.",
    viewFullAuditLog: "Lihat Log Audit Lengkap",
    hoursLeft: "{{hours}} jam lagi",
    dueSoonShort: "segera jatuh tempo",
  },
  language: {
    switchTo: "Ganti ke Bahasa Inggris",
    indonesian: "Bahasa Indonesia",
    english: "Bahasa Inggris",
  },
} as const;
