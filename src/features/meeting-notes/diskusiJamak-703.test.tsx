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
/* #707 — `<thead>` pindah ke `components/BagianPapan.tsx` (`KepalaTabel`), dan
 * yang pindah hanya ALAMATNYA: jumlah `<th>` dan kunci kamusnya tetap dikunci di
 * sini. Induknya 780 baris dari batas 800 §4, dan kepala tabel adalah potongan
 * berikutnya yang tidak punya state. Kalau nanti pindah lagi, perbarui alamatnya
 * seperti yang diminta `catatanLengkap-645.test.ts` — jangan hapus testnya. */
const KEPALA = "src/features/meeting-notes/components/BagianPapan.tsx";

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
  /* #714 menurunkan papan dari dua belas kolom; #715 menaikkan lagi ke SEMBILAN
   * setelah PIC dan Target Date dipisah kembali atas permintaan pemilik proyek.
   * Yang TETAP dikunci di
   * sini adalah maksud butir 3 dan butir 5-6 #703/#704: Follow-up punya tempat di
   * tabel, dan tautan serta gambar juga punya tempat. Yang berubah adalah bahwa
   * "punya tempat" tidak lagi berarti "punya kolom sendiri" — ketiganya sekarang
   * tinggal di sel yang berbagi dengan tetangga sepaham. */
  it("kepala tabel punya Follow-up, dan lampiran punya sel sendiri", () => {
    const kepala = blok(baca(KEPALA), "<thead>", "</thead>", "kepala tabel");
    expect(kepala).toContain('t("discussion.followUp")');
    expect(kepala).toContain('t("discussion.thLampiran")');
    // 8 kolom: No, Concern, Notes, Follow-up, Tags, PIC & Target, Lampiran,
    // Status & Action. Baris kosong tidak boleh bokek kolom.
    expect(kepala.match(/<th /g)).toHaveLength(9);
    expect(baca(TABEL)).toContain("colSpan={9}");
  });

  it("tautan dan gambar tetap dirender penuh di sel Lampiran (#704 tidak dicabut)", () => {
    const sel = blok(
      baca(BARIS),
      "tautan.length === 0 && berkas.length === 0",
      "</td>",
      "sel lampiran"
    );
    expect(sel).toContain("{l.label || l.url}"); // tautan, dengan labelnya
    expect(sel).toContain('rel="noopener noreferrer"');
    expect(sel).toContain('loading="lazy"'); // miniatur gambar (#711)
    // Satu sel, satu wadah — bukan dua kolom yang pada papan ini keduanya
    // hanya berisi "-".
    expect(sel.match(/max-h-32 overflow-y-auto/g)).toHaveLength(1);
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
    const daftar = blok(
      isi,
      "// #704 — BERKAS/GAMBAR",
      "// DISCUSSION POINT THREADED",
      "rute berkas"
    );
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
    expect(isi).toContain("ADD COLUMN IF NOT EXISTS tags JSONB");
    expect(isi).toContain("ADD COLUMN IF NOT EXISTS links JSONB");
  });

  it("kolom lama tidak dijatuhkan", () => {
    const isi = baca(MIGRASI);
    for (const kolom of ['"assignTo"', "concern", "fitur", "keterangan", '"tindakanLanjut"']) {
      expect(isi).toContain(kolom);
    }
  });
});

describe("#703/#704 lanjutan — isian papan lengkap, panel tidak terpotong", () => {
  /* Dua cacat yang ditangkap pemilik proyek dari tangkapan layar 12 Okt malam:
   * (1) kepala tabel sudah DUABELAS kolom sejak Follow-up, Tautan, dan Gambar
   *     masuk, tetapi baris cepat masih sembilan sel — sisa kolom bergeser ke
   *     kiri dan tombol "Add" mendarat di bawah THREAD, bukan di bawah ACTION;
   * (2) panel pemilih jamak menempel di DOM sel, sementara wadahnya
   *     `overflow-x-auto` (dua kali: di tabel dan di `ResponsiveTable`). CSS
   *     melipat `overflow-y: visible` menjadi `auto` begitu sumbu satunya auto,
   *     jadi panel apa pun yang menempel di baris terpotong tepi wadahnya.
   *
   * #712 MENGAKHIRI bentuk `<tr>` dua belas sel itu. Yang tetap dikunci di sini
   * adalah MAKSUD aslinya, bukan bentuknya: kepala punya dua belas kolom dan
   * setiap isian papan harus ADA di jalur tambah. Yang dicabut hanya satu
   * asumsinya — bahwa "ada di jalur tambah" berarti "duduk satu sel di bawah
   * nama kolomnya". Asumsi itulah yang membuat Add tidak pernah terlihat
   * bersamaan dengan yang sedang diketik, karena tabelnya 1.818 px lebar. */
  const jumlah = (isi: string, pola: RegExp) => (isi.match(pola) || []).length;

  it("kepala tabel sembilan kolom, dan baris tambah bukan lagi `<tr>`", () => {
    const kolom = jumlah(baca(KEPALA), /<th[\s>]/g);
    // #714 menurunkan ini dari 12, #715 menaikkan ke 9 setelah PIC dan tanggal
    // dipisah lagi; penjaga di berkas ini membaca NAMA kolom, bukan posisi.
    expect(kolom).toBe(9);
    const cepat = baca(CEPAT);
    expect(jumlah(cepat, /<td[\s>]/g)).toBe(0);
    expect(jumlah(cepat, /<tr[\s>]/g)).toBe(0);
  });

  it("delapan isian papan semuanya masih ada di baris tambah desktop", () => {
    const desktop = blok(
      baca(CEPAT),
      "export const BarisCepat",
      "export const BlokCepatMobile",
      "baris tambah"
    );
    for (const ekspresi of [
      "value={nilai.concern}",
      "value={nilai.keterangan}",
      "value={nilai.tindakanLanjut}",
      "nilai={nilai.assigneeIds}",
      "nilai={nilai.tags.map",
      "value={nilai.targetDate}",
      "nilai={nilai.links}",
      "nilai={nilai.berkas}",
    ]) {
      expect(desktop).toContain(ekspresi);
    }
  });

  it("Follow-up dikirim baris cepat dan ikut dibersihkan sesudah tersimpan", () => {
    const isi = baca(TABEL);
    expect(isi).toContain("tindakanLanjut: nilaiCepat.tindakanLanjut.trim()");
    expect(blok(isi, "setNilaiCepat({", "});", "reset baris cepat")).toContain("tindakanLanjut");
  });

  it("baris desktop dan blok HP sama-sama punya textarea Follow-up", () => {
    const isi = baca(CEPAT);
    expect(tag(isi, "value={nilai.tindakanLanjut}", "follow-up cepat")).toContain("textarea");
    expect(jumlah(isi, /value=\{nilai\.tindakanLanjut\}/g)).toBe(2);
  });

  it("panel jamak diportal ke body dan dipasang dengan position fixed", () => {
    const isi = baca(JAMAK);
    expect(isi).toContain("createPortal(");
    expect(isi).toContain('position: "fixed"');
    // Bentuk lama — menempel di sel, dan karena itu terpotong.
    expect(isi).not.toContain("absolute left-0 top-full");
  });

  it("panel dihitung ulang saat tabel digulir dan saat jendela diganti ukuran", () => {
    const isi = baca(JAMAK);
    expect(isi).toContain('addEventListener("scroll"');
    expect(isi).toContain('addEventListener("resize"');
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
