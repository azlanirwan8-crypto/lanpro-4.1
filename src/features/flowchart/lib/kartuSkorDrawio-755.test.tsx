/**
 * #755 — KARTU SKOR KESETARAAN draw.io.
 *
 * Pemilik proyek memberi batas berhenti yang terukur, bukan perasaan: "lakukan
 * fixing sampai 100% atau 80% sama dengan drawio, jangan berhenti jika belum di
 * atas 80%". Berkas ini mengubah kalimat itu menjadi angka yang dikunci test,
 * supaya klaim kesetaraan tidak pernah lagi bergantung pada pengukuran sekali
 * pakai yang hilang bersama folder temp.
 *
 * PENYEBUTNYA `kamusBentukDrawio.ts` — 1.426 nama `shape=` yang benar-benar
 * dihasilkan sidebar draw.io. Bukan registry penuh (~3.100 nama), dan itu
 * disengaja: yang diukur adalah bentuk yang BISA DIPILIH orang saat membuat
 * diagram.
 *
 * TIGA ANGKA, dan ketiganya dilaporkan walau yang satu buruk:
 *
 *   akuntansi        1426 / 1426 = 100%   setiap nama terpetakan ATAU
 *                                          dinyatakan beralasan di
 *                                          `TANPA_PADANAN_NATIVE`. Nol yang
 *                                          lolos tanpa keterangan.
 *   pembuatan diagram 352 /  393 = 89,6%  nama telanjang + pustaka non-ikon.
 *                                          DI ATAS batas 80% pemilik proyek.
 *   ikon vendor       130 / 1033 = 12,6%  aws4 + electrical + azure. BURUK,
 *                                          dan tetap ditulis apa adanya; 903
 *                                          di antaranya sudah beralasan.
 *                                          Keputusannya item #756 (MENUNGGU).
 *
 * KENAPA PENYEBUTNYA DIPECAH. `mxgraph.aws4` sendiri 598 nama melawan segelintir
 * ikon AWS native, `mxgraph.electrical` 349 melawan 87. Menggabungkan keduanya
 * ke satu angka menghasilkan 33,8% yang tidak membedakan "kita tidak bisa
 * menggambar heksagon" dari "kita tidak punya 594 ikon layanan AWS". Yang
 * pertama adalah bug; yang kedua adalah keputusan produk. Angka tunggal
 * menyembunyikan perbedaan itu, jadi di sini keduanya dipisah dan aturan
 * pengelompokannya ditulis terang: PUSTAKA IKON VENDOR adalah yang isinya ikon
 * layanan proprietari, bukan bentuk diagram.
 *
 * YANG TIDAK DIUKUR DI SINI, dinyatakan sesuai §15.3: apakah draw.io SUNGGUH
 * menampilkan hasil ekspornya dengan benar. Itu perbandingan layar ke layar dan
 * tidak mungkin dari mesin kerja ini. Test ini mengukur sisi LanPro saja.
 */
import {
  BENTUK_BARE_DRAWIO,
  BENTUK_PUSTAKA_DRAWIO,
  JUMLAH_BENTUK_DRAWIO,
  PUSTAKA_DRAWIO,
} from "./kamusBentukDrawio";
import { bentukDariGayaDrawio, TANPA_PADANAN_NATIVE } from "./petaBentukDrawio";

/** Gaya minimal yang dipakai sidebar draw.io untuk sebuah vertex bernama. */
const gaya = (nama: string) => `shape=${nama};whiteSpace=wrap;html=1`;

/**
 * Pustaka IKON VENDOR: isinya ikon layanan proprietari (AWS, Azure klasik,
 * simbol kelistrikan industri), bukan bentuk diagram. Jumlah namanya ribuan
 * sementara padanan native-nya hitungan jari, jadi ia diukur terpisah.
 *
 * `mxgraph.infographic` SENGAJA tidak masuk: ke-22 namanya terpetakan semua,
 * karena yang ada di sana adalah pita, spanduk, dan penanda yang memang punya
 * padanan native. Mengelompokkannya sebagai ikon hanya akan memperindah angka
 * kelompok diagram — persis jenis pemindahan gawang yang membuat kartu skor
 * tidak bisa dipercaya.
 */
