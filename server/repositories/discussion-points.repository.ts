import db from "../../src/lib/db";
import crypto from "crypto";
import { BATAS_DAFTAR_TANPA_PAGINATION, type PaginationParams } from "../lib/pagination";
import { susunUrutanDiskusi, type UrutanDiskusi } from "../lib/sortirDiskusi";

export interface DiscussionPointEntity {
  id: string;
  meetingId: string;
  parentPointId?: string | null;
  authorId?: string | null;
  assignTo?: string | null;
  /**
   * #703 (keputusan B2 = b) — PIC JAMAK. BUKAN kolom: baris di
   * `discussion_point_assignees`. `assignTo` yang lama TETAP ditulis (PIC pertama)
   * supaya pembaca lama — pemetaan AI, notifikasi, kartu mobile — tidak tiba-tiba
   * melihat kolomnya kosong.
   */
  assigneeIds?: string[];
  concern?: string | null;
  fitur?: string | null;
  system?: string | null;
  surrounding?: string | null;
  keterangan?: string | null;
  tindakanLanjut?: string | null;
  /** #703 (B1 = a) — snapshot isu Daftar Isu: `[{ id, label }]`. */
  tags?: unknown;
  /** #704 (B3) — `[{ id, label, url }]`. */
  links?: unknown;
  /** #704 — isi `discussion_point_files` untuk titik ini, ditempel saat dibaca. */
  files?: DiscussionPointFileEntity[];
  /**
   * #711 — isi `discussion_point_comments` untuk titik ini, ditempel untuk
   * SELURUH halaman dalam satu kueri. Bukan kolom: tidak ada `comments` di
   * `DiscussionPoints`, dan tidak akan pernah ada.
   */
  comments?: DiscussionPointCommentEntity[];
  /** #711 — panjang `comments`, ikut ditempel supaya layar tidak menghitungnya lagi. */
  commentsCount?: number;
  status?: string | null;
  targetDate?: string | null;
  tanggalUpdateStatus?: string | null;
  content?: string | null;
  createdAt?: string;
}

export interface DiscussionPointFileEntity {
  id: string;
  pointId: string;
  fileRef?: string | null;
  name?: string | null;
  originalName?: string | null;
  mimetype?: string | null;
  size?: number | null;
  url?: string | null;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  uploadedAt?: string;
}

export interface DiscussionPointCommentEntity {
  id: string;
  pointId: string;
  userId: string;
  userName: string;
  commentText: string;
  createdAt: string;
}

export class DiscussionPointsRepository {
  async findByMeetingId(
    meetingId: string,
    search?: string,
    urutan?: UrutanDiskusi
  ): Promise<DiscussionPointEntity[]> {
    const connection = await db.getConnection();
    try {
      const { where, params } = this.buildPointWhere(meetingId, search);
      const [rows]: any = await connection.query(
        `SELECT * FROM DiscussionPoints WHERE ${where} ${susunUrutanDiskusi(urutan)} LIMIT ${BATAS_DAFTAR_TANPA_PAGINATION}`,
        params
      );
      return await this.tempelAnak(connection, rows || []);
    } finally {
      connection.release();
    }
  }

  async findByMeetingIdPaged(
    meetingId: string,
    pagination: PaginationParams,
    search?: string,
    urutan?: UrutanDiskusi
  ): Promise<{ items: DiscussionPointEntity[]; total: number }> {
    const connection = await db.getConnection();
    try {
      const { where, params } = this.buildPointWhere(meetingId, search);
      const [countRows]: any = await connection.query(
        `SELECT COUNT(*)::int AS total FROM DiscussionPoints WHERE ${where}`,
        params
      );
      const total = countRows?.[0]?.total ?? 0;
      const [rows]: any = await connection.query(
        `SELECT * FROM DiscussionPoints WHERE ${where} ${susunUrutanDiskusi(urutan)} LIMIT ? OFFSET ?`,
        [...params, pagination.limit, pagination.offset]
      );
      return { items: await this.tempelAnak(connection, rows || []), total };
    } finally {
      connection.release();
    }
  }

