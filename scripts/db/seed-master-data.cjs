#!/usr/bin/env node
/**
 * Penyemai Master Data menyeluruh — item #84, diperbaiki lanjut item #85.
 *
 * KENAPA ADA. Review 16 Agu 2026 menemukan Master Data bolong dan tidak
 * konsisten: satu baris sampah berlabel `"n"` di `priority`, lima baris
 * ber-`order=0` tanpa metadata, `category` memuat DUA konsep sekaligus, dan
 * `environment` tidak punya SIT padahal QA memakainya.
 *
 * Yang lebih berat: **tidak ada konvensi apa yang disimpan**. `Users.department`
 * berisi campuran `dept-1` (id) dan `Technology & IT` (label), `Users.position`
 * berisi tiga format berbeda, `Projects.category` berisi `Agile` yang tidak ada
 * di master mana pun. Penyakit yang sama dengan peran — dan obatnya sama:
 * seluruh tipe memakai kolom `code`.
 *
 * ACUAN. Nilai diambil dari konvensi yang lazim dipakai Jira, GitLab, dan Azure
 * DevOps: lima tingkat prioritas, alur status yang menutup jalur terhenti
 * (Blocked) dan dibatalkan (Cancelled), serta jenis isu Epic/Story/Task/
 * Sub-task/Bug. Tipe yang khas proyek ini — `fitur`, `modul_aplikasi`,
 * `release`, `system`, `surrounding` — tidak diseragamkan ke benchmark mana pun
 * karena memang milik domain LanPro.
 *
 * ATURAN YANG DIPEGANG:
 *
 *   1. Label yang SEDANG DIPAKAI data hidup TIDAK diubah. Mengubah `To Do`
 *      menjadi `Todo` akan membuat 27 task kehilangan statusnya.
 *   2. Hanya baris yang terdaftar di `DIHAPUS` yang dihapus. Tidak ada
 *      penghapusan menyeluruh.
 *   3. Idempoten — dijalankan berkali-kali hasilnya sama.
 *
 * Katalog peran TIDAK disentuh di sini; ia punya penyemainya sendiri
 * (`npm run db:seed-roles`).
 *
 * Jalankan: npm run db:seed-master
 */

const { kodeDariLabel } = require("../../server/lib/kode-master.cjs");

