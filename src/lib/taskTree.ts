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
