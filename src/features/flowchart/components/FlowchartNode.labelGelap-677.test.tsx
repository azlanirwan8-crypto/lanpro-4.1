/**
 * #677 — label bentuk di PAPAN GELAP harus benar-benar terbaca.
 *
 * MENGAPA ITEM INI LAHIRNYA BERBEDA DARI YANG DIRENCANAKAN. Laporan 10 Okt
 * menduga garis papan menjadi `#000000` di atas kanvas gelap. Itu keliru, dan
 * kekeliruannya tercatat di sini supaya tidak diulang: `canvasTheme` BUKAN
 * properti papan yang bebas — `useFlowchartCanvas.ts:115` mengambilnya dari
 * `useTemaAplikasi()`, yang memetakan aplikasi gelap ke "blueprint" (#547). Jadi
 * di mode gelap garisnya `#60a5fa` (6,13:1), bukan hitam. Yang tersisa adalah
 * label, dan di situlah dua tabrakan nyata menunggu — keduanya ditemukan karena
 * test ini ditulis lebih dulu dan dibuat MERAH.
 *
 * TABRAKAN 1 — catatan tempel (`sticky`). `FlowchartNode.tsx:487` mengecualikan
 * sticky dari `text-content-inverse` saat blueprint. Pengecualian itu warisan
 * pada masa sticky masih diisi warna keras. Sejak #638 isian dipasang inline,
 * dan `:337` menekan SEMUA isian inline di blueprint — sticky jadi transparan,
 * mewarisi kelas paletnya yang gelap (`text-amber-900` = #78350f) di atas kanvas
 * #212428 = 1,72:1. Hurufnya ada, tidak terbaca.
 *
 * TABRAKAN 2 — bentuk `card`. Cabang card di `nodeTheme.ts:93` justru menulis
 * `bg-white/95` sebagai KELAS keras dan itu SENGAJA (kanvas mewakili dokumen,
 * §22.5), jadi kartunya putih di kedua mode. Sementara :487 memaksa labelnya
 * `text-content-inverse` = #ffffff. Putih di atas putih = 1,00:1.
 *
 * TABRAKAN 3 — palet `slate`. Debt yang sudah ditulis di `constants.ts:72-77`
 * ("perlu item sendiri"): satu-satunya palet yang mengambil warna huruf dari
 * TOKEN Tema, sehingga di gelap hurufnya membalik jadi terang di atas isian yang
 * tetap terang. Diperbaiki dengan token `content-*` yang nilainya sama di kedua
 * mode — pola yang sudah dipakai `content-inverse` (#ffffff, `index.css:84-92`)
 * dan bukan kelas keras, sehingga `audit:warna` tidak bertambah.
 *
 * BATAS JUJUR. Yang diuji adalah KELAS pada DOM sungguhan, hasil render
 * `FlowchartNode`. jsdom tidak menghitung computed color, jadi rasio di kepala
 * berkas ini dihitung dari nilai token dan nilai Tailwind yang diketahui, bukan
 * dari screenshot. Pemeriksaan tabrakan palet membaca `src/index.css` apa
 * adanya; bila suatu hari palet memakai kelas warna biasa, ia tidak dinilai.
 */
import fs from "node:fs";
import React from "react";
import { render } from "@testing-library/react";
import { FlowchartNode } from "./FlowchartNode";
import { colorPalettes } from "../constants";
import type { FlowNode } from "../types";

const css = fs.readFileSync(__dirname + "/../../../index.css", "utf8");

const bentuk = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Periksa kata sandi",
  color: "yellow",
  width: 150,
  height: 70,
  ...lebih,
});