const PUSTAKA_IKON_VENDOR = new Set(["mxgraph.aws4", "mxgraph.electrical", "mxgraph.azure"]);

/** Kunci `TANPA_PADANAN_NATIVE` boleh memuat `*`; sisanya karakter literal. */
const jadiPola = (kunci: string): RegExp =>
  new RegExp("^" + kunci.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");

const POLA_DEKLARASI = Object.keys(TANPA_PADANAN_NATIVE).map((k) => [k, jadiPola(k)] as const);

const dideklarasikan = (nama: string): boolean =>
  POLA_DEKLARASI.some(([, pola]) => pola.test(nama));

type Baris = { nama: string; petak: boolean; deklarasi: boolean };

const ukur = (): { telanjang: Baris[]; diagram: Baris[]; ikon: Baris[] } => {
  const telanjang: Baris[] = BENTUK_BARE_DRAWIO.map((n) => {
    const petak = bentukDariGayaDrawio(gaya(n)) !== null;
    return { nama: n, petak, deklarasi: !petak && dideklarasikan(n) };
  });
  const diagram: Baris[] = [];
  const ikon: Baris[] = [];
  for (const [pustaka, daftar] of Object.entries(BENTUK_PUSTAKA_DRAWIO)) {
    const tujuan = PUSTAKA_IKON_VENDOR.has(pustaka) ? ikon : diagram;
    for (const sufiks of daftar) {
      const nama = `${pustaka}.${sufiks}`;
      const petak = bentukDariGayaDrawio(gaya(nama)) !== null;
      tujuan.push({ nama, petak, deklarasi: !petak && dideklarasikan(nama) });
    }
  }
  return { telanjang, diagram, ikon };
};

const { telanjang, diagram, ikon } = ukur();
const jumlah = (baris: readonly Baris[], pilih: (b: Baris) => boolean) =>
  baris.filter(pilih).length;
const persen = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100);

describe("#755 akuntansi — tidak ada nama draw.io yang lolos tanpa keterangan", () => {
  const semua = [...telanjang, ...diagram, ...ikon];

  it("penyebutnya benar-benar seluruh kamus", () => {
    expect(semua.length).toBe(JUMLAH_BENTUK_DRAWIO);
    expect(semua.length).toBe(1426);
  });

  it("setiap nama terpetakan ATAU dinyatakan beralasan; nol yang liar", () => {
    const liar = semua.filter((b) => !b.petak && !b.deklarasi).map((b) => b.nama);
    // Inilah gerbang yang paling penting di berkas ini. Selama ia hijau, tidak
    // mungkin ada bentuk draw.io yang diam-diam hilang dari papan tanpa seorang
    // pun menuliskan alasannya.
    expect(liar).toEqual([]);
  });

  it("tidak ada deklarasi yang bertentangan dengan resolver", () => {
    // Kunci PERSIS (tanpa `*`) yang menyebut nama yang justru terpetakan adalah
    // kontradiksi: salah satunya pasti basi. Kunci wildcard boleh tumpang
    // tindih karena ia memang menyatakan "sebagian besar dari keluarga ini".
    const bertentangan = Object.keys(TANPA_PADANAN_NATIVE)
      .filter((k) => !k.includes("*"))
      .filter((k) => bentukDariGayaDrawio(gaya(k)) !== null);
    expect(bertentangan).toEqual([]);
  });

  it("setiap alasan cukup panjang untuk benar-benar menjelaskan", () => {
    // Deklarasi adalah cara sebuah kerugian dinyatakan, bukan disembunyikan.
    // Alasan kosong atau satu kata membuat gerbang di atas jadi karet.
    const dangkal = Object.entries(TANPA_PADANAN_NATIVE)
      .filter(([, alasan]) => alasan.trim().length < 15)
      .map(([k]) => k);
    expect(dangkal).toEqual([]);
  });
});

