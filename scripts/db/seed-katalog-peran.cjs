#!/usr/bin/env node
/**
 * Penyemai katalog peran ke `MasterData` — F7 / item #76 (Two-Tier RBAC).
 * Rancangan lengkapnya di AUDIT.md §19.
 *
 * KONTRAK DENGAN UI — pelajaran dari kekeliruan versi pertama.
 *
 * Versi pertama skrip ini membuat `type = 'system_role'` untuk peran sistem.
 * Barisnya masuk ke database dengan benar, tetapi **tidak pernah muncul di
 * layar**: `MasterDataPanel.tsx` hanya mengenal `type = 'project_role'`, lalu
 * memisahkan dua lapis itu lewat kolom `role_type` (`PROJECT` / `SYSTEM`).
 *
 * Jadi kontraknya:
 *
 *   type       = 'project_role'   untuk SELURUH peran, dua-duanya
 *   role_type  = 'SYSTEM'         peran sistem
 *   role_type  = 'PROJECT'        peran proyek
 *
 * Menambah tipe baru ke database tanpa memeriksa apa yang dibaca antarmuka
 * menghasilkan data yang benar tetapi tidak terlihat — bentuk kegagalan yang
 * paling membingungkan, karena semua pemeriksaan di sisi database lulus.
 *
 * SIFATNYA. Idempoten. Menjalankan berkali-kali aman dan hasilnya sama.
 *
 * ⚠️ SKRIP INI MENGHAPUS BARIS. Atas izin pemilik proyek 16 Agu 2026, karena
 * LanPro masih dalam tahap pengembangan dan katalog lama belum dipakai satu pun
 * baris `ProjectMembers`. Daftar yang dihapus ditulis eksplisit di `DIHAPUS`;
 * skrip tidak akan menghapus apa pun di luar daftar itu.
 *
 * Jalankan: npm run db:seed-roles
 */

