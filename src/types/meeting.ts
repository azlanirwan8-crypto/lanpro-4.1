/**
 * #703 (B1 = a) — satu tag menunjuk SATU isu dari Daftar Isu.
 *
 * `label` ikut dikirim dan disimpan, bukan diambil ulang dari daftar isu: isu
 * boleh dihapus, dan catatan rapat tidak boleh kemudian menampilkan id mentah.
 */
export interface TagIsu {
  id: string;
  label: string;
}

/** #704 (B3) — tautan jamak. `url` sudah divalidasi http/https di server. */
export interface TautanDiskusi {
  id: string;
  label?: string | null;
  url: string;
}

/** #704 — satu berkas/gambar yang menempel pada satu titik diskusi. */
export interface BerkasDiskusi {
  id: string;
  pointId?: string;
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

export interface DiscussionPoint {
  id?: string;
  meetingId?: string;
  parentPointId?: string;
  parent_point_id?: string;
  parentpointid?: string;
  authorId?: string;
  assignTo?: string;
  assignee_id?: string;
  /** #703 (B2 = b) — penerima JAMAK. `assignTo` tetap berisi yang pertama. */
  assigneeIds?: string[];
  /** #703 — tag isu. */
  tags?: TagIsu[] | null;
  /** #704 — tautan jamak. */
  links?: TautanDiskusi[] | null;
  /** #704 — berkas/gambar jamak. */
  files?: BerkasDiskusi[];
  concern: string;
  comment?: string;
  fitur?: string;
  feature_id?: string;
  system?: string;
  system_id?: string;
  surrounding?: string;
  surrounding_id?: string;
  keterangan?: string;
  next_action?: string;
  tindakanLanjut?: string;
  tindakan_lanjut?: string;
  status: "pending" | "completed";
  targetDate?: string;
  target_date?: string;
  /**
   * #793 — tanggal statusnya naik ke "completed", `YYYY-MM-DD`. Nullable di dua
   * tempat: kolomnya `VARCHAR(50)` tanpa NOT NULL (`pg-migrate.ts:546`) dan
   * skema Zod-nya `.optional().nullable()`. `null` BUKAN sama dengan `undefined`
   * di jalur ini: `updatePoint` di repository hanya menulis kolom yang
   * nilainya `!== undefined`, jadi mengosongkan tanggal saat batal-selesai
   * WAJIB mengirim `null` — mengirim `undefined` berarti kolomnya diam-diam
   * dibiarkan berisi tanggal lama.
   */
  tanggalUpdateStatus?: string | null;
  createdAt?: any;
  /**
   * #711 — balasan satu titik diskusi, ditempel repository untuk SELURUH
   * halaman dalam satu kueri. `commentsCount` ikut datang darinya supaya layar
   * tidak perlu memanggil endpoint komentar per baris hanya untuk sebuah angka.
   */
  comments?: DiscussionPointComment[];
  commentsCount?: number;
}

export interface DiscussionPointComment {
  id: string;
  pointId: string;
  userId?: string;
  userName?: string;
  user_name?: string;
  commentText: string;
  comment_text?: string;
  createdAt: string;
  created_at?: string;
}

export interface Meeting {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  meetingLink?: string;
  authorId: string; // The user who created the meeting
  createdAt: any;
  updatedAt?: any;
  transcript?: string;
  aiSummary?: string | any;
  recording_url?: string;
  file_size?: number;
  upload_status?: string;
  fileData?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}
