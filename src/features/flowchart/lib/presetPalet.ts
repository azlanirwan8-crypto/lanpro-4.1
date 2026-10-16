/**
 * #760 — preset palet menurut MAKSUD diagram, bukan menurut nama pustaka.
 *
 * Pemilik proyek meminta "flow sistem, flow bisnis, flow ui dan design".
 * Palet ini sudah punya 16 grup dan isinya cukup, tapi grup itu dinamai menurut
 * SUMBER stensil draw.io (`BPMN Diagram`, `Wireframe`, `Electrical & P&ID`),
 * bukan menurut apa yang sedang orang coba gambar. Jadi yang kurang adalah
 * penyaring per-intent, bukan bentuk baru — dan itulah yang ditambah di sini,
 * di atas grup lama yang tetap utuh.
 *
 * PETA INI HASIL KURASI, bukan fakta draw.io. Sebuah bentuk bisa masuk beberapa
 * maksud (`Swimlane & VSM` dipakai flow sistem maupun bisnis), jadi relasinya
 * banyak-ke-banyak dan sengaja ditulis eksplisit di sini supaya bisa dibaca dan
 * dibantah. Kalau pemilik papan menganggap sebuah grup salah tempat, yang
 * diubah adalah tabel ini — bukan menyembunyikan grup di komponen.
 *
 * `SEMUA` tidak ada di tabel: ia berarti "tidak ada saringan", dan menuliskannya
 * sebagai daftar 16 judul adalah cara pasti untuk tertinggal saat ada grup baru
 * ditambahkan ke `constants.ts`.
 */

/** Nama grup persis seperti `title` di `DIAGRAM_SHAPE_GROUPS`. */
export const PRESET_PALET = {
  sistem: [
    "Flowchart",
    "Swimlane & VSM",
    "UML Modeling",
    "Entity Relationship",
    "Logic Gates",
    "Cloud & Network",
    "Network Symbols",
    "AWS Active Cloud",
    "Azure Cloud",
    "Electrical & P&ID",
  ],
  bisnis: ["Flowchart", "Swimlane & VSM", "BPMN Diagram", "Callouts", "Arrows", "Basic Shapes"],
  ui: ["Wireframe", "Basic Shapes", "Callouts", "Arrows", "UML Modeling"],
} as const;

export type PresetPalet = keyof typeof PRESET_PALET | "semua";

export const URUT_PRESET: readonly PresetPalet[] = ["semua", "sistem", "bisnis", "ui"];

/** Kunci kamus per preset. Teks layar tidak pernah dirakit di luar kamus (§12). */
export const KUNCI_PRESET: Record<PresetPalet, string> = {
  semua: "shapePalette.presetSemua",
  sistem: "shapePalette.presetSistem",
  bisnis: "shapePalette.presetBisnis",
  ui: "shapePalette.presetUi",
};

/** Grup yang boleh ditampilkan untuk satu preset. `semua` tidak membatasi. */
export const grupBoleh = (preset: PresetPalet, judul: string): boolean =>
  preset === "semua" || (PRESET_PALET[preset] as readonly string[]).includes(judul);
