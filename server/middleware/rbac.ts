import jwt from "jsonwebtoken";
import db from "../../src/lib/db";
import { getJwtSecret } from "./auth";
import { catatPenjaga } from "./daftarPeranRute";

/**
 * ⚠️ PENJAGA LAMA — PENSIUN 16 Agu 2026. NOL rute memakainya. §19.8 tahap 4.
 *
 * Digantikan `jagaProyek(modul, aksi)` di `./jagaProyek.ts`.
 *
 * Kelemahannya struktural, bukan soal isi daftar perannya: karena ia menerima
 * DAFTAR PERAN, setiap rute mengarang sendiri siapa yang boleh. Diukur 16 Agu
 * 2026, 54 pemanggilan menghasilkan 8 daftar berbeda, dan 31 di antaranya
 * berbunyi `["*"]` — yang sesudah #49 berarti "anggota dengan peran APA PUN",
 * sehingga `viewer` ikut boleh menghapus (#66, #72).
 *
 * Ia juga **izinkan-secara-bawaan**: rute tanpa `:projectId` diloloskan begitu
 * saja. Itu kebalikan dari §19.6 aturan 3.
 *
 * TIGA pemakai terakhir dipindahkan ke `jagaSetelanProyek()` sesudah #89
 * dijawab. Sekarang **nol** rute memakainya, dan
 * `server/routes/penjaga-lama.test.ts` menguncinya di angka nol.
 *
 * Berkasnya belum dihapus karena `rbac.test.ts` masih menguji perilakunya, dan
 * tiga berkas test rute masih memalsukannya. Menghapusnya adalah pekerjaan
 * pembersihan tersendiri, bukan bagian dari penutupan #76.
 */
export const verifyProjectAccess = (allowedRoles: string[]) => {
  // Mendaftarkan diri saat penjaga DIBUAT — yaitu saat modul rute dimuat.
  // Yang tercatat adalah penjaga yang benar-benar terpasang, bukan yang
  // terbaca dari teks berkas. Lihat `daftarPeranRute.ts`. Nol pengaruh ke
  // perilaku: fungsi ini hanya menyimpan salinan daftar perannya.
  catatPenjaga(allowedRoles);

  return async (req: any, res: any, next: any) => {
    let connection;
    try {
      const { projectId, id } = req.params;
      const targetProjectId = projectId || id;

      if (!req.user) {
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          if (token) {
            try {
              const decoded = jwt.verify(token, getJwtSecret()) as any;
              req.user = decoded;
            } catch (e) {
              // Invalid or expired token
            }
          }
        }
      }

      let userId =
        req.user?.id ||
        req.user?.uid ||
        req.headers["x-user-id"] ||
        req.query.userId ||
        req.body.userId;

      if (!userId) {
        if (allowedRoles.includes("*")) {
          return next();
        }
        return res.status(403).json({ status: "error", message: "Akses ditolak" });
      }

      connection = await db.getConnection();

      const [uRows]: any = await connection.query(
        "SELECT id, role FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      if (uRows.length > 0) {
        userId = uRows[0].id;
        if (uRows[0].role === "admin") {
          return next();
        }
      }

      // #49 — DULU di sini ada jalan pintas:
      //
      //   if (req.user && allowedRoles.includes('*')) return next();
      //
      // Ia keluar SEBELUM cek pemilik (di bawah) dan cek keanggotaan
      // ProjectMembers, sehingga '*' berarti "siapa pun yang punya JWT" alih-alih
      // "anggota proyek dengan peran apa pun". Akibatnya 38 rute — termasuk
      // unduh dokumen dan unduh notulen rapat — terbuka lintas proyek.
      //
      // Bahwa itu menyimpang dari maksud terlihat dari GET /api/projects, yang
      // menyaring non-admin dengan `WHERE p.ownerId = ? OR pm.userId = ?`:
      // daftar proyeknya disaring, tapi isinya tidak. '*' kini ditangani di cek
      // keanggotaan di bawah, tempat ia memang sudah didaftarkan.

      if (!targetProjectId) return next();

      const [proj]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [
        targetProjectId,
      ]);
      if (proj.length > 0 && proj[0].ownerId === userId) {
        return next();
      }

      const [member]: any = await connection.query(
        "SELECT role FROM ProjectMembers WHERE projectId = ? AND userId = ?",
        [targetProjectId, userId]
      );

      if (member.length > 0) {
        const userRole = (member[0].role || "viewer").toLowerCase();
        if (
          allowedRoles.includes("*") ||
          allowedRoles.map((r) => r.toLowerCase()).includes(userRole)
        ) {
          return next();
        }
      }

      return res.status(403).json({ status: "error", message: "Akses ditolak" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: RBAC Middleware error:", error);
      res.status(500).json({ status: "error", message: "Gagal memverifikasi hak akses." });
    } finally {
      if (connection) connection.release();
    }
  };
};
