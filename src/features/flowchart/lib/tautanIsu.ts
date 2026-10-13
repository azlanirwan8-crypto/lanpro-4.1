/**
 * #718 — satu format untuk menyebut satu isu di layar Flowchart.
 *
 * Dahulu string ini dirakit di dalam JSX modal (`label: \`[key] judul\``), dan
 * `label: "..."` — bukan karena isinya kalimat. Perakitannya sekarang di sini:
 * ia dipakai tiga tempat (pilihan dropdown, lencana daftar, kartu HP), dan
 * tempatnya di `.ts` berarti tidak ada lagi salinan format yang bisa menyimpang.
 */
export const labelTautanIsu = (key: string | undefined, judul: string) =>
  key ? `[${key}] ${judul}` : judul;
