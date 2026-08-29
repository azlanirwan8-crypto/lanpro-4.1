/**
 * Regresi Item #248 — tiga modul yang dulu berhenti di separuh CRUD.
 *
 * DITEMUKAN 29 Agu 2026 lewat audit CRUD per modul `/qa` (AUDIT.md §13.16).
 * `chat` punya C dan R tanpa D; `notifications` punya C, R, U tanpa D; komentar
 * `discussion-points` punya C dan R tanpa U maupun D — padahal induknya, titik
 * diskusinya sendiri, punya CRUD lengkap sampai `jagaProyek("meetingNotes","D")`.
 * Bukan cacat kode: lubang yang tidak tercatat, dan lubang yang tidak tercatat
 * selalu terlupakan.
 *
 * YANG DIKUNCI TEST INI bukan "rutenya ada" — itu terlalu murah dan akan tetap
 * hijau kalau penjaganya dilepas besok. Yang dikunci ADALAH PENJAGANYA, karena
 * di sinilah tiga jalur hapus baru bisa berubah jadi tiga lubang baru:
 *
 *   - hapus pesan: hanya PENGIRIMNYA;
 *   - hapus notifikasi: hanya PENERIMANYA, dua lapis (parameter DAN baris);
 *   - sunting komentar: hanya PENULISNYA, meski matriks memberi peran lain `U`.
 *
 * Dan satu lagi yang tidak kelihatan sebagai bagian dari #248 tapi menopangnya:
 * penulis komentar kini diambil dari TOKEN. Dulu dari body dengan cadangan
 * header `x-user-id` lalu `"guest"`. Selama tidak ada U/D, itu "hanya"
 * pemalsuan nama. Begitu U dan D lahir, kepemilikan berhenti jadi hiasan dan
 * jadi KUNCI — membangun keduanya di atas penulis yang bisa dipalsukan sama
 * dengan tidak menjaganya sama sekali. Bentuk yang sama persis dengan `senderId`
 * di #69.
 *
 * Diperiksa statis terhadap teks sumber, sama seperti `hak-hapus.test.ts` dan
 * `hapus-berbasis-matriks.test.ts`, dan dengan batas yang sama jujurnya: ini
 * menangkap penjaga yang dilepas dan rute yang lupa dijaga, BUKAN bukti bahwa
 * seorang `viewer` sungguh-sungguh ditolak. Pembuktian itu ada di
 * `jagaProyek.test.ts` dan `rbac.test.ts`.
 */
import fs from "fs";
import path from "path";

const DIR = __dirname;
const AKAR = path.resolve(DIR, "..", "..");
// Akhir baris DINORMALKAN. Repo ini dikerjakan di Windows dan git menulis
// ulang LF jadi CRLF di working copy, jadi pola pencocokan yang memuat
// pergantian baris tidak pernah cocok di mesin pengembang sementara hijau
// di CI — kegagalan yang terlihat seperti rute hilang padahal rutenya ada.
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const baca = (...b: string[]) =>
  fs
    .readFileSync(path.join(AKAR, ...b), "utf8")
    .split(CRLF)
    .join(LF);

const chat = baca("server", "routes", "chat.routes.ts");
const notif = baca("server", "routes", "notifications.routes.ts");
const diskusi = baca("server", "routes", "discussion-points.routes.ts");

const repoChat = baca("server", "repositories", "chat.repository.ts");
const repoNotif = baca("server", "repositories", "notification.repository.ts");
const repoDiskusi = baca("server", "repositories", "discussion-points.repository.ts");

