/**
 * #685 — berkas `.drawio` adalah SUMBER KANONIK, bukan bahan sekali pakai.
 *
 * KENAPA MODUL INI ADA.
 *
 * Sampai hari ini jalur impor hanya menghasilkan `ParsedDiagram` (nodes/edges)
 * dan XML aslinya dibuang: tidak ada satu pun medan di `src` yang menyimpannya
 * (`canvasData` hanya berisi `nodes`/`edges`/`theme`/`konteks`/`documents`/`pola`,
 * lihat `services/flowchart.service.ts:54-68`). `eksporDrawio()` kemudian
 * MENULIS ULANG mxfile baru dari model LanPro (`lib/eksporDrawio.ts:187-196`),
 * jadi siklus unggah → simpan → muat → ekspor tidak pernah mengembalikan berkas
 * yang sama — ia mengembalikan berkas yang berbeda yang kebetulan mirip.
 *
 * Opsi A yang dipilih pemilik proyek 10 Okt menuntut tiga hal yang terpisah dan
 * tidak boleh saling menggantikan: (A) kesetiaan SUMBER — byte XML tetap ada dan
 * hash-nya sama sesudah siklus simpan/muat; (B) kesetiaan TAMPILAN — dirender
 * dengan renderer draw.io yang dipatok; (C) kesetiaan KONVERSI native — bukan
 * jaminan universal, dan setiap yang tidak bertahan harus DINYATAKAN sebelum
 * pengguna mengganti papan. Modul ini mengurus A dan menyiapkan C. B butuh
 * build draw.io itu sendiri dan tidak bisa diselesaikan dari sini.
 *
 * ATURAN YANG DIKUNCI DI SINI.
 *
 * 1. `xmlSumber` tidak pernah disentuh. Normalisasi, dekompresi, dan pemetaan
 *    gaya semuanya bekerja pada SALINAN yang dipakai penjeraf native. Menulis
 *    hasil konversi ke `xmlSumber` adalah cara paling mudah merusak berkas
 *    pengguna, dan itu tidak boleh terjadi diam-diam.
 * 2. XML adalah input TIDAK DIPERCAYA: ukuran dibatasi SEBELUM diurai, dan
 *    penolakan harus bisa dibaca pengguna — bukan papan kosong, bukan toast hijau.
 * 3. Dekompresi memakai `DecompressionStream` (API platform). `pako` dan
 *    `fflate` memang ada di `node_modules`, tetapi sebagai dependensi TRANSITIF:
 *    mengimpornya langsung berarti menaruh kode produksi di atas paket yang bisa
 *    hilang kapan saja tanpa siapa pun memutuskan itu.
 */

export const FORMAT_SUMBER = "drawio-xml-v1" as const;

/**
 * Batas byte sumber yang boleh ikut ke payload papan.
 *
 * ANGKA DAN ALASANNYA. Server membatasi SELURUH payload `canvasData` pada 8 MB
 * (`server/schemas/document.schema.ts:19`). Sumber XML duduk di dalam JSON itu
 * bersama nodes/edges, dan `JSON.stringify` meng-escape kutip/backslash sehingga
 * bisa menambah byte. 2 MB dipilih sebagai bagian untuk sumber saja: papan
 * draw.io nyata yang diunggah pengguna jarang melewati itu, dan sisanya tetap
 * untuk nodes/edges. Berkas yang lebih besar DITOLAK dengan pesan yang jelas —
 * bukan dipotong diam-diam, karena sumber yang terpotong adalah berkas rusak.
 */
export const BATAS_BYTE_SUMBER = 2 * 1024 * 1024;

/** Kode galat yang sampai ke UI; pesannya manusia, kodenya untuk test dan log. */
export type SebabTolakSumber =
  "bukan-drawio" | "terlalu-besar" | "xml-rusak" | "kompresi-rusak" | "tanpa-halaman";

export class TolakSumber extends Error {
  constructor(
    readonly sebab: SebabTolakSumber,
    pesan: string
  ) {
    super(pesan);
    this.name = "TolakSumber";
  }
}

