// Utilitas hierarki task. Sengaja TIDAK meng-import module apa pun:
// berkas ini dipakai BacklogSection/SprintSection dan harus bebas dari
// risiko circular import yang membuat binding function jadi undefined
// di production build (kasus "o is not a function").

export interface TreeTask {
  id: string;
  parentId?: string | null;
}

/**
 * Mengumpulkan semua descendant dari sebuah parent secara rekursif.
 * Aman terhadap data siklik (parentId melingkar) lewat `seen` set.
 */
const collect = <T extends TreeTask>(parentId: string, allTasks: T[], seen: Set<string>): T[] => {
  const children = allTasks.filter((t) => t.parentId === parentId && !seen.has(t.id));
  children.forEach((c) => seen.add(c.id));
  let all: T[] = [...children];
  for (const child of children) {
    all = [...all, ...collect(child.id, allTasks, seen)];
  }
  return all;
};

export const getAllDescendants = <T extends TreeTask>(parentId: string, allTasks: T[]): T[] =>
  collect(parentId, allTasks, new Set([parentId]));

export interface BarisPohon<T> {
  task: T;
  /** 1 = anak langsung, 2 = cucu, dst. */
  kedalaman: number;
}

/**
 * Seluruh keturunan `parentId` dalam URUTAN BACA POHON (pr-order mendalam-dulu),
 * tiap baris membawa kedalamannya supaya pemanggil bisa mengindentasinya.
 *
 * KENAPA BUKAN `getAllDescendants`. Fungsi itu mengumpulkan per tingkat —
 * semua anak dulu, baru semua cucu — jadi cucu dari anak pertama muncul
 * SESUDAH anak terakhir. Untuk daftar yang dibaca sebagai pohon, urutan itu
 * salah tempat: barisnya harus datang berdampingan dengan induknya sendiri.
 *
 * Aman terhadap `parentId` melingkar lewat himpunan `dilihat`, alasan yang sama
 * dengan `collect`.
 */
export const pohonKeturunan = <T extends TreeTask>(
  parentId: string,
  allTasks: T[]
): BarisPohon<T>[] => {
  const hasil: BarisPohon<T>[] = [];
  const dilihat = new Set<string>([parentId]);
  const jalan = (indukId: string, kedalaman: number): void => {
    allTasks
      .filter((t) => t.parentId === indukId && !dilihat.has(t.id))
      .forEach((t) => {
        dilihat.add(t.id);
        hasil.push({ task: t, kedalaman });
        jalan(t.id, kedalaman + 1);
      });
  };
  jalan(parentId, 1);
  return hasil;
};

/**
 * Kedalaman hierarki sebuah task (0 = tanpa parent).
 * Iteratif, bukan rekursif, agar aman terhadap parentId melingkar.
 */
export const getTaskDepth = <T extends TreeTask>(task: T, allTasks: T[]): number => {
  let depth = 0;
  let current: T = task;
  const seen = new Set<string>([task.id]);
  while (current.parentId) {
    if (seen.has(current.parentId)) break;
    const parent = allTasks.find((t) => t.id === current.parentId);
    if (!parent) break;
    seen.add(parent.id);
    depth += 1;
    current = parent;
  }
  return depth;
};
