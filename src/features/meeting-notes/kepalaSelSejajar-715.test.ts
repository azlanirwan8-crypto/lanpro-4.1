/**
 * #715 — KEPALA dan SEL harus menyebut kolom yang sama pada posisi yang sama.
 *
 * Ini bukan test gaya. #714 menulis kepala sebagai
 * `Notes → Follow-up → Context/Tags` sementara baris datanya tetap
 * `Notes → Context/Tags → Follow-up`. Hasilnya: kolom berjudul "FOLLOW UP"
 * menampilkan TAG, dan kolom "CONTEXT / TAGS" menampilkan teks follow-up. Dua
 * kolom bertukar isi, di layar, di production, dan TIDAK ADA SATU PUN PERKAKAS
 * YANG BERTERIAK:
 *
 *   - `tsc` tidak tahu kolom mana berisi apa — keduanya cuma `<td>`.
 *   - `vite build` hijau; kelas Tailwind hanyalah string.
 *   - `audit:warna`, `audit:tema`, `audit:label` tidak melihat urutan.
 *   - Test #703 yang mengunci "Follow-up punya kolom" hanya mengecek bahwa
 *     kuncinya ADA di kepala — dan memang ada, hanya di posisi yang salah.
 *
 * Yang terakhir itu pelajaran yang lebih besar dari bug-nya: penjaga yang
 * memeriksa KEADAAN ("ada kolom follow-up") tidak menangkap PERMUKINAN
 * ("kolom follow-up berdiri di atas data tag"). Yang menangkapnya hanya
 * perbandingan URUTAN antara dua berkas, dan itu yang dilakukan test ini.
 *
 * Membaca sumber, seperti saudara-saudaranya di folder ini, karena yang dikunci
 * adalah korespondensi posisi — dan jsdom tidak melakukan layout, jadi merender
 * pun tidak akan menunjukkan kolom mana yang salah label di mata pengguna.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const KEPALA = "src/features/meeting-notes/components/BagianPapan.tsx";
const BARIS = "src/features/meeting-notes/components/BarisDiskusi.tsx";
const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const MOBILE = "src/features/meeting-notes/components/DiscussionPointMobileCardView.tsx";

/**
 * Pasangan (kunci kepala, penanda sel) dalam URUTAN yang benar. Menambah kolom
 * berarti menambah satu baris di sini — dan kalau lupa menuanya di salah satu
 * berkas, assertion posisi jatuh, bukan lolos diam-diam.
 *
 * #792 — sepuluh, dan yang di posisi satu bukan lagi "No": pil status dan badge
 * komentar pindah ke kolom PERTAMA karena keduanya adalah keadaan yang dibaca,
 * sementara sunting dan hapus — perintah, bukan keadaan — tetap di kanan dan
 * menjadi kolomnya sendiri.
 */
const PASANGAN: [string, string][] = [
  ['t("discussion.thStatus")', "onClick={onToggleStatus}"],
  ['t("discussion.thNo")', "{nomor}"],
  ['t("discussion.thConcern")', "<Paragraf teks={p.concern}"],
  ['t("discussion.thNotes")', "<Paragraf teks={p.keterangan"],
  ['t("discussion.thContextTags")', "tag.map((s) =>"],
  ['t("discussion.followUp")', "<Paragraf teks={p.tindakanLanjut"],
  ['t("discussion.thPic")', "namaPenerima.map("],
  ['t("discussion.thTargetDate")', "{p.targetDate ?"],
  ['t("discussion.thLampiran")', "{tautan.map((l) =>"],
  ['t("discussion.thAction")', "onClick={onEdit}"],
];

const blok = (isi: string, mulai: string, selesai: string) => {
  const i = isi.indexOf(mulai);
  if (i < 0) throw new Error(`"${mulai}" tidak ditemukan`);
  const j = isi.indexOf(selesai, i);
  if (j < 0) throw new Error(`batas akhir "${selesai}" tidak ditemukan`);
  return isi.slice(i, j);
};

const posisi = (isi: string, penanda: string, nama: string) => {
  const i = isi.indexOf(penanda);
  if (i < 0) throw new Error(`${nama}: penanda "${penanda}" hilang — jangan buang kolomnya`);
  return i;
};

const menaik = (angka: number[]) => angka.every((n, i) => i === 0 || n > angka[i - 1]);

describe("#715 — kepala dan sel menyebut kolom yang sama", () => {
  it("keduanya memuat SEMUA kolom yang berpasangan", () => {
    const kepala = blok(baca(KEPALA), "<thead>", "</thead>");
    const baris = baca(BARIS);
    for (const [k, s] of PASANGAN) {
      expect(kepala).toContain(k);
      expect(baris).toContain(s);
    }
  });

  it("keduanya menaruh kolom di POSISI yang sama", () => {
    const kepala = blok(baca(KEPALA), "<thead>", "</thead>");
    const baris = baca(BARIS);
    const urutKepala = PASANGAN.map(([k]) => posisi(kepala, k, "kepala"));
    const urutSel = PASANGAN.map(([, s]) => posisi(baris, s, "sel"));
    // Masing-masing harus menaik pada urutan yang sama. Kalau kepala menulis
    // follow-up sebelum tags sementara sel menulis tags sebelum follow-up, salah
    // satu daftar ini berhenti menaik — dan itu persis cacat #714.
    expect(menaik(urutKepala)).toBe(true);
    expect(menaik(urutSel)).toBe(true);
  });

  it("jumlah kepala, jumlah sel, dan colSpan baris kosong satu angka yang sama", () => {
    const kepala = blok(baca(KEPALA), "<thead>", "</thead>");
    const nKepala = (kepala.match(/<th /g) || []).length;
    const nSel = (baca(BARIS).match(/<td /g) || []).length;
    expect(nKepala).toBe(PASANGAN.length);
    expect(nSel).toBe(PASANGAN.length);
    expect(baca(TABEL)).toContain(`colSpan={${PASANGAN.length}}`);
  });
});

