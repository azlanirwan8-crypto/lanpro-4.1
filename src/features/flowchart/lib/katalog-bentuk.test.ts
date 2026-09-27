/**
 * Kelengkapan katalog bentuk papan (#541).
 *
 * Tiga cara katalog ini bisa busuk, dan tidak ada satu pun yang terlihat di
 * layar sampai seseorang mengklik bentuknya:
 *  - tipe didaftarkan di katalog tapi tidak ada gambarnya di kanvas;
 *  - tipe ada di daftar SVG tapi tidak punya ikon pratinjau → panel kiri
 *    menampilkan kotak indigo generik (delapan bentuk mengalaminya diam-diam);
 *  - tipe dobel daftar, sehingga yang muncul selalu gambar yang pertama.
 * Test ini membaca katalog dan renderer sungguhan, bukan salinan daftarnya.
 */
import { DIAGRAM_SHAPE_GROUPS, UKURAN_BENTUK } from "../constants";
import { customSvgTypes, renderCustomSvgShape, renderMiniPreviewIcon } from "./shapes";
import type { FlowNode } from "../types";

const SEMUA_ITEM = DIAGRAM_SHAPE_GROUPS.flatMap((g) => g.items);
const SEMUA_TIPE = SEMUA_ITEM.map((i) => i.type);

const nodeUntuk = (type: string): FlowNode =>
  ({
    id: "n1",
    type,
    x: 0,
    y: 0,
    label: "Uji",
    color: "indigo",
    width: 140,
    height: 70,
  }) as FlowNode;

describe("katalog bentuk papan (#541)", () => {
  it("punya lebih dari 150 bentuk dan tidak ada tipe yang dobel", () => {
    expect(SEMUA_TIPE.length).toBeGreaterThanOrEqual(150);
    const dobel = SEMUA_TIPE.filter((t, i) => SEMUA_TIPE.indexOf(t) !== i);
    expect(dobel).toEqual([]);
  });

  it("setiap bentuk di katalog punya ikon pratinjau sendiri, bukan kotak generik", () => {
    // Fallback generik adalah <div>; tiap ikon asli dibungkus <svg>.
    const tanpaIkon = SEMUA_TIPE.filter((t) => {
      const ikon: any = renderMiniPreviewIcon(t);
      return !ikon || ikon.type !== "svg";
    });
    expect(tanpaIkon).toEqual([]);
  });

  it("setiap tipe yang mengaku SVG benar-benar digambar", () => {
    const tanpaGambar = customSvgTypes.filter((t) => {
      const hasil = renderCustomSvgShape(nodeUntuk(t), "miro", false);
      return hasil === null || hasil === undefined;
    });
    expect(tanpaGambar).toEqual([]);
  });

  it("setiap bentuk punya label dan keterangan yang tidak kosong", () => {
    const cacat = SEMUA_ITEM.filter((i) => !i.name?.trim() || !i.desc?.trim());
    expect(cacat).toEqual([]);
  });

  it("peta ukuran hanya menyebut tipe yang benar-benar ada di katalog", () => {
    const yatim = Object.keys(UKURAN_BENTUK).filter((t) => !SEMUA_TIPE.includes(t));
    expect(yatim).toEqual([]);
  });

  it("grup baru ikut terdaftar sehingga bentuknya terjangkau pencarian", () => {
    const judul = DIAGRAM_SHAPE_GROUPS.map((g) => g.title);
    expect(judul).toEqual(expect.arrayContaining(["Arrows", "Cloud & Network"]));
    // Jumlah grup menentukan apakah bentuk baru benar-benar muncul di panel,
    // bukan hanya bertambah di satu daftar.
    expect(judul.length).toBeGreaterThanOrEqual(10);
  });
});
