/**
 * #805 — JUDUL daftar ikut rata kiri-kanan, bukan hanya deskripsi.
 *
 * Permintaan pemilik proyek 02 Nov 2026, lewat tangkapan layar tabel Catatan
 * Rapat: "judul rapat tidak rata kiri kanan ini". Akarnya bukan salah tulis:
 * sel keterangan di baris yang SAMA sudah `text-justify` sejak #773
 * ("pastikan rata kiri kanan align khususnya deskripsi") dan #765d, sementara
 * sel judul tidak pernah masuk lingkup keduanya. Dua sel berdampingan dengan
 * dua perilaku teks berbeda — itu yang dibaca mata sebagai berantakan.
 *
 * Yang membuat item ini ada bukan selera, melainkan KEARIFAN LOKAL: repo ini
 * sudah terpecah dua. Poin Diskusi menjustifikasi teks judulnya
 * (`BarisDiskusi.tsx:235`, `DiscussionPointMobileCardView.tsx:202`) sementara
 * tiga daftar lebar membiarkannya rata kiri. Keputusan pemilik: SATU aturan
 * untuk semua judul (opsi B), jadi yang berubah adalah tiga daftar itu, bukan
 * Poin Diskusi.
 *
 * Test ini MEMBACA SUMBER, seperti saudara-saudaranya, karena yang dikunci ada
 * pada kelas di JSX dan jsdom tidak menghitung layout: `text-justify` yang
 * hilang tidak bisa dilihat dari render, dan `audit:warna`/`audit:tema` tidak
 * melihat perataan teks.
 *
 * BATAS YANG DIUKUR DAN SENGAJA TIDAK DIMASUKKAN. `text-justify` hanya
 * merentang baris yang BUKAN baris terakhir, jadi ia tidak ada artinya pada
 * teks yang tidak pernah berganti baris. Judul di layar rincian hidup di
 * `DetailViewChrome.tsx:87-90` sebagai `<span className="truncate">` satu baris
 * warisan #425 — menambah `text-justify` di sana menghasilkan no-op, dan
 * membuatnya berganti baris berarti mencabut keputusan #425, bukan mengerjakan
 * #805. Nama berkas (`NamaBerkas`, #771) dan label pendek satu baris juga di
 * luar daftar karena alasan yang sama: yang dijaga di sini adalah judul yang
 * MEMANG boleh melebar.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

/** (berkas, kelas LENGKAP tag yang merender judul). Kelas ditulis utuh, bukan
 *  hanya `text-justify`, karena dua alasan: `text-justify` tanpa izin berganti
 *  baris adalah no-op — maka `whitespace-normal break-words` ikut terkunci di
 *  string yang sama — dan satu kata yang hilang di tengah kelas tidak boleh
 *  lolos diam-diam. */
const JUDUL: [string, string][] = [
  ["src/features/meeting-notes/MeetingNotes.tsx", "whitespace-normal break-words text-justify"],
  [
    "src/features/meeting-notes/components/MeetingMobileCardView.tsx",
    "text-sm font-semibold text-content-strong whitespace-normal break-words leading-snug text-justify",
  ],
  ["src/features/wiki/WikiView.tsx", "max-w-[320px] whitespace-normal break-words text-justify"],
  [
    "src/features/wiki/components/WikiMobileCardView.tsx",
    "text-sm font-semibold text-content-strong leading-snug whitespace-normal break-words text-justify",
  ],
  [
    "src/features/flowchart/components/FlowchartDashboard.tsx",
    "max-w-[280px] whitespace-normal break-words text-justify",
  ],
  [
    "src/features/flowchart/components/FlowchartMobileCardView.tsx",
    "text-sm font-semibold text-content-strong whitespace-normal break-words leading-snug text-justify",
  ],
];

describe("#805 — judul tiga daftar rata kiri-kanan", () => {
  it.each(JUDUL)("%s menyimpan perataan dan izin berganti baris sekaligus", (berkas, kelas) => {
    expect(baca(berkas)).toContain(kelas);
  });

  it("Poin Diskusi tetap justify: keputusan #765d tidak dibalik ke kiri", () => {
    // Yang bergerak adalah tiga daftar, bukan papan. Kalau penjaga ini merah
    // karena seseorang menghapus `text-justify` dari `concern`, itu #805 yang
    // dijalankan terbalik (opsi C, sudah ditolak pemilik proyek).
    expect(baca("src/features/meeting-notes/components/BarisDiskusi.tsx")).toContain(
      "leading-snug whitespace-pre-wrap break-words text-justify"
    );
    expect(
      baca("src/features/meeting-notes/components/DiscussionPointMobileCardView.tsx")
    ).toContain("text-xs font-semibold text-content-strong leading-relaxed text-justify");
  });

  it("satu primitif rincian untuk tiga modul, jadi justify judul tidak pernah di sana", () => {
    // Judul rincian SATU BARIS dengan `truncate` (#425) dan dipakai tiga modul
    // lewat satu komponen. Ia sengaja tidak ikut #805; test ini mencatat bahwa
    // yang tidak ikut adalah keputusan, bukan kelalaian — dan kalau kelak
    // pemilik memutuskan judul rincian boleh melebar, itu item BARU, bukan
    // tambahan diam-diam di sini.
    const chrome = baca("src/components/ui/DetailViewChrome.tsx");
    expect(chrome).toContain('<span className="truncate">{title}</span>');
    expect(chrome).not.toContain("text-justify");
  });
});
