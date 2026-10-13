/**
 * #712 — jalur TAMBAH DATA tidak boleh hidup di dalam guliran tabel.
 *
 * Pemilik proyek membuka papan Discussion Points 13 Okt dengan empat tangkapan
 * layar dan satu kalimat: "ui nya berantakan tidak clean tambah data nya". Yang
 * terlihat pada layar itu adalah bentuk yang sudah dibenahi #708 — tingginya
 * sudah satu pita — sehingga sisanya bukan angka yang salah, melainkan bentuk
 * yang salah: baris tambah adalah `<tr>` dengan dua belas `<td>`, satu per kolom
 * kepala, dan tabelnya `min-w-[1818px]`. Pada layar 1440 px ada 378 px yang
 * selalu terpotong, jadi menulis Concern menggeser Add ke luar layar dan
 * mengejar Add menggeser Concern ke kiri. Tidak ada lebar kolom yang bisa
 * memperbaiki itu; yang harus berpindah adalah barisnya.
 *
 * Test ini MEMBACA SUMBU (urutan), bukan hanya isi: yang dikunci adalah bahwa
 * `<BarisCepat>` datang SESUDAH `</tbody>`, karena itu satu-satunya cara
 * memastikan ia tidak ikut wadah gulir. Kelas tata letak tidak melempar galat
 * dan tidak terlihat di `tsc` — pelajaran yang sama yang membuat
 * `tataletakPapan-707.test.ts` ada.
 *
 * Acuan yang ditiru bukan karangan: `IssueQuickCreateBar.tsx` (Daftar Isu) sudah
 * setahun memakai bar di luar gulir untuk hal yang sama, dan
 * `IssueTableInlineAddRow.tsx` memindah Save/Cancel ke sel DEPAN justru karena
 * alasan yang sama.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const CEPAT = "src/features/meeting-notes/components/BarisCepat.tsx";
const KEPALA = "src/features/meeting-notes/components/BagianPapan.tsx";
const JAMAK = "src/features/meeting-notes/components/PemilihJamak.tsx";
const LAPOR = "src/features/meeting-notes/components/FormDiskusi.tsx";

/** Potongan sumber mulai penanda sampai batas berikutnya. */
const blok = (isi: string, mulai: string, selesai: string, nama: string) => {
  const i = isi.indexOf(mulai);
  if (i < 0) throw new Error(`${nama}: "${mulai}" tidak ditemukan`);
  const j = isi.indexOf(selesai, i);
  if (j < 0) throw new Error(`${nama}: batas akhir "${selesai}" tidak ditemukan`);
  return isi.slice(i, j);
};

describe("#712 — baris tambah keluar dari wadah gulir", () => {
  it("<BarisCepat> dirender SESUDAH `</tbody>`, bukan di dalamnya", () => {
    const isi = baca(TABEL);
    const penutup = isi.indexOf("</tbody>");
    const baris = isi.indexOf("<BarisCepat");
    expect(penutup).toBeGreaterThan(-1);
    expect(baris).toBeGreaterThan(-1);
    // Ini inti itemnya. Selama `<BarisCepat>` duduk di antara `<tbody>` dan
    // `</tbody>`, ia mewarisi `overflow-auto` + `min-w-[1818px]` dan tombol
    // Add-nya tidak pernah terlihat bersamaan dengan yang sedang diketik.
    expect(baris).toBeGreaterThan(penutup);
    expect(isi.indexOf("</table>")).toBeLessThan(baris);
  });

  it("baris desktop hanya tampil di layar lebar, blok HP tetap ada", () => {
    // Bar ini memakai lebar viewport untuk menyempitkan lajurnya; di bawah
    // 640px yang dipakai tetap kartu bertumpuk (`BlokCepatMobile`), supaya
    // dua jalur tidak berebut ruang yang sama.
    const desktop = blok(
      baca(CEPAT),
      "export const BarisCepat",
      "export const BlokCepatMobile",
      "baris desktop"
    );
    expect(desktop).toContain("hidden sm:block");
    expect(baca(CEPAT)).toContain("export const BlokCepatMobile");
  });

  it("tautan dan berkas diatur lewat tombol penghitung, bukan lajur sendiri", () => {
    const desktop = blok(
      baca(CEPAT),
      "export const BarisCepat",
      "export const BlokCepatMobile",
      "baris desktop"
    );
    expect(desktop).toContain("aria-expanded={lampiranTerbuka}");
    // #709 tidak dicabut: keduanya masih bisa diisi dari layar ini.
    expect(desktop).toContain("<PenyuntingTautan");
    expect(desktop).toContain("<AntreanBerkas");
    // ...tetapi tidak lagi di lajur utama, karena di sanalah keduanya tumbuh
    // ke bawah sementara lajur lain tetap 44 px.
    expect(desktop).toContain("{lampiranTerbuka && (");
  });
});

describe("#712 — sel tidak boleh menggambar di atas kolom tetangga", () => {
  /* `table-fixed` MEMATOKAN lebar kolom, tetapi tidak membuang konten yang
   * lebih lebar: sisanya tetap digambar melewati tepi sel. Itulah chip nama
   * berkas di kolom THREAD dan kotak tag di kolom Follow Up pada tangkapan
   * layar 13 Okt. `ea671294` menambal PANEL-nya (portal); yang belum adalah
   * PEMICUNYA dan pagar umum di setiap sel. */
  it("kelas SEL mengunci luberan di tingkat sel", () => {
    // #714 menambahkan garis pemisah antar kolom pada kelas yang sama.
    expect(baca(KEPALA)).toContain(
      'export const SEL = "px-4 border-b border-border-faint border-r last:border-r-0 overflow-hidden"'
    );
  });

  it("pemicu pemilih jamak mengunci luberan chip", () => {
    const tombol = blok(baca(JAMAK), "className={cn(", "buttonClassName", "pemicu jamak");
    expect(tombol).toContain("overflow-hidden");
  });
});

describe("#712 — laci sunting memakai primitif Modal rumah", () => {
  /* `Modal` (`src/components/ui/Modal.tsx`) dipakai 21 berkas dan menyediakan
   * Portal, Escape, kunci gulir body, dan bottom-sheet di HP. Bentuk lama
   * menulis ulang krom itu sendiri dan karena itu kehilangan keempatnya. */
  it("FormDiskusi mengimpor Modal dan tidak lagi memasang z-[9999]", () => {
    const isi = baca(LAPOR);
    expect(isi).toContain('import { Modal } from "../../../components/ui/Modal"');
    expect(isi).toContain("<Modal");
    expect(isi).not.toContain("z-[9999]");
    expect(isi).not.toContain("fixed inset-0");
  });

  it("satu pita tinggi untuk seluruh kontrol satu baris laci", () => {
    const isi = baca(LAPOR);
    expect(isi).toContain("const isianKelas = `${dasarIsian} h-11`;");
    // `h-9` dipatok pada tombol pemilih sementara isinya `flex-wrap` — chip
    // ketiga digambar melewati garis bawah kotaknya. `min-h` menggantikannya.
    expect(isi).toContain("const tombolKelas = `${dasarIsian} min-h-11 text-left font-medium`;");
    expect(isi).not.toContain("h-9 px-3");
  });
});
