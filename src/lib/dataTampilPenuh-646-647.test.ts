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
 * sebab test ini ada, dan itu juga isi usulan #651.
 *
 * DAN SEKARANG ADA BUKTI KEDUANYA. #647 melepas `truncate` pada tiga sel tabel
 * flowchart TAPI MENINGGALKAN `whitespace-nowrap` pada `<tr>`-nya. Penjaga ini
 * tetap hijau karena ia hanya membaca tag yang merender ekspresi — sedangkan
 * yang meracuni teks ada satu tingkat di atasnya. Pemilik proyek mengirim
 * screenshot pada 08 Okt: "loh kok gini anda kerja nya kurang teliti". Sejak itu
 * dua hal dikunci di sini: setiap sel data yang dilebarkan harus MENYATAKAN
 * sendiri izin berganti barisnya (`bolehMelebar`), dan tidak ada baris DATA
 * yang boleh membawa `whitespace-nowrap` (penjaga ratchet di seluruh `src`).
 *
 * Batas yang dipakai sadar: untuk NAMA ORANG satu baris justru benar (jangan
 * memotong "Gloria Handoyo" jadi dua baris) — yang dilarang di sana adalah
 * memotongnya. Untuk URL, judul, dan keterangan, satu-baris-tanpa-batas adalah
 * cara mereka menghilang. Karena itu `bolehNowrap` ada dan dipakai eksplisit.
 *
 * Test ini MEMBACA SUMBER: yang dikunci kelas pada tag yang merender NILAI DATA
 * (bukan string UI `t("...")`, yang memang boleh satu baris).
 */
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

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
/** Sel data yang dilebarkan WAJIB menyatakan sendiri izin berganti barisnya.
 *  `break-words` saja tidak cukup: `overflow-wrap: break-word` hanya memecah
 *  kata yang tidak muat DI BARISNYA, dan di bawah `white-space: nowrap` dari
 *  leluhur kesempatan berganti baris tidak pernah ada — jadi teks memanjang
 *  satu baris tanpa batas menimpa kolom sebelah. Itulah galat #647 yang
 *  dilaporkan ulang pemilik proyek lewat screenshot 08 Okt. */
const bolehMelebar = (isi: string, ekspresi: string, berkas: string): void => {
  const kelas = kelasTag(isi, ekspresi, berkas);
  if (!/whitespace-(normal|pre-wrap|pre-line)/.test(kelas)) {
    throw new Error(
      `${berkas}: ${ekspresi} melebar tanpa menyatakan izin wrap sendiri ` +
        `(warisan dari baris/induk bisa membatalkannya)\n${kelas.slice(0, 220)}`
    );
  }
};

/** Semua berkas `.tsx` di bawah `src` (sama seperti yang dipindai gerbang lain). */
const berkasTsx = (arah: string): string[] => {
  const out: string[] = [];
  for (const e of readdirSync(arah, { withFileTypes: true })) {
    const p = join(arah, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|dist|\.git/.test(p)) out.push(...berkasTsx(p));
    } else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
};

/** `<tr>` yang MEMAKSA SATU BARIS di luar `<thead>`. Pada baris header nowrap
 *  benar (label kolom pendek); pada baris data ia adalah `truncate` yang
 *  menyamar — datanya tidak hilang, ia keluar dari kolomnya. */
const barisDataNowrap = (): string[] => {
  const temuan: string[] = [];
  for (const mutlak of berkasTsx(join(AKAR, "src"))) {
    const baris = readFileSync(mutlak, "utf8").replace(/\r\n/g, "\n").split("\n");
    const header: [number, number][] = [];
    let buka = -1;
    baris.forEach((l, i) => {
      if (/<thead>/.test(l)) buka = i;
      if (/<\/thead>/.test(l) && buka >= 0) {
        header.push([buka, i]);
        buka = -1;
      }
    });
    baris.forEach((l, i) => {
      if (!/<tr\b/.test(l)) return;
      let kelas = "";
      for (let k = i; k < Math.min(i + 14, baris.length); k++) {
        const m = baris[k].match(/className=\{?"([^"]*)"/);
        if (m) {
          kelas = m[1];
          break;
        }
      }
      if (!/whitespace-nowrap/.test(kelas)) return;
      if (header.some(([a, b]) => i >= a && i <= b)) return;
      temuan.push(`${relative(AKAR, mutlak)}:${i + 1}`);
    });
  }
  return temuan;
};

