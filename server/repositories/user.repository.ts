import db from "../../src/lib/db";
import type { PaginationParams } from "../lib/pagination";

/**
 * Batas atas daftar pengguna yang dimuat sekaligus (#284).
 *
 * `ORDER BY createdAt DESC` ditambahkan bersama batasnya, dan itu penting:
 * `LIMIT` tanpa urutan yang pasti memulangkan baris yang BERBEDA-BEDA antar
 * pemanggilan, dan daftar yang berubah-ubah tanpa sebab jauh lebih
 * membingungkan daripada daftar yang terpotong.
 */
const BATAS_PENGGUNA = 1000;

export interface UserEntity {
  id: string;
  uid?: string | null;
  username: string;
  nama_lengkap?: string | null;
  email?: string | null;
  displayName: string;
  role: string;
  status: string;
  permissions?: any;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  avatar_url?: string | null;
  photoURL?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  coverUrl?: string | null;
  passwordHash?: string;
  createdAt?: string;
  lastSeen?: string | null;
  /** #345 — preferensi reminder due date (default true). */
  notifDueReminder?: boolean | null;
}

export class UserRepository {
  async findAll(): Promise<UserEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, "coverUrl", createdAt, lastSeen FROM Users ORDER BY createdAt DESC LIMIT ' +
          BATAS_PENGGUNA
      );
      return (rows || []).map((u: any) => {
        try {
          if (u.permissions && typeof u.permissions === "string") {
            u.permissions = JSON.parse(u.permissions);
          }
        } catch (e) {}
        return u;
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Daftar pengguna TANPA field sensitif — item #162.
   *
   * `findAll()` memulangkan `email`, `phone`, dan `permissions`, dan
   * `GET /api/users` memulangkannya kepada SIAPA PUN yang membawa JWT sah.
   * Endpoint itu tidak bisa sekadar dikunci admin: ia mengisi `allUsers`
   * yang dipakai lima fitur non-admin — penyebutan di obrolan, status
   * daring, avatar header, pemilih penerima tugas, dan peserta rapat.
   *
   * Tidak satu pun dari kelimanya membaca ketiga field itu. Jadi yang
   * dipersempit adalah ISI-nya, bukan siapa yang boleh memanggil.
   *
   * Kolomnya sengaja ditulis ulang penuh, bukan hasil `findAll()` yang
   * disaring di JavaScript: menyaring setelah kueri berarti datanya SUDAH
   * meninggalkan database, dan satu `console.log` atau satu jalur galat
   * cukup untuk membocorkannya kembali.
   */
  async findAllRingkas(): Promise<UserEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT id, uid, username, nama_lengkap, displayName, role, status, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, "coverUrl", createdAt, lastSeen FROM Users ORDER BY createdAt DESC LIMIT ' +
          BATAS_PENGGUNA
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async findAllPaged(
    pagination: PaginationParams,
    search?: string
  ): Promise<{ items: UserEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const { where, params } = this.buildUserWhere(search);
      const [countRows]: any = await connection.query(
        `SELECT COUNT(*)::int AS total FROM Users WHERE ${where}`,
        params
      );
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(
        `SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, "coverUrl", createdAt, lastSeen FROM Users WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [...params, pagination.limit, pagination.offset]
      );
      return {
        items: (rows || []).map((u: any) => {
          try {
            if (u.permissions && typeof u.permissions === "string") {
              u.permissions = JSON.parse(u.permissions);
            }
          } catch (e) {}
          return u;
        }),
        total,
      };
    } finally {
      connection.release();
    }
  }

  async findAllRingkasPaged(
    pagination: PaginationParams,
    search?: string
  ): Promise<{ items: UserEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const { where, params } = this.buildUserWhere(search);
      const [countRows]: any = await connection.query(
        `SELECT COUNT(*)::int AS total FROM Users WHERE ${where}`,
        params
      );
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(
        `SELECT id, uid, username, nama_lengkap, displayName, role, status, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, "coverUrl", createdAt, lastSeen FROM Users WHERE ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [...params, pagination.limit, pagination.offset]
      );
      return { items: rows || [], total };
    } finally {
      connection.release();
    }
  }

  private buildUserWhere(search?: string) {
    if (!search?.trim()) return { where: "1=1", params: [] as unknown[] };
    const term = `%${search.trim().toLowerCase()}%`;
    return {
      where:
        "(LOWER(COALESCE(displayName, '')) LIKE ? OR LOWER(COALESCE(username, '')) LIKE ? OR LOWER(COALESCE(email, '')) LIKE ?)",
      params: [term, term, term],
    };
  }

  /**
   * Detail satu pengguna TANPA `passwordHash` — item #241.
   *
   * KENAPA HASH-NYA DIKELUARKAN. Kolom ini dulu ikut di-SELECT di sini, dan
   * `GET /api/users/:id` (`user.routes.ts`) memulangkan objek hasilnya apa
   * adanya lewat `res.json({ data: user })`. Akibatnya SETIAP pengguna yang
   * membawa JWT sah — sekecil apa pun perannya — bisa mengambil hash bcrypt
   * akun mana pun termasuk admin, lalu membobolnya offline tanpa batas
   * percobaan dan tanpa jejak di server. Itu jalur naik hak akses yang utuh.
   *
   * Yang membuatnya bertahan lama: method ini melayani DUA keperluan yang
   * berbeda. Satu-satunya yang benar-benar butuh hash adalah alur ganti sandi,
   * dan kebutuhan internal itulah yang dulu menentukan daftar kolomnya —
   * lalu jalur tampilan ikut kebagian. Sebelas pemanggil lainnya hanya
   * memakai `id`/`uid`/`username`/`email`/`role`/`permissions`.
   *
   * Jadi yang dibalik adalah DEFAULT-nya, bukan satu baris yang bocor.
   * Menambal `res.json` di rute itu saja akan menutup kebocoran hari ini
   * sambil membiarkan pemanggil BERIKUTNYA mewarisi hash tanpa memintanya.
   * Sekarang aman secara bawaan, dan yang butuh hash memintanya terpisah
   * lewat `findPasswordHashById()`.
   *
   * Kolomnya ditulis ulang penuh dan bukan disaring di JavaScript, alasan
   * yang sama seperti `findAllRingkas()` di atas: menyaring setelah kueri
   * berarti datanya sudah meninggalkan database.
   */
  async findByIdOrUid(idOrUid: string): Promise<UserEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, "coverUrl", createdAt, lastSeen FROM Users WHERE id = ? OR uid = ?',
        [idOrUid, idOrUid]
      );
      if (rows && rows.length > 0) {
        const u = rows[0];
        try {
          if (u.permissions && typeof u.permissions === "string") {
            u.permissions = JSON.parse(u.permissions);
          }
        } catch (e) {}
        return u;
      }
      return null;
    } finally {
      connection.release();
    }
  }

  /**
   * Detail satu pengguna TANPA `email`, `phone`, dan `permissions` — item #243.
   *
   * Pasangan per-id dari `findAllRingkas()`, dan lahir karena alasan yang sama
   * persis. #162 menutup kebocoran ketiga field itu di endpoint DAFTAR, tetapi
   * endpoint DETAIL (`GET /api/users/:id`) tetap memanggil `findByIdOrUid()`
   * tanpa memeriksa peran. Karena `findAllRingkas()` memulangkan `id` SEMUA
   * pengguna, id-nya tidak perlu ditebak: ambil daftarnya, lalu panggil
   * detailnya satu per satu. Redaksi yang hanya terpasang di satu dari dua
   * pintu bukan redaksi.
   *
   * Kenapa method baru dan bukan `findByIdOrUid()` yang dipersempit: sebelas
   * pemanggil internalnya — login, ganti sandi, penjaga proyek, notifikasi —
   * memang butuh `email`/`permissions` untuk bekerja. Mempersempit sumbernya
   * akan mematikan mereka. Yang dipersempit karena itu jalur TAMPILAN-nya,
   * dan pemilihannya dilakukan di rute yang tahu siapa pemanggilnya.
   *
   * Daftar kolomnya ditulis ulang penuh dan bukan hasil `findByIdOrUid()` yang
   * disaring di JavaScript, alasan yang sama seperti #162 dan #241: menyaring
   * setelah kueri berarti datanya SUDAH meninggalkan database, dan satu
   * `console.log` atau satu jalur galat cukup untuk membocorkannya kembali.
   */
  async findByIdOrUidRingkas(idOrUid: string): Promise<UserEntity | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT id, uid, username, nama_lengkap, displayName, role, status, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar, "coverUrl", createdAt, lastSeen FROM Users WHERE id = ? OR uid = ?',
        [idOrUid, idOrUid]
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Hash sandi tersimpan, HANYA untuk verifikasi — item #241.
   *
   * Dipisah dari `findByIdOrUid()` supaya hash tidak lagi ikut menumpang di
   * objek pengguna yang dipakai belasan tempat. Memulangkan `string | null`
   * dan bukan objek pengguna adalah bagian dari poinnya: nilai telanjang
   * tidak bisa tanpa sengaja ikut ter-`res.json()` bersama field lain, yang
   * persis cara #241 lahir.
   *
   * Pemanggil sahnya satu: alur ganti sandi di `user.routes.ts`, yang
   * mencocokkan sandi lama sebelum menyimpan yang baru. Bila suatu saat ada
   * pemanggil kedua, itu keputusan sadar — bukan warisan diam-diam.
   */
  async findPasswordHashById(idOrUid: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT passwordHash FROM Users WHERE id = ? OR uid = ?",
        [idOrUid, idOrUid]
      );
      if (rows && rows.length > 0) return rows[0].passwordHash ?? null;
      return null;
    } finally {
      connection.release();
    }
  }

  async updateLastSeen(userId: string, lastSeen: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE Users SET lastSeen = ? WHERE id = ? OR uid = ?", [
        lastSeen,
        userId,
        userId,
      ]);
    } finally {
      connection.release();
    }
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity | null> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Users SET avatar_url = ?, photoURL = ?, avatarUrl = ? WHERE id = ? OR uid = ?",
        [avatarUrl, avatarUrl, avatarUrl, userId, userId]
      );
      const [rows]: any = await connection.query(
        "SELECT id, uid, username, nama_lengkap, email, displayName, role, status, permissions, phone, department, position, COALESCE(avatar_url, photoURL, avatarUrl) AS avatar_url, COALESCE(avatar_url, photoURL, avatarUrl) AS photoURL, createdAt, lastSeen FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      return rows && rows[0] ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async getAvatar(userId: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [barisLama]: any = await connection.query(
        "SELECT avatar_url, photoURL, avatarUrl FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      return (
        barisLama?.[0]?.avatar_url || barisLama?.[0]?.photoURL || barisLama?.[0]?.avatarUrl || null
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Item #208 — sebelumnya cover disimpan hanya di `localStorage` browser
   * (`UserDetailView.tsx`), tidak pernah dikirim ke server sama sekali —
   * hilang begitu pindah browser/hapus cache, dan tidak terlihat pengguna
   * lain. Ditambahkan supaya persis pola avatar: tersimpan di database.
   */
  async updateCover(userId: string, coverUrl: string): Promise<Partial<UserEntity> | null> {
    const connection = await db.getConnection();
    try {
      await connection.query('UPDATE Users SET "coverUrl" = ? WHERE id = ? OR uid = ?', [
        coverUrl,
        userId,
        userId,
      ]);
      const [rows]: any = await connection.query(
        'SELECT id, uid, "coverUrl" FROM Users WHERE id = ? OR uid = ?',
        [userId, userId]
      );
      return rows && rows[0] ? rows[0] : null;
    } finally {
      connection.release();
    }
  }

  async getCover(userId: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT "coverUrl" FROM Users WHERE id = ? OR uid = ?',
        [userId, userId]
      );
      return rows?.[0]?.coverUrl || null;
    } finally {
      connection.release();
    }
  }

  /** #178 — dipakai sebelum UPDATE supaya klien dapat pesan jelas, bukan galat Postgres mentah. */
  async isUsernameTaken(username: string, excludeId: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id FROM Users WHERE username = ? AND id != ?",
        [username, excludeId]
      );
      return !!(rows && rows.length > 0);
    } finally {
      connection.release();
    }
  }

  /** #178 — case-insensitive, sejalan dengan `findUserByEmail` di auth.repository.ts. */
  async isEmailTaken(email: string, excludeId: string): Promise<boolean> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT id FROM Users WHERE LOWER(email) = LOWER(?) AND id != ?",
        [email.trim(), excludeId]
      );
      return !!(rows && rows.length > 0);
    } finally {
      connection.release();
    }
  }

  async updateUser(id: string, updates: Record<string, any>, isAdmin: boolean): Promise<void> {
    const connection = await db.getConnection();
    try {
      const sqlUpdates: string[] = [];
      const values: any[] = [];

      if (isAdmin) {
        if (updates.role !== undefined) {
          sqlUpdates.push("role = ?");
          values.push(updates.role);
        }
        if (updates.status !== undefined) {
          sqlUpdates.push("status = ?");
          values.push(updates.status);
        }
        if (updates.permissions !== undefined) {
          sqlUpdates.push("permissions = ?");
          values.push(updates.permissions ? JSON.stringify(updates.permissions) : null);
        }
        if (updates.department !== undefined) {
          sqlUpdates.push("department = ?");
          values.push(updates.department || null);
        }
        if (updates.position !== undefined) {
          sqlUpdates.push("position = ?");
          values.push(updates.position || null);
        }
      }

      if (updates.displayName !== undefined) {
        sqlUpdates.push("displayName = ?");
        values.push(updates.displayName);
      }
      if (updates.username !== undefined) {
        sqlUpdates.push("username = ?");
        values.push(updates.username);
      }
      if (updates.email !== undefined) {
        sqlUpdates.push("email = ?");
        values.push(updates.email && updates.email.trim() !== "" ? updates.email.trim() : null);
      }
      if (updates.effectiveAvatar !== undefined) {
        sqlUpdates.push("photoURL = ?", "avatar_url = ?", "avatarUrl = ?");
        values.push(updates.effectiveAvatar, updates.effectiveAvatar, updates.effectiveAvatar);
      }
      if (updates.phone !== undefined) {
        sqlUpdates.push("phone = ?");
        values.push(updates.phone && updates.phone.trim() !== "" ? updates.phone.trim() : null);
      }
      if (
        updates.passwordHash !== undefined &&
        updates.passwordHash !== null &&
        updates.passwordHash !== ""
      ) {
        sqlUpdates.push("passwordHash = ?");
        values.push(updates.passwordHash);
      }

      if (sqlUpdates.length > 0) {
        values.push(id);
        await connection.query(`UPDATE Users SET ${sqlUpdates.join(", ")} WHERE id = ?`, values);
      }
    } finally {
      connection.release();
    }
  }

  async updateProfile(
    id: string,
    updates: {
      displayName: string;
      username: string;
      email?: string | null;
      phone?: string | null;
      avatar?: string | null;
      newPasswordHash?: string;
    }
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      if (updates.newPasswordHash) {
        await connection.query("UPDATE Users SET passwordHash = ? WHERE id = ?", [
          updates.newPasswordHash,
          id,
        ]);
      }

      await connection.query(
        "UPDATE Users SET displayName = ?, username = ?, email = ?, phone = ?, photoURL = ?, avatar_url = ?, avatarUrl = ? WHERE id = ?",
        [
          updates.displayName,
          updates.username,
          updates.email || null,
          updates.phone || null,
          updates.avatar || null,
          updates.avatar || null,
          updates.avatar || null,
          id,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async delete(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Users WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }

  async getUserProjectRoles(
    dbUserId: string,
    firebaseUid: string
  ): Promise<{
    projectRoles: Record<string, string>;
    adminProjectIds: string[];
    qaProjectIds: string[];
  }> {
    const connection = await db.getConnection();
    try {
      const [pmRows]: any = await connection.query(
        "SELECT projectId, role FROM ProjectMembers WHERE userId = ? OR userId = ?",
        [dbUserId, firebaseUid]
      );

      const projectRoles: Record<string, string> = {};
      const adminProjectIds: string[] = [];
      const qaProjectIds: string[] = [];

      for (const pm of pmRows) {
        if (pm.projectId) {
          const rawRole = (pm.role || "").toLowerCase().trim();
          let role = rawRole;
          if (rawRole === "qa engineer" || rawRole === "qa") {
            role = "qa";
            qaProjectIds.push(pm.projectId);
          } else if (rawRole === "ui/ux designer") {
            role = "ui/ux";
          } else if (rawRole === "database admin (dba)" || rawRole === "database admin") {
            role = "dba";
          } else if (rawRole === "architecture") {
            role = "arsitektur";
          } else if (rawRole === "business analyst") {
            role = "bisnis analyst";
          } else if (rawRole === "project admin" || rawRole === "admin") {
            role = "admin";
            adminProjectIds.push(pm.projectId);
          }
          projectRoles[pm.projectId] = role;
        }
      }

      const [ownerRows]: any = await connection.query(
        "SELECT id FROM Projects WHERE ownerId = ? OR ownerId = ?",
        [dbUserId, firebaseUid]
      );
      for (const p of ownerRows) {
        projectRoles[p.id] = "admin";
        if (!adminProjectIds.includes(p.id)) {
          adminProjectIds.push(p.id);
        }
      }

      return { projectRoles, adminProjectIds, qaProjectIds };
    } finally {
      connection.release();
    }
  }
}

export const userRepository = new UserRepository();
