/**
 * Test penjaga #744 — blok Catatan Rapat di broadcast WhatsApp.
 *
 * Dua jenis penjaga, keduanya memang dibutuhkan di repo ini:
 *
 *  1. Penjaga PERILAKU atas `formatMeetingList()` dan `formatMessage()`. Ini
 *     yang menjamin pesan tetap rapi dan — yang lebih penting — tidak
 *     MENGUBAH bentuk pesan bagi penerima yang tidak punya topik rapat.
 *
 *  2. Penjaga TEKS SUMBER atas `whatsapp.service.ts`. Presedennya
 *     `whatsapp-broadcast-error-504.test.ts`. Tiga sifat #744 mudah hilang
 *     tanpa membuat satu pun test merah, jadi ketiganya dikunci di sini:
 *     cabang skip harus memeriksa tugas DAN rapat, kueri topik rapat tidak
 *     boleh menarik kolom sensitif, dan `taskCount` di log tidak boleh
 *     dicampur jumlah topik.
 */

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: async () => ({ query: async () => [[]], release: () => {} }) },
}));

import fs from "fs";
import path from "path";
import {
  formatMeetingList,
  formatMessage,
  ambilTopikRapat,
  BATAS_TOPIK_RAPAT,
  type TopikRapat,
} from "../services/whatsapp.service";
import { DEFAULT_WHATSAPP_TEMPLATE } from "../services/broadcastConfig.service";

const GARIS_KAKI = "─────────────────";

/* Topik di fixture ini sengaja muat dalam satu baris (kolom nilai = 25 karakter)
 * supaya assert baris-utuh tetap terbaca. Pelipatan topik panjang diuji terpisah
 * lewat `topikPanjang` di bawah. */
const topik: TopikRapat[] = [
  {
    judulRapat: "Kickoff Q4 Planning",
    topik: "Evaluasi kapasitas tim",
    status: "pending",
    targetDate: "2026-11-02",
  },
  {
    judulRapat: "Kickoff Q4 Planning",
    topik: "Pembagian PIC rilis",
    status: "pending",
    targetDate: "",
  },
  {
    judulRapat: "Review Sprint 12",
    topik: "Migrasi database ke Neon",
    status: "pending",
    targetDate: "2026-10-20",
  },
];

const tiket = [
  {
    id: 1,
    title: "Fix Authentication Flow",
    status: "IN_PROGRESS",
    priority: "high",
    dueDate: "2026-09-10",
    projectName: "LanPro Core",
  },
];