/** Panjang dalam byte, bukan karakter: XML draw.io boleh berisi teks non-ASCII. */
export const panjangByte = (teks: string): number => {
  try {
    return new TextEncoder().encode(teks).length;
  } catch {
    // Lingkungan tanpa TextEncoder tidak seharusnya terjadi di peramban modern,
    // dan jatuh ke panjang karakter adalah pendekatan yang SALAH untuk penjagaan
    // ukuran. Lebih baik menolak daripada menerima berkas 4x lipat.
    throw new TolakSumber("xml-rusak", "Lingkungan ini tidak mendukung pengukuran byte.");
  }
};

/** Dokumen draw.io: akar `mxfile` (berkas) atau `mxGraphModel` (tempel/ekspor lama). */
export const adalahDrawio = (teks: string): boolean => {
  const awal = (teks || "").trimStart().slice(0, 4096);
  return awal.startsWith("<") && /<(?:mxfile|mxGraphModel)\b/i.test(awal);
};

/** Fungsi pengurai deflate-raw: byte mentah -> teks XML. */
export type PenguraiDeflate = (bytes: Uint8Array) => Promise<string>;

const base64KeBytes = (b64: string): Uint8Array => {
  const bersih = b64.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]*$/.test(bersih)) {
    throw new TolakSumber("kompresi-rusak", "Isi halaman bukan base64 yang sah.");
  }
  const biner = atob(bersih);
  const bytes = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
  return bytes;
};

/**
 * Pengurai bawaan: `DecompressionStream("deflate-raw")`, API platform yang sudah
 * ada di peramban modern dan Node 18+. Tidak ada dependensi baru yang dipasang
 * untuk ini.
 *
 * `pako` dan `fflate` memang TERSEDIA di `node_modules`, tetapi sebagai
 * dependensi transitif paket lain — mengimpornya langsung menaruh kode produksi
 * di atas paket yang boleh hilang kapan saja tanpa ada yang memutuskannya.
 */
const penguraiPlatform: PenguraiDeflate = async (bytes) => {
  const Penyedia = (globalThis as any).DecompressionStream;
  if (typeof Penyedia !== "function") {
    throw new TolakSumber(
      "kompresi-rusak",
      "Peramban ini tidak mendukung berkas .drawio terkompresi (DecompressionStream tidak ada)."
    );
  }
  const aliran = new Response(
    new Blob([bytes as any]).stream().pipeThrough(new Penyedia("deflate-raw"))
  );
  return await aliran.text();
};

/**
 * Isi `<diagram>` yang dikompresi adalah **deflate-raw** lalu base64 — bukan
 * zlib ber-header. Salah memilih format menghasilkan sampah biner, bukan galat
 * yang rapi, jadi formatnya dinyatakan terang-terangan dan hasilnya diverifikasi
 * harus XML.
 */
export const dekompresDrawio = async (
  teksTersandi: string,
  pengurai?: PenguraiDeflate
): Promise<string> => {
  const bytes = base64KeBytes(teksTersandi);
  const biner = await (pengurai ?? penguraiPlatform)(bytes);
  if (!/<(?:mxGraphModel|mxCell|root)\b/i.test(biner)) {
    throw new TolakSumber("kompresi-rusak", "Hasil dekompresi bukan XML diagram.");
  }
  // draw.io menaruh teks UTF-8-nya lewat escape URI sebelum deflate; kalau
  // langkah itu dilewat, label akan muncul sebagai "%3CRingkasan".
  try {
    const lepas = decodeURIComponent(biner);
    return lepas.includes("<") ? lepas : biner;
  } catch {
    return biner;
  }
};

export interface HalamanSumber {
  id: string;
  nama: string;
  terkompresi: boolean;
  /** Jumlah mxCell yang terlihat pada halaman ini; 0 untuk halaman kosong. */
  sel: number;
}

export interface HasilSumber {
  /** Byte asli seperti yang diterima. TIDAK pernah dinormalisasi. */
  xmlSumber: string;
  /**
   * Teks siap-jeraf untuk jalur KONVERSI native: halaman terkompresi sudah
   * dibuka. Beda dengan `xmlSumber` justru karena sumber harus utuh apa adanya.
   */
  teksSiapJeraf: string;
  halaman: HalamanSumber[];
  byteSumber: number;
}

