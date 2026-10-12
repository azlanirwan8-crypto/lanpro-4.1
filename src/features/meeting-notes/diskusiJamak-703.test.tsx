/**
 * #703/#704 — enam permintaan pemilik proyek pada menu Meeting Notes
 * (12 Okt): Context/Tags dari Daftar Isu, PIC jamak, kolom Follow-up,
 * concern/notes/follow-up berupa text area, tautan jamak, dan gambar jamak.
 *
 * Test ini MEMBACA SUMBER, bukan merender. Alasannya sama seperti
 * `catatanLengkap-645.test.ts` di folder yang sama: yang dikunci adalah BENTUK
 * isian dan alamat data — `type="text"` versus `<textarea>` tidak melempar
 * galat, ia hanya membuat paragraf pengguna mengalir keluar dari satu baris.
 *
 * Blok terakhir menjaga §4 (berkas di atas 800 baris harus dipecah). Enam field
 * baru itu persis jenis pekerjaan yang membuat berkas 1.255 baris jadi 1.500
 * kalau ditumpuk di tempat yang sama.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const LAPOR = "src/features/meeting-notes/components/FormDiskusi.tsx";
const CEPAT = "src/features/meeting-notes/components/BarisCepat.tsx";
const BARIS = "src/features/meeting-notes/components/BarisDiskusi.tsx";
const KARTU = "src/features/meeting-notes/components/DiscussionPointMobileCardView.tsx";
const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const JAMAK = "src/features/meeting-notes/components/PemilihJamak.tsx";
const RUTE = "server/routes/discussion-points.routes.ts";
const MIGRASI = "src/lib/pg-migrate.ts";

/** Potongan sumber mulai dari penanda sampai batas berikutnya. */
const blok = (isi: string, mulai: string, selesai: string, nama: string) => {
  const i = isi.indexOf(mulai);
  if (i < 0) throw new Error(`${nama}: "${mulai}" tidak ditemukan — jangan hilangkan fieldnya`);
  const j = isi.indexOf(selesai, i);
  if (j < 0) throw new Error(`${nama}: batas akhir "${selesai}" tidak ditemukan`);
  return isi.slice(i, j);
};

/** Tag pembungkus sebuah ekspresi: dari `<` terakhir sebelum ekspresi itu. */
const tag = (isi: string, ekspresi: string, nama: string) => {
  const i = isi.indexOf(ekspresi);
  if (i < 0) throw new Error(`${nama}: "${ekspresi}" tidak ditemukan — jangan hilangkan fieldnya`);
  const buka = isi.lastIndexOf("<", i);
  return isi.slice(buka, i);
};

describe("#703 butir 4 — isian yang bisa berparagraf adalah text area", () => {
  it("laci sunting: concern, notes, dan follow-up ketiganya textarea", () => {
    const isi = baca(LAPOR);
    for (const ekspresi of ["form.concern", "form.keterangan", "form.tindakanLanjut"]) {
      expect(tag(isi, `value={${ekspresi} || ""}`, ekspresi)).toContain("textarea");
    }
  });

  it("baris cepat: catatan textarea dan Enter tidak lagi menyimpan dari sana", () => {
    const isi = baca(CEPAT);
    const pembungkus = tag(isi, "value={nilai.keterangan}", "catatan cepat");
    expect(pembungkus).toContain("textarea");
    // Enter di textarea berarti ganti baris. Yang menyimpan cukup tombol.
    expect(pembungkus).not.toContain("onKeyDown");
  });
});