const warna = {
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

/**
 * Baris yang dihapus, beserta alasannya. Hanya id yang tercantum di sini yang
 * dihapus — tidak ada penghapusan berdasarkan pola.
 */
const DIHAPUS = [
  // Baris sampah berlabel "n" — tidak punya arti apa pun. Id-nya UUID, bukan
  // pola `md-*`, karena dibuat lewat antarmuka.
  { id: "2b61b9fb-9d49-414b-aa8c-e966817b14d5", alasan: 'baris sampah berlabel "n"' },
  // Digantikan `Highest` agar tangga prioritas utuh (Highest..Lowest).
  // Aman dihapus: tidak ada satu pun Task yang memakainya.
  { id: "md-priority-urgent", alasan: "digantikan Highest" },
  // Item #85 — entry yang menduplikasi `issue_type`. `category` kini murni area
  // teknis; jenis pekerjaan (Bug/Enhancement/dll) sudah tersedia di `issue_type`.
  // Sebelum dihapus, Tasks.category yang menyimpan nilai ini disiapkan di
  // blok migrasi di bawah (lihat MIGRASI_CATEGORY).
  { id: "md-category-bug", alasan: "duplikat issue_type — pindah ke issue_type" },
  { id: "md-category-enhancement", alasan: "duplikat issue_type — pindah ke issue_type" },
  { id: "md-category-new_feature", alasan: "duplikat issue_type — pindah ke issue_type" },
  { id: "md-category-maintenance", alasan: "duplikat issue_type — tidak ada padanan, dikosongkan" },
];

/**
 * priority — lima tingkat, konvensi Jira.
 * `High`, `Medium`, `Low` DIPERTAHANKAN labelnya karena dipakai data hidup.
 * `Urgent` dinaikkan menjadi `Highest` agar tangganya utuh.
 */
const PRIORITY = [
  { slug: "highest", code: "highest", label: "Highest", order: 1, color: "#B91C1C", icon: "ChevronsUp", description: "Menghentikan pekerjaan lain. Harus ditangani sekarang juga." },
  { slug: "high", code: "high", label: "High", order: 2, color: "#EF4444", icon: "ChevronUp", description: "Berdampak besar, dikerjakan pada sprint berjalan." },
  { slug: "medium", code: "medium", label: "Medium", order: 3, color: "#F59E0B", icon: "Minus", description: "Prioritas normal. Bawaan untuk item baru." },
  { slug: "low", code: "low", label: "Low", order: 4, color: "#10B981", icon: "ChevronDown", description: "Dikerjakan bila ada waktu tersisa." },
  { slug: "lowest", code: "lowest", label: "Lowest", order: 5, color: "#64748B", icon: "ChevronsDown", description: "Tidak mendesak. Boleh ditunda tanpa batas." },
];

/**
 * status — alur kerja. Empat label yang dipakai data hidup dipertahankan
 * persis: To Do, In Progress, In Review, Testing.
 * Ditambah Backlog, Blocked, dan Cancelled yang selama ini tidak ada — padahal
 * pekerjaan yang terhenti dan yang dibatalkan adalah keadaan nyata.
 */
const STATUS = [
  { slug: "backlog", code: "backlog", label: "Backlog", order: 1, color: "#94A3B8", icon: "Inbox", description: "Sudah dicatat, belum dijadwalkan ke sprint mana pun." },
  { slug: "todo", code: "todo", label: "To Do", order: 2, color: "#3B82F6", icon: "Circle", description: "Masuk sprint, belum dikerjakan." },
  { slug: "in-progress", code: "in_progress", label: "In Progress", order: 3, color: "#8B5CF6", icon: "PlayCircle", description: "Sedang dikerjakan." },
  { slug: "in-review", code: "in_review", label: "In Review", order: 4, color: "#06B6D4", icon: "Eye", description: "Menunggu peninjauan kode atau hasil kerja." },
  { slug: "testing", code: "testing", label: "Testing", order: 5, color: "#F59E0B", icon: "FlaskConical", description: "Sedang diuji QA." },
  { slug: "blocked", code: "blocked", label: "Blocked", order: 6, color: "#DC2626", icon: "OctagonX", description: "Terhenti oleh hal di luar kendali pengerjanya." },
  { slug: "done", code: "done", label: "Done", order: 7, color: "#10B981", icon: "CheckCircle2", description: "Selesai dan diterima." },
  { slug: "cancelled", code: "cancelled", label: "Cancelled", order: 8, color: "#64748B", icon: "XCircle", description: "Dibatalkan, tidak akan dikerjakan." },
];

/** issue_type — konvensi Jira. Labelnya sudah benar sejak awal, tinggal kode & metadata. */
const ISSUE_TYPE = [
  { slug: "epic", code: "epic", label: "Epic", order: 1, color: "#8B5CF6", icon: "Layers", description: "Wadah pekerjaan besar yang dipecah menjadi beberapa Story." },
  { slug: "story", code: "story", label: "Story", order: 2, color: "#10B981", icon: "BookOpen", description: "Kebutuhan dari sudut pandang pengguna." },
  { slug: "task", code: "task", label: "Task", order: 3, color: "#3B82F6", icon: "SquareCheck", description: "Pekerjaan teknis yang berdiri sendiri." },
  { slug: "subtask", code: "subtask", label: "Sub-task", order: 4, color: "#06B6D4", icon: "GitBranch", description: "Pecahan dari Story atau Task." },
  { slug: "bug", code: "bug", label: "Bug", order: 5, color: "#EF4444", icon: "Bug", description: "Cacat pada fungsi yang sudah berjalan." },
];

/**
 * environment — SIT ditambahkan karena `QATestCases.tipeTesting` sudah memakainya
 * sementara master tidak pernah punya.
 */
const ENVIRONMENT = [
  { slug: "dev", code: "dev", label: "Development (DEV)", order: 1, color: "#3B82F6", icon: "Code2", description: "Lingkungan pengembang. Data boleh dibuang kapan saja." },
  { slug: "sit", code: "sit", label: "System Integration (SIT)", order: 2, color: "#8B5CF6", icon: "Blocks", description: "Pengujian keterhubungan antar sistem." },
  { slug: "stg", code: "stg", label: "Staging (STG)", order: 3, color: "#F59E0B", icon: "Server", description: "Cermin production untuk uji akhir sebelum rilis." },
  { slug: "uat", code: "uat", label: "UAT", order: 4, color: "#06B6D4", icon: "UserCheck", description: "Pengujian penerimaan oleh pengguna bisnis." },
  { slug: "prod", code: "prod", label: "Production (PROD)", order: 5, color: "#DC2626", icon: "Globe", description: "Lingkungan yang dipakai pengguna sungguhan." },
];

/** department — label yang ada dipertahankan; metadata yang bolong diisi. */
const DEPARTMENT = [
  { slug: "it-technology", code: "it", label: "IT & Technology", order: 1, color: "#3B82F6", icon: "Cpu", description: "Rekayasa perangkat lunak dan infrastruktur." },
  { slug: "quality-assurance", code: "qa", label: "Quality Assurance", order: 2, color: "#F59E0B", icon: "ShieldCheck", description: "Jaminan kualitas dan pengujian." },
  { slug: "business-operations", code: "bizops", label: "Business Operations", order: 3, color: "#10B981", icon: "Briefcase", description: "Operasional bisnis dan analisis proses." },
  { slug: "product-management", code: "product", label: "Product Management", order: 4, color: "#EC4899", icon: "Lightbulb", description: "Perencanaan produk dan prioritas kebutuhan." },
  { slug: "entrepreneur-channel", code: "ecd", label: "Entrepreneur Channel Development", order: 5, color: "#8B5CF6", icon: "Store", description: "Pengembangan kanal kemitraan dan merchant." },
];

/** jenis_dokumen — lima yang ada dipertahankan, ditambah tiga yang lazim dipakai. */
const JENIS_DOKUMEN = [
  { slug: "brd", code: "brd", label: "Business Requirements Document (BRD)", order: 1, color: "#8B5CF6", icon: "FileText", description: "Kebutuhan bisnis tingkat tinggi." },
  { slug: "fsd", code: "fsd", label: "Functional Spec (FSD)", order: 2, color: "#3B82F6", icon: "FileCode", description: "Rincian perilaku fungsional sistem." },
  { slug: "tsd", code: "tsd", label: "Technical Spec (TSD)", order: 3, color: "#06B6D4", icon: "Cpu", description: "Rancangan teknis dan keputusan arsitektur." },
  { slug: "test-plan", code: "test_plan", label: "Test Plan", order: 4, color: "#F59E0B", icon: "ClipboardCheck", description: "Rencana pengujian: cakupan, skenario, dan kriteria lulus." },
  { slug: "uat-signoff", code: "uat_signoff", label: "UAT Sign-off Report", order: 5, color: "#10B981", icon: "FileCheck", description: "Bukti penerimaan pengguna atas hasil pengujian." },
  { slug: "arch-diagram", code: "arch_diagram", label: "Architecture Diagram", order: 6, color: "#EC4899", icon: "Network", description: "Gambaran komponen sistem dan hubungannya." },
  { slug: "flowchart", code: "flowchart", label: "Flowchart", order: 7, color: "#6366F1", icon: "Workflow", description: "Diagram alur proses. Sudah dipakai Documents, tetapi belum pernah ada di master." },
  { slug: "meeting-minutes", code: "meeting_minutes", label: "Meeting Minutes", order: 8, color: "#64748B", icon: "NotebookPen", description: "Notulen rapat beserta keputusan dan tindak lanjutnya." },
];

/**
 * project_status — TIPE BARU.
 * `Projects.status` sudah berisi `Active` sejak lama, tetapi tidak pernah ada
 * master untuknya. Labelnya dipertahankan persis.
 */
const PROJECT_STATUS = [
  { slug: "planning", code: "planning", label: "Planning", order: 1, color: "#8B5CF6", icon: "Compass", description: "Masih disusun; pengerjaan belum dimulai." },
  { slug: "active", code: "active", label: "Active", order: 2, color: "#10B981", icon: "PlayCircle", description: "Sedang berjalan." },
  { slug: "on-hold", code: "on_hold", label: "On Hold", order: 3, color: "#F59E0B", icon: "PauseCircle", description: "Ditahan sementara atas keputusan pemangku kepentingan." },
  { slug: "completed", code: "completed", label: "Completed", order: 4, color: "#3B82F6", icon: "CheckCircle2", description: "Selesai dan diserahterimakan." },
  { slug: "cancelled", code: "cancelled", label: "Cancelled", order: 5, color: "#64748B", icon: "XCircle", description: "Dihentikan permanen." },
];

/**
 * methodology — TIPE BARU.
 * `Projects.category` berisi `Agile`, yang selama ini tidak ada di master mana
 * pun. `category` sendiri memuat dua konsep tercampur, jadi metodologi diberi
 * tipenya sendiri alih-alih menumpang di sana.
 */
const METHODOLOGY = [
  { slug: "agile", code: "agile", label: "Agile", order: 1, color: "#10B981", icon: "Repeat", description: "Iteratif dan bertahap, menyesuaikan perubahan sepanjang jalan." },
  { slug: "scrum", code: "scrum", label: "Scrum", order: 2, color: "#3B82F6", icon: "Users", description: "Agile dengan sprint, peran, dan upacara yang baku." },
  { slug: "kanban", code: "kanban", label: "Kanban", order: 3, color: "#8B5CF6", icon: "Columns3", description: "Aliran berkelanjutan dengan batas pekerjaan berjalan." },
  { slug: "waterfall", code: "waterfall", label: "Waterfall", order: 4, color: "#64748B", icon: "ArrowDownToLine", description: "Berurutan; satu tahap selesai sebelum tahap berikutnya." },
  { slug: "hybrid", code: "hybrid", label: "Hybrid", order: 5, color: "#F59E0B", icon: "Shuffle", description: "Gabungan; perencanaan berurutan, pengerjaan iteratif." },
];

/**
 * sprint_status — TIPE BARU (item #140).
 *
 * PERHATIAN pada huruf besar-kecil. `Sprints.status` menyimpan `planned`,
 * `active`, dan `completed` HURUF KECIL. Labelnya ditulis persis seperti itu,
 * bukan dikapitalisasi, karena aturan 1 di atas: label yang sedang dipakai
 * data hidup tidak diubah. Mengubahnya menjadi `Planned` akan membuat setiap
 * sprint kehilangan statusnya.
 */
const SPRINT_STATUS = [
  { slug: "sprint-planned", code: "planned", label: "planned", order: 1, color: "#8B5CF6", icon: "CalendarClock", description: "Sudah dijadwalkan, belum dimulai." },
  { slug: "sprint-active", code: "active", label: "active", order: 2, color: "#10B981", icon: "PlayCircle", description: "Sedang berjalan." },
  { slug: "sprint-completed", code: "completed", label: "completed", order: 3, color: "#3B82F6", icon: "CheckCircle2", description: "Sudah ditutup." },
];

/**
 * qa_phase — TIPE BARU (item #140).
 *
 * SIT/UAT/PTR ditulis keras di DUA tempat (AddSuiteModal dan QASuiteSidebar),
 * jadi menambah fase baru selama ini menuntut penyuntingan keduanya sekaligus.
 * `QATestSuites.phase` dan `QATestCases.tipeTesting` sama-sama menyimpan `SIT`.
 */
const QA_PHASE = [
  { slug: "qa-sit", code: "sit", label: "SIT", order: 1, color: "#3B82F6", icon: "Cpu", description: "System Integration Test — antar modul dan antar sistem." },
  { slug: "qa-uat", code: "uat", label: "UAT", order: 2, color: "#10B981", icon: "CheckCircle2", description: "User Acceptance Test — penerimaan oleh pengguna." },
  { slug: "qa-ptr", code: "ptr", label: "PTR", order: 3, color: "#F59E0B", icon: "ShieldCheck", description: "Production Readiness Test — kesiapan rilis." },
];

/**
 * qa_status — TIPE BARU (item #140).
 * `QATestCases.status` menyimpan `Pending`; labelnya dipertahankan persis.
 */
const QA_STATUS = [
  { slug: "qa-pending", code: "pending", label: "Pending", order: 1, color: "#94A3B8", icon: "Clock", description: "Belum dijalankan." },
  { slug: "qa-passed", code: "passed", label: "Passed", order: 2, color: "#10B981", icon: "CheckCircle2", description: "Hasil sesuai yang diharapkan." },
  { slug: "qa-failed", code: "failed", label: "Failed", order: 3, color: "#EF4444", icon: "XCircle", description: "Hasil tidak sesuai; perlu perbaikan." },
  { slug: "qa-blocked", code: "blocked", label: "Blocked", order: 4, color: "#F59E0B", icon: "AlertOctagon", description: "Tidak dapat dijalankan karena ada penghalang." },
  { slug: "qa-retest", code: "retest", label: "Retest", order: 5, color: "#6366F1", icon: "RotateCcw", description: "Menunggu pengujian ulang setelah perbaikan." },
];

/**
 * project_risk — TIPE BARU (item #140).
 * `Tasks.projectRisk` menyimpan `Low`; labelnya dipertahankan persis.
 */
const PROJECT_RISK = [
  { slug: "risk-low", code: "low", label: "Low", order: 1, color: "#10B981", icon: "ShieldCheck", description: "Dampak kecil bila meleset." },
  { slug: "risk-medium", code: "medium", label: "Medium", order: 2, color: "#F59E0B", icon: "ShieldAlert", description: "Perlu diawasi; dampak menengah." },
  { slug: "risk-high", code: "high", label: "High", order: 3, color: "#EF4444", icon: "ShieldX", description: "Dampak besar; perlu rencana mitigasi." },
];

/**
 * resolution — TIPE BARU (item #139).
 *
 * `IssueTableRow` sudah menyaring MasterData bertipe `resolution`, tetapi
 * tabelnya tidak punya satu pun baris bertipe itu — dropdown tampil kosong.
 *
 * CATATAN PENTING: mengisi master ini TIDAK membuat nilainya bisa disimpan.
 * Tabel `Tasks` belum punya kolom `resolution`, dan rute update tugas hanya
 * mengizinkan 15 field yang tidak memuatnya. Lihat item #139.
 */
const RESOLUTION = [
  { slug: "res-done", code: "done", label: "Done", order: 1, color: "#10B981", icon: "CheckCircle2", description: "Dikerjakan dan selesai." },
  { slug: "res-wontdo", code: "wont_do", label: "Won't Do", order: 2, color: "#64748B", icon: "MinusCircle", description: "Diputuskan tidak dikerjakan." },
  { slug: "res-duplicate", code: "duplicate", label: "Duplicate", order: 3, color: "#8B5CF6", icon: "Copy", description: "Sudah tercakup isu lain." },
  { slug: "res-cannot-reproduce", code: "cannot_reproduce", label: "Cannot Reproduce", order: 4, color: "#F59E0B", icon: "SearchX", description: "Gejalanya tidak dapat dimunculkan kembali." },
  { slug: "res-incomplete", code: "incomplete", label: "Incomplete", order: 5, color: "#94A3B8", icon: "FileQuestion", description: "Keterangan tidak cukup untuk ditindaklanjuti." },
];

/**
 * category — area teknis murni (item #85).
 *
 * Entri yang menduplikasi `issue_type` (Bug/Enhancement/New Feature/
 * Maintenance) telah dipindahkan ke DIHAPUS. Nilai `Tasks.category` yang
 * masih menyimpan kode-kode itu akan dinolkan lewat blok MIGRASI_CATEGORY
 * di bawah agar tidak meninggalkan data yatim.
 *
 * Catatan: label yang SUDAH DIPAKAI DATA HIDUP (Backend/Frontend/DevOps)
 * tidak diubah agar tidak merusak tampilan yang sudah ada.
 */
const CATEGORY = [
  { slug: "backend",        code: "backend",        label: "Backend",         order: 1, color: "#3B82F6", icon: "Server",        description: "Pengerjaan di sisi server, API, dan lapisan data." },
  { slug: "frontend",       code: "frontend",       label: "Frontend",        order: 2, color: "#EC4899", icon: "Monitor",       description: "Pengerjaan di sisi antarmuka pengguna." },
  { slug: "devops",         code: "devops",         label: "DevOps",          order: 3, color: "#8B5CF6", icon: "Workflow",      description: "Infrastruktur, CI/CD, dan otomasi operasional." },
  { slug: "security",       code: "security",       label: "Security",        order: 4, color: "#DC2626", icon: "ShieldCheck",   description: "Keamanan sistem, enkripsi, dan kontrol akses." },
  { slug: "infrastructure", code: "infrastructure", label: "Infrastructure",   order: 5, color: "#0EA5E9", icon: "HardDrive",    description: "Server, jaringan, dan layanan cloud." },
  { slug: "database",       code: "database",       label: "Database",        order: 6, color: "#F59E0B", icon: "Database",      description: "Skema, kueri, migrasi, dan optimasi basis data." },
];

/** Tipe khas domain LanPro — labelnya tidak diubah, hanya dilengkapi kode. */
const KODE_SAJA = {
  fitur: {
    "Authentication & Auth": "auth",
    "User Management": "user_mgmt",
    "Task Management": "task_mgmt",
    "Master Data Settings": "master_data",
    "Reporting & Analytics": "reporting",
  },
  system: {
    "Core Backend API": "core_api",
    "Database Storage": "db_storage",
    "Payment Gateway Integration": "payment_gw",
    "Notification Gateway": "notif_gw",
  },
  release: {
    "v1.0.0-MVP": "v1_0_0",
    "v1.1.0-Sprint1": "v1_1_0",
    "v1.2.0-Sprint2": "v1_2_0",
    "v2.0.0-Major": "v2_0_0",
  },
  surrounding: {
    "Internal Network": "internal_net",
    "External Partner": "external_partner",
    "Analytics Provider": "analytics",
    "Messaging Broker": "messaging",
    "External Payment Merchant": "payment_merchant",
    "Third-Party Auth Provider": "thirdparty_auth",
  },
  jabatan: {
    "VP of Engineering": "vp_eng",
    "Engineering Manager": "eng_manager",
    "Tech Lead": "tech_lead",
    "Senior Developer": "senior_dev",
    "Junior Developer": "junior_dev",
    "Software Engineer": "software_eng",
    "Frontend Engineer": "frontend_eng",
    "Backend Engineer": "backend_eng",
    "System Analyst": "system_analyst",
    "Business Analyst": "business_analyst",
    "QA Engineer": "qa_engineer",
    "UI/UX Designer": "uiux_designer",
    "Product Owner": "product_owner",
    "Project Manager": "project_manager",
    "Department Head": "department_head",
  },
};

(async () => {
  require("dotenv").config();
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error(warna.merah("DATABASE_URL tidak ditemukan."));
    process.exit(2);
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let ditambah = 0;
  let diperbarui = 0;
  let dihapus = 0;

  const semai = async (baris, type) => {
    console.log("");
    console.log(warna.tebal(`  ${type}`));
    for (const r of baris) {
      const id = `md-${type}-${r.slug}`;
      const { rows } = await client.query(
        `INSERT INTO "MasterData" (id, type, code, label, "order", color, icon, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET
           code = EXCLUDED.code, label = EXCLUDED.label, "order" = EXCLUDED."order",
           color = EXCLUDED.color, icon = EXCLUDED.icon, description = EXCLUDED.description
         RETURNING (xmax = 0) AS baru`,
        [id, type, r.code, r.label, r.order, r.color, r.icon, r.description]
      );
      if (rows[0].baru) {
        ditambah++;
        console.log(`    ${warna.hijau("TAMBAH ")} ${r.label}`);
      } else {
        diperbarui++;
        console.log(warna.redup(`    perbarui ${r.label}`));
      }
    }
  };

  /**
   * Item #141 — memastikan sebuah kolom benar-benar ada sebelum dipakai.
   *
   * Tanpa ini, satu blok migrasi yang merujuk kolom tidak ada akan
   * MENGGAGALKAN SELURUH penyemai, termasuk blok-blok sesudahnya yang tidak
   * ada hubungannya. Itulah yang terjadi selama ini.
   */
  const kolomAda = async (tabel, kolom) => {
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [tabel, kolom]
    );
    return rows.length > 0;
  };

  try {
    console.log("");
    console.log(warna.tebal("Menyemai Master Data"));
    console.log(warna.redup("  label yang dipakai data hidup dipertahankan apa adanya"));

    console.log("");
    console.log(warna.tebal("  Pembersihan"));
    for (const d of DIHAPUS) {
      const { rowCount } = await client.query(`DELETE FROM "MasterData" WHERE id = $1`, [d.id]);
      if (rowCount > 0) {
        dihapus++;
        console.log(`    ${warna.merah("HAPUS  ")} ${d.id} ${warna.redup("— " + d.alasan)}`);
      }
    }
    // Item #86 — bersihkan seluruh baris MasterData bertipe modul_aplikasi
    // Sumber kebenaran resmi untuk modul/aplikasi adalah tabel ProjectModules.
    const { rowCount: modulHapus } = await client.query(
      `DELETE FROM "MasterData" WHERE type = 'modul_aplikasi'`
    );
    if (modulHapus > 0) {
      dihapus += modulHapus;
      console.log(
        `    ${warna.merah("HAPUS  ")} ${modulHapus} baris type='modul_aplikasi' ${warna.redup("— sumber kebenaran: ProjectModules (#86)")}`
      );
    }
    if (dihapus === 0) console.log(warna.redup("    (tidak ada yang perlu dihapus)"));

    await semai(PRIORITY, "priority");
    await semai(STATUS, "status");
    await semai(ISSUE_TYPE, "issue_type");
    await semai(ENVIRONMENT, "environment");
    await semai(DEPARTMENT, "department");
    await semai(JENIS_DOKUMEN, "jenis_dokumen");
    await semai(PROJECT_STATUS, "project_status");
    await semai(METHODOLOGY, "methodology");
    await semai(SPRINT_STATUS, "sprint_status");
    await semai(QA_PHASE, "qa_phase");
    await semai(QA_STATUS, "qa_status");
    await semai(PROJECT_RISK, "project_risk");
    await semai(RESOLUTION, "resolution");
    await semai(CATEGORY, "category");

    // ── MIGRASI category #85 ───────────────────────────────────────────────
    // Tasks yang menyimpan kode duplikat (bug/enhancement/new_feature) di
    // kolom category dipindah ke issue_type bila cocok, atau dikosongkan
    // (maintenance) karena tidak ada padanan di issue_type.
    //
    // Dilakukan SEBELUM penghapusan baris MasterData agar tidak terjadi
    // window di mana data tasks merujuk ke baris yang sudah dihapus.
    console.log("");
    console.log(warna.tebal("  Migrasi Tasks.category (item #85)"));

    // Item #141 — blok ini merujuk kolom "Tasks"."issue_type" yang TIDAK PERNAH
    // ADA di skema; tabel Tasks menyimpan jenis pekerjaan di kolom "type".
    // Akibatnya penyemai selalu gagal di sini, dan dua blok sesudahnya
    // ("Melengkapi kode" dan "Dedup & migrasi rujukan") tidak pernah berjalan
    // sekali pun sejak #85 ditulis.
    //
    // Yang dilakukan di sini hanya MELEWATI blok bila kolomnya tidak ada,
    // bukan menebak maksud aslinya. Menulis ulang `issue_type` menjadi `type`
    // akan MENGUBAH data — dan tidak ada yang perlu diubah: seluruh
    // Tasks.category bernilai NULL. Bila suatu saat basis data lama dengan
    // kolom itu dipulihkan, blok ini akan berjalan seperti semula.
    const bisaMigrasiCategory =
      (await kolomAda("Tasks", "category")) && (await kolomAda("Tasks", "issue_type"));

    if (!bisaMigrasiCategory) {
      console.log(
        warna.kuning('    LEWAT   kolom "Tasks"."issue_type" tidak ada — migrasi #85 dilewati')
      );
      console.log(warna.redup("            lihat item #141; ini BUKAN kegagalan penyemaian"));
    } else {

    const PETA_CATEGORY_KE_ISSUETYPE = [
      { dari: "bug",         ke: "bug"   },
      { dari: "enhancement", ke: "story" },  // Enhancement paling dekat Story
      { dari: "new_feature", ke: "story" },  // New Feature paling dekat Story
    ];

    let migrasiCategory = 0;
    for (const p of PETA_CATEGORY_KE_ISSUETYPE) {
      const { rowCount } = await client.query(
        `UPDATE "Tasks"
         SET issue_type = COALESCE(issue_type, $1), category = NULL
         WHERE category = $2 AND issue_type IS NULL`,
        [p.ke, p.dari]
      );
      if (rowCount > 0) {
        migrasiCategory += rowCount;
        console.log(warna.kuning(`    PINDAH  ${rowCount} Tasks: category='${p.dari}' -> issue_type='${p.ke}', category=NULL`));
      }
    }
    // Kosongkan sisanya (maintenance dan semua yang tersisa dari kode lama)
    const kode_dihapus = ["bug", "enhancement", "new_feature", "maintenance"];
    for (const k of kode_dihapus) {
      const { rowCount } = await client.query(
        `UPDATE "Tasks" SET category = NULL WHERE category = $1`,
        [k]
      );
      if (rowCount > 0) {
        migrasiCategory += rowCount;
        console.log(warna.kuning(`    KOSONG  ${rowCount} Tasks: category='${k}' -> NULL (tidak ada padanan)`));
      }
    }
    if (migrasiCategory === 0) console.log(warna.redup("    (tidak ada Tasks yang perlu dimigrasikan)"));
    }

    // Melengkapi kode pada tipe khas domain, tanpa mengubah labelnya
    console.log("");
    console.log(warna.tebal("  Melengkapi kode (label tidak diubah)"));
    for (const [type, peta] of Object.entries(KODE_SAJA)) {
      for (const [label, code] of Object.entries(peta)) {
        const { rowCount } = await client.query(
          `UPDATE "MasterData" SET code = $1 WHERE type = $2 AND label = $3 AND (code IS NULL OR code <> $1)`,
          [code, type, label]
        );
        if (rowCount > 0) {
          diperbarui++;
          console.log(warna.redup(`    ${type}: ${label} -> ${code}`));
        }
      }
    }

    // ── DEDUP ──────────────────────────────────────────────────────────────
    //
    // Baris lama memakai pola id yang beragam — `prio-2`, `stat-1`, `dept-1`,
    // bahkan UUID — sehingga penyemaian membuat baris BARU berdampingan dengan
    // yang lama alih-alih menimpanya. Keduanya berlabel sama.
    //
    // Aturannya: bila satu label punya dua baris dan salah satunya SUDAH
    // ber-kode, yang tanpa kode adalah duplikat dan dibuang. Sebelum dibuang,
    // rujukan data hidup dipindahkan ke KODE baris yang bertahan.
    console.log("");
    console.log(warna.tebal("  Dedup & migrasi rujukan"));

    const { rows: kembar } = await client.query(`
      SELECT lama.id AS id_lama, baru.code AS kode_baru, lama.type, lama.label
      FROM "MasterData" lama
      JOIN "MasterData" baru
        ON baru.type = lama.type AND baru.label = lama.label AND baru.id <> lama.id
      WHERE lama.code IS NULL AND baru.code IS NOT NULL
    `);

    // Kolom data hidup yang merujuk Master Data lewat id ATAU label.
    const RUJUKAN = [
      { tabel: "Users", kolom: "department", type: "department" },
      { tabel: "Users", kolom: "position", type: "jabatan" },
    ];

    let rujukanDipindah = 0;
    for (const k of kembar) {
      for (const r of RUJUKAN) {
        if (r.type !== k.type) continue;
        const { rowCount } = await client.query(
          `UPDATE "${r.tabel}" SET "${r.kolom}" = $1 WHERE "${r.kolom}" = $2`,
          [k.kode_baru, k.id_lama]
        );
        if (rowCount > 0) {
          rujukanDipindah += rowCount;
          console.log(
            `    ${warna.kuning("PINDAH ")} ${r.tabel}.${r.kolom}: ${rowCount} baris ${k.id_lama} -> ${k.kode_baru}`
          );
        }
      }
      const { rowCount } = await client.query(`DELETE FROM "MasterData" WHERE id = $1`, [k.id_lama]);
      if (rowCount > 0) {
        dihapus++;
        console.log(`    ${warna.merah("HAPUS  ")} duplikat ${k.type}: ${k.label} ${warna.redup("(" + k.id_lama + ")")}`);
      }
    }
    if (kembar.length === 0) console.log(warna.redup("    (tidak ada duplikat)"));

    // Rujukan yang menyimpan ID baris yang MASIH ADA — disamakan ke kode.
    // Ini melengkapi dedup di atas, yang hanya menangani id baris terhapus.
    for (const r of RUJUKAN) {
      const { rowCount } = await client.query(
        `UPDATE "${r.tabel}" t SET "${r.kolom}" = m.code
         FROM "MasterData" m
         WHERE m.type = $1 AND m.code IS NOT NULL
           AND t."${r.kolom}" = m.id AND t."${r.kolom}" <> m.code`,
        [r.type]
      );
      if (rowCount > 0) {
        rujukanDipindah += rowCount;
        console.log(`    ${warna.kuning("PINDAH ")} ${r.tabel}.${r.kolom}: ${rowCount} baris dari id ke kode`);
      }
    }

    // Rujukan yang menyimpan LABEL, bukan id — disamakan ke kode.
    for (const r of RUJUKAN) {
      const { rowCount } = await client.query(
        `UPDATE "${r.tabel}" t SET "${r.kolom}" = m.code
         FROM "MasterData" m
         WHERE m.type = $1 AND m.code IS NOT NULL
           AND t."${r.kolom}" = m.label AND t."${r.kolom}" <> m.code`,
        [r.type]
      );
      if (rowCount > 0) {
        rujukanDipindah += rowCount;
        console.log(`    ${warna.kuning("PINDAH ")} ${r.tabel}.${r.kolom}: ${rowCount} baris dari label ke kode`);
      }
    }
    if (rujukanDipindah === 0) console.log(warna.redup("    (tidak ada rujukan yang perlu dipindah)"));

    // Nilai yang TIDAK cocok dengan apa pun di Master Data. Sengaja hanya
    // DILAPORKAN, tidak ditebak — menebak pemetaan persis cara "Technology & IT"
    // dulu tersimpan padahal master menyebutnya "IT & Technology".
    console.log("");
    console.log(warna.tebal("  Nilai yatim (tidak ada padanannya di Master Data)"));
    let yatim = 0;
    for (const r of RUJUKAN) {
      const { rows } = await client.query(
        `SELECT t."${r.kolom}" AS nilai, COUNT(*)::int AS n
         FROM "${r.tabel}" t
         WHERE t."${r.kolom}" IS NOT NULL AND t."${r.kolom}" <> ''
           AND NOT EXISTS (
             SELECT 1 FROM "MasterData" m
             WHERE m.type = $1 AND (m.code = t."${r.kolom}" OR m.id = t."${r.kolom}" OR m.label = t."${r.kolom}")
           )
         GROUP BY t."${r.kolom}"`,
        [r.type]
      );
      for (const x of rows) {
        yatim++;
        console.log(warna.kuning(`    ${r.tabel}.${r.kolom} = "${x.nilai}" (${x.n} baris) — perlu keputusan`));
      }
    }
    if (yatim === 0) console.log(warna.hijau("    (tidak ada)"));

    // ── Kode susulan untuk baris di luar katalog (item #141) ───────────────
    //
    // Blok "Melengkapi kode" di atas hanya mengenal label yang terdaftar di
    // katalog skrip ini. Baris yang DITAMBAHKAN PENGGUNA lewat panel Master
    // Data tidak ada di sana — dan INSERT-nya memang tidak mengisi `code`
    // sama sekali (lihat item #143), jadi baris seperti itu akan terus
    // bermunculan tanpa kode.
    //
    // Di sini kodenya diturunkan dari label sebagai jalan terakhir. Labelnya
    // TIDAK diubah, sesuai aturan 1 — termasuk bila label itu punya spasi di
    // ujung; yang dibersihkan hanya kode turunannya.
    console.log("");
    console.log(warna.tebal("  Kode susulan untuk baris di luar katalog"));

    const { rows: tanpaKode } = await client.query(
      `SELECT id, type, label FROM "MasterData" WHERE code IS NULL OR code = ''`
    );

    let kodeSusulan = 0;
    for (const baris of tanpaKode) {
      const kode = kodeDariLabel(baris.label);
      if (!kode) {
        console.log(warna.kuning(`    LEWAT   ${baris.type}: label "${baris.label}" tidak menghasilkan kode`));
        continue;
      }
      await client.query(`UPDATE "MasterData" SET code = $1 WHERE id = $2`, [kode, baris.id]);
      kodeSusulan++;
      console.log(warna.hijau(`    ISI     ${baris.type}: "${baris.label}" -> code='${kode}'`));
    }
    if (kodeSusulan === 0 && tanpaKode.length === 0) {
      console.log(warna.redup("    (semua baris sudah punya kode)"));
    }

    const { rows: sisa } = await client.query(
      `SELECT type, COUNT(*)::int AS total, COUNT(code)::int AS ber_kode
       FROM "MasterData" GROUP BY type ORDER BY type`
    );

    console.log("");
    console.log("──────────────────────────────────────────────────────────");
    console.log(warna.hijau(`  ${ditambah} ditambahkan · ${diperbarui} diperbarui · ${dihapus} dihapus`));
    console.log("");
    for (const r of sisa) {
      const tanda = r.ber_kode === r.total ? warna.hijau("OK  ") : warna.kuning("SISA");
      console.log(`  ${tanda} ${r.type.padEnd(16)} ${r.ber_kode}/${r.total} punya kode`);
    }
    console.log("──────────────────────────────────────────────────────────");
    console.log("");
  } catch (e) {
    console.error(warna.merah(`GAGAL: ${e.message}`));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
