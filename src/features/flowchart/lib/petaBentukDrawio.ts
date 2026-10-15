/**
 * #752 — resolver gaya draw.io → tipe native LanPro.
 *
 * Berkas ini HANYA logika. Seluruh datanya ada di `tabelBentukDrawio.ts` dan
 * penyebutnya di `kamusBentukDrawio.ts`; pemisahan itu bukan kerapian semata —
 * `agents.md` melarang berkas di atas 800 baris, dan versi pertama #752
 * menggabungkan keduanya sampai 1.111 baris.
 *
 * LIMA LAPIS, dari yang paling khusus ke paling umum. `null` dikembalikan bila
 * tidak yakin, supaya rantai lama di `importers.ts` tetap memutuskan dan
 * `batasKonversi` tetap melaporkan kehilangan (#685):
 *
 *  1. `bentukDariParameter` — nama stensil sama, gambar beda menurut parameter.
 *     Sidebar BPMN menawarkan 217 bentuk dari ENAM stensil; tanpa lapis ini
 *     seluruh task BPMN masuk sebagai satu tipe.
 *  2. `PETA_SHAPE` — nilai `shape=` telanjang persis (`shape=hexagon`).
 *  3. `PETA_PUSTAKA` — nilai ber-namespace (`shape=mxgraph.bpmn.task2`),
 *     dicocokkan sisa-utuh dulu lalu segmen demi segmen ke kanan.
 *  4. `PETA_KELUARGA` — pustaka yang bentuknya dikelompokkan, bukan dinamai.
 *  5. `PETA_TOKEN` — token `style=` tanpa `shape=` (`ellipse;whiteSpace=wrap`).
 *
 * `sesuaikan` berjalan sesudahnya untuk hal yang tidak bisa diputuskan nama
 * bentuknya sendiri (arah swimlane, `aspect=fixed`, `startSize=0`).
 *
 * PELAJARAN YANG MENYEBABKAN STRUKTUR INI. Versi pertama menulis tabel dari
 * dugaan dan melaporkan "190 tipe native terjangkau". Diukur terhadap korpus
 * draw.io sungguhan, 206 dari 248 kuncinya adalah nama yang TIDAK PERNAH ADA.
 * Angka itu mengukur karangannya sendiri. Karena itu tiap kunci kini diuji
 * terhadap `kamusBentukDrawio.ts`, dan cakupan dilaporkan per pustaka.
 */
import type { FlowNodeType } from "../types";
import {
  JENIS_AKTIVITAS_BPMN,
  JENIS_GERBANG_BPMN,
  OPERASI_GERBANG_LOGIKA,
  OPERASI_GERBANG_NEGASI,
  PETA_KELUARGA,
  PETA_PUSTAKA,
  PETA_SHAPE,
  PETA_TOKEN,
  PENANDA_TUGAS_BPMN,
  POLIGON_BERATURAN,
  SIMBOL_EVENT_BPMN,
} from "./tabelBentukDrawio";

export {
  PETA_KELUARGA,
  PETA_PUSTAKA,
  PETA_SHAPE,
  PETA_TOKEN,
  TANPA_PADANAN_NATIVE,
} from "./tabelBentukDrawio";

/** `kunci=nilai` dari token `style=`. Token tanpa `=` dilewati: itu nama bentuk. */
const bacaParam = (bagian: readonly string[]): Map<string, string> => {
  const param = new Map<string, string>();
  for (const token of bagian) {
    const sama = token.indexOf("=");
    if (sama < 1) continue;
    param.set(
      token.slice(0, sama).trim().toLowerCase(),
      token
        .slice(sama + 1)
        .trim()
        .toLowerCase()
    );
  }
  return param;
};

/**
 * Lapis 1. Hanya untuk stensil yang gambarnya ditentukan parameter — sisanya
 * tidak perlu diperiksa dan langsung `null`.
 *
 * `negating=1` pada gerbang logika mengubah AND jadi NAND dan OR jadi NOR.
 * XNOR SENGAJA tidak dipetakan: papan tidak punya tipenya, dan menebak `gateXor`
 * akan menggambar gerbang yang salah tanpa jejak di laporan batas.
 */
