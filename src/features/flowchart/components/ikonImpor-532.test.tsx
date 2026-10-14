/**
 * @jest-environment jsdom
 *
 * #532 — emoji berhenti menjadi elemen antarmuka pada alur gambar.
 *
 * Diukur 25 Sep, diukur ulang 14 Okt: sepuluh situs emoji di
 * `ImportDiagramModal.tsx` (empat field `emoji` per format, 💡 pada kotak
 * petunjuk, 📦/📂 pada zona unggah, ✅ pada lencana "siap diterapkan", 🔷 dan ↗️
 * pada ringkasan hasil). Glyph emoji tidak bisa diwarnai token (§22), tidak ikut
 * ukuran teks, dan gambarnya berbeda di tiap platform — satu-satunya chrome
 * papan yang lepas dari sistem desain.
 *
 * Yang dijaga test ini ada dua: (1) modalnya benar-benar merender ikon SVG, dan
 * (2) sapuan pita Unicode atas seluruh `src/features/flowchart/**.tsx` non-test
 * tidak menemukan emoji baru. Satu pengecualian disebut namanya di bawah, bukan
 * dilonggarkan diam-diam.
 */
import React from "react";
import { render } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { ImportDiagramModal } from "./ImportDiagramModal";

/**
 * Label bawaan catatan tempel. Ini DATA yang tersimpan di dokumen pengguna,
 * bukan chrome — menghapusnya berarti mengubah isi papan yang sudah ada.
 * Pengecualian ini disebut namanya supaya tidak jadi pintu belakang.
 */
const PENGECUALIAN = [{ berkas: "FlowchartContainer.tsx", baris: /label: "Ide Baru Miro/ }];

const PITA_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const sapu = (dir: string, hasil: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sapu(p, hasil);
    else if (e.name.endsWith(".tsx") && !/test/.test(e.name)) hasil.push(p);
  }
  return hasil;
};

const pasang = () =>
  render(
    <ImportDiagramModal
      isImportModalOpen={true}
      setIsImportModalOpen={() => {}}
      importType="drawio"
      setImportType={() => {}}
      parsedImportData={{ nodes: [{ id: "n1" }, { id: "n2" }], edges: [{ id: "e1" }] }}
      setParsedImportData={() => {}}
      parsedFilename="alur.drawio"
      setParsedFilename={() => {}}
      dragOverImport={false}
      setDragOverImport={() => {}}
      handleProcessImportFile={() => {}}
      handleApplyImportMerge={() => {}}
      handleApplyImportReplace={() => {}}
      batasImpor={null}
    />
  );

describe("#532 — ikon lucide menggantikan glyph emoji di dialog impor", () => {
  it("empat pemilih format merender ikon SVG, bukan karakter emoji", () => {
    const { baseElement } = pasang();
    const tombol = Array.from(baseElement.querySelectorAll("button")).filter((b) =>
      /Draw\.io|Miro|Mermaid|LanPro/.test(b.textContent || "")
    );
    expect(tombol).toHaveLength(4);
    for (const b of tombol) expect(b.querySelector("svg")).not.toBeNull();
  });

  it("sepuluh glyph yang dulu jadi chrome dialog ini sudah tidak dirender lagi", () => {
    const { baseElement } = pasang();
    const teks = baseElement.textContent || "";
    const DULU = ["📊", "🟡", "✏", "🔮", "💡", "📦", "📂", "✅", "🔷", "↗"];
    expect(DULU.filter((g) => teks.includes(g))).toEqual([]);
  });

  it("petunjuk, ringkasan hasil, dan lencana punya ikon SVG", () => {
    const { baseElement } = pasang();
    const kelas = Array.from(baseElement.querySelectorAll("svg.lucide")).map((s) =>
      Array.from(s.classList).find((c) => c.startsWith("lucide-") && c !== "lucide") || ""
    );
    for (const nama of [
      "lucide-lightbulb",
      "lucide-circle-check-big",
      "lucide-shapes",
      "lucide-move-up-right",
    ])
      expect(kelas).toContain(nama);
  });

  it("tidak ada emoji baru di chrome papan gambar", () => {
    const berkas = sapu(path.join(__dirname, ".."));
    const situs: string[] = [];
    for (const b of berkas) {
      const nama = path.basename(b);
      const baris = fs.readFileSync(b, "utf8").split("\n");
      baris.forEach((l, i) => {
        if (!PITA_EMOJI.test(l)) return;
        const dimaafkan = PENGECUALIAN.some((p) => p.berkas === nama && p.baris.test(l));
        if (!dimaafkan) situs.push(`${nama}:${i + 1} ${l.trim().slice(0, 60)}`);
      });
    }
    expect(situs).toEqual([]);
  });
});
