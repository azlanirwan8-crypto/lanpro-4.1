/**
 * #777 — semua toast sonner bergaya Velzon "left border" (alert-border-left).
 *
 * Pemilik proyek, 17 Okt 2026: "saya mau semuanya untuk menggunakan styling
 * velzon yang di gambar ke 2 ... cek semua alert nya". Gambar itu adalah demo
 * Alert Border Left templat Velzon: latar lembut, garis kiri 3 px berwarna
 * aksen, teks gelap terbaca, outline halus.
 *
 * Ada 495 pemanggilan `toast.*` di 54 berkas yang semuanya melewati dua
 * `<Toaster>` (AppContainer.tsx:3900/:3955), jadi gaya dipasang SEKALI di
 * src/index.css lewat 12 variabel yang sonner baca dari `[data-sonner-toaster]`
 * — bukan dengan menyapu call site. Yang dikunci di sini:
 *
 * (a) token `--color-{success,info,warning,danger}-soft` ada di `@theme`
 *     (mode terang, heksa) DAN di `html.dark` (dicampur ke permukaan gelap
 *     supaya tidak transparan di atas konten);
 * (b) blok override mengisi ulang `--{success,info,warning,error}-bg/-border/
 *     -text` dari token repo — `error` memakai keluarga `danger`;
 * (c) tiap selektor toast berprefiks `html` — spesifisitas satu langkah di
 *     atas aturan sonner, sehingga urutan styles sonner dalam bundel Vite
 *     tidak bisa mengalahkannya lagi (pelajaran #776: pemenang adalah
 *     spesifisitas/urutan, bukan niat);
 * (d) batang kiri 3 px diatur per tipe; dan
 * (e) blok toast tidak boleh memuat heksa mentah — warna hanya lewat token.
 *
 * Kelas `.alert-border-left` (+ variannya) adalah padanan JSX untuk fase 2
 * migrasi alert inline (#778); kelasnya dikunci ikut di sini supaya tidak
 * berubah arah sebelum fase 2 berjalan.
 */
import { readFileSync } from "fs";
import { join } from "path";

const BERKAS = join(__dirname, "..", "..", "..", "src", "index.css");
const isi = readFileSync(BERKAS, "utf8").replace(/\r\n/g, "\n");

/** Ambil blok CSS dari penanda komentar sampai kurung tutup sejajar. */
const blok = (penanda: string) => {
  const mulai = isi.indexOf(penanda);
  expect(mulai).toBeGreaterThanOrEqual(0);
  return isi.slice(isi.lastIndexOf("/*", mulai));
};

/** Komentar CSS dibuang — penanda seperti "#777" di dalam komentar bukan heksa. */
const bersih = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");

const TIPES_SONNER = ["success", "info", "warning", "error"] as const;
const KELUARGA: Record<(typeof TIPES_SONNER)[number], string> = {
  success: "success",
  info: "info",
  warning: "warning",
  error: "danger",
};

describe("toast gaya Velzon left border (#777)", () => {
  it("token `-soft` ada di @theme (terang) dan di html.dark (campuran)", () => {
    for (const n of ["success", "info", "warning", "danger"]) {
      expect(isi).toContain(`--color-${n}-soft: #`);
      expect(isi).toMatch(
        new RegExp(
          `--color-${n}-soft: color-mix\\(in srgb, var\\(--color-${n}\\) \\d+%, var\\(--color-surface\\)\\)`
        )
      );
    }
  });

  it("12 variabel sonner diisi ulang dari token repo, error memakai keluarga danger", () => {
    const atas = blok('[data-sonner-toaster][data-sonner-theme="light"]');
    for (const t of TIPES_SONNER) {
      const k = KELUARGA[t];
      expect(atas).toContain(`--${t}-bg: var(--color-${k}-soft);`);
      expect(atas).toContain(`--${t}-text: var(--color-${k}-text);`);
      expect(atas).toMatch(
        new RegExp(`--${t}-border: color-mix\\(in srgb, var\\(--color-${k}\\) 30%, transparent\\);`)
      );
    }
  });

  it("tiap selektor toast berprefiks html — tidak bisa dikalahkan urutan bundel", () => {
    const b = blok("#777 — toast sonner bergaya Velzon");
    const selesai = b.indexOf("Padanan JSX");
    const potong = bersih(b.slice(0, selesai > 0 ? selesai : undefined));
    for (const baris of potong.split("\n")) {
      if (!baris.includes("[data-sonner")) continue;
      expect(baris.trimStart().startsWith("html ")).toBe(true);
    }
    expect(potong.match(/\[data-sonner/g)!.length).toBeGreaterThanOrEqual(6);
  });

  it("garis kiri 3 px diatur sekali, warnanya per tipe", () => {
    const b = blok("#777 — toast sonner bergaya Velzon");
    expect(b).toContain("border-left-width: 3px;");
    for (const t of TIPES_SONNER) {
      expect(b).toContain(`[data-type="${t}"]`);
    }
    for (const t of TIPES_SONNER) {
      expect(b).toContain(`border-left-color: var(--color-${KELUARGA[t]});`);
    }
  });

  it("blok toast nol heksa mentah — warna hanya lewat token", () => {
    const b = blok("#777 — toast sonner bergaya Velzon");
    const selesai = b.indexOf("Padanan JSX");
    const potong = bersih(b.slice(0, selesai > 0 ? selesai : undefined));
    expect(potong).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("kelas .alert-border-left + 4 varian ada untuk fase 2 (#778)", () => {
    const b = blok("Padanan JSX dari gaya toast di atas");
    expect(b).toContain(".alert-border-left {");
    expect(b).toContain("border-left: 3px solid var(--alert-accent, var(--color-info));");
    for (const n of ["success", "info", "warning", "danger"]) {
      expect(b).toContain(`.alert-border-left.alert-${n} {`);
      expect(b).toContain(`--alert-soft: var(--color-${n}-soft);`);
      expect(b).toContain(`--alert-accent: var(--color-${n});`);
      expect(b).toContain(`--alert-text: var(--color-${n}-text);`);
    }
  });
});