const DAFTAR_MEETING = "src/features/meeting-notes/MeetingNotes.tsx";
const TABEL_FLOW = "src/features/flowchart/components/FlowchartDashboard.tsx";
const KARTU_FLOW = "src/features/flowchart/components/FlowchartMobileCardView.tsx";
const KARTU_MEETING = "src/features/meeting-notes/components/MeetingMobileCardView.tsx";

describe("kartu Document List flowchart (#646 -> #648)", () => {
  const isi = baca(PAPAN);

  it("dua barisnya tidak memotong dan tidak memaksa satu baris", () => {
    tanpaPotong(isi, "{doc.name || label.berkas || doc.fileName}", PAPAN);
    tanpaPotong(isi, "{label.host || doc.fileName || doc.link}", PAPAN);
  });

  it("token mesin sepanjang 200 karakter tidak lagi dituang ke kartu", () => {
    // #646 pertama: alamat utuh ditampilkan -> kartu jadi lima baris sampah
    // (screenshot 06 Okt). Yang tampil sekarang host + nama berkas terurai.
    expect(isi).not.toMatch(/>\s*\{doc\.link \|\| doc\.fileName\}/);
    expect(isi).toContain("labelTautan(doc.link)");
  });

  it("alamat lengkap tetap reachable: tooltip di barisnya dan tombol salin", () => {
    expect(kelasTag(isi, "{label.host || doc.fileName || doc.link}", PAPAN)).toContain(
      "title={doc.link || doc.fileName}"
    );
    expect(isi).toContain('t("flowchart.salinTautan")');
    expect(isi).toContain("navigator.clipboard.writeText(tautan)");
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

  it("sel data yang dilebarkan menyatakan sendiri izin berganti barisnya (#649)", () => {
    // #647 melepas `truncate` di sini tapi meninggalkan `whitespace-nowrap`
    // pada `<tr>`: teks jadi satu baris panjang menimpa kolom Author, Last
    // Updated, dan Action (screenshot 08 Okt).
    bolehMelebar(isi, "{fw.name}", TABEL_FLOW);
    bolehMelebar(isi, "{fw.description ? (", TABEL_FLOW);
    bolehMelebar(isi, "{linkedEpic.title}", TABEL_FLOW);
  });
});

describe("baris data tidak boleh memaksa satu baris (#649, ratchet seluruh src)", () => {
  /** Garis dasar: satu situs WARISAN yang belum dikerjakan dan belum ada
   *  itemnya di papan — `WikiView.tsx` memakai `whitespace-nowrap h-12` pada
   *  baris datanya. Angka ini boleh MENYUSUT, tidak boleh bertambah. */
  const GARIS_DASAR = ["src/features/wiki/WikiView.tsx"];

  it("tidak ada baris DATA baru yang membawa whitespace-nowrap", () => {
    const temuan = [
      ...new Set(barisDataNowrap().map((t) => t.replace(/:\d+$/, "").replace(/\\/g, "/"))),
    ].sort();
    expect(temuan.filter((t) => !GARIS_DASAR.includes(t))).toEqual([]);
  });

  it("tabel flowchart dan meeting notes bersih dari baris nowrap", () => {
    // Dua layar yang dilaporkan pemilik proyek: keduanya harus NOL temuan,
    // bukan "masuk garis dasar".
    const temuan = barisDataNowrap();
    expect(temuan.filter((t) => /FlowchartDashboard/.test(t))).toEqual([]);
    expect(temuan.filter((t) => /MeetingNotes\.tsx/.test(t))).toEqual([]);
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