describe("#744 · formatMeetingList — blok topik rapat", () => {
  it("membungkus daftar dengan blok monospace seperti formatTaskList (#505)", () => {
    const list = formatMeetingList(topik);
    expect(list.startsWith("```\n")).toBe(true);
    expect(list.endsWith("\n```")).toBe(true);
  });

  it("mengelompokkan topik di bawah judul rapatnya, judul rapat hanya dicetak sekali", () => {
    const list = formatMeetingList(topik);
    expect(list).toContain("[1] KICKOFF Q4 PLANNING");
    expect(list).toContain("[2] REVIEW SPRINT 12");
    expect(list.match(/KICKOFF Q4 PLANNING/g)).toHaveLength(1);
    expect(list).toContain("    Topik          : Evaluasi kapasitas tim");
    expect(list).toContain("    Topik          : Pembagian PIC rilis");
    expect(list).toContain("    Topik          : Migrasi database ke Neon");
  });

  it("tiap butir memuat Status dan Tanggal Target sejajar, permintaan putaran 3", () => {
    const list = formatMeetingList(topik);
    expect(list).toContain("    Status         : Pending");
    expect(list).toContain("    Tanggal Target : 02/11/2026");
    expect(list).toContain("    Tanggal Target : 20/10/2026");
    // targetDate kosong tidak boleh mencetak baris kosong atau tanggal palsu
    expect(list).toContain("    Tanggal Target : -");
  });

  it("status rapat yang tersimpan sebagai kode tetap terbaca, bukan 'in_progress'", () => {
    const list = formatMeetingList([
      { judulRapat: "Rapat A", topik: "Topik", status: "in_progress", targetDate: "" },
    ]);
    expect(list).toContain("    Status         : In Progress");
    expect(list).not.toContain("in_progress");
  });

  it("titik dua ketiga label berbaris di kolom yang sama", () => {
    const kolom = new Set(
      formatMeetingList(topik)
        .split("\n")
        .filter((b) => /^ {4}[A-Za-z][A-Za-z ]* : /.test(b))
        .map((b) => b.indexOf(" : "))
    );
    expect(kolom.size).toBe(1);
  });

  /* Putaran 2 #744 — penjaga-penjaga ini lahir dari tangkapan layar uji kirim
   * sungguhan: WhatsApp melipat baris panjang di KOLOM NOL, di luar indentasi
   * blok, dan pesan tampak berantakan. Pelipatan kini dilakukan sendiri. */
  const topikPanjang: TopikRapat[] = [
    {
      judulRapat: "Allignment Squad 1 - Wondr Merchant",
      topik:
        "Terakhir dari Andreas APS info ada 30 merchant yang belum berhasil dilakukan migrasi ulang karena informasi data yang kurang sesuai.",
      status: "pending",
      targetDate: "",
    },
  ];

  it("setiap baris di dalam blok tidak melebihi lebar layar ponsel", () => {
    const panjang = formatMeetingList(topikPanjang)
      .split("\n")
      .map((b) => b.length);
    expect(Math.max(...panjang)).toBeLessThanOrEqual(46);
  });

  it("tidak ada baris isi yang jatuh di kolom nol — penyebab berantakan di layar", () => {
    const isi = formatMeetingList(topikPanjang)
      .split("\n")
      .slice(1, -1)
      .filter((b) => b.trim().length > 0 && !b.startsWith("["));
    isi.forEach((b) => expect(b.startsWith(" ")).toBe(true));
  });

  it("baris lanjutan nilai menjorok sejajar di kolom nilainya, bukan di kolom nol", () => {
    const baris = formatMeetingList(topikPanjang).split("\n");
    const iTopik = baris.findIndex((b) => b.startsWith("    Topik"));
    expect(iTopik).toBeGreaterThan(-1);
    expect(baris[iTopik + 1].startsWith(" ".repeat(21))).toBe(true);
    expect(baris[iTopik + 1].trim().length).toBeGreaterThan(0);
  });

  it("tidak mencetak topik yang kembar dua kali di rapat yang sama", () => {
    const list = formatMeetingList([
      { judulRapat: "Rapat A", topik: "Topik sama", status: "pending", targetDate: "" },
      { judulRapat: "Rapat A", topik: "Topik sama", status: "pending", targetDate: "" },
    ]);
    expect(list.match(/Topik sama/g)).toHaveLength(1);
  });

  it("menyebut jumlah sisa yang terpotong batas, bukan membuangnya diam-diam", () => {
    const sepuluh: TopikRapat[] = Array.from({ length: BATAS_TOPIK_RAPAT }, (_, i) => ({
      judulRapat: `Rapat ${i + 1}`,
      topik: `Topik ${i + 1}`,
      status: "pending",
      targetDate: "",
    }));
    expect(formatMeetingList(sepuluh, 14)).toContain("+ 4 topik lainnya tidak ditampilkan");
    expect(formatMeetingList(sepuluh, 10)).not.toContain("topik lainnya");
  });

  it("judul rapat dan topik kosong tetap tercetak, tidak menghasilkan baris '[1] '", () => {
    const list = formatMeetingList([{ judulRapat: "  ", topik: "", status: "", targetDate: "" }]);
    expect(list).toContain("[1] TANPA JUDUL RAPAT");
    expect(list).toContain("    Topik          : Tanpa Topik");
  });
});

