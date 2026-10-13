/**
 * #721 — layar rincian Isu boleh punya SATU bahasa kontrol, dan ia tinggal di
 * `src/components/ui/gayaForm.ts`.
 *
 * Yang mendorong test ini bukan selera. Pemilik proyek melaporkan "ini putih
 * semua kelihatannya" (13 Okt), dan setelah diukur keluhan itu ternyata tiga
 * sebab berbeda yang kebetulan satu layar:
 *
 *   1. `bg-surface-sunken/70/40` di pembungkus panel atribut — dua alpha dalam
 *      satu kelas, Tailwind tidak memancarkan CSS apa pun, jadi panel yang
 *      seharusnya bertingkat jatuh ke putih. Tidak ada gerbang yang melihatnya:
 *      `audit:kelas` hanya memeriksa kelas GARIS.
 *   2. Empat belas kelas isian, tiga kelas pemicu dropdown, dua puluh tujuh kelas
 *      tombol, dan lima perlakuan fokus berbeda — dua kotak berdampingan boleh
 *      berbeda tinggi tanpa ada yang menulisnya.
 *   3. Pemisah baris masih `border-border-faint` di sembilan tempat, padahal
 *      #699 sudah mengukur garis itu hanya 1,096:1 terhadap putih.
 *
 * Butir (1) dan (3) tidak bisa ditangkap test render: jsdom tidak melakukan
 * layout, jadi "tidak ada CSS yang dihasilkan" dan "garisnya tidak terlihat"
 * sama-sama tidak kelihatan di jest. Karena itu penjaganya membaca sumber,
 * seperti saudara-saudaranya di folder ini.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r?\n/g, "\n");

const KIT = "src/components/ui/gayaForm.ts";

/** Sembilan berkas yang membentuk satu layar rincian Isu. */
const LAYAR = [
  "src/features/issues/TaskDetailModal.tsx",
  "src/features/issues/components/modal/TaskDetailSidebar.tsx",
  "src/features/issues/components/modal/TaskAttachmentsSection.tsx",
  "src/features/issues/components/modal/TaskCommentsSection.tsx",
  "src/features/issues/components/modal/TaskLinksSection.tsx",
  "src/features/issues/components/modal/TaskSubtasksSection.tsx",
  "src/features/issues/components/modal/TaskDetailPrimitives.tsx",
  "src/components/DescriptionEditor.tsx",
];

describe("#721 — kit gayaForm adalah satu-satunya sumber bentuk kontrol", () => {
  it("tinggi isian sama dengan baseline Velzon di index.css", () => {
    const kit = baca(KIT);
    // `index.css:607-615` menstandarkan isian pada 2.25rem; `CoreUI.tsx:94`
    // memakai `h-9` untuk varian `md`. Dua angka itu harus satu cerita.
    expect(kit).toContain('export const ISIAN = cn(ISIAN_DASAR, "h-9")');
    // `w-full` TIDAK boleh ikut di dasar: isian sempit (kotak jam, `w-16`)
    // akan berperang kelas dengan kit-nya sendiri, dan `cn()` tidak membuang
    // yang kalah — pemenangnya urutan stylesheet.
    const dasar = /const ISIAN_DASAR =\s*\n?\s*"([^"]+)"/.exec(kit)![1];
    expect(dasar).not.toMatch(/\bw-/);
    expect(dasar).not.toMatch(/\bh-/);
  });

  it("tidak ada satu pun konstanta kit yang memuat dua kelas properti sama", () => {
    const kit = baca(KIT);
    const kelas = [...kit.matchAll(/"([^"]*(?:rounded|border|bg-|text-)[^"]*)"/g)].map((m) => m[1]);
    expect(kelas.length).toBeGreaterThan(4);
    // `cn()` hanya merantai, jadi di DALAM kit sendiri pun dua kelas satu grup
    // harus dianggap cacat, bukan "nanti yang belakang menang".
    const GRUP: [RegExp, string][] = [
      [/\bh-\S+/, "tinggi"],
      [/\bw-\S+/, "lebar"],
      [/\brounded-\S+/, "radius"],
      [/\btext-\S*\d+px|\btext-(?:xs|sm|base|lg)\b/, "ukuran huruf"],
      [/\bresize-\S+/, "resize"],
    ];
    for (const k of kelas) {
      for (const [pola, nama] of GRUP) {
        const hits = (k.match(new RegExp(pola.source, "g")) || []).length;
        expect({ kelas: k, properti: nama, jumlah: hits }).toEqual({
          kelas: k,
          properti: nama,
          jumlah: expect.any(Number),
        });
        expect(hits).toBeLessThanOrEqual(1);
      }
    }
  });

  it("focus:ring-0 hanya hidup di varian tanpa bingkai", () => {
    // `!ring-0` adalah cara lama layar ini membungkam kit-nya sendiri.
    expect(baca(KIT)).not.toContain("!ring-0");
    for (const b of LAYAR) expect(baca(b)).not.toMatch(/!ring-0|!outline-none/);
    const diLuar = LAYAR.filter((b) => /focus:ring-0/.test(baca(b)));
    expect(diLuar).toEqual([]);
  });
});

