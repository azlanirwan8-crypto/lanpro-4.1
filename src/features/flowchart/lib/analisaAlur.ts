/**
 * #841 Fase 1 — analisa struktur alur, murni dan bisa diuji tanpa React.
 *
 * Sebelum modul ini ada, tombol "Simulasikan" hanya menjalankan BFS lalu
 * menyalakan tiap bentuk selama satu detik (`FlowchartContainer.handleSimulateFlow`).
 * Ia tidak pernah menjawab pertanyaan yang membuatnya dipakai orang: alur ini
 * BENAR atau tidak. Tiga cacat yang terukur dari kode lama:
 *
 * 1. Tidak ada satu pun laporan. Titik awal dipilih sebagai "semua bentuk tanpa
 *    garis masuk", jadi bentuk yatim ikut menyala seolah-olah pintu masuk yang
 *    sah, dan papan yang patah dua tetap diumumkan selesai
 *    (`toast.success(t("toast.simDone"))` di ujung loop).
 * 2. Cadangan titik awalnya mencocokkan TEKS label (`label.includes("mulai")`,
 *    `includes("start")`) dan bentuk `oval`; kalau tetap kosong, `nodes[0]` —
 *    bentuk pertama dalam array, bukan awal alur. Papan berbahasa Inggris atau
 *    awal berbentuk lain langsung salah mulai.
 * 3. Siklus ditangani `visited` dan berhenti diam-diam; jalan buntu di tengah
 *    proses, percabangan bukan dua, dan garis keputusan tanpa label tidak
 *    pernah dilaporkan.
 *
 * Modul ini HANYA membaca struktur. Tidak ada React, tidak ada `t()`, tidak ada
 * geometri: yang pulang adalah kode temuan plus id simpul/tepi, dan sebuah
 * jejak skenario untuk dianimasikan. Penerjemahan dan penggambaran terjadi di
 * tempatnya — `LaporanAlur.tsx` dan `FlowchartEdges.tsx`.
 *
 * Semua keluaran deterministik: penyortiran id di setiap langkah, jadi papan
 * yang sama menghasilkan laporan dan jejak yang sama meski urutan arraynya
 * diacak. Itu alasan test boleh membandingkan angka harapan secara harfiah.
 */

/** Bentuk yang berarti "ada pertanyaan di sini": cabang dua dengan label. */
const BENTUK_KEPUTUSAN = new Set(["diamond", "decision"]);
/** Bentuk yang berarti "alur berhenti di sini" — palet menulisnya "Mulai / Selesai". */
const BENTUK_TERMINAL = new Set(["oval"]);

/** Batas ekspansi jejak: graf siklik besar tidak boleh membuat laporan mengunci UI. */
const BATAS_EKSPANSI = 20000;
/** Jalan buntu berhenti dibaca di sini; angka di atasnya dilaporkan sebagai "≥". */
const BATAS_SENARIO = 99;

export interface SimpulAlur {
  id: string;
  type: string;
  label: string;
}