describe("#744 · formatMessage — tiga bentuk pesan", () => {
  it("tiket + rapat: kepala 'Ringkasan Pekerjaan', dua blok terpisah, sub-judul 📋", () => {
    const pesan = formatMessage("Azlan Irwan", tiket, null, "https://lanpro.my.id", topik, 3);

    expect(pesan).toContain("*[LanPro] Ringkasan Pekerjaan*");
    expect(pesan).toContain("Berikut tiket tugas aktif yang ditugaskan kepada Anda:");
    expect(pesan).toContain("📋 *Catatan Rapat*");
    expect(pesan).toContain("Berikut topik rapat yang ditugaskan kepada Anda:");
    expect(pesan).toContain("🔗 *Akses Detail:*");

    // Blok tiket #505 tidak boleh bergeser sedikit pun.
    expect(pesan).toContain("    Tanggal Terakhir : 10/09/2026");
    expect(pesan).toContain(`${GARIS_KAKI}\n_Pesan otomatis • LanPro Project Management_`);
  });

  it("HANYA rapat: kepala 'Catatan Rapat', tanpa judul ganda dan tanpa kalimat tiket", () => {
    const pesan = formatMessage("Budi", [], null, "https://lanpro.my.id", topik, 3);

    expect(pesan).toContain("*[LanPro] Catatan Rapat*");
    expect(pesan).toContain("Berikut topik rapat yang ditugaskan kepada Anda:");
    expect(pesan).not.toContain("Berikut tiket tugas aktif");
    expect(pesan).not.toContain("📋 *Catatan Rapat*");
    expect(pesan).toContain("🔗 *Akses Catatan Rapat:*");
  });

  it("HANYA tiket: pesan IDENTIK dengan sebelum #744 (penjaga regresi)", () => {
    const pesan = formatMessage("Azlan Irwan", tiket, null, "https://lanpro.my.id");

    expect(pesan).toContain("*[LanPro] Task Assignment*");
    expect(pesan).toContain("Halo *Azlan Irwan*,");
    expect(pesan).toContain("Berikut tiket tugas aktif yang ditugaskan kepada Anda:");
    expect(pesan).toContain("🔗 *Akses Detail Tugas:*");
    expect(pesan).not.toContain("Catatan Rapat");
    expect(pesan).not.toContain("topik rapat");
  });

  it("template bawaan diperlakukan sebagai BELUM dikustomisasi, sehingga kepala adaptif tercapai", () => {
    // Inilah jalur yang benar-benar berjalan di production: `toRow()` di
    // broadcastConfig.service.ts:36-43 selalu menormalkan template ke default.
    const pesan = formatMessage("Budi", [], DEFAULT_WHATSAPP_TEMPLATE, "https://x.id", topik, 3);

    expect(pesan).toContain("*[LanPro] Catatan Rapat*");
    expect(pesan).not.toContain("Berikut tiket tugas aktif");
    expect(pesan).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
  });

  it("template kustom dengan {{meeting_list}} menggantinya di tempat", () => {
    const kustom = `Halo {{user_name}},\n{{task_list}}\nRapatmu:\n{{meeting_list}}\n{{app_url}}`;
    const pesan = formatMessage("Budi", tiket, kustom, "https://x.id", topik, 3);

    expect(pesan).toContain("Rapatmu:");
    expect(pesan).toContain("[1] KICKOFF Q4 PLANNING");
    expect(pesan.indexOf("Rapatmu:")).toBeLessThan(pesan.indexOf("[1] KICKOFF Q4 PLANNING"));
    expect(pesan).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
  });

  it("template kustom LAMA tanpa {{meeting_list}} tetap menampilkan topik, disisipkan SEBELUM garis kaki", () => {
    const kustomLama = `Halo {{user_name}},\n\n{{task_list}}\n\n${GARIS_KAKI}\n_Pesan otomatis_`;
    const pesan = formatMessage("Budi", tiket, kustomLama, "https://x.id", topik, 3);

    expect(pesan).toContain("[1] KICKOFF Q4 PLANNING");
    expect(pesan.indexOf("[1] KICKOFF Q4 PLANNING")).toBeLessThan(pesan.indexOf(GARIS_KAKI));
    expect(pesan.trim().endsWith("_Pesan otomatis_")).toBe(true);

    // Blok sisipan WAJIB membawa judulnya sendiri: tanpa itu penerima melihat
    // dua blok ```monospace``` bersambung dan tidak bisa membedakan mana tiket
    // tugas mana topik rapat.
    expect(pesan).toContain("📋 *Catatan Rapat*");
    expect(pesan.indexOf("📋 *Catatan Rapat*")).toBeLessThan(pesan.indexOf("[1] KICKOFF Q4"));
  });

  it("template kustom tanpa garis kaki menambahkan blok rapat di ujung, bukan menghilangkannya", () => {
    const pesan = formatMessage(
      "Budi",
      tiket,
      "Tugas {{user_name}}:\n{{task_list}}",
      "https://x.id",
      topik,
      3
    );
    expect(pesan.trim().endsWith("```")).toBe(true);
    expect(pesan).toContain("[2] REVIEW SPRINT 12");
  });

  it("tidak meninggalkan placeholder apa pun bila tidak ada rapat sama sekali", () => {
    const pesan = formatMessage(
      "Budi",
      tiket,
      "Tugas:\n{{task_list}}\nRapat:\n{{meeting_list}}",
      "https://x.id",
      [],
      0
    );
    expect(pesan).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
    // Blok tiket tetap ada (ia juga monospace), yang harus hilang adalah blok rapat.
    expect(pesan).not.toContain("Topik :");
    expect(pesan).not.toContain("KICKOFF Q4 PLANNING");
  });
});

