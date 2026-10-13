/**
 * #707 dan #708 — papan Discussion Points harus bisa dibaca.
 *
 * Dua keluhan pemilik proyek 12 Okt lewat tangkapan layar: kepala tabel ikut
 * tergulir sehingga tidak ada lagi yang menamai kolomnya, dan kolom Notes /
 * Follow-up yang panjang membuat tiap baris punya tinggi sendiri. Yang pertama
 * bukan soal kelas `sticky` yang ketinggalan ditulis — ia memang tidak akan
 * pernah bekerja selama ada DUA wadah gulir bertingkat, karena `position:
 * sticky` mengunci ke scrollport TERDEKAT dan yang terdekat itu tingginya
 * mengikuti isi, jadi ia tidak pernah bergulir. Yang kedua terbentur keputusan
 * #645 yang sudah dikunci `catatanLengkap-645.test.ts`: catatan rapat tidak
 * boleh dipotong. Jadi yang dirapikan tingginya, bukan isinya.
 *
 * Test ini MEMBACA SUMBER, seperti dua test lain di folder yang sama. Kelas tata
 * letak tidak melempar galat dan tidak terlihat di `tsc`: satu `overflow-x-auto`
 * tambahan membuat kepala tabel lolos tanpa satu pun perkakas berteriak.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const KEPALA = "src/features/meeting-notes/components/BagianPapan.tsx";
const BARIS = "src/features/meeting-notes/components/BarisDiskusi.tsx";

/** Potongan sumber mulai penanda sampai batas berikutnya. */
const blok = (isi: string, mulai: string, selesai: string, nama: string) => {
  const i = isi.indexOf(mulai);
  if (i < 0) throw new Error(`${nama}: "${mulai}" tidak ditemukan`);
  const j = isi.indexOf(selesai, i);
  if (j < 0) throw new Error(`${nama}: batas akhir "${selesai}" tidak ditemukan`);
  return isi.slice(i, j);
};

/** Pembungkus sebuah ekspresi data: dari `<div` terakhir sebelum ekspresi itu. */
const pembungkus = (isi: string, ekspresi: string) => {
  const i = isi.indexOf(ekspresi);
  if (i < 0) throw new Error(`"${ekspresi}" tidak ditemukan — jangan hilangkan fieldnya`);
  const buka = isi.lastIndexOf("<div", i);
  if (buka < 0) throw new Error(`"${ekspresi}": tidak ada pembungkusnya`);
  return isi.slice(buka, i);
};

describe("#707 — kepala tabel melekat", () => {
  it("hanya ada SATU wadah gulir antara tabel dan layar", () => {
    const isi = baca(TABEL);
    // `ResponsiveTable` menambahkan `overflow-x-auto`-nya sendiri di dalam
    // wadah gulir papan, dan itulah yang membuat sticky mengunci ke kotak yang
    // tidak pernah bergulir.
    expect(isi).not.toContain("<ResponsiveTable");
    expect(blok(isi, "Desktop Table Container", "<KepalaTabel", "wadah desktop")).toContain(
      "<table"
    );
  });

  it("wadah desktop menggulir dua sumbu dan punya tinggi pasti", () => {
    const wadah = blok(baca(TABEL), "Desktop Table Container", "<KepalaTabel", "wadah desktop");
    // `min-h-0` + `flex-1` memberi wadah itu tinggi yang TERBATAS; tanpa itu
    // tingginya mengikuti isi dan tidak ada yang bisa digulir sama sekali.
    expect(wadah).toContain("overflow-auto");
    expect(wadah).toContain("flex-1");
    expect(wadah).toContain("min-h-0");
  });

  it("sel kepala sticky dengan latar yang tidak tembus pandang", () => {
    const kelas = blok(baca(KEPALA), "const th =", "return (", "kelas kepala");
    expect(kelas).toContain("sticky top-0");
    expect(kelas).toContain("bg-surface-sunken");
    // Latar tembus (`/5`, `/40`) membuat baris yang lewat di bawah kepala
    // terlihat menembusnya. Standar #422 (`bg-primary-surface/5`) aman selama
    // kepalanya tidak melekat; begitu melekat, ia jadi cacat.
    expect(kelas).not.toMatch(/bg-[\w-]+\/\d+/);
  });

  it("garis kepala dan garis baris hidup di SEL, bukan di baris", () => {
    const isi = baca(KEPALA);
    expect(isi).toContain("border-b border-border-subtle");
    // `border-separate` (syarat garis kepala ikut melekat) membuat border pada
    // baris tidak digambar — jadi `divide-y` di tbody menghasilkan nol garis.
    // Pemisah baris karenanya pindah ke `SEL`, yang dipakai baris data DAN
    // baris cepat supaya keduanya bergerak bersamaan.
    expect(isi).toContain("border-b border-border-faint");
    expect(baca(TABEL)).toContain("border-separate");
    expect(baca(TABEL)).not.toContain("divide-y");
    expect(baca(BARIS)).toContain("cn(SEL,");
  });
});

