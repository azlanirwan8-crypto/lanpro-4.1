/**
 * #849 — port cabang: dua garis yang keluar dari SISI yang sama tidak boleh
 * berangkat dari titik yang sama.
 *
 * Yang terukur sebelum modul ini ada (papan tujuh bentuk, hasil "Rapikan
 * Otomatis" #840, router #833): keempat pasangan garis saudara berjalan
 * TINDIH 60 px pada koridor yang sama persis, karena pemilihan port
 * (`getClosestPortsPoint` di `FlowchartEdges.tsx`) bekerja per garis tanpa
 * mengingat saudaranya. Kedua cabang sebuah diamond sama-sama memilih sisi
 * `right`, jadi keduanya keluar di (700,222) dan rute ortogonalnya — yang
 * memang hanya menghindari BENTUK, bukan garis lain — berimpit sampai titik
 * belok. Hasilnya di layar: satu garis yang tampak bercabang sendiri, dan
 * ruas yang lewat di atas sebuah bentuk lalu turun ke dalamnya, terbaca
 * sebagai simpul yang sebenarnya tidak ada.
 *
 * Penggeseran per PASANGAN bentuk (#533) tidak menyentuh ini: kunci pasangan
 * adalah `a|b`, jadi `fds→go` dan `fds→nogo` tidak pernah dianggap kembar.
 *
 * Modul ini murni: hanya membaca geometri, memulangkan angka geser per ujung
 * garis. Yang menggambar tetap `FlowchartEdges.tsx`, dan ia menambahkan angka
 * ini di atas `langkah` #533 — keduanya nol bila tidak ada saudara, jadi papan
 * tanpa cabang berperilaku persis seperti sebelumnya.
 *
 * Port yang DIPAKU oleh pengguna (`portSumber`/`portTujuan`, hasil #669) tidak
 * pernah digeser dan tidak dihitung sebagai saudara: itu jangkar eksplisit,
 * memindahkannya berarti membatalkan pilihan yang sengaja dibuat.
 */
import { ukuranBentukEfektif } from "../constants";

export type NamaPort = "top" | "right" | "bottom" | "left";

export interface Port {
  x: number;
  y: number;
  dir: { x: number; y: number };
  nama: NamaPort;
}

