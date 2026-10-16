/**
 * @jest-environment jsdom
 *
 * #762 — titik panah bisa DIPIN ke tempat yang disentuh, bukan ke port yang
 * dipapankan papan.
 *
 * SEBAB. Pemilik proyek menulis dua kali, dan yang kedua dengan nada tinggi:
 * "masih tidak bisa di pin titik panah yang di inginkan" / "garis panah tidak
 * bisa di atur". Akarnya satu dan sudah terbukti di kode sebelum perubahan ini:
 * `portSumber`/`portTujuan` sudah ADA di model, sudah DIBACA saat impor
 * (`gayaImpor.ts:318-320`), sudah DIHORMATI saat menggambar
 * (`FlowchartEdges.tsx:566-568`), dan sudah DITULIS BALIK saat ekspor
 * (`eksporDrawio.ts:152-153`) — yang tidak pernah ada adalah satu pun jalur di
 * layar yang menulisnya. Jadi garis hasil impor draw.io menempel persis,
 * sementara garis yang dibuat atau dipindah pengguna selalu melompat ke port
 * pilihan papan.
 *
 * draw.io menyimpan pin sebagai PECAHAN 0..1 (`exitX/exitY`), bukan koordinat
 * absolut. Itu bukan detail: pecahan membuat pin tetap di tempatnya relatif ke
 * bentuknya ketika bentuk itu dipindahkan atau diubah ukurannya. Test kedua di
 * bawah mengunci sifat itu, dan itu yang membedakan "pin" dari "titik terakhir
 * yang pernah diklik".
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { pecahanPort, titikPort } from "./FlowchartEdges";
import type { FlowNode } from "../types";

const bentuk = (x: number, y: number, width = 200, height = 100): FlowNode => ({
  id: "p1",
  type: "rect",
  x,
  y,
  label: "P",
  color: "indigo",
  width,
  height,
});

describe("#762 pecahan port", () => {
  it("titik sudut, tengah, dan tepi kembali ke pecahan yang benar", () => {
    const n = bentuk(100, 200, 200, 100);
    expect(pecahanPort(n, { x: 100, y: 200 })).toEqual({ x: 0, y: 0 });
    expect(pecahanPort(n, { x: 300, y: 300 })).toEqual({ x: 1, y: 1 });
    expect(pecahanPort(n, { x: 200, y: 250 })).toEqual({ x: 0.5, y: 0.5 });
    // Seperempat ke kanan, sepersepuluh ke bawah: pin yang tidak simetris,
    // yaitu jenis yang tidak bisa dihasilkan papan sebelum item ini.
    expect(pecahanPort(n, { x: 150, y: 210 })).toEqual({ x: 0.25, y: 0.1 });
  });

  it("titik di luar bentuk dijepit ke 0..1, bukan disimpan sebagai angka liar", () => {
    const n = bentuk(100, 200, 200, 100);
    const luar = pecahanPort(n, { x: 900, y: -400 });
    expect(luar).toEqual({ x: 1, y: 0 });
  });

  it("pecahan -> titik -> pecahan kembali ke angka yang sama", () => {
    // Ini sifat yang membuat pin bertahan saat bentuk dipindah: yang disimpan
    // adalah hubungan relatif, bukan koordinat layar.
    const n = bentuk(100, 200, 200, 100);
    for (const p of [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.25, y: 0.7 },
      { x: 0.5, y: 0.5 },
    ]) {
      const diPapan = titikPort(n, p);
      expect(pecahanPort(n, diPapan).x).toBeCloseTo(p.x, 6);
      expect(pecahanPort(n, diPapan).y).toBeCloseTo(p.y, 6);
    }
  });

  it("pin ikut berpindah bersama bentuknya, bukan tertinggal di layar", () => {
    const pecahan = { x: 0.25, y: 0.7 };
    const asal = titikPort(bentuk(100, 200), pecahan);
    const sesudahDipindah = titikPort(bentuk(400, 500), pecahan);
    expect(sesudahDipindah.x - asal.x).toBe(300);
    expect(sesudahDipindah.y - asal.y).toBe(300);
  });
});