describe("#708 — dua belas kolom yang tidak lagi memanjang tanpa batas", () => {
  it("lebar kolom ditetapkan dari kepala, dan tabelnya table-fixed", () => {
    const kepala = blok(baca(KEPALA), "<thead>", "</thead>", "kepala tabel");
    expect(baca(TABEL)).toContain("table-fixed");
    // Tanpa `table-fixed`, `width` pada sel kepala hanya sebuah saran dan
    // isi terpanjang tetap menentukan lebar kolomnya.
    expect(kepala.match(/w-\[\d+px\]/g)?.length).toBeGreaterThanOrEqual(11);
  });

  it.each([
    ["{p.concern}", "concern"],
    ["{p.keterangan || p.comment", "catatan"],
    ["{p.tindakanLanjut || p.next_action}", "follow-up"],
  ])("sel %s dibatasi TINGGINYA, bukan isinya", (ekspresi, _nama) => {
    const pembungkusSel = pembungkus(baca(BARIS), ekspresi);
    expect(pembungkusSel).toContain("whitespace-pre-wrap");
    expect(pembungkusSel).toContain("max-h-32");
    expect(pembungkusSel).toContain("overflow-y-auto");
    // Janji #645 tidak dicabut di sini: tidak ada satu pun bentuk pemotongan.
    expect(pembungkusSel).not.toContain("line-clamp");
    expect(pembungkusSel).not.toContain("truncate");
  });

  it("sel teks rata atas supaya baris yang berbeda tinggi tidak bergeser", () => {
    const isi = baca(BARIS);
    expect(isi.match(/align-top/g)?.length).toBeGreaterThanOrEqual(9);
  });
});

