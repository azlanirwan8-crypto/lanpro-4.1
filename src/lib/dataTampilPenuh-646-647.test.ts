/**
 * #646 + #647 — data harus tampil, bukan dipotong di layar.
 *
 * LANJARANNYA. #645 melepas `line-clamp-2` pada sel catatan Discussion Points.
 * Pemilik proyek lalu menunjuk kartu "Document List" flowchart (06 Okt): URL
 * SharePoint ±200 karakter memakai `whitespace-nowrap` sehingga teks MENYELEWANG
 * keluar border kartu — "kan harusnya view card gitu" — lalu meminta sapuan:
 * "ada lagi ngak data yang kepotong".
 *
 * `whitespace-nowrap` pada data panjang adalah kembar dari `truncate`: keduanya
 * membuat teks tidak tampil — yang satu menghilangkannya diam-diam, yang satu
 * lagi membuangnya keluar wadahnya. Gerbang `audit:label` R2 hanya mengenali
 * `truncate` + `max-w-[NNpx]`, jadi pola nowrap ini lolos dari penjaga; itu
 * sebab test ini ada, dan itu juga isi usulan #648.
 *
 * Batas yang dipakai sadar: untuk NAMA ORANG satu baris justru benar (jangan
 * memotong "Gloria Handoyo" jadi dua baris) — yang dilarang di sana adalah
 * memotongnya. Untuk URL, judul, dan keterangan, satu-baris-tanpa-batas adalah
 * cara mereka menghilang. Karena itu `bolehNowrap` ada dan dipakai eksplisit.
 *
 * Test ini MEMBACA SUMBER: yang dikunci kelas pada tag yang merender NILAI DATA
 * (bukan string UI `t("...")`, yang memang boleh satu baris).
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

/** Kelas tag yang merender `ekspresi`. Jangkar "didahului bukan `=` dan bukan
 *  huruf" membuat pencarian tidak tertukar dengan prop bernama sama
 *  (`name={author.name}`) tapi tetap menemukan yang didahului teks lain, seperti
 *  chip epic `🎯 {linkedEpic.title}`. `\s*` menampung gaya prettier yang
 *  menaruh ekspresi di barisnya sendiri. */
const kelasTag = (isi: string, ekspresi: string, berkas: string): string => {
  const pola = new RegExp(`(?<![=\\w])${ekspresi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const ketemu = pola.exec(isi);
  if (!ketemu) throw new Error(`${berkas}: ${ekspresi} tidak ditemukan — jangan hilangkan datanya`);
  const buka = isi.lastIndexOf("<", ketemu.index);
  if (buka < 0) throw new Error(`${berkas}: tag pembungkus ${ekspresi} tidak ketemu`);
  return isi.slice(buka, ketemu.index + 1);
};

const tanpaPotong = (isi: string, ekspresi: string, berkas: string, bolehNowrap = false): void => {
  const kelas = kelasTag(isi, ekspresi, berkas);
  const dilarang = ["truncate", "line-clamp", "text-ellipsis"];
  if (!bolehNowrap) dilarang.push("whitespace-nowrap");
  for (const pemotong of dilarang) {
    if (kelas.includes(pemotong)) {
      throw new Error(`${berkas}: ${ekspresi} masih memakai ${pemotong}\n${kelas.slice(0, 200)}`);
    }
  }
};

const PAPAN = "src/features/flowchart/FlowchartContainer.tsx";
const DAFTAR_MEETING = "src/features/meeting-notes/MeetingNotes.tsx";
const TABEL_FLOW = "src/features/flowchart/components/FlowchartDashboard.tsx";
const KARTU_FLOW = "src/features/flowchart/components/FlowchartMobileCardView.tsx";
const KARTU_MEETING = "src/features/meeting-notes/components/MeetingMobileCardView.tsx";

describe("kartu Document List flowchart (#646)", () => {
  const isi = baca(PAPAN);

  it("nama berkas dan alamat tautan boleh berganti baris", () => {
    tanpaPotong(isi, "{doc.name}", PAPAN);
    tanpaPotong(isi, "{doc.link || doc.fileName}", PAPAN);
  });

  it("alamat panjang dipecah di dalam kartu, bukan meluber keluar", () => {
    // URL tidak punya spasi: `break-words` saja tidak cukup, harus break-all.
    expect(kelasTag(isi, "{doc.link || doc.fileName}", PAPAN)).toContain("break-all");
  });
});

describe("daftar Meeting Notes tampil penuh (#647)", () => {
  const isi = baca(DAFTAR_MEETING);

  it("judul, nama berkas rekaman, dan keterangan tidak dipotong", () => {
    tanpaPotong(isi, "{meeting.title}", DAFTAR_MEETING);
    tanpaPotong(isi, "{meeting.fileName}", DAFTAR_MEETING);
    tanpaPotong(isi, "{meeting.description || (", DAFTAR_MEETING);
  });

  it("nama penulis tidak dipotong, tapi boleh satu baris", () => {
    tanpaPotong(isi, "{author.name}", DAFTAR_MEETING, true);
  });

  it("nama berkas rekaman tampil penuh di detail dan di form", () => {
    tanpaPotong(isi, "{activeMeeting.fileName}", DAFTAR_MEETING);
    tanpaPotong(isi, "{newMeetingFile.name}", DAFTAR_MEETING);
    tanpaPotong(isi, "{editingMeeting.fileName}", DAFTAR_MEETING);
  });

  it("keterangan menghormati baris baru dari pengguna", () => {
    expect(kelasTag(isi, "{meeting.description || (", DAFTAR_MEETING)).toContain(
      "whitespace-pre-wrap"
    );
  });
});

describe("daftar flowchart tampil penuh (#647)", () => {
  const isi = baca(TABEL_FLOW);

  it("nama, deskripsi, dan epic tertaut tidak dipotong", () => {
    tanpaPotong(isi, "{fw.name}", TABEL_FLOW);
    tanpaPotong(isi, "{fw.description ? (", TABEL_FLOW);
    tanpaPotong(isi, "{linkedEpic.title}", TABEL_FLOW);
  });

  it("nama pembuat tidak dipotong", () => {
    tanpaPotong(isi, "{createdBy}", TABEL_FLOW, true);
  });

  it("tinggi baris tidak dikunci lagi", () => {
    // `h-14` pada baris membuat teks yang sudah diizinkan melebar tetap
    // tercekik: tingginya tidak boleh tumbuh.
    expect(isi).not.toMatch(/cursor-pointer h-14/);
  });
});

describe("kartu mobile tampil penuh (#647)", () => {
  const flow = baca(KARTU_FLOW);
  const meeting = baca(KARTU_MEETING);

  it("judul dan keterangan kartu tidak di-clamp", () => {
    tanpaPotong(flow, '{flow.name || "Untitled Diagram"}', KARTU_FLOW);
    tanpaPotong(flow, "{flow.description}", KARTU_FLOW);
    tanpaPotong(meeting, "{meeting.title}", KARTU_MEETING);
    tanpaPotong(meeting, "{meeting.description}", KARTU_MEETING);
  });

  it("epic dan penulis kartu tidak dipotong", () => {
    tanpaPotong(flow, "{epicName}", KARTU_FLOW);
    tanpaPotong(flow, "{author}", KARTU_FLOW, true);
    tanpaPotong(meeting, "{authorName}", KARTU_MEETING, true);
  });
});