describe("#715 — jumlah lebar kepala dan min-w wadah tidak boleh berbeda", () => {
  /* Perulangan yang sama, bentuk lain: satu angka ditulis di kepala, angka lain
   * ditulis di induk, dan selama tidak ada yang menjumlahkan yang pertama,
   * keduanya boleh menyimpang tanpa terlihat. 1.818 px lahir dari situ. */
  it("min-w wadah Persis sama dengan jumlah lebar kolom", () => {
    const kepala = blok(baca(KEPALA), "<thead>", "</thead>");
    const lebar = (kepala.match(/w-\[\d+px\]/g) || []).map((s) =>
      Number(/\[(\d+)px\]/.exec(s)![1])
    );
    expect(lebar).toHaveLength(PASANGAN.length);
    const total = lebar.reduce((a, b) => a + b, 0);
    const wadah = Number(/min-w-\[(\d+)px\]/.exec(baca(TABEL))?.[1] ?? -1);
    expect(wadah).toBe(total);
  });
});

describe("#715 — papan ikut keputusan garis #699 dan #678b", () => {
  it("pemisah baris memakai garis setajam garis kontrol, bukan yang nyaris tak terlihat", () => {
    // #699 mengukur `border-border-faint` hanya 1,096:1 terhadap putih, jadi
    // baris papan ini mengalir satu sama lain. Daftar Isu sudah pindah lebih
    // dulu; papan ini menyusul.
    expect(baca(KEPALA)).toContain("border-b border-b-border-subtle");
    // Pemisah KOLOM tetap faint (#678b): garis setajam kontrol di setiap kolom
    // mengubah tabel menjadi kisi.
    expect(baca(KEPALA)).toContain("border-r border-r-border-faint");
  });

  it("warna garis ditulis PER SISI, bukan dua warna untuk semua sisi", () => {
    // `border-border-subtle border-border-faint` dalam satu kelas tidak akan
    // bekerja: keduanya mengatur `border-color` untuk semua sisi dan pemenangnya
    // ditentukan urutan stylesheet, bukan maksud penulisnya.
    const sel = /export const SEL =\s*\n?\s*"([^"]+)"/.exec(baca(KEPALA))![1];
    expect(sel).toContain("border-b-border-subtle");
    expect(sel).toContain("border-r-border-faint");
    // Yang dilarang adalah bentuk SEMUA SISI: `border-border-<token>`. Perlu
    // awalan "border-" yang berdiri sendiri, karena kelas per-sisi yang ditulis
    // di atas juga memuat nama tokennya — dan itu justru yang kita mau.
    expect(sel).not.toMatch(/\sborder-border-[a-z]/);
  });

  it("pil status memakai token, bukan palet Tailwind", () => {
    // Kelas lama datang dari palet mentah dan tidak punya padanan mode gelap:
    // teks gelap di atas kartu gelap. Token `--color-warning-text` diturunkan
    // untuk kedua mode (§22). Papan dan kartu mobile adalah pil yang SAMA untuk
    // data yang sama (#645 satu perilaku), jadi keduanya ikut disapu — dan kalau
    // salah satu kembali ke palet, penjaga ini yang berteriak.
    const berkas = [BARIS, MOBILE];
    for (const nama of berkas) {
      const isi = baca(nama);
      expect(isi).toContain("bg-warning/10 text-warning-text border border-warning/30");
      expect(isi).toContain("bg-success/10 text-success-text border border-success/30");
      for (const palet of ["amber-", "emerald-", "rose-", "slate-", "gray-"]) {
        expect(isi).not.toContain(`${palet}500`);
        expect(isi).not.toContain(`${palet}600`);
        expect(isi).not.toContain(`${palet}700`);
      }
    }
  });

  it("kepala tabel memakai ritme kit rumah, bukan ukuran sendiri", () => {
    const th = blok(baca(KEPALA), "const th =", "return (");
    // `tableHeaderCell` di `src/features/issues/styles.ts`: 10px, py-2.5.
    expect(th).toContain("text-[10px]");
    expect(th).toContain("py-2.5");
    expect(th).not.toContain("text-xs");
    // Sel data ikut menipis satu tingkat supaya kepala dan badan satu ritme.
    expect(baca(BARIS).match(/cn\(SEL, "py-2\.5/g)?.length).toBeGreaterThanOrEqual(9);
  });
});
