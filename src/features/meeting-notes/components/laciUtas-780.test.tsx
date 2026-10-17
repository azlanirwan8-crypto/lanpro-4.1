/**
 * #780 — gelembung utas diskusi dirapikan ala Messenger.
 *
 * Pemilik proyek, 18 Okt, menunjuk laci utas catatan rapat: "ini juga akun
 * avatar tidak clean dan chat nya kok gede gini coba deh benchmark ke fb gimana
 * chat nya clean dan rapi". Empat sebab di source (`LaciUtas.tsx` putaran
 * sebelumnya):
 *
 * 1. `<p className="... pb-3.5">` menyisakan 14 px ruang kosong di dasar SETIAP
 *    gelembung karena jam ditaruh `absolute bottom-1 right-3` di DALAM gelembung
 *    — gelembung selalu lebih tinggi dari teksnya;
 * 2. `max-w-[85%]` di laci `max-w-lg` = 435 px untuk pesan dua baris;
 * 3. jamnya `text-xs sm:text-[11px] sm:text-[9px]` — DUA varian `sm:` untuk satu
 *    properti, jadi yang menang urutan stylesheet (11 px) dan 9 px yang dimaksud
 *    penulis mati; ini cacat keluarga #776;
 * 4. avatar penulis `w-4 h-4` = 16 px, di bawah ambang 18 px tangga #776, di mana
 *    `border` + `shadow-2xs` mendominasi lingkaran — "tidak clean".
 *
 * Yang dikunci: jam di LUAR gelembung, tanpa ruang mati, satu varian `sm:` per
 * properti, gelembung memeluk teks (72 %), avatar penulis 24 px.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";
import { LaciUtas } from "./LaciUtas";

const BERKAS = join(__dirname, "LaciUtas.tsx");
const isi = readFileSync(BERKAS, "utf8").replace(/\r\n/g, "\n");

const TITIK = { id: "d1", concern: "Data dashboard DMA masih perlu divalidasi" } as any;
const KOMENTAR = [
  {
    id: "k1",
    userName: "Rido oktbriananta",
    userId: "u-rido",
    commentText: "update 16.10.26 jam 14.50 DMA akan fulfill data maksimal hari ini",
    createdAt: "2026-10-16T07:50:00Z",
  },
] as any[];

const renderLaci = (milikSaya = false) =>
  render(
    <LaciUtas
      titik={TITIK}
      komentar={KOMENTAR}
      anggota={milikSaya ? [] : ([{ id: "u-rido", displayName: "Rido" }] as any)}
      pengguna={{ uid: "u-lain", displayName: "Orang Lain" } as any}
      mengirim={false}
      onKirim={() => {}}
      onTutup={() => {}}
    />
  );

describe("gelembung utas diskusi (#780)", () => {
  it("tidak ada lagi ruang mati di dasar gelembung dan jam tidak di dalam gelembung", () => {
    expect(isi).not.toContain("pb-3.5");
    expect(isi).not.toMatch(/absolute\s+bottom-1/);
    expect(isi).not.toContain("max-w-[85%]");
  });

  it("tidak ada satu pun elemen membawa dua varian sm: untuk satu properti", () => {
    const ganda = isi
      .split("\n")
      .filter((b) => (b.match(/\bsm:text-/g) || []).length > 1)
      .map((b) => b.trim());
    expect(ganda).toEqual([]);
  });

  it("jam dirender DI LUAR gelembung, sebagai tetangga setelahnya", () => {
    const { container } = renderLaci();
    const gelembung = container.querySelector("p")!.parentElement!;
    const induk = gelembung.parentElement!;
    const jam = [...induk.children].find((el) => /^\d{2}[.:]\d{2}$/.test(el.textContent!.trim()));
    expect(jam).toBeTruthy();
    expect(jam!.contains(gelembung)).toBe(false);
    expect(gelembung.nextElementSibling).toBe(jam);
    expect(jam!.className).toContain("text-3xs");
  });

  it("gelembung memeluk teks: px-3 py-1.5, maksimum 72% baris", () => {
    const { container } = renderLaci();
    const gelembung = container.querySelector("p")!.parentElement!;
    expect(gelembung.className).toContain("px-3");
    expect(gelembung.className).toContain("py-1.5");
    expect(gelembung.className).not.toContain("px-3.5");
    expect(gelembung.className).toContain("rounded-2xl");
    expect(gelembung.parentElement!.className).toContain("max-w-[72%]");
  });

  it("avatar penulis 24 px, bukan 16 px", () => {
    const { container } = renderLaci();
    const avatar = container.querySelector(".avatar-tint") as HTMLElement;
    expect(avatar.className).toContain("w-6 h-6");
    expect(avatar.className).not.toContain("w-4 h-4");
    expect(avatar.textContent).toBe("RO");
  });
});