/**
 * Membaca berkas `.drawio` menjadi sumber kanonik + salinan siap-jeraf.
 *
 * DOMParser dipakai (bukan regex) karena draw.io menulis label di dalam
 * `<![CDATA[...]]>`: regex yang mencari `<diagram` bisa tersesat pada teks
 * pengguna, dan kesalahan itu tidak terlihat sampai papan seseorang rusak.
 */
export const bacaSumberDrawio = async (
  teks: string,
  namaBerkas = "",
  pengurai?: PenguraiDeflate
): Promise<HasilSumber> => {
  const mentah = (teks || "").trim();
  if (!adalahDrawio(mentah)) {
    throw new TolakSumber(
      "bukan-drawio",
      `"${namaBerkas || "berkas"}" bukan berkas draw.io (tidak ada <mxfile> atau <mxGraphModel>).`
    );
  }

  const byte = panjangByte(mentah);
  if (byte > BATAS_BYTE_SUMBER) {
    throw new TolakSumber(
      "terlalu-besar",
      `Berkas ${namaBerkas || ""} berukuran ${(byte / 1024 / 1024).toFixed(1)} MB, batas sumber ${(
        BATAS_BYTE_SUMBER /
        1024 /
        1024
      ).toFixed(0)} MB. Sumber tidak akan dipotong diam-diam.`
    );
  }

  const doc = new DOMParser().parseFromString(mentah, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new TolakSumber("xml-rusak", `XML pada "${namaBerkas || "berkas"}" tidak valid.`);
  }

  const daftarDiagram = Array.from(doc.getElementsByTagName("diagram"));
  const halaman: HalamanSumber[] = [];
  const isiUntukJeraf: string[] = [];

  for (const node of daftarDiagram) {
    // Halaman inline berisi ELEMEN <mxGraphModel>; halaman terkompresi hanya
    // punya teks base64. `textContent` TIDAK bisa dipakai sebagai penanda:
    // mxCell menyimpan segalanya di ATRIBUT, jadi halaman inline yang sah
    // textContent-nya kosong dan akan dikira halaman rusak.
    const model = node.firstElementChild;
    const teksIsi = (node.textContent || "").trim();
    const id = node.getAttribute("id") || `halaman-${halaman.length + 1}`;
    const nama = node.getAttribute("name") || id;

    const terkompresi = !model && teksIsi !== "";
    let terbuka = "";
    if (model) {
      terbuka = new XMLSerializer().serializeToString(model);
    } else if (terkompresi) {
      terbuka = await dekompresDrawio(teksIsi, pengurai);
    }

    const sel = terbuka
      ? new DOMParser().parseFromString(terbuka, "text/xml").getElementsByTagName("mxCell").length
      : 0;

    halaman.push({ id, nama, terkompresi, sel });
    if (terbuka) isiUntukJeraf.push(terbuka);
  }

  let teksSiapJeraf = mentah;
  if (daftarDiagram.length > 0) {
    if (isiUntukJeraf.length === 0) {
      throw new TolakSumber(
        "tanpa-halaman",
        `Berkas "${namaBerkas || "berkas"}" tidak punya halaman berisi.`
      );
    }
    // Halaman dikumpulkan dalam satu mxfile supaya penjeraf lama tidak berubah
    // perilakunya; sumber aslinya tetap `mentah`, bukan rekonstruksi ini.
    teksSiapJeraf = `<mxfile>${isiUntukJeraf.join("")}</mxfile>`;
  } else if (isiUntukJeraf.length === 0 && !/<mxGraphModel|<mxCell/i.test(mentah)) {
    throw new TolakSumber(
      "tanpa-halaman",
      `Berkas "${namaBerkas || "berkas"}" tidak punya halaman berisi.`
    );
  }

  return { xmlSumber: mentah, teksSiapJeraf, halaman, byteSumber: byte };
};