/** Potongan teks satu pendaftaran rute, dari `method(` sampai penutup handler-nya. */
const blokRute = (sumber: string, metode: string, jalur: string): string => {
  const tanda = `router.${metode}(\n  "${jalur}"`;
  const tandaSatuBaris = `router.${metode}("${jalur}"`;
  const i = sumber.includes(tanda) ? sumber.indexOf(tanda) : sumber.indexOf(tandaSatuBaris);
  if (i === -1) throw new Error(`rute ${metode.toUpperCase()} ${jalur} tidak terdaftar`);
  const j = sumber.indexOf("\n});", i);
  const k = sumber.indexOf("\n);", i);
  const akhir = [j, k].filter((n) => n > -1).sort((a, b) => a - b)[0];
  return sumber.slice(i, akhir === undefined ? sumber.length : akhir);
};

describe("#248 chat — D yang dulu tidak ada", () => {
  const blok = () => blokRute(chat, "delete", "/api/chat/messages/:id");

  it("rutenya terdaftar", () => {
    expect(() => blok()).not.toThrow();
  });

  it("hanya pengirimnya yang boleh menghapus", () => {
    // Bukan penerimanya, dan bukan admin: percakapan ini privat antar dua orang.
    expect(blok()).toContain("findSenderIdById(");
    expect(blok()).toContain("matchesCaller(req.user, senderId)");
  });

  it("pesan yang tidak ada dijawab 404, bukan 403 atau 200", () => {
    // 403 untuk baris yang tidak ada membocorkan id mana yang hidup.
    expect(blok()).toContain("srv.pesan_tidak_ditemukan");
  });

  it("repositorinya memulangkan pengirim telanjang, bukan seluruh baris", () => {
    // Nilai yang dipakai MEMUTUSKAN otorisasi tidak boleh ikut menumpang di
    // objek yang kelak ter-res.json() — pelajaran #241.
    const i = repoChat.indexOf("async findSenderIdById(");
    expect(i).toBeGreaterThan(-1);
    expect(repoChat.slice(i, repoChat.indexOf("\n  }", i))).toContain("Promise<string | null>");
  });

  it("hapusnya keras dan berbatas satu baris", () => {
    const i = repoChat.indexOf("async deleteMessage(");
    expect(i).toBeGreaterThan(-1);
    expect(repoChat.slice(i, repoChat.indexOf("\n  }", i))).toContain(
      "DELETE FROM Messages WHERE id = ?"
    );
  });
});

describe("#248 notifications — D yang dulu tidak ada", () => {
  const blok = () => blokRute(notif, "delete", "/api/users/:userId/notifications/:id");

  it("rutenya terdaftar", () => {
    expect(() => blok()).not.toThrow();
  });

  it("dijaga DUA lapis, sama seperti PUT di atasnya", () => {
    // Lapis kedua yang benar-benar menutup: tanpa ia, memanggil
    // /api/users/<id-saya>/notifications/<id-punya-orang-lain> lolos lapis
    // pertama. Persis bentuk itulah yang membuat PUT sudah aman sejak awal
    // sementara POST tidak (#244).
    const b = blok();
    expect(b).toContain("matchesCaller(req.user, userId)");
    expect(b).toContain("findRecipientIdById(");
    expect(b).toContain("matchesCaller(req.user, recipientId)");
  });

  it("notifikasi yang tidak ada dijawab 404", () => {
    expect(blok()).toContain("srv.notifikasi_tidak_ditemukan");
  });

  it("hapusnya keras dan berbatas satu baris", () => {
    const i = repoNotif.indexOf("async delete(");
    expect(i).toBeGreaterThan(-1);
    expect(repoNotif.slice(i, repoNotif.indexOf("\n  }", i))).toContain(
      "DELETE FROM Notifications WHERE id = ?"
    );
  });
});