  /**
   * #703/#704 — tempel anak-anak sebuah titik diskusi: daftar penerima dan
   * daftar berkas. #711 menambah daftar komentar. TIGA kueri untuk SELURUH
   * halaman, bukan tiga kueri per baris.
   *
   * `IN (?)` di sini BUKAN `IN (?,?,?)`: `convertToPostgres()` di `src/lib/db.ts:59`
   * mengubah `IN (?)` menjadi `= ANY(?)`, dan bentuk itu MENSYARATKAN array.
   * Mengirim satu nilai tunggal membuat Postgres menolak kuernya — pelajaran
   * #329 yang di repository ini sudah didokumentasikan di `task.repository.ts:127`
   * dan baru saja menumbangkan #701. Karena itu `ids` selalu array, termasuk bila
   * titik diskusinya cuma satu, dan daftar kosong tidak dikueri sama sekali.
   */
  private async tempelAnak(
    connection: { query: (sql: string, params?: unknown) => Promise<unknown> },
    points: DiscussionPointEntity[]
  ): Promise<DiscussionPointEntity[]> {
    const ids = points.map((p) => p.id).filter(Boolean);
    if (ids.length === 0) return points;

    const [penerima]: any = await connection.query(
      "SELECT point_id, user_id FROM discussion_point_assignees WHERE point_id IN (?) ORDER BY created_at ASC",
      [ids]
    );
    const perPoin = new Map<string, string[]>();
    (penerima || []).forEach((r: any) => {
      if (!r.point_id || !r.user_id) return;
      if (!perPoin.has(r.point_id)) perPoin.set(r.point_id, []);
      perPoin.get(r.point_id)!.push(r.user_id);
    });

    const berkas = await this.berkasUntuk(connection, ids);
    const perBerkas = new Map<string, DiscussionPointFileEntity[]>();
    berkas.forEach((f) => {
      if (!f.pointId) return;
      if (!perBerkas.has(f.pointId)) perBerkas.set(f.pointId, []);
      perBerkas.get(f.pointId)!.push(f);
    });

    /* #711 — komentar SATU kueri untuk seluruh halaman, bukan satu kueri per
     * baris. Sebelum ini frontend memanggil endpoint komentar untuk SETIAP
     * titik diskusi yang tampil: sepuluh baris berarti sepuluh permintaan dan
     * sepuluh render, hanya untuk mencetak angka di kolom Utas dan mengintip
     * balasan di kartu HP. Presedennya `task.repository.ts:157-174` (#494), dan
     * bentuk `IN (?)`-nya adalah yang sama seperti dua kueri di atas — bukan
     * `IN (?,?,…)`.
     *
     * `pointid` huruf kecil utuh: kolom itu lahir dari identifier tanpa kutip
     * (§5), dan `findCommentsByPointId()` sudah membacanya dengan cara yang
     * sama. Alias ber-kutip di bawah meniru daftar kolom fungsi itu supaya
     * bentuk yang diterima layar tidak berubah.
     */
    const [komentar]: any = await connection.query(
      `SELECT id,
              pointid     AS "pointId",
              "userId"    AS "userId",
              username    AS "userName",
              commenttext AS "commentText",
              "createdAt" AS "createdAt"
         FROM discussion_point_comments
        WHERE pointid IN (?)
        ORDER BY "createdAt" ASC`,
      [ids]
    );
    const perKomentar = new Map<string, DiscussionPointCommentEntity[]>();
    (komentar || []).forEach((c: DiscussionPointCommentEntity) => {
      if (!c.pointId) return;
      if (!perKomentar.has(c.pointId)) perKomentar.set(c.pointId, []);
      perKomentar.get(c.pointId)!.push(c);
    });

    return points.map((p) => {
      const daftarKomentar = perKomentar.get(p.id) ?? [];
      return {
        ...p,
        assigneeIds: perPoin.get(p.id) ?? (p.assignTo ? [String(p.assignTo)] : []),
        files: perBerkas.get(p.id) ?? [],
        comments: daftarKomentar,
        commentsCount: daftarKomentar.length,
      };
    });
  }

  private buildPointWhere(meetingId: string, search?: string) {
    const params: unknown[] = [meetingId];
    let where = "meetingId = ?";
    if (search?.trim()) {
      where +=
        " AND (LOWER(COALESCE(concern, '')) LIKE ? OR LOWER(COALESCE(keterangan, '')) LIKE ? OR LOWER(COALESCE(fitur, '')) LIKE ?)";
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }
    return { where, params };
  }