/**
 * SHA-256 dari sumber. Definisi penerimaan #685 membandingkan hash sesudah
 * unggah → simpan → muat → ekspor, jadi hash harus yang sebenarnya — bukan
 * ceksum buatan sendiri yang kebetulan sama cepatnya.
 *
 * `crypto.subtle` hanya tersedia di konteks aman (https/localhost). Kalau tidak
 * ada, fungsi ini MENGEMBALIKAN null dan pemanggil wajib jujur bahwa siklusnya
 * belum terverifikasi; tidak boleh menyamar jadi sudah.
 */
export const hashSumber = async (teks: string): Promise<string | null> => {
  const subtle = (globalThis as any).crypto?.subtle;
  if (!subtle?.digest) return null;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(teks));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Kunci gaya draw.io yang TIDAK dipertahankan penjeraf native.
 *
 * Daftarnya berasal dari pengukuran `tabelKesetiaan-660.test.tsx:516-528`, yang
 * menguji satu per satu bahwa kunci itu menghasilkan `{}`. Ini bukan daftar
 * "tidak peduli": inilah yang harus DITAMPILKAN sebelum konversi, supaya
 * pengguna tahu papan hasil konversinya bukan berkas aslinya.
 */
const KUNCI_GAYA_TAK_DIPERTAHANKAN = [
  "sketch",
  "arcSize",
  "gradientDirection",
  "perimeter",
  "labelPosition",
  "verticalLabelPosition",
  "exitDx",
  "exitDy",
  "entryDx",
  "entryDy",
  "imageWidth",
  "imageHeight",
  "indent",
  "spacing",
] as const;

export interface BatasKonversi {
  /** Nilai `shape=` yang tidak punya padanan native. */
  bentukTakDikenal: string[];
  /** Kunci gaya yang ada di sumber tetapi hilang di model native. */
  kunciHilang: string[];
  /** Halaman yang ikut dijeraf tetapi tidak akan tampak sama di papan. */
  halaman: HalamanSumber[];
  /** Bentuk yang labelnya HTML/CDATA — satu `textarea` native tidak bisa menampung gaya campuran. */
  labelKaya: number;
  konektorOtomatis: number;
  waypoint: number;
}

/**
 * Laporan yang ditampilkan SEBELUM konversi native.
 *
 * Bukan keharusan teknis — keharusan KEJUJURAN. Tanpa ini "impor berhasil"
 * berarti "tidak ada error", padahal bentuk khusus, gaya label, halaman kedua,
 * dan routing otomatis sudah tidak sama lagi.
 */
export const batasKonversi = (
  sumber: Pick<HasilSumber, "halaman">,
  xmlDoc: Document,
  bentukDidukung: ReadonlySet<string>
): BatasKonversi => {
  const bentuk = new Set<string>();
  const kunci = new Set<string>();
  let labelKaya = 0;
  let konektorOtomatis = 0;
  let waypoint = 0;

  for (const cell of Array.from(xmlDoc.getElementsByTagName("mxCell"))) {
    const gaya = cell.getAttribute("style") || "";
    if (!gaya) continue;
    for (const bagian of gaya.split(";")) {
      const [nama, nilai] = bagian.split("=");
      if (!nama) continue;
      const k = nama.trim().toLowerCase();
      if (k === "shape" && nilai && !bentukDidukung.has(nilai.trim().toLowerCase())) {
        bentuk.add(nilai.trim());
      }
      if ((KUNCI_GAYA_TAK_DIPERTAHANKAN as readonly string[]).includes(k)) kunci.add(k);
    }
    const value = cell.getAttribute("value") || "";
    if (/<[a-z][^>]*>|&lt;|<!\[CDATA\[/i.test(value)) labelKaya++;
    if (/edgeStyle=orthogonalEdgeStyle|rounded=1/.test(gaya)) konektorOtomatis++;
    const geo = cell.getElementsByTagName("mxGeometry")[0];
    if (geo && geo.getElementsByTagName("Array").length > 0) waypoint++;
  }

  return {
    bentukTakDikenal: Array.from(bentuk).sort(),
    kunciHilang: Array.from(kunci).sort(),
    halaman: sumber.halaman,
    labelKaya,
    konektorOtomatis,
    waypoint,
  };
};