const props = (node: FlowNode, tema: "miro" | "blueprint") =>
  ({
    node,
    isSelected: false,
    setSelectedNodeId: jest.fn(),
    setSelectedEdgeId: jest.fn(),
    isSourceOfConnect: false,
    adaSumberSambung: false,
    setConnectSourceId: jest.fn(),
    isHovered: false,
    setHoveredNodeId: jest.fn(),
    isDragging: false,
    isActiveSim: false,
    canvasTheme: tema,
    isWorkspaceEditable: true,
    setActiveTool: jest.fn(),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    setNodeContextMenu: jest.fn(),
    handleNodeMouseDown: jest.fn(),
    handleResizeMouseDown: jest.fn(),
    handleConnectPortClick: jest.fn(),
    handleUpdateActiveNode: jest.fn(),
    handleUpdateNode: jest.fn(),
    handleDuplicateNode: jest.fn(),
    handleDeleteSelected: jest.fn(),
    getLinkedTaskDetails: () => undefined,
    setSelectedTaskForDetail: jest.fn(),
    setIsTaskDetailModalOpen: jest.fn(),
  }) as any;

const gambar = (node: FlowNode, tema: "miro" | "blueprint") => {
  const { container } = render(<FlowchartNode {...props(node, tema)} />);
  return {
    label: (container.querySelector("textarea") as HTMLTextAreaElement).className,
    html: container.innerHTML,
  };
};

describe("#677 label pada papan gelap (blueprint)", () => {
  it("catatan tempel TIDAK lagi mewarisi huruf gelap di kanvas gelap", () => {
    const { label } = gambar(bentuk({ type: "sticky", color: "yellow" }), "blueprint");
    expect(label).toContain("text-content-inverse");
  });

  it("catatan tempel tetap memakai huruf paletnya di papan terang", () => {
    // Sisi yang tidak boleh berubah: papan `miro` sudah benar, dan perbaikan
    // ini tidak boleh membalikkan warna label sticky di sana.
    const { label } = gambar(bentuk({ type: "sticky", color: "yellow" }), "miro");
    expect(label).not.toContain("text-content-inverse");
  });

  it("bentuk card tidak dipaksa huruf putih di atas kartunya yang putih", () => {
    const { label, html } = gambar(bentuk({ type: "card", color: "blue" }), "blueprint");
    expect(html).toContain("bg-white/95"); // kartunya memang tetap putih di kedua mode
    expect(label).not.toContain("text-content-inverse");
  });

  it("bentuk biasa tetap putih hurufnya di blueprint", () => {
    // Regresi penjaga: yang boleh dikecualikan hanya yang menggurat latar
    // terangnya sendiri. Bentuk biasa tetap transparan dan butuh huruf terang.
    const { label } = gambar(bentuk({ type: "rect", color: "indigo" }), "blueprint");
    expect(label).toContain("text-content-inverse");
  });
});

describe("#677 warna huruf palet tidak boleh ikut tema aplikasi", () => {
  // Palet warna papan adalah DATA: isian bentuknya tetap di kedua mode, jadi
  // hurufnya juga tidak boleh berpindah pihak. Penjaga ini memaksa setiap kelas
  // `text-content-*` yang dipakai palet menunjuk ke token yang nilainya SAMA di
  // dasar dan di `.dark`.
  const nilaiToken = (nama: string): string[] =>
    [...css.matchAll(new RegExp("--color-" + nama + ":\\s*([^;]+);", "g"))].map((m) =>
      m[1]
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim()
        .toLowerCase()
    );

  const memakaiToken = Object.entries(colorPalettes).filter(([, v]) =>
    /^text-content(-[a-z-]+)?$/.test(v.text)
  );

  it("palet yang memakai token `content-*` tidak boleh sendirian", () => {
    // Kalau nanti semua palet pindah ke hex, penjaga token ini tidak boleh
    // diam-diam menjadi test kosong.
    expect(memakaiToken.length).toBeGreaterThan(0);
  });

  for (const [nama, nilai] of memakaiToken) {
    it(`palet ${nama} (${nilai.text}) menunjuk ke token yang tidak berpindah warna`, () => {
      // `text-content-kanvas` -> `--color-content-kanvas`; `text-content` ->
      // `--color-content`. Penamaan ini mengikuti aturan Tailwind v4, bukan
      // tebakan test.
      const namaToken = nilai.text.replace(/^text-/, "");
      const semua = nilaiToken(namaToken);
      expect(semua.length).toBeGreaterThan(0);
      expect(new Set(semua).size).toBe(1);
    });
  }
});
