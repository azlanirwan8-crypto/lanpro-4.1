/**
 * #582 — salin-tempel papan dijaga di bentuk keluarannya, bukan di jumlah
 * pemanggilan fungsi. Seleksi dan clipboard dulu satu array yang sama, jadi
 * "sudah disalin" bisa berarti "tidak ada yang tersimpan" tanpa ada yang
 * tahu; test ini mengunci apa yang sungguh-sungguh ada di clipboard dan apa
 * yang lahir saat ditempel.
 */
import { kumpulkanSalinan, hasilTempel } from "./salinTempel";
import type { FlowEdge, FlowNode } from "../types";

const bentuk = (id: string, x: number, y: number, lebih?: Partial<FlowNode>): FlowNode =>
  ({ id, type: "rect", x, y, label: id, color: "indigo", ...lebih }) as FlowNode;

const panah = (id: string, dari: string, ke: string, lebih?: Partial<FlowEdge>): FlowEdge =>
  ({ id, fromNodeId: dari, toNodeId: ke, ...lebih }) as FlowEdge;

describe("kumpulkanSalinan — apa yang benar-benar masuk clipboard (#582)", () => {
  it("membawa panah yang kedua ujungnya ikut diseleksi", () => {
    const papan = [bentuk("a", 100, 100), bentuk("b", 320, 100), bentuk("luar", 900, 500)];
    const semuaPanah = [panah("e1", "a", "b"), panah("e2", "b", "luar")];

    const salinan = kumpulkanSalinan([papan[0], papan[1]], semuaPanah);

    expect(salinan.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    // Inilah yang hilang di Ctrl+V lama: 3 bentuk terseleksi, panah dibuang.
    expect(salinan.edges).toHaveLength(1);
    expect(salinan.edges[0].id).toBe("e1");
  });

  it("salinan tidak ikut bergeser ketika bentuk asalnya digeret", () => {
    const asal = bentuk("a", 100, 100);
    const salinan = kumpulkanSalinan([asal], []);

    asal.x = 999;

    expect(salinan.nodes[0].x).toBe(100);
  });
});

describe("hasilTempel — apa yang lahir saat Ctrl+V (#582)", () => {
  const duaBentukSatuPanah = {
    nodes: [bentuk("a", 100, 100), bentuk("b", 320, 100)],
    edges: [panah("e1", "a", "b", { strokeStyle: "dashed" as const })],
  };

  it("PUSAT kelompok mendarat di titik kursor, bukan pojok kiri-atas (#637)", () => {
    const hasil = hasilTempel(duaBentukSatuPanah, { x: 800, y: 600 });

    // Kotak pembungkus salinan: x 100..450, y 100..170 -> pusat (275,135),
    // jadi geserannya (525,465). Pojok kiri-atas dulu mendarat di (800,600);
    // sekarang titik itulah yang diduduki TENGAH kelompok.
    expect(hasil.nodes.map((n) => n.x)).toEqual([625, 845]);
    expect(hasil.nodes[0].y).toBe(565);
    const x1 = Math.min(...hasil.nodes.map((n) => n.x));
    const x2 = Math.max(...hasil.nodes.map((n) => n.x + (n.width || 130)));
    const y1 = Math.min(...hasil.nodes.map((n) => n.y));
    const y2 = Math.max(...hasil.nodes.map((n) => n.y + (n.height || 70)));
    expect((x1 + x2) / 2).toBe(800);
    expect((y1 + y2) / 2).toBe(600);
  });

  it("memberi id segar dan panah tetap menghubungkan hasil tempelnya sendiri", () => {
    const hasil = hasilTempel(duaBentukSatuPanah, { x: 800, y: 600 });
    const [satu, dua] = hasil.nodes;

    expect(satu.id).not.toBe("a");
    expect(dua.id).not.toBe("b");
    expect(hasil.edges[0].fromNodeId).toBe(satu.id);
    expect(hasil.edges[0].toNodeId).toBe(dua.id);
    expect(hasil.edges[0].id).not.toBe("e1");
    // Gaya garis yang dipilih pengguna ikut pindah.
    expect(hasil.edges[0].strokeStyle).toBe("dashed");
  });

  it("menempel dua kali tanpa kursor tidak menindih persis di tempat yang sama", () => {
    const pertama = hasilTempel(duaBentukSatuPanah);
    expect(pertama.nodes[0].x).toBe(130);
    expect(pertama.nodes[0].y).toBe(130);
  });

  it("kelompok yang ditempel di luar papan dijepit ke tepi, tetap utuh", () => {
    const hasil = hasilTempel(duaBentukSatuPanah, { x: 5000, y: 5000 });
    const kananTerjauh = Math.max(...hasil.nodes.map((n) => n.x + (n.width || 130)));

    expect(kananTerjauh).toBeLessThanOrEqual(3500);
    expect(hasil.nodes[1].x - hasil.nodes[0].x).toBe(220);
  });

  it("clipboard kosong menempel tanpa menambah apa pun", () => {
    expect(hasilTempel({ nodes: [], edges: [] }, { x: 10, y: 10 })).toEqual({
      nodes: [],
      edges: [],
    });
  });
});