describe("#721 — layar tidak lagi menulis ulang bentuk kontrol", () => {
  it("tidak ada lagi tinggi kontrol di luar skala kit", () => {
    // `h-[32px]` adalah tinggi panel atribut sebelum item ini; ia 4 px di bawah
    // baseline aplikasi dan tidak ada satu pun perkakas yang memprotesnya.
    for (const b of LAYAR) expect(baca(b)).not.toContain("h-[32px]");
  });

  it("tidak ada pemisah `faint` yang tersisa di layar ini", () => {
    // #699: baris dan kartu dipisah dengan `subtle`; `faint` hanya untuk
    // pemisah KOLOM di dalam tabel (#678b), dan layar ini tidak punya tabel.
    for (const b of LAYAR) expect(baca(b)).not.toContain("border-border-faint");
  });

  it("tidak ada palet Tailwind mentah yang tersisa di layar ini", () => {
    // `audit:warna` hanya menghitung netral (putih/hitam/slate/gray/zinc/
    // neutral/stone), jadi `text-red-600` dan `bg-amber-500/10` lolos diam-diam
    // — itulah sebabnya penjaga ini ada di sini, dan itu juga isi #696.
    const palet = /\b(?:bg|text|border|ring|from|to|shadow)-[a-z]+-\d{2,3}\b/g;
    for (const b of LAYAR) {
      const hits = baca(b).match(palet) || [];
      expect({ berkas: b, hits }).toEqual({ berkas: b, hits: [] });
    }
  });

  it("label medan tidak ditulis ulang per berkas", () => {
    const lama =
      'className="text-[10px] font-normal text-content-subtle uppercase tracking-normal flex items-center gap-1.5"';
    for (const b of LAYAR) expect(baca(b)).not.toContain(lama);
    expect(baca("src/features/issues/components/modal/TaskDetailSidebar.tsx")).toContain(
      "className={LABEL}"
    );
  });
});

describe("#720 — kelas yang tidak menghasilkan CSS itu cacat, bukan gaya", () => {
  const KELAS_CACAT: [RegExp, string][] = [
    [/\/\d+\/\d+(?=["'\s])/g, "dua alpha dalam satu kelas (mis. `bg-surface-sunken/70/40`)"],
    [/tracking-normal[a-z]+/g, "nama kelas yang diketik salah (`tracking-normalr`)"],
    [/-content-x-\d/g, "imbuhan yang tidak ada (`-content-x-1/2`)"],
  ];

  it("tidak ada satu pun di layar ini", () => {
    for (const b of LAYAR) {
      const isi = baca(b);
      for (const [pola, sebab] of KELAS_CACAT) {
        expect({ berkas: b, sebab, temuan: isi.match(pola) || [] }).toEqual({
          berkas: b,
          sebab,
          temuan: [],
        });
      }
    }
  });

  it("panel atribut benar-benar memakai satu alpha", () => {
    const sidebar = baca("src/features/issues/components/modal/TaskDetailSidebar.tsx");
    expect(sidebar).toContain("bg-surface-sunken/60");
  });
});

describe("#721 — ratchet: jumlah kelas kontrol tulisan-tangan tidak boleh naik", () => {
  /* Sisa kelas tulis-tangan di layar ini bukan isian lagi, melainkan chip,
   * lencana, dan tombol kecil di toolbar komentar/lampiran. Angka di bawah ini
   * adalah hasil hitung 13 Okt SESUDAH kit dipasang; setiap kelas baru yang
   * menambah daftar itu harus lewat test ini, bukan lewat mata. */
  const BATAS = 19;

  const jumlah = (isi: string) =>
    [...isi.matchAll(/className=\{?["`]([^"`]*)["`]\}?/g)]
      .map((m) => m[1])
      .filter(
        (k) =>
          /\bborder\b|\bbg-surface\b|\bbg-primary\//.test(k) &&
          /\brounded/.test(k) &&
          /\btext-/.test(k) &&
          /\b(?:h-\[\d+px\]|h-\d+|px-|py-|p-\d)/.test(k)
      ).length;

  it(`tidak lebih dari ${BATAS} di seluruh layar`, () => {
    const per = LAYAR.map((b) => jumlah(baca(b)));
    const total = per.reduce((a, c) => a + c, 0);
    expect(total).toBeLessThanOrEqual(BATAS);
  });
});
