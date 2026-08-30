import db from "../../src/lib/db";

/**
 * Batas atas riwayat percakapan yang dimuat sekaligus (#284).
 *
 * Sebelumnya kedua kueri di bawah TANPA batas: seluruh riwayat sejak pesan
 * pertama diambil setiap kali percakapan dibuka. Hari ini tidak terasa karena
 * datanya kecil, tetapi percakapan adalah satu-satunya tabel di aplikasi ini
 * yang tumbuh selamanya dan tidak pernah menyusut. Yang patah lebih dulu bukan
 * tampilannya melainkan koneksinya: pool diklem maksimal 20, jadi satu kueri
 * panjang menahan koneksi dan permintaan berikutnya mengantre sampai timeout
 * -- gejala yang sama dengan #163/#175 walau akarnya berbeda.
 *
 * KENAPA HARUS DIBALIK. Urutan tampilnya ASC (terlama dulu), sehingga
 * `LIMIT n` polos justru memulangkan n pesan TERTUA dan membuang yang baru --
 * kebalikan dari yang berguna. Jadi diambil n TERBARU lewat subkueri DESC,
 * lalu dibalik ke ASC untuk ditampilkan.
 */
const BATAS_RIWAYAT_PESAN = 500;

export interface MessageEntity {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  read: boolean;
  partnerId?: string;
}

export class ChatRepository {
  async findLastMessages(userId: string): Promise<MessageEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT m1.*, 
                CASE WHEN m1.senderId = ? THEN m1.receiverId ELSE m1.senderId END AS partnerId
         FROM Messages m1
         INNER JOIN (
             SELECT 
                 CASE WHEN senderId = ? THEN receiverId ELSE senderId END AS partnerId,
                 MAX(timestamp) as max_ts
             FROM Messages
             WHERE (senderId = ? OR receiverId = ?) AND receiverId != 'group'
             GROUP BY partnerId
         ) m2 ON (
             (m1.senderId = ? AND m1.receiverId = m2.partnerId) OR 
             (m1.receiverId = ? AND m1.senderId = m2.partnerId)
         ) AND m1.timestamp = m2.max_ts`,
        [userId, userId, userId, userId, userId, userId]
      );

      const [groupRows]: any = await connection.query(
        "SELECT * FROM Messages WHERE receiverId = 'group' ORDER BY timestamp DESC LIMIT 1"
      );

      const [aiRows]: any = await connection.query(
        "SELECT * FROM Messages WHERE (senderId = ? AND receiverId = 'lanpro-ai') OR (senderId = 'lanpro-ai' AND receiverId = ?) ORDER BY timestamp DESC LIMIT 1",
        [userId, userId]
      );

      const allRows = [...(rows || [])];
      if (groupRows && groupRows.length > 0) {
        allRows.push({
          ...groupRows[0],
          partnerId: "group",
        });
      }
      if (aiRows && aiRows.length > 0) {
        allRows.push({
          ...aiRows[0],
          partnerId: "lanpro-ai",
        });
      }

      return allRows;
    } finally {
      connection.release();
    }
  }

  async findConversationMessages(senderId: string, receiverId: string): Promise<MessageEntity[]> {
    const connection = await db.getConnection();
    try {
      let rows: any;
      if (receiverId === "group") {
        [rows] = await connection.query(
          `SELECT * FROM (
             SELECT * FROM Messages WHERE receiverId = 'group'
             ORDER BY timestamp DESC LIMIT ${BATAS_RIWAYAT_PESAN}
           ) AS terbaru ORDER BY timestamp ASC`
        );
      } else {
        [rows] = await connection.query(
          `SELECT * FROM (
             SELECT * FROM Messages
              WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
              ORDER BY timestamp DESC LIMIT ${BATAS_RIWAYAT_PESAN}
           ) AS terbaru ORDER BY timestamp ASC`,
          [senderId, receiverId, receiverId, senderId]
        );
      }
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createMessage(msg: {
    id: string;
    senderId: string;
    receiverId: string;
    message: string;
    timestamp: string;
    read?: boolean;
  }): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "INSERT INTO Messages (id, senderId, receiverId, message, timestamp, `read`) VALUES (?, ?, ?, ?, ?, ?)",
        [msg.id, msg.senderId, msg.receiverId, msg.message, msg.timestamp, msg.read || false]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Pengirim sebuah pesan — item #248.
   *
   * Memulangkan `senderId` telanjang dan bukan seluruh barisnya: nilai yang
   * dipakai untuk MEMUTUSKAN otorisasi tidak boleh ikut menumpang di objek yang
   * kelak ter-`res.json()`. Pola yang sama dengan `findRecipientIdById()` di
   * repositori notifikasi, yang sudah melayani jalur "tandai terbaca".
   */
  async findSenderIdById(id: string): Promise<string | null> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query("SELECT senderId FROM Messages WHERE id = ?", [
        id,
      ]);
      return rows && rows.length > 0 ? rows[0].senderId : null;
    } finally {
      connection.release();
    }
  }

  /** Menghapus satu pesan — item #248. */
  async deleteMessage(id: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM Messages WHERE id = ?", [id]);
    } finally {
      connection.release();
    }
  }

  async markAsRead(senderId: string, receiverId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE Messages SET `read` = ? WHERE senderId = ? AND receiverId = ?",
        [1, senderId, receiverId]
      );
    } finally {
      connection.release();
    }
  }

  async getUnreadCounts(userId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT senderId, COUNT(*) as count FROM Messages WHERE receiverId = ? AND `read` = false GROUP BY senderId",
        [userId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }
}

export const chatRepository = new ChatRepository();