export interface SimpulPort {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface GarisPort {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  portSumber?: { x: number; y: number } | null;
  portTujuan?: { x: number; y: number } | null;
}

/** Jarak antar cabang di sepanjang tepi bentuk. Sama dengan langkah #533. */
export const LANGKAH_PORT = 18;

/** Empat port tengah sisi, urutan tetap: atas, kanan, bawah, kiri. */
const portBentuk = (node: SimpulPort): Port[] => {
  const { width, height } = ukuranBentukEfektif(node);
  return [
    { nama: "top", x: node.x + width / 2, y: node.y, dir: { x: 0, y: -1 } },
    { nama: "right", x: node.x + width, y: node.y + height / 2, dir: { x: 1, y: 0 } },
    { nama: "bottom", x: node.x + width / 2, y: node.y + height, dir: { x: 0, y: 1 } },
    { nama: "left", x: node.x, y: node.y + height / 2, dir: { x: -1, y: 0 } },
  ];
};

/** Pasangan port terdekat — aturan yang sama yang dipakai papan sejak #533. */
export const pilihPort = (src: SimpulPort, tgt: SimpulPort): { source: Port; target: Port } => {
  const sourcePorts = portBentuk(src);
  const targetPorts = portBentuk(tgt);
  let minDistance = Infinity;
  let bestSource = sourcePorts[2];
  let bestTarget = targetPorts[0];
  for (const s of sourcePorts) {
    for (const t of targetPorts) {
      const d = Math.hypot(t.x - s.x, t.y - s.y);
      if (d < minDistance) {
        minDistance = d;
        bestSource = s;
        bestTarget = t;
      }
    }
  }
  return { source: bestSource, target: bestTarget };
};

/**
 * Geser sebuah port sepanjang TEPI bentuknya: port di sisi kiri/kanan bergerak
 * vertikal, port di sisi atas/bawah bergerak horizontal. Konvensi ini dipinjam
 * apa adanya dari #533 supaya dua mekanisme geser tidak bertentangan arah.
 */
export const geserPort = <T extends { x: number; y: number; dir?: { x: number; y: number } }>(
  p: T,
  d: number
): T => (d === 0 ? p : p.dir && p.dir.x !== 0 ? { ...p, y: p.y + d } : { ...p, x: p.x + d });

const tengah = (n: SimpulPort) => {
  const u = ukuranBentukEfektif(n);
  return { x: n.x + u.width / 2, y: n.y + u.height / 2 };
};

export interface Sebaran {
  /** Geseran di ujung asal; 0 bila garis ini tidak punya saudara di sisi itu. */
  keluar: number;
  /** Geseran di ujung tujuan. */
  masuk: number;
}

/**
 * Hitung geseran tiap ujung garis. Urutan saudara mengikuti koordinat TEPI
 * LAWAN yang tegak lurus terhadap sisi port — cabang yang menuju bentuk di
 * atas keluar paling atas, jadi kipasnya tidak pernah saling menyilang.
 * Pemecah dasi id, sehingga hasilnya tidak bergantung urutan array `edges`.
 */
export function sebarPort(edges: GarisPort[], nodes: SimpulPort[]): Map<string, Sebaran> {
  const peta = new Map(nodes.map((n) => [n.id, n]));
  const hasil = new Map<string, Sebaran>();
  const dorong = (id: string, bagian: Partial<Sebaran>) => {
    const kini = hasil.get(id) || { keluar: 0, masuk: 0 };
    hasil.set(id, { ...kini, ...bagian });
  };

  interface Anggota {
    id: string;
    acuh: number;
  }
  const grupKeluar = new Map<string, Anggota[]>();
  const grupMasuk = new Map<string, Anggota[]>();

  for (const e of edges) {
    const src = peta.get(e.fromNodeId);
    const tgt = peta.get(e.toNodeId);
    if (!src || !tgt || e.fromNodeId === e.toNodeId) continue;
    const { source, target } = pilihPort(src, tgt);
    const tSrc = tengah(src);
    const tTgt = tengah(tgt);
    // Setiap garis dengan dua ujung ikut tercatat walau nanti tidak berpindah:
    // nilainya 0, bukan "tidak ada", supaya lapisan gambar tidak menebak.
    dorong(e.id, {});

    if (!e.portSumber) {
      const acuh = source.dir.x !== 0 ? tTgt.y : tTgt.x;
      const kunci = `${e.fromNodeId}|${source.nama}`;
      if (!grupKeluar.has(kunci)) grupKeluar.set(kunci, []);
      grupKeluar.get(kunci)!.push({ id: e.id, acuh });
    }
    if (!e.portTujuan) {
      const acuh = target.dir.x !== 0 ? tSrc.y : tSrc.x;
      const kunci = `${e.toNodeId}|${target.nama}`;
      if (!grupMasuk.has(kunci)) grupMasuk.set(kunci, []);
      grupMasuk.get(kunci)!.push({ id: e.id, acuh });
    }
  }

  const sematkan = (grup: Map<string, Anggota[]>, bagian: keyof Sebaran) => {
    for (const daftar of grup.values()) {
      if (daftar.length < 2) continue;
      daftar.sort((a, b) => a.acuh - b.acuh || a.id.localeCompare(b.id));
      daftar.forEach((anggota, i) => {
        dorong(anggota.id, {
          [bagian]: (i - (daftar.length - 1) / 2) * LANGKAH_PORT,
        } as Partial<Sebaran>);
      });
    }
  };
  sematkan(grupKeluar, "keluar");
  sematkan(grupMasuk, "masuk");

  return hasil;
}