describe("#248 komentar discussion point — U dan D yang dulu tidak ada", () => {
  const JALUR_PENDEK = "/api/discussion-points/:pointId/comments/:commentId";
  const JALUR_PROYEK =
    "/api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments/:commentId";

  it("keempat rutenya terdaftar — dua bentuk jalur, sama seperti GET dan POST", () => {
    // Mendaftarkan hanya satu bentuk berarti separuh pemanggil kehilangan
    // fiturnya, dan itu baru ketahuan di layar.
    for (const jalur of [JALUR_PENDEK, JALUR_PROYEK]) {
      expect(() => blokRute(diskusi, "put", jalur)).not.toThrow();
      expect(() => blokRute(diskusi, "delete", jalur)).not.toThrow();
    }
  });

  it("hapusnya dijaga aksi D, suntingnya aksi U — bukan sebaliknya", () => {
    expect(blokRute(diskusi, "delete", JALUR_PROYEK)).toContain('jagaProyek("meetingNotes", "D")');
    expect(blokRute(diskusi, "put", JALUR_PROYEK)).toContain('jagaProyek("meetingNotes", "U")');
  });

  it("bentuk jalur pendek menurunkan proyeknya lewat entitas, bukan lepas penjaga", () => {
    expect(blokRute(diskusi, "delete", JALUR_PENDEK)).toContain('"discussionPoint"');
    expect(blokRute(diskusi, "put", JALUR_PENDEK)).toContain('"discussionPoint"');
  });

  it("menyunting dibatasi PENULISNYA, meski matriks memberi peran lain aksi U", () => {
    // Manajer yang menulis ulang kalimat Anda dan membiarkannya tetap bernama
    // Anda lebih buruk daripada manajer yang menghapusnya: yang pertama
    // memalsukan, yang kedua sekadar meniadakan.
    const i = diskusi.indexOf("const putCommentHandler");
    expect(i).toBeGreaterThan(-1);
    const handler = diskusi.slice(i, diskusi.indexOf("\n};", i));
    expect(handler).toContain("findCommentOwnerId(");
    expect(handler).toContain("matchesCaller(req.user, pemilik)");
  });

  it("menyunting hanya mengubah teksnya, tidak memindahkan kepemilikan", () => {
    const i = repoDiskusi.indexOf("async updateComment(");
    expect(i).toBeGreaterThan(-1);
    const m = repoDiskusi.slice(i, repoDiskusi.indexOf("\n  }", i));
    expect(m).toContain("SET commentText = ?");
    for (const terlarang of ["userId", "userName", "createdAt"]) {
      expect(m.slice(m.indexOf("SET"))).not.toContain(terlarang);
    }
  });
});

describe("#248 penulis komentar diambil dari token, bukan dari kiriman klien", () => {
  it("handler komentar tidak lagi punya cadangan x-user-id maupun 'guest'", () => {
    // Keduanya adalah cara penulis komentar dipalsukan sebelum U/D lahir.
    //
    // Dilingkupi ke handler komentar, BUKAN ke seluruh berkas, dan itu bukan
    // pelonggaran: pembuatan TITIK diskusi masih memakai pola lama yang sama
    // (`authorId || req.headers["x-user-id"] || "guest"`, baris ~56). Itu
    // temuan tersendiri — #251 — dan menyeretnya ke sini akan membuat test
    // #248 merah karena alasan yang bukan #248.
    const i = diskusi.indexOf("const postCommentHandler");
    const handler = diskusi.slice(i, diskusi.indexOf(LF + "};", i));
    expect(handler).not.toContain('req.headers["x-user-id"]');
    expect(handler).not.toContain('"guest"');
  });

  it("penulisnya bersumber dari req.user", () => {
    const i = diskusi.indexOf("const penulisDari");
    expect(i).toBeGreaterThan(-1);
    const helper = diskusi.slice(i, diskusi.indexOf("\n});", i));
    expect(helper).toContain("req.user?.id");
    expect(helper).toContain("req.user?.uid");
  });

  it("handler pembuat komentar tidak lagi membaca userId dari body", () => {
    const i = diskusi.indexOf("const postCommentHandler");
    const handler = diskusi.slice(i, diskusi.indexOf("\n};", i));
    expect(handler).toContain("penulisDari(req)");
    expect(handler).not.toMatch(/const\s*\{[^}]*\buserId\b[^}]*\}\s*=\s*req\.body/);
  });
});