describe("#703 butir 1 dan 2 — Context/Tags dari Daftar Isu, PIC jamak", () => {
  it("laci sunting memakai pemilih JAMAK untuk penerima dan untuk tag", () => {
    const isi = baca(LAPOR);
    expect(tag(isi, "nilai={Array.isArray(form.assigneeIds)", "penerima")).toContain(
      "<PemilihJamak"
    );
    expect(tag(isi, "nilai={(form.tags || []).map", "tag")).toContain("<PemilihJamak");
  });

  it("sumber opsi tag adalah DAFTAR ISU proyek, bukan MasterData", () => {
    const isi = baca(TABEL);
    expect(isi).toContain("fetchTasks(projectId, { rootsOnly: false })");
    expect(isi).toContain("setOpsiIsu(");
    // `fitur` lama TIDAK dibuang — ia tetap punya kontrolnya sendiri.
    expect(baca(LAPOR)).toContain('t("discussion.feature")');
  });

  it("pemilih jamak tidak menyimpan satu pun daftar opsi keras (§3)", () => {
    const isi = baca(JAMAK);
    // Semua kandidat datang dari props; tidak ada array literal berisi nama.
    expect(isi).not.toMatch(/opsi\s*=\s*\[\s*"/);
    expect(isi).toContain("opsi: OpsiJamak[]");
  });

  it("baris lama dan kartu mobile sama-sama menampilkan daftar penerima", () => {
    for (const berkas of [BARIS, KARTU]) {
      expect(baca(berkas)).toMatch(/namaPenerima[\s\S]{0,80}\.map\(/);
    }
  });
});

describe("#703 butir 3 — kolom Follow-up akhirnya tampil di tabel", () => {
  it("kepala tabel punya Follow-up, Tautan, dan Gambar", () => {
    const isi = baca(TABEL);
    const kepala = blok(isi, "<thead>", "</thead>", "kepala tabel");
    for (const kunci of [
      't("discussion.followUp")',
      't("discussion.tautan")',
      't("discussion.gambar")',
    ]) {
      expect(kepala).toContain(kunci);
    }
    // 12 kolom: No, Concern, Notes, Tags, Follow-up, PIC, Target, Tautan,
    // Gambar, Thread, Status, Action. Baris kosong tidak boleh bokek kolom.
    expect(kepala.match(/<th /g)).toHaveLength(12);
    expect(isi).toContain("colSpan={12}");
  });

  it("selnya memisahkan Follow-up dari Concern (#703: field ada, kolomnya tidak)", () => {
    const isi = baca(BARIS);
    const followUp = blok(isi, "{p.tindakanLanjut || p.next_action", ")}", "sel follow-up");
    expect(followUp).toContain("whitespace-pre-wrap");
  });
});

describe("#704 butir 5 dan 6 — tautan jamak dan gambar jamak", () => {
  it("tautan pengguna selalu rel=noopener noreferrer dan http(s) saja", () => {
    for (const berkas of [BARIS, KARTU]) {
      const isi = baca(berkas);
      expect(isi).toContain('rel="noopener noreferrer"');
    }
    const rute = baca(RUTE);
    expect(rute).toContain("buatBerkasDiskusiSchema");
  });

  it("unggah memakai endpoint yang sudah memvalidasi magic byte, bukan jalur baru", () => {
    const layanan = baca("src/services/meetingService.ts");
    expect(layanan).toContain('"/api/v1/upload-document"');
    expect(layanan).toContain("uploadDiscussionPointFile");
  });

  it("rute berkas berada di bawah penjaga proyek yang sama dengan titiknya", () => {
    const isi = baca(RUTE);
    const daftar = blok(isi, "// #704 — BERKAS/GAMBAR", "// DISCUSSION POINT THREADED", "rute berkas");
    expect(daftar).toContain('jagaProyek("meetingNotes", "R")');
    expect(daftar).toContain('jagaProyek("meetingNotes", "C")');
    expect(daftar).toContain('jagaProyek("meetingNotes", "D")');
    // Hapus satu berkas harus memastikan induknya lebih dulu (#248).
    expect(daftar).toContain("findFilePointId");
  });
});

describe("skema (#703/#704) — nama huruf kecil utuh, bukan camelCase ber-kutip", () => {
  it("tabel anak dan kolom JSONB baru ada di migrasi", () => {
    const isi = baca(MIGRASI);
    expect(isi).toContain("CREATE TABLE IF NOT EXISTS discussion_point_assignees");
    expect(isi).toContain("CREATE TABLE IF NOT EXISTS discussion_point_files");
    expect(isi).toContain('ADD COLUMN IF NOT EXISTS tags JSONB');
    expect(isi).toContain('ADD COLUMN IF NOT EXISTS links JSONB');
  });

  it("kolom lama tidak dijatuhkan", () => {
    const isi = baca(MIGRASI);
    for (const kolom of ['"assignTo"', "concern", "fitur", "keterangan", '"tindakanLanjut"']) {
      expect(isi).toContain(kolom);
    }
  });
});

describe("§4 — berkas yang dipecah tidak boleh menggembung lagi", () => {
  const batas = 800;
  it.each([
    ["DiscussionPointsTable", TABEL],
    ["FormDiskusi", LAPOR],
    ["BarisDiskusi", BARIS],
    ["BarisCepat", CEPAT],
    ["LaciUtas", "src/features/meeting-notes/components/LaciUtas.tsx"],
    ["PemilihJamak", JAMAK],
  ])("%s di bawah %i baris", (_nama, relatif) => {
    const jumlah = baca(relatif as string).split("\n").length;
    expect(jumlah).toBeLessThan(batas);
  });

  it("tidak ada satu pun komponen baru yang memotong teks data (#645/#647)", () => {
    for (const berkas of [LAPOR, CEPAT, BARIS, JAMAK]) {
      const isi = baca(berkas);
      // `truncate` masih diizinkan pada LABEL kepala/ikon, jadi yang diperiksa
      // ekspresi datanya secara spesifik.
      for (const ekspresi of ["{p.keterangan", "{p.concern", "{p.tindakanLanjut", "{s.label"]) {
        if (!isi.includes(ekspresi)) continue;
        const i = isi.indexOf(ekspresi);
        const tag = isi.slice(i - 260, i);
        expect(tag).not.toContain("line-clamp");
        expect(tag).not.toContain("truncate");
      }
    }
  });
});
