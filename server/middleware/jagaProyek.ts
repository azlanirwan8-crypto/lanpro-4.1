/**
 * PENJAGA PROYEK BERBASIS MATRIKS — AUDIT.md §19.8 tahap 4, item #76.
 *
 * Menggantikan `verifyProjectAccess(daftarPeran)` dengan `jagaProyek(modul, aksi)`.
 *
 * APA YANG BERUBAH, DAN KENAPA ITU INTINYA.
 *
 * Penjaga lama menerima DAFTAR PERAN, sehingga setiap rute mengarang sendiri
 * siapa yang boleh. Hasilnya diukur 16 Agu 2026: 54 penjaga menghasilkan 8
 * daftar berbeda, dan 31 di antaranya (57%) berbunyi `["*"]` — "anggota mana
 * pun", sehingga `viewer` ikut boleh menghapus (#66, #72).
 *
 * Penjaga ini menerima MODUL dan AKSI. Siapa yang boleh dijawab satu tempat:
 * `src/lib/matriksAkses.ts`, yang isinya diikat ke tabel §19.4 dan §19.5 lewat
 * test. Rute tidak lagi punya pendapat tentang peran.
 *
 * URUTAN PEMERIKSAAN mengikuti §19.6 persis:
 *
 *   1. user dikenali?                      tidak -> 403
 *   2. system role Administrator?          ya    -> LOLOS (God Mode)
 *   3. pemilik proyek?                     ya    -> diperlakukan peran `owner`
 *   4. anggota proyek?                     tidak -> 403  (menutup #49)
 *   5. matriks(peran, modul, aksi)?        tidak -> 403  (deny-by-default)
 *
 * DENY-BY-DEFAULT. Tidak ada satu pun cabang yang meloloskan permintaan karena
 * "tidak ada aturan yang melarang". Pembalikan itulah yang menutup #68, #70,
 * #71, dan #80 sekaligus — keempatnya lolos justru karena bawaannya "izinkan".
 *
 * PERAN WARISAN. `member` sudah dimigrasikan ke `developer` di database (tahap
 * 3), tetapi normalisasinya tetap dipasang di sini. Bukan karena ragu pada
 * migrasinya, melainkan karena baris baru bisa lahir dari kode lama yang masih
 * menulis `member`. Tanpa normalisasi, baris seperti itu akan DITOLAK diam-diam
 * dan pemiliknya kehilangan akses tanpa jejak.
 */

import db from "../../src/lib/db";
import { normalkanPeran } from "../../src/types/roles";
import {
  bolehDiProyek,
  bolehHapusProyek,
  punyaGodMode,
  type Aksi,
  type ModulProyek,
} from "../../src/lib/matriksAkses";

/**
 * Nilai lama -> peran katalog. §19.17 & §19.18.
 *
 * `head` sengaja TIDAK dipetakan. Ia peran SISTEM, dan §19.6 aturan 1
 * menyatakan system role tidak berlaku di dalam proyek kecuali Administrator.
 * Seorang `head` yang benar-benar anggota proyek akan punya baris
 * `ProjectMembers` tersendiri dengan peran proyeknya.
 */
const PETA_WARISAN: Record<string, string> = {
  member: "developer",
  designer: "developer",
};

export const peranProyekEfektif = (mentah: unknown): string => {
  const n = normalkanPeran(mentah);
  return PETA_WARISAN[n] || n;
};

/**
 * Dipanggil ketika Administrator menembus proyek yang bukan miliknya.
 *
 * §19.6 aturan 2 mewajibkan setiap pemakaian God Mode tercatat di `AuditLogs` —
 * tanpa pencatatan, tidak ada cara mengetahui penyalahgunaannya.
 *
 * ⚠️ SEKARANG BARU MENCATAT KE LOG SERVER, BELUM KE TABEL `AuditLogs`.
 * Itu utang yang disengaja dan bernomor (#88), bukan kelalaian: menulis ke
 * `AuditLogs` di dalam penjaga berarti satu INSERT pada setiap permintaan
 * admin, dan bentuk tulisannya perlu disepakati lebih dulu supaya tidak
 * menenggelamkan log yang sudah ada.
 */
export const catatGodMode = (
  userId: string,
  projectId: string,
  modul: string,
  aksi: Aksi,
  cetak: (p: string) => void = console.warn
): void => {
  cetak(`[RBAC][GOD-MODE] admin=${userId} proyek=${projectId} modul=${modul} aksi=${aksi}`);
};