describe("#755 kartu skor — angka dikunci supaya perubahannya disadari", () => {
  it("bentuk telanjang: 86 terpetakan, 29 beralasan, dari 115", () => {
    expect(telanjang.length).toBe(115);
    expect(jumlah(telanjang, (b) => b.petak)).toBe(86);
    expect(jumlah(telanjang, (b) => b.deklarasi)).toBe(29);
  });

  it("pustaka pembuatan diagram: 266 terpetakan dari 278 (95,7%)", () => {
    expect(diagram.length).toBe(278);
    expect(jumlah(diagram, (b) => b.petak)).toBe(266);
    expect(
      persen(
        jumlah(diagram, (b) => b.petak),
        diagram.length
      )
    ).toBeGreaterThan(95);
  });

  it("pustaka ikon vendor: 130 terpetakan dari 1033 (12,6%) — buruk, dan dinyatakan", () => {
    expect(ikon.length).toBe(1033);
    expect(jumlah(ikon, (b) => b.petak)).toBe(130);
    expect(jumlah(ikon, (b) => b.deklarasi)).toBe(903);
    // Angka ini TIDAK boleh diam-diam naik lewat satu wildcard baru: kalau
    // cakupan ikon berubah, itu keputusan produk (#756), bukan perbaikan peta.
    expect(
      persen(
        jumlah(ikon, (b) => b.petak),
        ikon.length
      )
    ).toBeLessThan(20);
  });

  it("mentah seluruh kamus: 482 dari 1426 (33,8%)", () => {
    const terpetakan =
      jumlah(telanjang, (b) => b.petak) +
      jumlah(diagram, (b) => b.petak) +
      jumlah(ikon, (b) => b.petak);
    expect(terpetakan).toBe(482);
  });
});

describe("#755 batas berhenti pemilik proyek: di atas 80% untuk membuat diagram", () => {
  const terpetakan = jumlah(telanjang, (b) => b.petak) + jumlah(diagram, (b) => b.petak);
  const penyebut = telanjang.length + diagram.length;
  const skor = persen(terpetakan, penyebut);

  it("skornya 352/393 = 89,6%, di atas 80%", () => {
    expect(terpetakan).toBe(352);
    expect(penyebut).toBe(393);
    expect(skor).toBeGreaterThan(80);
    expect(skor).toBeCloseTo(89.6, 1);
  });

  it("tiap pustaka yang dipakai membuat flowchart berada di atas 90%", () => {
    // Pustaka-pustaka ini adalah yang benar-benar dibuka orang saat membuat
    // flowchart. `mxgraph.uml25` TIDAK ikut diperiksa di sini: ketiga namanya
    // adalah stensil aksi berparameter yang seluruhnya sudah dinyatakan
    // beralasan, dan floor 90% pada penyebut 3 hanya akan jadi hiasan.
    const floor = new Map<string, number>();
    for (const b of diagram) {
      const pustaka = b.nama.split(".").slice(0, 2).join(".");
      const isi = floor.get(pustaka) ?? 0;
      floor.set(pustaka, isi + (b.petak ? 1 : 0));
    }
    const dihitung = [
      "mxgraph.flowchart",
      "mxgraph.basic",
      "mxgraph.bpmn",
      "mxgraph.arrows2",
      "mxgraph.networks",
      "mxgraph.infographic",
      "mxgraph.mockup",
      "mxgraph.lean_mapping",
    ];
    for (const pustaka of dihitung) {
      const total = (BENTUK_PUSTAKA_DRAWIO[pustaka] ?? []).length;
      expect(total).toBeGreaterThan(0);
      expect(persen(floor.get(pustaka) ?? 0, total)).toBeGreaterThanOrEqual(90);
    }
  });

  it("12 pustaka ber-namespace semuanya ikut terukur", () => {
    expect(PUSTAKA_DRAWIO.length).toBe(12);
    const terukur = new Set(
      [...diagram, ...ikon].map((b) => b.nama.split(".").slice(0, 2).join("."))
    );
    expect(terukur.size).toBe(12);
  });
});