const bentukDariParameter = (
  nilaiShape: string,
  param: ReadonlyMap<string, string>
): FlowNodeType | null => {
  const cari = (
    tabel: Readonly<Record<string, FlowNodeType>>,
    kunci?: string
  ): FlowNodeType | null => (kunci ? (tabel[kunci] ?? null) : null);

  switch (nilaiShape) {
    case "mxgraph.bpmn.task2": {
      const dariPenanda = cari(PENANDA_TUGAS_BPMN, param.get("taskmarker"));
      if (dariPenanda) return dariPenanda;
      return cari(JENIS_AKTIVITAS_BPMN, param.get("bpmnshapetype"));
    }
    case "mxgraph.bpmn.gateway2":
      return cari(JENIS_GERBANG_BPMN, param.get("gwtype"));
    case "mxgraph.bpmn.event":
      return cari(SIMBOL_EVENT_BPMN, param.get("symbol"));
    case "mxgraph.electrical.logic_gates.logic_gate": {
      const operasi = param.get("operation");
      if (!operasi) return null;
      const tabel = param.get("negating") === "1" ? OPERASI_GERBANG_NEGASI : OPERASI_GERBANG_LOGIKA;
      return cari(tabel, operasi);
    }
    case "mxgraph.basic.polygon": {
      // Jumlah titik = jumlah `[` dikurangi kurung pembungkus. Tanpa
      // `polyCoords` stensil ini tidak menggambar apa pun yang bisa dikenali.
      const koordinat = param.get("polycoords");
      if (!koordinat) return null;
      const titik = (koordinat.match(/\[/g) ?? []).length - 1;
      return POLIGON_BERATURAN[titik] ?? null;
    }
    default:
      return null;
  }
};

/**
 * Lapis 3. Sisa UTUH dicoba lebih dulu, lalu segmen kiri dilepas satu per satu.
 *
 * Versi pertama melakukan sebaliknya — memotong ke segmen TERAKHIR saja — dan
 * itu mematikan seluruh pustaka Mockup (59 bentuk) yang kuncinya bertitik
 * (`forms.combobox`): `mxgraph.mockup.forms.combobox` dipotong jadi `combobox`,
 * yang tidak ada di tabel, jadi semuanya jatuh ke `rect` tanpa gejala apa pun.
 */
const cariDiPustaka = (nilaiShape: string): FlowNodeType | null => {
  for (const pustaka of Object.keys(PETA_PUSTAKA)) {
    const awalan = `${pustaka}.`;
    if (!nilaiShape.startsWith(awalan)) continue;
    const tabel = PETA_PUSTAKA[pustaka];
    let sisa = nilaiShape.slice(awalan.length);
    while (sisa) {
      const hasil = tabel[sisa];
      if (hasil) return hasil;
      const titik = sisa.indexOf(".");
      if (titik < 0) break;
      sisa = sisa.slice(titik + 1);
    }
  }
  return null;
};

/** Lapis 4: segmen pertama sesudah namespace dipakai sebagai nama keluarga. */
const cariDiKeluarga = (nilaiShape: string): FlowNodeType | null => {
  for (const pustaka of Object.keys(PETA_KELUARGA)) {
    const awalan = `${pustaka}.`;
    if (!nilaiShape.startsWith(awalan)) continue;
    const keluarga = nilaiShape.slice(awalan.length).split(".")[0];
    const hasil = PETA_KELUARGA[pustaka][keluarga];
    if (hasil) return hasil;
  }
  return null;
};

/**
 * Perbaikan yang tidak bisa diputuskan nama bentuknya sendiri.
 *
 * `swimlane;horizontal=0` memindah judul ke sisi KIRI, yaitu lane melebar.
 * `swimlane;startSize=0` bukan lane sama sekali — draw.io memakainya sebagai
 * wadah grup, jadi `container` lebih jujur daripada lane tanpa judul.
 * `ellipse;aspect=fixed` adalah cara draw.io menulis LINGKARAN; ia tidak punya
 * `shape=circle`.
 *
 * `direction=` pada panah: `Sidebar-Arrows2.js` hanya punya SATU stensil panah
 * lurus (`mxgraph.arrows2.arrow`) dan menghasilkan "Arrow Up" serta "Arrow
 * Down" dengan `direction=north`/`south`. Tanpa baris ini keduanya masuk
 * sebagai panah kanan. Arah `west` ikut didukung karena mxGraph menerima
 * keempat nilai `mxConstants.DIRECTION_*` dan pengguna bisa memutar panah
 * mana pun lewat UI draw.io.
 */
const ARAH_PANAH: Readonly<Record<string, FlowNodeType>> = {
  north: "arrowUp",
  south: "arrowDown",
  west: "arrowLeft",
};

const sesuaikan = (bagian: readonly string[], tipe: FlowNodeType): FlowNodeType => {
  const param = bacaParam(bagian);
  if (tipe === "laneVertical" || tipe === "laneHorizontal") {
    if (param.get("startsize") === "0") return "container";
    const judulKiri = param.get("horizontal") === "0";
    return judulKiri ? "laneHorizontal" : "laneVertical";
  }
  if (tipe === "oval" && param.get("aspect") === "fixed") return "circle";
  if (tipe === "arrowRight") {
    const arah = param.get("direction");
    if (arah && ARAH_PANAH[arah]) return ARAH_PANAH[arah];
  }
  return tipe;
};

/**
 * Memutuskan tipe native dari string `style=` draw.io.
 *
 * Huruf besar/kecil TIDAK dipersoalkan — fungsi ini menurunkan sendiri seluruh
 * stringnya. Sebelumnya ia menuntut masukan sudah huruf kecil, dan
 * `importers.ts` ternyata mengirim `style` mentah; prasyarat yang tidak
 * ditegakkan pemanggil adalah bug yang menunggu terjadi.
 *
 * `null` berarti "tidak tahu", dan itu jawaban yang lebih aman daripada
 * menebak: bentuk yang tidak dikenali jatuh ke `rect` DAN muncul di laporan
 * batas, bukan diam-diam menjadi bentuk yang salah.
 */
export const bentukDariGayaDrawio = (gaya: string): FlowNodeType | null => {
  if (!gaya) return null;

  const bagian = gaya
    .toLowerCase()
    .split(";")
    .map((b) => b.trim())
    .filter(Boolean);

  const nilaiShape = bagian
    .find((b) => b.startsWith("shape="))
    ?.slice("shape=".length)
    .trim()
    .toLowerCase();

  if (nilaiShape) {
    const dariParam = bentukDariParameter(nilaiShape, bacaParam(bagian));
    if (dariParam) return sesuaikan(bagian, dariParam);
    const persis = PETA_SHAPE[nilaiShape];
    if (persis) return sesuaikan(bagian, persis);
    const dariPustaka = cariDiPustaka(nilaiShape);
    if (dariPustaka) return sesuaikan(bagian, dariPustaka);
    const dariKeluarga = cariDiKeluarga(nilaiShape);
    if (dariKeluarga) return sesuaikan(bagian, dariKeluarga);
    return null;
  }

  // Lapis 5a: token pertama. mxGraph memperlakukannya sebagai nama bentuk.
  const pertama = bagian[0]?.toLowerCase();
  if (pertama && PETA_TOKEN[pertama]) return sesuaikan(bagian, PETA_TOKEN[pertama]);

  // Lapis 5b: token mana pun. draw.io kadang menaruh nama bentuk di tengah,
  // misalnya `fillColor=none;triangle`. Aman karena `PETA_TOKEN` sengaja hanya
  // memuat nama inti mxGraph yang tidak mungkin jadi nama properti.
  for (const token of bagian) {
    const t = token.toLowerCase();
    if (t && PETA_TOKEN[t]) return sesuaikan(bagian, PETA_TOKEN[t]);
  }

  return null;
};

/**
 * Setiap kata bentuk yang dikenali resolver — dibaca laporan batas konversi
 * supaya "apa yang hilang" selalu sepadan dengan "apa yang benar-benar
 * dipetakan", tanpa ada dua daftar yang harus diingat bersamaan.
 *
 * `RANTAI_LAMA` adalah kata yang dikenali rantai `includes` di `importers.ts`
 * tetapi tidak punya baris tabel; tanpanya bentuk itu dilaporkan hilang
 * padahal tergambar.
 */
const RANTAI_LAMA: readonly string[] = ["db", "preprocess", "class", "lambda", "sticky"];

export const KATA_BENTUK_DIKENALI: ReadonlySet<string> = new Set<string>([
  ...Object.keys(PETA_SHAPE),
  ...Object.keys(PETA_TOKEN),
  ...Object.values(PETA_PUSTAKA).flatMap((t) => Object.keys(t)),
  ...Object.values(PETA_KELUARGA).flatMap((t) => Object.keys(t)),
  ...RANTAI_LAMA,
]);

/** Jumlah tipe native berbeda yang bisa dihasilkan impor — angka cakupan #752. */
export const hitungTipeTerjangkau = (): number =>
  new Set<string>([
    ...Object.values(PETA_SHAPE),
    ...Object.values(PETA_TOKEN),
    ...Object.values(PETA_PUSTAKA).flatMap((t) => Object.values(t)),
    ...Object.values(PETA_KELUARGA).flatMap((t) => Object.values(t)),
  ]).size;
