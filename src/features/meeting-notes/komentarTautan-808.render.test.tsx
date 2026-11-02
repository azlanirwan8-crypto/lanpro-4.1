/**
 * #808a — tautan di dalam komentar utas, di RENDER SUNGGUHAN.
 *
 * Penjaga sumber (`fontUtas-790`, `laciUtas-780`) mengunci kelas dan ritme
 * gelembung. Yang tidak bisa mereka buktikan adalah perilaku: bahwa alamat
 * sepanjang 300 karakter itu benar-benar menjadi satu tautan yang bisa diklik,
 * bahwa teks di sekitarnya tidak hilang, dan bahwa `javascript:` tidak pernah
 * menemukan jalan ke `href`. Ketiganya hanya terbaca dari DOM hasil render.
 *
 * Harness-nya sengaja memegang dua komentar sekaligus: yang satu berisi alamat,
 * yang satu komentar biasa. Kalau pemecah salah tulis dan membuat SATU komentar
 * melempar, seluruh laci hilang — dan itu justru yang harus tertangkap di sini,
 * bukan di mata pemilik proyek.
 */
import React from "react";
import { render } from "@testing-library/react";
import { LaciUtas } from "./components/LaciUtas";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "id" } }),
}));

const SHAREPOINT =
  "https://bankbniitbk-my.sharepoint.com/:p:/g/personal/rifky_bankbni_co_id/EYx3vXqTb1dLtYv2VDCYdUQB6YQdFpKtGmHqNzZqOZzKw?e=Ab1cD2&file=Design%20PPT%2020CI%2020BNI%20Migration";

const TITIK = { id: "p1", concern: "Utas uji" } as any;
const PENGGUNA = { uid: "u1", displayName: "Azlan", username: "azlan" } as any;

const pasang = (isiKomentar: string[]) =>
  render(
    <LaciUtas
      titik={TITIK}
      anggota={[]}
      pengguna={PENGGUNA}
      mengirim={false}
      onKirim={() => {}}
      onTutup={() => {}}
      komentar={
        isiKomentar.map((teks, i) => ({
          id: `k${i}`,
          commentText: teks,
          userId: "u2",
          userName: "Mohamad Rifky",
          createdAt: "2026-11-02T07:50:00.000Z",
        })) as any
      }
    />
  );

describe("#808a — komentar bertautan", () => {
  it("alamat SharePoint menjadi satu tautan dengan alamat penuh di href dan title", () => {
    const { container } = pasang([`materi link draft ${SHAREPOINT} ya`]);
    const tautan = container.querySelectorAll("a");
    expect(tautan).toHaveLength(1);
    const a = tautan[0] as HTMLAnchorElement;
    expect(a.getAttribute("href")).toBe(SHAREPOINT);
    expect(a.getAttribute("title")).toBe(SHAREPOINT);
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
    expect(a.getAttribute("rel")).toContain("noreferrer");
  });

  it("yang terbaca adalah milik siapa dan berkas apa, bukan token mesin", () => {
    const { container } = pasang([`materi link draft ${SHAREPOINT} ya`]);
    const teks = (container.querySelector("a") as HTMLAnchorElement).textContent || "";
    expect(teks).toContain("bankbniitbk-my.sharepoint.com");
    expect(teks).toContain("Design PPT 20CI 20BNI Migration");
    expect(teks).not.toContain("%20");
    expect(teks).not.toContain("EYx3vXqTb1dLtYv2VDCYdUQB");
  });

  it("teks di sekeliling tautan tetap tampil utuh", () => {
    const { container } = pasang([`materi link draft ${SHAREPOINT} ya`]);
    const gelembung = (container.querySelector("a") as HTMLAnchorElement).parentElement!;
    expect(gelembung.textContent).toContain("materi link draft ");
    expect(gelembung.textContent).toContain(" ya");
  });

  it("komentar biasa tidak mendapat tautan dan tidak kehilangan satu karakter pun", () => {
    const { container } = pasang(["cek komplek migrasi data merchant\nlihat lagi besok"]);
    expect(container.querySelectorAll("a")).toHaveLength(0);
    const isi = container.querySelector("p")!.textContent || "";
    expect(isi).toBe("cek komplek migrasi data merchant\nlihat lagi besok");
  });

  it("javascript: dan data: tidak pernah masuk ke href", () => {
    const { container } = pasang([
      "javascript:alert(1) dan data:text/html,<script>alert(1)</script>",
      `https://a.co/x javascript:alert(2)`,
    ]);
    const href = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(href.every((h) => /^https:\/\//.test(String(h)))).toBe(true);
    expect(href).toEqual(["https://a.co/x"]);
  });

  it("satu komentar bertautan tidak merusak komentar lain di laci yang sama", () => {
    const { container } = pasang(["komentar tanpa alamat", `dokumennya ${SHAREPOINT}`]);
    expect(container.querySelectorAll("a")).toHaveLength(1);
    const isi = [...container.querySelectorAll("p")].map((p) => p.textContent);
    expect(isi).toContain("komentar tanpa alamat");
  });

  it("penahan tautan dievaluasi tepat sebelum dipakai, bukan di hulu", () => {
    // Nilai yang dikirim klien disimpan mentah di `commentText` (#584), jadi
    // yang dijaga di sini adalah TAMPILAN-nya: tidak ada satu pun tempat di
    // laci ini yang menulis href tanpa melewati `tautanAman`.
    const sumber = require("fs")
      .readFileSync(require("path").join(__dirname, "components/LaciUtas.tsx"), "utf8")
      .replace(/\r\n/g, "\n");
    expect(sumber).toContain("const tujuan = tautanAman(segitiga.isi)");
    expect(sumber).toContain("href={tujuan}");
    expect(sumber).not.toMatch(/href=\{segitiga\.isi\}/);
  });
});
