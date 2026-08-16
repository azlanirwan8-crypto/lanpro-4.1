#!/usr/bin/env node
/**
 * Penyemai katalog peran ke `MasterData` — F7 / item #76 (Two-Tier RBAC).
 *
 * KENAPA ADA. `MasterData` sudah memuat 7 baris `project_role` sejak 5 Agu 2026
 * lengkap dengan kolom `role_type`, tetapi barisnya TIDAK pernah disemai oleh
 * migrasi — ia masuk dari luar. Sesudah item #79 menjadikan `pg-migrate.ts`
 * sumber kebenaran schema, katalog peran pun perlu jalur yang bisa diulang,
 * bukan SQL sekali pakai yang hilang jejaknya.
 *
 * SIFATNYA. Idempoten dan HANYA MENAMBAH. Menjalankannya berkali-kali aman.
 * Skrip ini TIDAK menghapus, TIDAK memindahkan, dan TIDAK mengubah baris yang
 * tidak dikenalnya. Peran lama (`Product Owner`, `Scrum Master`,
 * `Frontend Engineer`, ...) sengaja DIBIARKAN — pemindahannya ke `jabatan` dan
 * penghapusannya masih menunggu keputusan pemilik proyek, dan operasi itu tidak
 * bisa dibatalkan.
 *
 * URUTAN. Peran baru diberi `order` 10 ke atas supaya tidak bertabrakan dengan
 * baris lama. Perapian urutan dilakukan bersama pembersihan, bukan sekarang.
 *
 * Jalankan: npm run db:seed-roles
 */

const path = require("path");

const warna = {
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
};

/**
 * SYSTEM ROLE — mengatur hal DI LUAR proyek.
 *
 * Empat, bukan lima: `Project Manager` sengaja tidak ada di sini atas ketetapan
 * pemilik proyek 16 Agu 2026. Sesudah pembuatan proyek dibatasi ke Administrator,
 * peran itu tidak menyisakan pembeda apa pun dari Standard User — dan menyimpan
 * peran yang bedanya nol mengulang persis masalah `developer` vs `member`.
 * Tempatnya di project role.
 */
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
 * PROJECT ROLE — mengatur hal DI DALAM satu proyek.
 *
 * Empat baris di bawah adalah yang BELUM ada. `Project Admin` dan `QA Engineer`
 * sudah ada di katalog dan tidak disentuh.
 *
 * Disusun sebagai tangga mengikuti GitLab (Guest -> Reporter -> Developer ->
 * Maintainer -> Owner), bukan berdasarkan profesi. `Frontend Engineer` dan
 * `Backend Engineer` tidak menjadi peran karena hak aksesnya identik — itu
 * jabatan, dan tempatnya di `MasterData.type = 'jabatan'`.
 */
const PROJECT_ROLES = [
  {
    slug: "project-owner",
    label: "Project Owner",
    order: 10,
    color: "#B91C1C",
    icon: "Crown",
    description:
      "Pemilik proyek. Satu-satunya project role yang boleh MENGHAPUS proyek. Mewarisi seluruh hak Project Admin.",
  },
  {
    slug: "project-manager",
    label: "Project Manager",
    order: 11,
    color: "#0891B2",
    icon: "ClipboardList",
    description:
      "Mengelola sprint, milestone, dan timeline. Menggantikan peran Product Owner dan Scrum Master yang fungsinya beririsan.",
  },
  {
    slug: "contributor",
    label: "Contributor",
    order: 12,
    color: "#059669",
    icon: "Code2",
    description:
      "Pelaksana pekerjaan: membuat dan mengubah task, menulis dokumentasi, flowchart, dan notulen. Tidak menghapus. Mencakup developer, system analyst, dan business analyst — pembedanya ada di jabatan, bukan di hak akses.",
  },
  {
    slug: "viewer",
    label: "Viewer",
    order: 13,
    color: "#94A3B8",
    icon: "Eye",
    description:
      "Hanya membaca seluruh modul proyek. Tidak membuat, mengubah, maupun menghapus apa pun.",
  },
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

  let ditambah = 0;
  let diperbarui = 0;

  const semai = async (baris, type, roleType) => {
    for (const r of baris) {
      const id = `md-${type}-${r.slug}`;
      const { rows } = await client.query(
        `INSERT INTO "MasterData" (id, type, label, "order", color, icon, description, role_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           label = EXCLUDED.label,
           "order" = EXCLUDED."order",
           color = EXCLUDED.color,
           icon = EXCLUDED.icon,
           description = EXCLUDED.description,
           role_type = EXCLUDED.role_type
         RETURNING (xmax = 0) AS baru`,
        [id, type, r.label, r.order, r.color, r.icon, r.description, roleType]
      );
      const baru = rows[0].baru;
      if (baru) ditambah++;
      else diperbarui++;
      console.log(
        `  ${baru ? warna.hijau("TAMBAH ") : warna.redup("perbarui")} ${roleType.padEnd(7)} ${r.label}`
      );
    }
  };

  try {
    console.log("");
    console.log(warna.tebal("Menyemai katalog peran ke MasterData"));
    console.log(warna.redup("  hanya menambah — tidak menghapus atau memindahkan apa pun"));
    console.log("");

    await semai(SYSTEM_ROLES, "system_role", "SYSTEM");
    await semai(PROJECT_ROLES, "project_role", "PROJECT");

    const { rows: ringkas } = await client.query(
      `SELECT role_type, COUNT(*)::int AS n FROM "MasterData"
       WHERE role_type IS NOT NULL GROUP BY role_type ORDER BY role_type`
    );

    console.log("");
    console.log("──────────────────────────────────────────────────────────");
    console.log(warna.hijau(`  ${ditambah} baris ditambahkan · ${diperbarui} diperbarui`));
    for (const r of ringkas) console.log(warna.redup(`  katalog ${r.role_type}: ${r.n} peran`));
    console.log("──────────────────────────────────────────────────────────");
    console.log("");
  } catch (e) {
    console.error(warna.merah(`GAGAL: ${e.message}`));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