describe("#744 · ambilTopikRapat — kueri dan batasnya", () => {
  const koneksiPalsu = (baris: any[]) => {
    const tercatat: { sql: string; params: unknown[] }[] = [];
    return {
      tercatat,
      query: async (sql: string, params: unknown[] = []) => {
        tercatat.push({ sql, params });
        return [baris];
      },
    };
  };

  it("mengembalikan baris kosong tanpa menyentuh database bila tidak ada kunci pengguna", async () => {
    const koneksi = koneksiPalsu([]);
    const hasil = await ambilTopikRapat(koneksi as any, []);
    expect(hasil.baris).toEqual([]);
    expect(hasil.total).toBe(0);
    expect(koneksi.tercatat).toHaveLength(0);
  });

  it("mencocokkan KETIGA kunci identitas, karena assignee disimpan sebagai uid", async () => {
    const koneksi = koneksiPalsu([]);
    await ambilTopikRapat(koneksi as any, ["7", "uid-7", "budi"]);

    const { sql, params } = koneksi.tercatat[0];
    // discussion_point_assignees (#703, PIC jamak) DAN kolom "assignTo" lama.
    expect(sql).toContain("discussion_point_assignees");
    expect(sql).toContain('dp."assignTo" IN (?)');
    // Keduanya menerima array, bukan nilai tunggal — IN (?) jadi = ANY($n).
    expect(params[0]).toEqual(["7", "uid-7", "budi"]);
    expect(params[1]).toEqual(["7", "uid-7", "budi"]);
    expect(params[2]).toBe(BATAS_TOPIK_RAPAT);
  });

  it("mengecualikan titik diskusi yang sudah selesai", async () => {
    const koneksi = koneksiPalsu([]);
    await ambilTopikRapat(koneksi as any, ["7"]);
    expect(koneksi.tercatat[0].sql).toContain(`COALESCE(dp.status, 'pending') <> 'completed'`);
  });

  it("mengutip manual kolom yang tidak ada di camelCaseCols db.ts (pelajaran #476)", async () => {
    const koneksi = koneksiPalsu([]);
    await ambilTopikRapat(koneksi as any, ["7"]);
    const sql = koneksi.tercatat[0].sql;
    expect(sql).toContain('dp."meetingId"');
    expect(sql).toContain('dp."targetDate"');
    expect(sql).toContain('dp."assignTo"');
    expect(sql).not.toMatch(/[^"]\bmeetingId\b[^"]/);
  });

  it("memetakan judul rapat, topik, status, dan tanggal target, serta membawa total sebelum LIMIT", async () => {
    const koneksi = koneksiPalsu([
      {
        judulRapat: "Rapat A",
        topik: "Topik satu",
        status: "pending",
        targetDate: "2026-10-20",
        total: 12,
      },
      { judulRapat: "Rapat B", topik: "Topik dua", status: "pending", targetDate: "", total: 12 },
    ]);
    const hasil = await ambilTopikRapat(koneksi as any, ["7"]);
    expect(hasil.total).toBe(12);
    expect(hasil.baris[0]).toEqual({
      judulRapat: "Rapat A",
      topik: "Topik satu",
      status: "pending",
      targetDate: "2026-10-20",
      total: 12,
    });
  });

  it("kueri menarik status dan tanggal target untuk label blok catatan putaran 3", async () => {
    const koneksi = koneksiPalsu([]);
    await ambilTopikRapat(koneksi as any, ["7"]);
    const sql = koneksi.tercatat[0].sql;
    expect(sql).toContain(`AS "status"`);
    expect(sql).toContain(`AS "targetDate"`);
  });
});