const tolak = (res: any) => res.status(403).json({ status: "error", message: "Akses ditolak" });

/**
 * @param modul modul §19.5 yang dijaga rute ini
 * @param aksi  huruf CRUD menurut §19.7
 */
export const jagaProyek = (modul: ModulProyek, aksi: Aksi) => {
  return async (req: any, res: any, next: any) => {
    let connection;
    try {
      const targetProjectId = req.params?.projectId || req.params?.id;

      const userIdMentah =
        req.user?.id || req.user?.uid || req.headers?.["x-user-id"] || req.query?.userId;
      if (!userIdMentah) return tolak(res);

      connection = await db.getConnection();

      const [uRows]: any = await connection.query(
        "SELECT id, role FROM Users WHERE id = ? OR uid = ?",
        [userIdMentah, userIdMentah]
      );
      if (uRows.length === 0) return tolak(res);

      const userId = uRows[0].id;

      // §19.6 langkah 3b — God Mode, HANYA Administrator sistem.
      if (punyaGodMode(uRows[0].role)) {
        catatGodMode(String(userId), String(targetProjectId || "-"), modul, aksi);
        return next();
      }

      // Rute tanpa proyek tidak boleh lewat penjaga ini: ia dirancang untuk
      // memutuskan berdasarkan keanggotaan proyek. Meloloskannya berarti
      // mengembalikan "izinkan bila tidak tahu" yang justru sedang ditutup.
      if (!targetProjectId) return tolak(res);

      const [proj]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [
        targetProjectId,
      ]);
      if (proj.length > 0 && proj[0].ownerId === userId) {
        return bolehDiProyek("owner", modul, aksi) ? next() : tolak(res);
      }

      const [member]: any = await connection.query(
        "SELECT role FROM ProjectMembers WHERE projectId = ? AND userId = ?",
        [targetProjectId, userId]
      );
      // §19.6 aturan 4 — bukan anggota = 403, setinggi apa pun system role-nya.
      if (member.length === 0) return tolak(res);

      const peran = peranProyekEfektif(member[0].role);
      return bolehDiProyek(peran, modul, aksi) ? next() : tolak(res);
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: jagaProyek error:", error);
      // Galat TIDAK boleh berarti "izinkan". §19.6 aturan 3.
      return res.status(500).json({ status: "error", message: "Gagal memverifikasi hak akses." });
    } finally {
      if (connection) connection.release();
    }
  };
};

/**
 * Penjaga khusus PENGHAPUSAN PROYEK. §19.5.
 *
 * Menghapus proyek bukan operasi pada sebuah modul, melainkan pada proyek itu
 * sendiri — karena itu ia tidak lewat `MATRIKS_PROYEK`. §19.5 memberikannya
 * HANYA kepada Project Owner; Administrator sistem tetap menembus lewat God
 * Mode seperti operasi lain.
 *
 * ⚠️ INI PENGETATAN NYATA. Penjaga sebelumnya berbunyi
 * `verifyProjectAccess(["admin", "head"])`, sehingga anggota proyek berperan
 * `admin` — Project Admin, BUKAN pemilik — juga bisa menghapus seluruh proyek.
 * Sesudah ini ia tidak bisa. Yang tersisa: pemilik proyek, dan Administrator
 * sistem.
 */
export const jagaHapusProyek = () => {
  return async (req: any, res: any, next: any) => {
    let connection;
    try {
      const projectId = req.params?.projectId || req.params?.id;
      const userIdMentah =
        req.user?.id || req.user?.uid || req.headers?.["x-user-id"] || req.query?.userId;
      if (!userIdMentah || !projectId) return tolak(res);

      connection = await db.getConnection();

      const [uRows]: any = await connection.query(
        "SELECT id, role FROM Users WHERE id = ? OR uid = ?",
        [userIdMentah, userIdMentah]
      );
      if (uRows.length === 0) return tolak(res);

      if (punyaGodMode(uRows[0].role)) {
        catatGodMode(String(uRows[0].id), String(projectId), "(hapus proyek)", "D");
        return next();
      }

      const [proj]: any = await connection.query("SELECT ownerId FROM Projects WHERE id = ?", [
        projectId,
      ]);
      if (proj.length > 0 && proj[0].ownerId === uRows[0].id && bolehHapusProyek("owner")) {
        return next();
      }

      return tolak(res);
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: jagaHapusProyek error:", error);
      return res.status(500).json({ status: "error", message: "Gagal memverifikasi hak akses." });
    } finally {
      if (connection) connection.release();
    }
  };
};
