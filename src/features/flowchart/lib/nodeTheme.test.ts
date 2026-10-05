/**
 * Test untuk pemetaan node → kelas Tailwind.
 *
 * Berekstensi .ts (proyek Jest "node"): fungsi-fungsi ini murni string, tidak
 * menyentuh DOM sama sekali, jadi tidak perlu jsdom yang lebih lambat.
 *
 * Seperti pada importers, test ini merekam perilaku sebagaimana adanya saat
 * dipindahkan dari FlowchartContainer — jaring pengaman untuk Fase 5 yang akan
 * membelah JSX-nya.
 */
import { getShapeThemeClasses, getInitials } from "./nodeTheme";
import type { FlowNode } from "../types";

const node = (over: Partial<FlowNode> = {}): FlowNode =>
  ({
    id: "n1",
    type: "rect",
    x: 0,
    y: 0,
    label: "Uji",
    color: "indigo",
    ...over,
  }) as FlowNode;

describe("getShapeThemeClasses", () => {
  /**
   * #638 (rute 2) memindahkan WARNA bentuk dari kelas Tailwind ke
   * `colorPaletteHex`, dipasang inline oleh `FlowchartNode`. Alasannya diukur:
   * kelas `bg-*-100 border-*-600` memberi kontras tepi/isian 4,5-9,4 sementara
   * draw.io 1,8-3,3, dan bentuk terlihat seperti stiker tebal ("gemuk, warnanya
   * pecah" - laporan pemilik proyek 05 Okt). Yang dijaga di sini karena itu:
   * PEMETAAN warna -> palet teks, dan fakta bahwa kelas warna bentuk sudah
   * tidak memegang latar/tepi lagi.
   */
  it("memakai palet teks sesuai warna node, tanpa mewarnai latar dari kelas", () => {
    const hasil = getShapeThemeClasses(node({ color: "rose" }), false);

    expect(hasil).toContain("text-rose-900");
    expect(hasil).not.toMatch(/\bbg-/);
    expect(hasil).not.toMatch(/border-rose/);
  });

  it("tepi bentuk div 1 px seperti garis tepi draw.io, bukan 2 px", () => {
    const hasil = getShapeThemeClasses(node({ color: "rose" }), false);

    expect(hasil).toContain(" border ");
    expect(hasil).not.toContain("border-2");
  });

  it("jatuh ke palet indigo bila warnanya tidak dikenal", () => {
    expect(getShapeThemeClasses(node({ color: "tidak-ada-warna-ini" }), false)).toContain(
      "text-indigo-900"
    );
  });

  it("menambahkan cincin penanda hanya saat node terpilih", () => {
    expect(getShapeThemeClasses(node(), true)).toContain("ring-4");
    expect(getShapeThemeClasses(node(), false)).not.toContain("ring-4");
  });

  it("membedakan bentuk lewat kelas sudutnya", () => {
    expect(getShapeThemeClasses(node({ type: "rect" }), false)).toContain("rounded-xl");
    expect(getShapeThemeClasses(node({ type: "cylinder" }), false)).toContain("rounded-t-[20px]");
    expect(getShapeThemeClasses(node({ type: "folder" }), false)).toContain("rounded-tr-lg");
  });

  // TEMUAN, sengaja direkam apa adanya: `customSvgTypes` memuat "oval" dan
  // "circle", sehingga cabang khusus keduanya di bagian bawah fungsi ini TIDAK
  // PERNAH tercapai — pemeriksaan customSvgTypes menangkapnya lebih dulu.
  // Test ini mengunci perilaku yang benar-benar berjalan sekarang, supaya
  // pembelahan JSX di fase berikutnya tidak diam-diam mengubahnya. Keputusan
  // apakah cabang mati itu dibuang ada di pemilik repo.
  it.each(["oval", "circle"])("menggambar %s sebagai SVG, bukan div bersudut", (tipe) => {
    const hasil = getShapeThemeClasses(node({ type: tipe as FlowNode["type"] }), false);

    expect(hasil).toContain("bg-transparent");
    expect(hasil).not.toContain("rounded-full");
  });

  it("menghormati gaya garis node", () => {
    expect(getShapeThemeClasses(node({ borderStyle: "dashed" }), false)).toContain("border-dashed");
    expect(getShapeThemeClasses(node({ borderStyle: "none" }), false)).toContain("border-0");
  });

  it("membuat bentuk SVG transparan tanpa border agar tidak tampak kotak ganda", () => {
    const hasil = getShapeThemeClasses(node({ type: "diamond" }), false);

    expect(hasil).toContain("bg-transparent");
    expect(hasil).toContain("border-0");
    // Rangkanya digambar SVG, jadi div-nya tidak boleh ikut memberi cincin.
    expect(hasil).not.toContain("ring-4");
  });

  it("memberi sticky note tata letak kiri-atas, bukan tengah", () => {
    expect(getShapeThemeClasses(node({ type: "sticky" }), false)).toContain("text-left");
  });
});

describe("getInitials", () => {
  it("mengambil huruf pertama dua kata pertama", () => {
    expect(getInitials("Rifky Pramadanianto")).toBe("RP");
  });

  it("mengambil dua huruf pertama bila hanya satu kata", () => {
    expect(getInitials("Administrator")).toBe("AD");
  });

  it("memakai LP bila nama tidak diketahui", () => {
    expect(getInitials()).toBe("LP");
    expect(getInitials("")).toBe("LP");
  });

  it("tahan terhadap spasi berlebih", () => {
    expect(getInitials("  Rido   Oktobriananta  ")).toBe("RO");
  });
});
