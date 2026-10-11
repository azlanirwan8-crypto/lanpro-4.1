/**
 * #689 butir (f) — penyusun baris dan sumbu Roadmap, dikeluarkan dari
 * `TimelinePanel.tsx` supaya bisa diuji tanpa peramban.
 *
 * Dua hal yang dulu hanya bisa dibuktikan dengan membaca baris:
 *
 * 1. Hirarki disusun dengan PEMINDAIAN ULANG. `tasks.filter(...)` dipanggil per
 *    induk, per cucu, dan `tasks.some(...)` diulang untuk SETIAP baris saat
 *    render — jadi biayanya kuadratik terhadap jumlah tugas, dan ia dibayar
 *    lagi tiap `setTempDates` selama menyeret batang.
 * 2. Sumbu waktu dipatok tanggal MATI (`2026-03-01` s/d `2026-05-31`). Itu sisa
 *    fixture pengembangan: proyek mana pun yang dibuka hari ini dipaksa
 *    membuka ruang kosong beberapa bulan dan batang-batangnya menyusut.
 *
 * Batas yang disengaja: `susunBaris` hanya menelusuri DUA tingkat (induk → anak
 * → cucu) seperti sebelumnya, dan urutan keluarannya identik dengan algoritma
 * lama. Test-nya yang mengunci itu, bukan komentar ini.
 */
import {
  addDays,
  differenceInDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ensureDate } from "../../../lib/utils";
import type { Task } from "../../../types";

export interface BarisHirarki {
  task: Task;
  isChild: boolean;
  depth: number;
  parentId?: string;
  isLastChild?: boolean;
}

/** `parentId -> anak`, dibangun sekali. */
export const indeksAnak = (tasks: readonly Task[]): Map<string, Task[]> => {
  const indeks = new Map<string, Task[]>();
  for (const task of tasks) {
    const induk = typeof task.parentId === "string" && task.parentId !== "" ? task.parentId : "";
    if (!induk) continue;
    const daftar = indeks.get(induk);
    if (daftar) daftar.push(task);
    else indeks.set(induk, [task]);
  }
  return indeks;
};

/**
 * Daftar baris siap-render: induk dulu (epic lebih dulu), lalu anaknya selama
 * induk tidak dilipat.
 *
 * `collapsed[id] === false` berarti terbuka; apa pun yang lain mengikuti
 * perilaku default lama (terbuka), supaya papan yang sudah ada tidak berubah
 * bentuknya.
 */
export const susunBaris = (
  tasks: readonly Task[],
  collapsed: Record<string, boolean | undefined>
): BarisHirarki[] => {
  const daftar = Array.isArray(tasks) ? tasks : [];
  const anak = indeksAnak(daftar);
  const idTerkenal = new Set<string>(daftar.map((t) => t.id));

  // Akar = tanpa induk ATAU induknya tidak ada di layar ini (task yatim).
  const topLevels = daftar.filter((t) => !t.parentId || !idTerkenal.has(String(t.parentId)));

  const terurut = [...topLevels].sort((a, b) => {
    const aEpic = (a.type || "").toLowerCase() === "epic";
    const bEpic = (b.type || "").toLowerCase() === "epic";
    if (aEpic && !bEpic) return -1;
    if (!aEpic && bEpic) return 1;
    return 0;
  });

  const baris: BarisHirarki[] = [];

  const tambahAnak = (currentChildren: Task[], currentDepth: number) => {
    currentChildren.forEach((child, idx) => {
      baris.push({
        task: child,
        isChild: true,
        depth: currentDepth,
        parentId: child.parentId,
        isLastChild: idx === currentChildren.length - 1,
      });

      const cucu = anak.get(child.id) ?? [];
      if (cucu.length > 0 && collapsed[child.id] !== false) {
        tambahAnak(cucu, currentDepth + 1);
      }
    });
  };

  for (const task of terurut) {
    baris.push({ task, isChild: false, depth: 0, isLastChild: false });
    const children = anak.get(task.id) ?? [];
    if (children.length > 0 && collapsed[task.id] !== false) {
      tambahAnak(children, 1);
    }
  }

  return baris;
};

export interface HasilSumbu {
  minDate: Date;
  maxDate: Date;
  totalDays: number;
  months: Date[];
  weeks: Date[];
  days: Date[];
  years: Date[];
  /** `false` saat tidak satu pun tugas punya tanggal — layar butuh pesan, bukan kanvas kosong. */
  punyaTanggal: boolean;
}

/**
 * Rentang + titik sumbu yang seluruhnya DIPEROLEH DARI DATA. Tidak ada lagi
 * tanggal mati: sumbu yang lebih lebar dari jadwal proyek membuat pengguna
 * melihat ruang kosong, bukan pekerjaannya.
 */
export const sumbuWaktu = (
  tasks: readonly Task[],
  hariIni: Date = new Date(),
  penyanggaHari = 90
): HasilSumbu => {
  const daftar = Array.isArray(tasks) ? tasks : [];
  let minDate = new Date("2099-12-31");
  let maxDate = new Date("2000-01-01");
  let punyaTanggal = false;

  for (const task of daftar) {
    if (task.startDate) {
      const awal = ensureDate(task.startDate);
      if (awal.getTime() < minDate.getTime()) minDate = awal;
      punyaTanggal = true;
    }
    if (task.endDate) {
      const akhir = ensureDate(task.endDate);
      if (akhir.getTime() > maxDate.getTime()) maxDate = akhir;
      punyaTanggal = true;
    }
  }

  if (!punyaTanggal) {
    minDate = startOfMonth(hariIni);
    maxDate = endOfMonth(addDays(hariIni, penyanggaHari));
  } else {
    minDate = startOfMonth(minDate);
    maxDate = endOfMonth(addDays(maxDate, penyanggaHari));
  }

  if (minDate.getTime() > maxDate.getTime()) {
    maxDate = endOfMonth(addDays(minDate, penyanggaHari));
  }

  const totalDays = differenceInDays(maxDate, minDate);

  const months: Date[] = [];
  for (
    let cursor = startOfMonth(minDate);
    cursor <= maxDate;
    cursor = addDays(endOfMonth(cursor), 1)
  ) {
    months.push(cursor);
  }

  const weeks: Date[] = [];
  for (
    let cursor = startOfWeek(minDate);
    cursor <= maxDate;
    cursor = addDays(endOfWeek(cursor), 1)
  ) {
    weeks.push(cursor);
  }

  const years: Date[] = [];
  for (
    let cursor = startOfYear(minDate);
    cursor <= maxDate;
    cursor = addDays(endOfYear(cursor), 1)
  ) {
    years.push(cursor);
  }

  const days: Date[] = [];
  for (let i = 0; i <= totalDays; i++) days.push(addDays(minDate, i));

  return { minDate, maxDate, totalDays, months, weeks, days, years, punyaTanggal };
};