  async createPoint(point: DiscussionPointEntity): Promise<DiscussionPointEntity> {
    const connection = await db.getConnection();
    try {
      const contentVal = point.concern || point.keterangan || "Poin Diskusi";
      try {
        await connection.query(
          'INSERT INTO DiscussionPoints (id, meetingId, "parentPointId", "authorId", "assignTo", concern, fitur, "system", surrounding, keterangan, "tindakanLanjut", status, "targetDate", "tanggalUpdateStatus", content, tags, links) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            point.id,
            point.meetingId,
            point.parentPointId || null,
            point.authorId || "guest",
            point.assignTo || null,
            point.concern || null,
            point.fitur || null,
            point.system || null,
            point.surrounding || null,
            point.keterangan || null,
            point.tindakanLanjut || null,
            point.status || "pending",
            point.targetDate || null,
            point.tanggalUpdateStatus || null,
            contentVal,
            // JSONB ditulis sebagai TEKS ber-JSON, sama seperti kolom `meeting_details`
            // di `meeting.repository.ts:188`. Tanpa `JSON.stringify` node-pg mengirim
            // array JS sebagai literal PG (`{a,b}`) dan jsonb menolaknya.
            point.tags === undefined ? null : JSON.stringify(point.tags),
            point.links === undefined ? null : JSON.stringify(point.links),
          ]
        );
      } catch (insertErr: any) {
        console.warn("[POST DiscussionPoint Resilient Retry]:", insertErr?.message);
        await connection.query(
          'INSERT INTO DiscussionPoints (id, meetingId, "authorId", concern, status, content) VALUES (?, ?, ?, ?, ?, ?)',
          [
            point.id,
            point.meetingId,
            point.authorId || "guest",
            point.concern || "Poin Diskusi",
            point.status || "pending",
            contentVal,
          ]
        );
      }
      await this.gantiPenerima(connection, point.id, point.assigneeIds);
      return point;
    } finally {
      connection.release();
    }
  }

  /**
   * #703 — tulis ulang daftar penerima sebuah titik diskusi.
   *
   * Hapus-lalu-sisip, bukan diff: daftarnya pendek (puluhan orang, bukan ribuan)
   * dan diff yang salah justru meninggalkan baris yatim. TIDAK dibungkus
   * transaksi — `createPoint` di atas sengaja punya jalur "resilient retry" yang
   * memakai `console.warn` setelah INSERT gagal, dan di dalam transaksi kegagalan
   * pertama akan meng-abort sisanya (25P02, pelajaran #469). Galat di sini
   * dibiarkan naik ke rute: lebih baik pemanggil tahu penerimanya tidak tersimpan
   * daripada daftar terlihat tersimpan padahal tidak.
   *
   * `undefined` = "tidak disentuh" (pemanggil tidak mengirim field itu),
   * `[]` = "kosongkan". Bedanya harus dijaga: form edit selalu mengirim daftarnya,
   * sedangkan toggle status hanya mengirim `{ status }`.
   */
  private async gantiPenerima(
    connection: { query: (sql: string, params?: unknown) => Promise<unknown> },
    pointId: string,
    penerima?: string[]
  ): Promise<void> {
    if (penerima === undefined) return;
    await connection.query("DELETE FROM discussion_point_assignees WHERE point_id = ?", [pointId]);
    for (const userId of Array.from(new Set(penerima.filter(Boolean)))) {
      await connection.query(
        "INSERT INTO discussion_point_assignees (id, point_id, user_id) VALUES (?, ?, ?)",
        [crypto.randomUUID(), pointId, userId]
      );
    }
  }

  async updatePoint(pointId: string, updates: Partial<DiscussionPointEntity>): Promise<void> {
    const connection = await db.getConnection();
    try {
      const sqlUpdates: string[] = [];
      const values: any[] = [];

      // #476 — kolom camelCase DiscussionPoints TIDAK di auto-quote db.ts;
      // tanpa kutip PG menulis twin lowercase (parentpointid, …).
      if (updates.parentPointId !== undefined) {
        sqlUpdates.push('"parentPointId" = ?');
        values.push(updates.parentPointId);
      }
      if (updates.assignTo !== undefined) {
        sqlUpdates.push('"assignTo" = ?');
        values.push(updates.assignTo);
      }
      if (updates.concern !== undefined) {
        sqlUpdates.push("concern = ?");
        values.push(updates.concern);
      }
      if (updates.fitur !== undefined) {
        sqlUpdates.push("fitur = ?");
        values.push(updates.fitur);
      }
      if (updates.system !== undefined) {
        sqlUpdates.push("`system` = ?");
        values.push(updates.system);
      }
      if (updates.surrounding !== undefined) {
        sqlUpdates.push("surrounding = ?");
        values.push(updates.surrounding);
      }
      if (updates.keterangan !== undefined) {
        sqlUpdates.push("keterangan = ?");
        values.push(updates.keterangan);
      }
      if (updates.tindakanLanjut !== undefined) {
        sqlUpdates.push('"tindakanLanjut" = ?');
        values.push(updates.tindakanLanjut);
      }
      if (updates.status !== undefined) {
        sqlUpdates.push("status = ?");
        values.push(updates.status);
      }
      if (updates.targetDate !== undefined) {
        sqlUpdates.push('"targetDate" = ?');
        values.push(updates.targetDate);
      }
      if (updates.tanggalUpdateStatus !== undefined) {
        sqlUpdates.push('"tanggalUpdateStatus" = ?');
        values.push(updates.tanggalUpdateStatus);
      }
      // #703/#704 — dua kolom baru ini huruf kecil utuh dan TIDAK perlu dikutip:
      // tidak ada di daftar `camelCaseCols` `db.ts`, dan tidak ada yang bisa dilipat.
      if (updates.tags !== undefined) {
        sqlUpdates.push("tags = ?");
        values.push(updates.tags === null ? null : JSON.stringify(updates.tags));
      }
      if (updates.links !== undefined) {
        sqlUpdates.push("links = ?");
        values.push(updates.links === null ? null : JSON.stringify(updates.links));
      }

      if (sqlUpdates.length > 0) {
        values.push(pointId);
        await connection.query(
          `UPDATE DiscussionPoints SET ${sqlUpdates.join(", ")} WHERE id = ?`,
          values
        );
      }
      await this.gantiPenerima(connection, pointId, updates.assigneeIds);
    } finally {
      connection.release();
    }
  }

  async deletePoint(pointId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      // #444 — komentar thread ikut hilang; sebelumnya orphan di discussion_point_comments
      await connection.query("DELETE FROM discussion_point_comments WHERE pointId = ?", [pointId]);
      // #703/#704 — dengan alasan yang sama: baris penerima dan berkas yang
      // ditinggalkan tidak akan terbaca lagi oleh siapa pun, tetapi tetap
      // menumpuk selamanya dan bisa menunjuk orang yang salah bila id-nya dipakai
      // ulang oleh titik diskusi baru.
      await connection.query("DELETE FROM discussion_point_assignees WHERE point_id = ?", [
        pointId,
      ]);
      await connection.query("DELETE FROM discussion_point_files WHERE point_id = ?", [pointId]);
      await connection.query("DELETE FROM DiscussionPoints WHERE id = ?", [pointId]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /** #704 — berkas/gambar yang menempel pada SATU titik diskusi. */
  async findFilesByPointId(pointId: string): Promise<DiscussionPointFileEntity[]> {
    const connection = await db.getConnection();
    try {
      return await this.berkasUntuk(connection, [pointId]);
    } finally {
      connection.release();
    }
  }

  /**
   * #704 — SATU kueri untuk seluruh halaman, bukan satu per baris.
   *
   * `tempelPenerima()` sudah membuktikan polanya: `IN (?)` + ARRAY menjadi
   * `= ANY($n)` oleh `convertToPostgres()`. Daftar kosong tidak dikueri.
   */
  private async berkasUntuk(
    connection: { query: (sql: string, params?: unknown) => Promise<unknown> },
    pointIds: string[]
  ): Promise<DiscussionPointFileEntity[]> {
    const ids = pointIds.filter(Boolean);
    if (ids.length === 0) return [];
    const [rows]: any = await connection.query(
      "SELECT id, point_id, file_ref, name, original_name, mimetype, size, url, uploaded_by, uploaded_by_name, uploaded_at FROM discussion_point_files WHERE point_id IN (?) ORDER BY uploaded_at ASC",
      [ids]
    );
    return (rows || []).map((r: any) => ({
      id: r.id,
      pointId: r.point_id,
      fileRef: r.file_ref,
      name: r.name,
      originalName: r.original_name,
      mimetype: r.mimetype,
      size: r.size === null || r.size === undefined ? 0 : Number(r.size),
      url: r.url,
      uploadedBy: r.uploaded_by,
      uploadedByName: r.uploaded_by_name,
      uploadedAt: r.uploaded_at,
    }));
  }

  async createFile(berkas: DiscussionPointFileEntity): Promise<DiscussionPointFileEntity> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO discussion_point_files (id, point_id, file_ref, name, original_name, mimetype, size, url, uploaded_by, uploaded_by_name, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          berkas.id,
          berkas.pointId,
          berkas.fileRef || null,
          berkas.name || null,
          berkas.originalName || null,
          berkas.mimetype || null,
          berkas.size || 0,
          berkas.url || null,
          berkas.uploadedBy || null,
          berkas.uploadedByName || null,
          berkas.uploadedAt || new Date().toISOString(),
        ]
      );
      return berkas;
    } finally {
      connection.release();
    }
  }

  /**
   * #704 — titik diskusi mana yang memiliki sebuah berkas.
   *
   * Hanya id induknya yang dikembalikan, dengan alasan yang sama seperti
   * `findCommentOwnerId()` di #248 dan `findPasswordHashById()` di #241: nilai
   * yang dipakai untuk MEMUTUSKAN jangan ikut menumpang di objek yang kelak
   * ter-`res.json()`.
   */
  async findFilePointId(fileId: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT point_id FROM discussion_point_files WHERE id = ?",
        [fileId]
      );
      return rows && rows.length > 0 ? rows[0].point_id : null;
    } finally {
      connection.release();
    }
  }

  /**
   * #704 — barisnya dihapus; BYTENYA sengaja tidak.
   *
   * Menghapus berkas di penyimpanan butuh tahu driver-nya (`local` vs `s3`) dan
   * itu wilayah `storage.service.ts`. Yang berbahaya bila tidak dilakukan apa
   * apa adalah baris yang menunjuk ke berkas yang sudah tidak ada, bukan
   * sebaliknya — dan arah itu sudah ditutup di sini.
   */
  async deleteFile(fileId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM discussion_point_files WHERE id = ?", [fileId]);
    } finally {
      connection.release();
    }
  }

  async findCommentsByPointId(pointId: string): Promise<DiscussionPointCommentEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT id,
                pointid     AS "pointId",
                "userId"    AS "userId",
                username    AS "userName",
                commenttext AS "commentText",
                "createdAt" AS "createdAt"
           FROM discussion_point_comments
          WHERE pointId = ?
          ORDER BY createdAt ASC`,
        [pointId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createComment(
    comment: DiscussionPointCommentEntity
  ): Promise<DiscussionPointCommentEntity> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO discussion_point_comments (id, pointId, userId, userName, commentText, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        [
          comment.id,
          comment.pointId,
          comment.userId,
          comment.userName,
          comment.commentText,
          comment.createdAt,
        ]
      );
      return comment;
    } finally {
      connection.release();
    }
  }

  /**
   * Pemilik sebuah komentar — item #248.
   *
   * Memulangkan `userId` telanjang dan bukan seluruh barisnya, alasan yang sama
   * seperti `findPasswordHashById()` di #241: nilai yang dipakai untuk MEMUTUSKAN
   * otorisasi tidak boleh ikut menumpang di objek yang kelak ter-`res.json()`.
   * Pemanggilnya cuma dua — jalur sunting dan jalur hapus — dan keduanya hanya
   * perlu tahu satu hal: ini komentar siapa.
   */
  async findCommentOwnerId(commentId: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        'SELECT "userId" AS "userId" FROM discussion_point_comments WHERE id = ?',
        [commentId]
      );
      return rows && rows.length > 0 ? rows[0].userId : null;
    } finally {
      connection.release();
    }
  }

  /** Menyunting teks satu komentar — item #248. Hanya teksnya yang boleh berubah. */
  async updateComment(commentId: string, commentText: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("UPDATE discussion_point_comments SET commentText = ? WHERE id = ?", [
        commentText,
        commentId,
      ]);
    } finally {
      connection.release();
    }
  }

  /** Menghapus satu komentar — item #248. */
  async deleteComment(commentId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM discussion_point_comments WHERE id = ?", [commentId]);
    } finally {
      connection.release();
    }
  }
}

export const discussionPointsRepository = new DiscussionPointsRepository();