describe("#744 · penjaga teks sumber whatsapp.service.ts", () => {
  const sumber = fs.readFileSync(path.join(__dirname, "../services/whatsapp.service.ts"), "utf8");

  it("cabang skip memeriksa tiket DAN topik rapat, bukan tiket saja", () => {
    expect(sumber).toContain("if (tasks.length > 0 || jumlahTopik > 0) {");
  });

  it("kueri topik rapat tidak menarik kolom sensitif catatan rapat", () => {
    // Irisannya HANYA badan ambilTopikRapat. Berhenti di sendDailyTaskDigest,
    // bukan di formatTaskList: putaran 2 menambah variabel `keterangan` di
    // digest yang tidak ada hubungannya dengan kolom yang dibaca kueri.
    const badan = sumber.slice(
      sumber.indexOf("export async function ambilTopikRapat"),
      sumber.indexOf("export async function sendDailyTaskDigest")
    );
    expect(badan.length).toBeGreaterThan(0);
    for (const terlarang of [
      "keterangan",
      "tindakanLanjut",
      "transcript",
      "aiSummary",
      "analysis_result",
    ]) {
      expect(badan).not.toContain(terlarang);
    }
  });

  it("tiket dan rapat berangkat sebagai pesan terpisah, kecuali admin meminta inline", () => {
    expect(sumber).toContain("const daftarPesan: string[] = gabung");
    expect(sumber).toContain("rapatDigabungKeTemplat(messageTemplate)");
    expect(sumber).toContain('["pesan tugas", "catatan rapat"]');
  });

  it("pengiriman sebagian dicatat gagal dengan keterangan pesan mana yang lolos", () => {
    expect(sumber).toContain('Sebagian terkirim (${terkirim.join(", ")}); gagal: ${reason}');
  });

  it("taskCount di log broadcast tetap jumlah TIKET, jumlah topik masuk details", () => {
    expect(sumber).toContain("taskCount: tasks.length,");
    expect(sumber).toContain(
      "details: `Berhasil dikirim (${isi}) dalam ${daftarPesan.length} pesan`,"
    );
    expect(sumber).not.toContain("taskCount: tasks.length + jumlahTopik");
  });

  it("totalTanpaTugas tetap ada (#504 menguncinya) dan totalTopikRapat dilaporkan", () => {
    expect(sumber).toContain("totalTanpaTugas++;");
    expect(sumber).toContain("totalTopikRapat: number;");
  });

  it("#745 — tiga status hardcode diganti predikat terminal MasterData", () => {
    expect(sumber).not.toContain("t.status IN ('To Do', 'In Progress', 'Testing')");
    expect(sumber).toContain("muatKunciTerminal(connection)");
    expect(sumber).toContain('sqlStatusBukanTerminal("t.status", kunciTerminal)');
  });

  it("kunci terminal dibaca sekali per digest, bukan sekali per penerima", () => {
    const jumlah = sumber.split("await muatKunciTerminal(connection)").length - 1;
    expect(jumlah).toBe(1);
  });
});
