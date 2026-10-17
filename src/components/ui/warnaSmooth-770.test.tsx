/**
 * #770 — lingkaran avatar harus LEMBUT, dan rona seorang orang hanya punya SATU
 * sumber.
 *
 * Pemilik proyek, 17 Okt: "lihat icon user ini agak kasar, coba benchmark ke
 * aplikasi lain, icon avatar nya clean dan enak dilihat tidak keras". Ini
 * membalik arah #125 — keputusan pemilik sendiri waktu itu — dan pembalikannya
 * bukan selera belaka: #125 menuntut latar pekat karena butuh TEKS yang tidak
 * bisa kalah kontras di kartu gelap (tint 15 % membuat inisial terbaca 1,85).
 * `.avatar-tint` memenuhi kebutuhan yang SAMA dari satu heksa: teksnya
 * di-mix ke `--color-content`, jadi gelap di mode terang dan terang di mode
 * gelap, tanpa satu pun `dark:` (§22.4) dan tanpa kelas palet mentah yang
 * selama ini lolos `audit:warna` (gerbang itu hanya menghitung abu-abu).
 *
 * Yang dikunci di sini, berurutan: (a) komponen merender kelas tint dan
 * mengisi `--lbr` dari heksa identitas, (b) TIDAK ADA lagi kelas palet pekat di
 * berkasnya, (c) tidak ada varian gelap, (d) dua orang berbeda boleh saja
 * sewarna (hash 8 rona), tapi satu orang tidak boleh berubah antar render.
 */
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import UserAvatar, { getUserAvatarHex, HEKSA_AVATAR } from "./UserAvatar";

const BERKAS = join(__dirname, "UserAvatar.tsx");
const isi = () => readFileSync(BERKAS, "utf8").replace(/\r\n/g, "\n");

const ANGGOTA = [
  { uid: "u1", displayName: "Azlan Iryan" },
  { uid: "u2", displayName: "Nabila Triana" },
];

describe("avatar lembut (#770)", () => {
  it("memakai .avatar-tint dan heksa identitas di --lbr, bukan kelas palet", () => {
    const { container } = render(<UserAvatar uid="u2" members={ANGGOTA as any} />);
    const bulat = container.firstElementChild as HTMLElement;
    expect(bulat.className).toContain("avatar-tint");
    expect(bulat.style.getPropertyValue("--lbr")).toBe(getUserAvatarHex("u2"));
    expect(bulat.className).not.toMatch(/\bbg-[a-z]+-\d{2,3}\b/);
    expect(bulat.className).not.toMatch(/\btext-content-inverse\b/);
  });

  it("rona orang stabil: ID yang sama memberi heksa yang sama setiap render", () => {
    const pertama = render(<UserAvatar uid="u1" members={ANGGOTA as any} />);
    const kedua = render(<UserAvatar uid="u1" members={ANGGOTA as any} />);
    const heksa = (r: { container: HTMLElement }) =>
      (r.container.firstElementChild as HTMLElement).style.getPropertyValue("--lbr");
    expect(heksa(pertama)).toBe(heksa(kedua));
    expect(HEKSA_AVATAR).toContain(heksa(pertama));
  });

  it("gambar asli tetap menggantikan inisial, dan tint tidak menghapusnya", () => {
    const { container } = render(
      <UserAvatar uid="u1" members={ANGGOTA as any} src="https://example.test/a.png" />
    );
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("berkasnya bersih dari palet mentah dan dari varian gelap", () => {
    const s = isi();
    expect(s).not.toMatch(/\bbg-[a-z]+-\d{2,3}\b/);
    expect(s).not.toMatch(/\bborder-[a-z]+-\d{2,3}\b/);
    expect(s).not.toMatch(/\bdark:/);
    // Satu daftar warna saja. Kalau daftar kedua muncul, satu orang bisa
    // berubah rona antar layar — pelanggaran #122/#125 yang dulu dijaga
    // kesejajarannya oleh `warnaSmooth-769.test.ts`.
    expect((s.match(/export const [A-Z_]+ = \[/g) || []).length).toBe(1);
  });

  it("kelas .avatar-tint benar-benar ada di CSS dan menurunkan teks dari --color-content", () => {
    const css = readFileSync(join(__dirname, "..", "..", "index.css"), "utf8").replace(
      /\r\n/g,
      "\n"
    );
    const blok = css.slice(css.indexOf(".avatar-tint {"));
    expect(blok).not.toBe("");
    expect(blok).toContain("var(--lbr");
    expect(blok).toContain("var(--color-content)");
    expect(blok.split("}")[0]).not.toMatch(/dark/);
  });
});