const warna = {
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

/**
 * Baris yang DIHAPUS dari katalog peran.
 *
 * Product Owner & Scrum Master: fungsinya beririsan dan dilebur ke
 * Project Manager (§19.9 K3). Keduanya tetap tersedia sebagai `jabatan`.
 *
 * Lead / Frontend / Backend Engineer: hak aksesnya IDENTIK satu sama lain dan
 * identik dengan Contributor. Yang membedakan cuma profesinya, dan itu jabatan
 * — bukan izin (§19.3). Dipindahkan ke `type = 'jabatan'`.
 *
 * md-system_role-*: kekeliruan versi pertama skrip ini, tipe yang tidak dikenal
 * antarmuka.
 */
const DIHAPUS = [
  "md-project_role-product-owner",
  "md-project_role-scrum-master",
  "md-project_role-lead-developer",
  "md-project_role-frontend-engineer",
  "md-project_role-backend-engineer",
  "md-system_role-administrator",
  "md-system_role-department-head",
  "md-system_role-standard-user",
  "md-system_role-observer",
];

/** SYSTEM ROLE — mengatur hal DI LUAR proyek. Empat peran (§19.4). */
const SYSTEM_ROLES = [
  {
    slug: "administrator",
    label: "Administrator",
    order: 1,
    color: "#DC2626",
    icon: "ShieldCheck",
    description:
      "Akses penuh seluruh sistem. Satu-satunya peran yang menembus batas project role (God Mode), dan satu-satunya yang boleh membuat proyek baru.",
  },
  {
    slug: "department-head",
    label: "Department Head",
    order: 2,
    color: "#7C3AED",
    icon: "Building2",
    description:
      "Pimpinan departemen. Membaca data master, pengguna, dan audit log; melihat seluruh proyek di departemennya. Tidak mengubah pengaturan sistem.",
  },
  {
    slug: "standard-user",
    label: "Standard User",
    order: 3,
    color: "#2563EB",
    icon: "User",
    description:
      "Peran bawaan seluruh pengguna. Tidak punya hak sistem apa pun; seluruh kemampuannya ditentukan project role di tiap proyek yang ia ikuti.",
  },
  {
    slug: "observer",
    label: "Observer",
    order: 4,
    color: "#64748B",
    icon: "Eye",
    description:
      "Hanya membaca, dan hanya pada proyek tempat ia terdaftar. Untuk auditor, klien, atau pemangku kepentingan luar.",
  },
];

/**
 * PROJECT ROLE — mengatur hal DI DALAM satu proyek. Enam peran (§19.5).
 * Disusun sebagai tangga mengikuti GitLab: tiap tingkat mewarisi yang di bawah.
 */
const PROJECT_ROLES = [
  {
    slug: "project-owner",
    label: "Project Owner",
    order: 1,
    color: "#B91C1C",
    icon: "Crown",
    description:
      "Pemilik proyek. SATU-SATUNYA project role yang boleh MENGHAPUS proyek. Mewarisi seluruh hak Project Admin.",
  },
  {
    slug: "project-admin",
    label: "Project Admin",
    order: 2,
    color: "#6366F1",
    icon: "Shield",
    description:
      "Tata kelola proyek: mengelola anggota, peran, dan pengaturan proyek. Hak penuh di seluruh modul kecuali menghapus proyek.",
  },
  {
    slug: "project-manager",
    label: "Project Manager",
    order: 3,
    color: "#0891B2",
    icon: "ClipboardList",
    description:
      "Mengelola sprint, milestone, dan timeline. Menggantikan Product Owner dan Scrum Master yang fungsinya beririsan.",
  },
  {
    slug: "contributor",
    label: "Contributor",
    order: 4,
    color: "#059669",
    icon: "Code2",
    description:
      "Pelaksana pekerjaan: membuat dan mengubah task, dokumentasi, flowchart, dan notulen. TIDAK menghapus. Mencakup developer, system analyst, dan business analyst — pembedanya di jabatan, bukan hak akses.",
  },
  {
    slug: "qa-engineer",
    label: "QA",
    order: 5,
    color: "#F59E0B",
    icon: "CheckCircle",
    description:
      "Pemilik penuh modul Quality Assessment: membuat, mengubah, dan menghapus test case serta bukti pengujian. Setara Contributor di modul lain.",
  },
  {
    slug: "viewer",
    label: "Viewer",
    order: 6,
    color: "#94A3B8",
    icon: "Eye",
    description:
      "Hanya membaca seluruh modul proyek. Tidak membuat, mengubah, maupun menghapus apa pun.",
  },
];

/**
 * Jabatan yang perlu ada setelah peran dipisahkan dari profesi.
 * `slug` dipakai untuk id; bila jabatan dengan label sama sudah ada, dilewati.
 */
const JABATAN_BARU = [
  { slug: "system-analyst", label: "System Analyst", order: 8, description: "Analis sistem dan perancang alur proses" },
  { slug: "frontend-engineer", label: "Frontend Engineer", order: 9, description: "Pengembang antarmuka pengguna" },
  { slug: "backend-engineer", label: "Backend Engineer", order: 10, description: "Pengembang logika bisnis dan layanan API" },
];

(async () => {
  require("dotenv").config();
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error(warna.merah("DATABASE_URL tidak ditemukan di environment."));
    process.exit(2);
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let dihapus = 0;
  let ditambah = 0;
  let diperbarui = 0;

  const upsert = async (r, type, roleType) => {
    const id = `md-${type}-${r.slug}`;
    const { rows } = await client.query(
      `INSERT INTO "MasterData" (id, type, label, "order", color, icon, description, role_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label, "order" = EXCLUDED."order", color = EXCLUDED.color,
         icon = EXCLUDED.icon, description = EXCLUDED.description, role_type = EXCLUDED.role_type
       RETURNING (xmax = 0) AS baru`,
      [id, type, r.label, r.order, r.color || null, r.icon || null, r.description, roleType]
    );
    if (rows[0].baru) ditambah++;
    else diperbarui++;
    return rows[0].baru;
  };

  try {
    console.log("");
    console.log(warna.tebal("Menyemai katalog peran ke MasterData"));
    console.log(warna.redup("  type='project_role' untuk keduanya; dipisah lewat role_type"));
    console.log("");

    // 1. Hapus baris usang — hanya yang terdaftar eksplisit
    console.log(warna.tebal("  Pembersihan"));
    for (const id of DIHAPUS) {
      const { rowCount } = await client.query(`DELETE FROM "MasterData" WHERE id = $1`, [id]);
      if (rowCount > 0) {
        dihapus++;
        console.log(`    ${warna.merah("HAPUS  ")} ${id}`);
      }
    }
    if (dihapus === 0) console.log(warna.redup("    (tidak ada yang perlu dihapus)"));

    // 2. SYSTEM role
    console.log("");
    console.log(warna.tebal("  SYSTEM ROLE"));
    for (const r of SYSTEM_ROLES) {
      const baru = await upsert(r, "project_role", "SYSTEM");
      console.log(`    ${baru ? warna.hijau("TAMBAH ") : warna.redup("perbarui")} ${r.label}`);
    }

    // 3. PROJECT role
    console.log("");
    console.log(warna.tebal("  PROJECT ROLE"));
    for (const r of PROJECT_ROLES) {
      const baru = await upsert(r, "project_role", "PROJECT");
      console.log(`    ${baru ? warna.hijau("TAMBAH ") : warna.redup("perbarui")} ${r.label}`);
    }

    // 4. Jabatan — profesi yang dipindahkan dari katalog peran
    console.log("");
    console.log(warna.tebal("  JABATAN (profesi, bukan izin)"));
    for (const j of JABATAN_BARU) {
      const { rows: ada } = await client.query(
        `SELECT id FROM "MasterData" WHERE type='jabatan' AND lower(label)=lower($1)`,
        [j.label]
      );
      if (ada.length > 0) {
        console.log(warna.redup(`    lewati  ${j.label} (sudah ada)`));
        continue;
      }
      await client.query(
        `INSERT INTO "MasterData" (id, type, label, "order", description)
         VALUES ($1, 'jabatan', $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [`md-jabatan-${j.slug}`, j.label, j.order, j.description]
      );
      ditambah++;
      console.log(`    ${warna.hijau("TAMBAH ")} ${j.label}`);
    }

    // 5. Perbaiki typo yang sudah lama ada
    const { rowCount: typo } = await client.query(
      `UPDATE "MasterData" SET label='Business Analyst'
       WHERE type='jabatan' AND label='Businnes Analyst'`
    );
    if (typo > 0) console.log(`    ${warna.kuning("PERBAIKI")} typo "Businnes Analyst" -> "Business Analyst"`);

    // Ringkasan
    const { rows: ringkas } = await client.query(
      `SELECT role_type, COUNT(*)::int AS n FROM "MasterData"
       WHERE type='project_role' GROUP BY role_type ORDER BY role_type NULLS LAST`
    );

    console.log("");
    console.log("──────────────────────────────────────────────────────────");
    console.log(
      warna.hijau(`  ${ditambah} ditambahkan · ${diperbarui} diperbarui · ${dihapus} dihapus`)
    );
    for (const r of ringkas) {
      console.log(warna.redup(`  role_type=${r.role_type || "(kosong)"} : ${r.n} peran`));
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
