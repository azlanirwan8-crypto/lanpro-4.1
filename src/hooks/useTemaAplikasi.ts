import { useEffect, useState } from "react";

/**
 * Tema papan gambar TIDAK bisa dipilih sendiri — ia ikut tema aplikasi.
 *
 * Alasannya (audit papan 26 Sep 2026): papan punya tombol tema sendiri di
 * bilah atasnya, jadi ada dua sumber kebenaran yang bisa bertabrakan —
 * aplikasi gelap dengan papan terang atau sebaliknya, dan warna papan gelap itu
 * ditulis keras (`bg-[#0a1124]`, `text-sky-100`) sehingga tidak ikut token.
 *
 * Sumber kebenaran aplikasi adalah kelas `dark` pada <html> yang dipasang
 * `useAppTheme` (§22: gelap memakai kelas di akar, BUKAN prefers-color-scheme).
 * Kelas itu bisa berubah tanpa ada prop yang mengalir ke sini (tombol tema di
 * header, atau mode "system" yang mengikuti jam), jadi yang dibaca adalah
 * DOM-nya langsung lewat MutationObserver — bukan state yang disalin, yang
 * akan basi.
 */
export type TemaPapan = "miro" | "blueprint";

const bacaTema = (): TemaPapan =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "blueprint"
    : "miro";

export function useTemaAplikasi(): TemaPapan {
  const [tema, setTema] = useState<TemaPapan>(bacaTema);

  useEffect(() => {
    const akar = document.documentElement;
    const segarkan = () => setTema(bacaTema());
    const pengamat = new MutationObserver(segarkan);
    pengamat.observe(akar, { attributes: true, attributeFilter: ["class", "data-theme"] });

    // Tema "system" tidak menulis kelas saat preferensi OS berubah sampai
    // pendengar di AppContainer bergerak; ikut berlangganan supaya papan tidak
    // tertinggal satu langkah.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", segarkan);

    // Kelas `dark` mungkin baru dipasang setelah render pertama (efek mount),
    // jadi baca ulang sekali di sini.
    segarkan();

    return () => {
      pengamat.disconnect();
      media.removeEventListener?.("change", segarkan);
    };
  }, []);

  return tema;
}