export interface TepiAlur {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export type TingkatTemuan = "galat" | "peringatan";

export type KodeTemuan =
  | "tanpa_awal"
  | "banyak_awal"
  | "tak_terjangkau"
  | "jalan_buntu"
  | "cabang_bukan_dua"
  | "cabang_tanpa_label"
  | "siklus_terjebak";

export interface TemuanAlur {
  kode: KodeTemuan;
  tingkat: TingkatTemuan;
  simpulIds: string[];
  tepiIds: string[];
}

export interface HasilAnalisa {
  temuan: TemuanAlur[];
  awalIds: string[];
  /** Simpul tanpa tepi keluar — tempat alur berhenti, sah atau tidak. */
  akhirIds: string[];
  terjangkauIds: string[];
  /** Banyaknya GRUP temuan, bukan banyaknya bentuk: lima yatim = satu galat. */
  jumlahGalat: number;
  jumlahPeringatan: number;
}

const banding = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Tepi yang boleh dipakai: kedua ujungnya ADA di papan. Garis yatim (ujungnya
 * sudah dihapus — lihat #631) tidak dihitung sebagai masukan/keluaran, karena
 * kalau ikut, satu bentuk yang masih utuh bisa dilaporkan "tak terjangkau"
 * hanya karena bekas garis yang belum dibersihkan.
 */
function tepiSah(nodes: SimpulAlur[], edges: TepiAlur[]): TepiAlur[] {
  const ada = new Set(nodes.map((n) => n.id));
  return edges
    .filter((e) => ada.has(e.fromNodeId) && ada.has(e.toNodeId))
    .slice()
    .sort((a, b) => banding(a.id, b.id));
}

interface Peta {
  keluar: Map<string, TepiAlur[]>;
  masuk: Map<string, TepiAlur[]>;
}

function bangunPeta(tepi: TepiAlur[]): Peta {
  const keluar = new Map<string, TepiAlur[]>();
  const masuk = new Map<string, TepiAlur[]>();
  for (const e of tepi) {
    if (!keluar.has(e.fromNodeId)) keluar.set(e.fromNodeId, []);
    if (!masuk.has(e.toNodeId)) masuk.set(e.toNodeId, []);
    keluar.get(e.fromNodeId)!.push(e);
    masuk.get(e.toNodeId)!.push(e);
  }
  return { keluar, masuk };
}

function jangkauMulai(awalIds: string[], keluar: Map<string, TepiAlur[]>): Set<string> {
  const lihat = new Set<string>();
  const antre = [...awalIds];
  while (antre.length) {
    const id = antre.shift()!;
    if (lihat.has(id)) continue;
    lihat.add(id);
    for (const t of keluar.get(id) || []) if (!lihat.has(t.toNodeId)) antre.push(t.toNodeId);
  }
  return lihat;
}

/**
 * Siklus yang tidak punya jalan keluar dicari dengan komponen kuat (Tarjan):
 * satu gugus yang seluruh tepi keluarnya tetap berada di dalam gugus itu adalah
 * jerat — simulasi apa pun yang masuk ke situ tidak akan pernah selesai.
 * Simpul tunggal dengan garis ke dirinya sendiri termasuk kasus ini.
 */
function jerat(nodes: SimpulAlur[], { keluar }: Peta, jangkau: Set<string>): string[] {
  if (!jangkau.size) return [];
  const idSimpul = nodes.map((n) => n.id).sort(banding);
  const indeks = new Map<string, number>();
  const low = new Map<string, number>();
  const padaSusunan = new Set<string>();
  const susunan: string[] = [];
  const hasil: string[] = [];
  let waktu = 0;

  const gugus = (id: string) => {
    indeks.set(id, waktu);
    low.set(id, waktu);
    waktu += 1;
    susunan.push(id);
    padaSusunan.add(id);
    for (const t of keluar.get(id) || []) {
      const w = t.toNodeId;
      if (!indeks.has(w)) {
        gugus(w);
        low.set(id, Math.min(low.get(id)!, low.get(w)!));
      } else if (padaSusunan.has(w)) {
        low.set(id, Math.min(low.get(id)!, indeks.get(w)!));
      }
    }
    if (low.get(id) === indeks.get(id)) {
      const gugusKuat: string[] = [];
      let w = "";
      do {
        w = susunan.pop()!;
        padaSusunan.delete(w);
        gugusKuat.push(w);
      } while (w !== id);
      if (gugusKuat.length > 1) {
        const diDalam = new Set(gugusKuat);
        const bisaKeluar = gugusKuat.some((s) =>
          (keluar.get(s) || []).some((t) => !diDalam.has(t.toNodeId))
        );
        if (!bisaKeluar) hasil.push(...gugusKuat);
      }
    }
  };

  for (const id of idSimpul) {
    if (indeks.has(id) || !jangkau.has(id)) continue;
    gugus(id);
  }
  // Gelung sendiri: Tarjan hanya melaporkan gugus kuat beranggota lebih dari
  // satu, padahal bentuk yang garis keluarnya hanya menuju dirinya sendiri
  // juga jerat — masuk, dan tidak pernah keluar.
  for (const id of idSimpul) {
    if (!jangkau.has(id) || hasil.includes(id)) continue;
    const keluaran = keluar.get(id) || [];
    const putaran = keluaran.some((t) => t.toNodeId === id);
    const bisaKeluar = keluaran.some((t) => t.toNodeId !== id);
    if (putaran && !bisaKeluar) hasil.push(id);
  }
  return Array.from(new Set(hasil)).sort(banding);
}

/**
 * Awal yang jadi acuan: bentuk terminal lebih dulu (palet menulis `oval`
 * sebagai "Mulai / Selesai"), lalu id terkecil. Bentuk, BUKAN teks label —
 * kode lama mencocokkan kata "mulai"/"start" di label, jadi papan berbahasa
 * Inggris atau awal berbentuk lain jatuh ke `nodes[0]`: bentuk pertama dalam
 * array, bukan awal alur.
 */
function utamaDari(awalIds: string[], peta: Map<string, SimpulAlur>): string | undefined {
  return awalIds.find((id) => BENTUK_TERMINAL.has(peta.get(id)?.type || "")) ?? awalIds[0];
}

/**
 * Laporan struktur papan. `galat` = alur pasti rusak (tidak bisa dijalankan
 * sampai habis), `peringatan` = bisa jalan tapi hampir pasti bukan yang
 * dimaksud pembuatnya.
 */
export function analisaAlur(nodes: SimpulAlur[], edges: TepiAlur[]): HasilAnalisa {
  const tepi = tepiSah(nodes, edges);
  const { keluar, masuk } = bangunPeta(tepi);
  const idSimpul = nodes.map((n) => n.id).sort(banding);
  const peta = new Map<string, SimpulAlur>(nodes.map((n) => [n.id, n]));

  const awalIds = idSimpul.filter((id) => !masuk.get(id)?.length);
  const akhirIds = idSimpul.filter((id) => !keluar.get(id)?.length);
  const awalUtama = utamaDari(awalIds, peta);
  // "Terjangkau" dibaca dari SATU titik awal karena itulah yang akan diputar
  // animasinya. Yang berstatus "awal lain" punya baris laporannya sendiri
  // (lihat `banyak_awal`) dan tidak dihitung dua kali di sini; bentuk yang
  // berdiri sendiri tetap terjatuh ke `tak_terjangkau`, karena ia tidak punya
  // garis keluar sehingga bukan awal, cuma benda yang lewat.
  const jangkau = jangkauMulai(awalUtama ? [awalUtama] : [], keluar);
  const terjangkauIds = idSimpul.filter((id) => jangkau.has(id));
  const awalLain = awalIds.filter((id) => id !== awalUtama && keluar.get(id)?.length);

  const temuan: TemuanAlur[] = [];
  const dorong = (
    kode: KodeTemuan,
    tingkat: TingkatTemuan,
    simpulIds: string[],
    tepiIds: string[] = []
  ) => {
    if (!simpulIds.length && !tepiIds.length) return;
    temuan.push({
      kode,
      tingkat,
      simpulIds: simpulIds.slice().sort(banding),
      tepiIds: tepiIds.slice().sort(banding),
    });
  };

  if (nodes.length > 0 && awalIds.length === 0) dorong("tanpa_awal", "galat", idSimpul);
  dorong("banyak_awal", "peringatan", awalLain);

  // Tanpa titik awal, `jangkau` kosong dan seluruh papan akan dilaporkan dua
  // kali: sekali sebagai "tidak ada awal", sekali sebagai "tidak terjangkau".
  // Yang pertama lebih actionable, jadi yang keduanya tidak ditulis.
  if (awalIds.length) {
    const sudahDilaporkan = new Set(awalLain);
    dorong(
      "tak_terjangkau",
      "galat",
      idSimpul.filter((id) => !jangkau.has(id) && !sudahDilaporkan.has(id))
    );
  }

  // Jalan buntu yang SAJA dari yang terjangkau: yang tidak terjangkau sudah
  // dilaporkan di atas, dan melaporkannya dua kali hanya membuat tumpukan.
  const buntu = akhirIds.filter(
    (id) => jangkau.has(id) && !BENTUK_TERMINAL.has(peta.get(id)!.type)
  );
  dorong("jalan_buntu", "peringatan", buntu);

  const keputusan = terjangkauIds.filter((id) => BENTUK_KEPUTUSAN.has(peta.get(id)!.type));
  dorong(
    "cabang_bukan_dua",
    "peringatan",
    keputusan.filter((id) => (keluar.get(id) || []).length !== 2)
  );
  dorong(
    "cabang_tanpa_label",
    "peringatan",
    [],
    tepi
      .filter(
        (t) => BENTUK_KEPUTUSAN.has(peta.get(t.fromNodeId)!.type) && !String(t.label || "").trim()
      )
      .map((t) => t.id)
  );

  dorong("siklus_terjebak", "galat", jerat(nodes, { keluar, masuk }, jangkau));

  return {
    temuan,
    awalIds,
    akhirIds,
    terjangkauIds,
    jumlahGalat: temuan.filter((t) => t.tingkat === "galat").length,
    jumlahPeringatan: temuan.filter((t) => t.tingkat === "peringatan").length,
  };
}

export interface SkenarioAlur {
  simpulIds: string[];
  tepiIds: string[];
  /** Jumlah skenario berbeda yang berakhir di jalan buntu, mentok di `BATAS_SENARIO`. */
  jumlahSkenario: number;
  mungkinLebih: boolean;
  /** Garis yang terjangkau tapi tidak dilalui skenario pertama — cabang yang tidak dilewati. */
  tepiTakDilewati: string[];
}

/**
 * Skenario pertama (urutan id garis) beserta hitungan saudaranya.
 *
 * Sengaja SATU jejak yang dianimasikan, bukan seluruh graf: yang dicari orang
 * dari "simulasi" adalah satu perjalanan yang bisa ditonton dan dibaca
 * ringkasannya, bukan lampu-lampu yang menyala acak seperti perilaku lama.
 * Cabang yang tidak dilewati dihitung dan dilaporkan, supaya jejak tunggal ini
 * tidak pernah menyiratkan "alur sudah lengkap".
 */
export function skenarioAlur(nodes: SimpulAlur[], edges: TepiAlur[]): SkenarioAlur | null {
  const tepi = tepiSah(nodes, edges);
  const { keluar, masuk } = bangunPeta(tepi);
  const peta = new Map<string, SimpulAlur>(nodes.map((n) => [n.id, n]));
  const awalIds = nodes
    .map((n) => n.id)
    .sort(banding)
    .filter((id) => !masuk.get(id)?.length);
  const awal = utamaDari(awalIds, peta);
  if (!awal) return null;

  // Jejak pertama disimpan di dalam array, bukan di variabel: TypeScript
  // melipat penyempitan `let terbaik = null` menjadi `never` di luar closure
  // karena ia tidak tahu closure di bawah sudah mengisinya.
  const ditemukan: { simpulIds: string[]; tepiIds: string[] }[] = [];
  let terminal = 0;
  let ekspansi = 0;
  let mungkinLebih = false;

  const jalan = (id: string, dalamJejak: Set<string>, simpul: string[], jalur: string[]) => {
    if (ekspansi++ > BATAS_EKSPANSI) {
      mungkinLebih = true;
      return;
    }
    const keluaran = (keluar.get(id) || []).filter((t) => !dalamJejak.has(t.toNodeId));
    if (!keluaran.length) {
      terminal += 1;
      if (terminal > BATAS_SENARIO) mungkinLebih = true;
      if (!ditemukan.length) ditemukan.push({ simpulIds: [...simpul], tepiIds: [...jalur] });
      return;
    }
    for (const t of keluaran) {
      if (terminal > BATAS_SENARIO && ditemukan.length) return;
      dalamJejak.add(t.toNodeId);
      jalan(t.toNodeId, dalamJejak, [...simpul, t.toNodeId], [...jalur, t.id]);
      dalamJejak.delete(t.toNodeId);
    }
  };

  jalan(awal, new Set([awal]), [awal], []);
  const jejak = ditemukan[0];
  if (!jejak) return null;

  const terpakai = new Set(jejak.tepiIds);
  const jangkau = jangkauMulai([awal], keluar);
  return {
    ...jejak,
    jumlahSkenario: Math.min(terminal, BATAS_SENARIO),
    mungkinLebih,
    tepiTakDilewati: tepi
      .filter((t) => !terpakai.has(t.id) && jangkau.has(t.fromNodeId))
      .map((t) => t.id)
      .sort(banding),
  };
}

/**
 * "Mulai → Cek (Ya) → Selesai" — ringkasan satu skenario dengan label cabang di
 * dalam kurung, karena tanpa label cabang, jejaknya terbaca seperti daftar nama.
 * Label bentuk yang kosong tetap ditampilkan (spasi nol) supaya jumlah anak
 * panah pada ringkasan selalu sama dengan jumlah langkah animasinya.
 */
export function ringkasJejak(
  skenario: SkenarioAlur,
  nodes: SimpulAlur[],
  edges: TepiAlur[]
): string {
  const nama = new Map<string, SimpulAlur>(nodes.map((n) => [n.id, n]));
  const tepi = new Map<string, TepiAlur>(edges.map((e) => [e.id, e]));
  return skenario.simpulIds
    .map((id, i) => {
      const label = String(nama.get(id)?.label ?? "").trim();
      const berikutnya = skenario.tepiIds[i];
      const cabangnya = berikutnya ? String(tepi.get(berikutnya)?.label ?? "").trim() : "";
      return cabangnya ? `${label} (${cabangnya})` : label;
    })
    .join(" → ");
}