describe("#708 lanjutan — baris cepat satu pita, bukan empat tinggi", () => {
  /* Pemilik proyek 12 Okt, tangkapan layar kedua: "ini kok field entry nya
   * tidak sama ukuran nya". Terukur: input 30 px, textarea 46 px, tombol
   * pemilih 32 px, tombol tambah tautan/gambar 18 px — empat garis dasar pada
   * satu baris. Yang diseragamkan adalah TINGGI.
   *
   * #712 mencatat batas aturan ini: menyeragamkan tinggi NYATA-NYATA tidak
   * cukup, dan buktinya adalah baris yang sama tetap dilaporkan berantakan
   * sesudah test ini hijau. Yang salah adalah jumlah lajur yang dipaksa muat
   * satu baris, bukan angkanya. Test ini karena itu bertahan sebagai penjaga
   * pita tinggi — sekarang pada sebuah BAR di luar tabel, bukan pada `<tr>`;
   * bentuk barisnya dikunci `barTambah-712.test.ts`. */
  const CEPAT = "src/features/meeting-notes/components/BarisCepat.tsx";
  const JAMAK = "src/features/meeting-notes/components/PemilihJamak.tsx";

  /** Hanya baris DESKTOP: blok HP adalah kartu bertumpuk, bukan satu baris. */
  const desktop = () => {
    const isi = baca(CEPAT);
    const mulai = isi.indexOf("export const BarisCepat");
    const akhir = isi.indexOf("export const BlokCepatMobile");
    if (mulai < 0 || akhir < 0) throw new Error("batas baris desktop tidak ditemukan");
    return isi.slice(mulai, akhir);
  };

  it("satu konstanta tinggi dipakai isian dan tombol", () => {
    const isi = baca(CEPAT);
    expect(isi).toContain('const TINGGI = "h-11"');
    expect(isi).toMatch(/const isianKelas = `w-full min-w-0 \$\{TINGGI\}/);
    // Tombol memakai min-h: isinya chip, dan dua nama panjang boleh dua baris.
    expect(isi).toContain("min-h-11");
  });

  it("tidak ada lagi tinggi lama yang berseliweran di baris desktop", () => {
    const isi = desktop();
    expect(isi).not.toContain("h-8");
    expect(isi).not.toContain("min-h-[42px]");
    expect(isi).not.toContain("resize-y");
    expect(isi).not.toContain("h-auto");
  });

  it("textarea menggulir di dalam kotaknya, bukan memanjangkan baris", () => {
    const isi = desktop();
    expect(isi.match(/resize-none overflow-y-auto/g)).toHaveLength(2);
  });

  it("pembuka tautan dan berkas setinggi kontrol di sebelahnya saat kosong", () => {
    const isi = baca(CEPAT);
    expect(isi).toContain("const tombolSambung =");
    expect(
      isi.match(/nilai\.length === 0 \? tombolSambung : tombolKecil/g)?.length
    ).toBeGreaterThanOrEqual(1);
    expect(isi).toContain("nilai.length === 0 ? tombolSambung : tombolKecil");
  });

  it("pemilih jamak membatasi ringkasannya pada dua chip plus penghitung", () => {
    const isi = baca(JAMAK);
    expect(isi).toContain("const CHIP_TERPAKAI = 2;");
    expect(isi).toContain("terpilih.slice(0, CHIP_TERPAKAI)");
    expect(isi).toContain('t("discussion.sisaJamak"');
    // Yang tidak tampil tidak hilang: panelnya tetap satu klik jauhnya.
    expect(isi).toContain("tersaring.map(");
  });
});

describe("#708 lanjutan — isi panel pemilih jamak", () => {
  const JAMAK = "src/features/meeting-notes/components/PemilihJamak.tsx";

  it("kode tugas tidak ditampilkan lagi di daftar pilihan", () => {
    // Pemilik proyek 13 Okt: "wmir - id nya jangan di tampilkan hapus saja".
    // Yang dicabut bukan hanya render-nya: `OpsiJamak` tidak lagi punya kolom
    // kedua, dan pemanggilnya tidak lagi mengirim `t.key` — kalau tidak, ia
    // tetap ikut menyaring pencarian padahal tidak terlihat.
    expect(baca(JAMAK)).not.toContain("keterangan");
    expect(baca(TABEL)).not.toContain("keterangan: t.key");
  });

  it("opsi panjang tidak membuat kotak centang melayang", () => {
    const isi = baca(JAMAK);
    expect(isi).toContain("flex items-start gap-2.5");
    expect(isi).toContain("mt-px");
    // Lebar minimum 280 px: pada 240 px judul isu memakan tiga baris.
    expect(isi).toContain("Math.max(kotak.width, 280)");
  });

  it("penanda terpilih datang dari latar dan centang, bukan dari warna teks", () => {
    const isi = baca(JAMAK);
    const mulai = isi.indexOf("tersaring.map(");
    const baris = isi.slice(mulai, isi.indexOf("</button>", mulai));
    expect(baris).toContain('aktif ? "bg-primary/10"');
    expect(baris).not.toContain("text-primary");
  });
});

describe("#708 lanjutan — paragraf yang diketik sampai sebagai paragraf", () => {
  const PARAGRAF = "src/features/meeting-notes/components/Paragraf.tsx";
  const KARTU = "src/features/meeting-notes/components/DiscussionPointMobileCardView.tsx";
  const LAPOR = "src/features/meeting-notes/components/FormDiskusi.tsx";

  it("pemecahnya baris kosong, dan \\r\\n ditempel dari dokumen Windows tetap dikenali", () => {
    const isi = baca(PARAGRAF);
    expect(isi).toContain('replace(/\\r\\n/g, "\\n")');
    expect(isi).toContain("split(/\\n{2,}/)");
  });

  it("tidak ada HTML yang dirender — teks masuk sebagai anak elemen", () => {
    // Arah A dipilih justru karena ia tidak membuka jalur injeksi. Kalau ini
    // berubah, yang berubah adalah keputusannya — bukan detail teknisnya.
    for (const berkas of [PARAGRAF, BARIS, KARTU, LAPOR]) {
      expect(baca(berkas)).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("tabel dan kartu HP memakai satu perender yang sama (#645: satu perilaku)", () => {
    expect(baca(BARIS)).toContain("<Paragraf teks={p.keterangan || p.comment");
    expect(baca(BARIS)).toContain("<Paragraf teks={p.concern}");
    expect(baca(BARIS)).toContain("<Paragraf teks={p.tindakanLanjut || p.next_action}");
    expect(baca(KARTU)).toContain("<Paragraf teks={p.keterangan}");
    expect(baca(KARTU)).toContain("<Paragraf teks={p.tindakanLanjut}");
  });

  it("janji #645 tetap terbaca di sel: pembungkusnya masih whitespace-pre-wrap", () => {
    // `catatanLengkap-645.test.ts` membaca 400 karakter sebelum ekspresi data.
    // Memindahkan kelas ke dalam komponen Paragraf akan membuatnya merah —
    // pembungkus sel memang sengaja tetap memakainya.
    const isi = baca(BARIS);
    const i = isi.indexOf("{p.keterangan");
    expect(isi.slice(i - 400, i)).toContain("whitespace-pre-wrap");
  });

  it("laci sunting memakai SATU tinggi textarea dan satu baris petunjuk", () => {
    const isi = baca(LAPOR);
    /* #712 — Concern, Notes, dan Follow-up dulunya tiga angka (80/72/72 px).
     * Ketiganya kini satu konstanta; yang dikunci di sini konstantanya DAN
     * jumlah pemakaiannya, supaya tidak ada field yang menyelinap pulang. */
    expect(isi).toContain(
      "const textareaKelas = `${dasarIsian} min-h-[80px] py-2 leading-relaxed`;"
    );
    expect(isi.match(/className=\{textareaKelas\}/g)).toHaveLength(3);
    expect(isi).toContain('t("discussion.hintParagraf")');
  });
});
