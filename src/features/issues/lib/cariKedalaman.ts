import { MasterData, Task } from "../../../types";
import { cocokJenisIsu } from "../../../lib/jenisIsu";

/**
 * #864 — pencarian Daftar Isu kedalaman penuh.
 *
 * Kenapa modul ini ada. Tiga lapis menyaring pohon isu (server `halamanAkar`,
 * `displayRoots` di klien, dan saringan baris anak di `IssueTableRow`) dan
 * sebelumnya masing-masing hanya melihat ANAK LANGSUNG — padahal render baris
 * sendiri sudah rekursif. Aturan "ada keturunan yang cocok" dan "rantai mana
 * yang harus dibuka" tidak boleh ditulis tiga kali dengan tiga cara berbeda;
 * di sinilah keduanya hidup.
 *
 * Set simpul yang dikunjungi menghentikan penelusuran pada relasi melingkar.
 */

type Simpul = { id: string; parentId?: string | null };

/** Kelompok anak per `parentId`. Simpul tanpa induk tidak masuk indeks. */
export function indeksAnak<T extends Simpul>(tasks: T[]): Map<string, T[]> {
  const anak = new Map<string, T[]>();
  for (const t of tasks) {
    if (!t.parentId) continue;
    const daftar = anak.get(t.parentId);
    if (daftar) daftar.push(t);
    else anak.set(t.parentId, [t]);
  }
  return anak;
}

/** Peta id -> simpul, dipakai penelusuran ke atas. */
export function indeksId<T extends Simpul>(tasks: T[]): Map<string, T> {
  const byId = new Map<string, T>();
  for (const t of tasks) if (t.id) byId.set(t.id, t);
  return byId;
}

/**
 * Semua KETURUNAN `rootId` (kedalaman >= 1) yang lolos `pred`, dilevel per
 * level. Simpul yang sudah dibuka tidak dibuka lagi, jadi data yang melingkar
 * berhenti sendiri.
 */
export function keturunanCocok<T extends Simpul>(
  rootId: string,
  anak: Map<string, T[]>,
  pred: (t: T) => boolean
): T[] {
  const hasil: T[] = [];
  const dilihat = new Set<string>([rootId]);
  const antrean = [...(anak.get(rootId) ?? [])];
  for (let i = 0; i < antrean.length; i += 1) {
    const simpul = antrean[i];
    if (dilihat.has(simpul.id)) continue;
    dilihat.add(simpul.id);
    if (pred(simpul)) hasil.push(simpul);
    for (const anakSimpul of anak.get(simpul.id) ?? []) antrean.push(anakSimpul);
  }
  return hasil;
}

/**
 * Id leluhur dari `id` (dirinya sendiri tidak ikut) sampai akar. Berhenti pada
 * `parentId` kosong, induk yang tidak ada di daftar (menggantung — sisa impor
 * buruk), atau siklus. Dipakai untuk membuka simpul antara
 * DAN akarnya saat hasil cari duduk jauh di bawah.
 */
export function rantaiLeluhur<T extends Simpul>(id: string, byId: Map<string, T>): string[] {
  const rantai: string[] = [];
  const dilihat = new Set<string>([id]);
  let sekarang = byId.get(id)?.parentId;
  while (sekarang && byId.has(sekarang) && !dilihat.has(sekarang)) {
    dilihat.add(sekarang);
    rantai.push(sekarang);
    sekarang = byId.get(sekarang)?.parentId;
  }
  return rantai;
}

/** Saringan yang dipakai SATU BARIS anak — sama persis dengan yang dulu hidup di `IssueTableRow`. */
export type SaringanBarisIsu = {
  issueSearch?: string;
  listFilterStatus?: string;
  listFilterPriority?: string;
  listFilterAssignee?: string;
  listFilterCategory?: string;
  listFilterSprint?: string;
  listFilterEnvironment?: string;
  listFilterProjectRisk?: string;
  listFilterRelease?: string;
  listFilterResolution?: string;
  listFilterType?: string;
  listFilterLabel?: string;
  listFilterStartDate?: string;
  listFilterEndDate?: string;
  listFilterDateType?: string;
};

/**
 * Pembanding baris anak. Dijaga agar TETAP seperti perilaku lama: ia sengaja
 * tidak memeriksa `listFilterOverdue` dan memakai `dueDate` sebagai bawaan
 * tanggal — `displayRoots` punya aturannya sendiri dan perbedaannya tercatat
 * di #864, bukan disamarkan di sini.
 */
export function cocokDenganSaringanBaris(
  t: Task,
  mArr: MasterData[],
  f: SaringanBarisIsu
): boolean {
  const query = (f.issueSearch || "").toLowerCase().trim();
  if (query) {
    const cocok =
      (t.title || "").toLowerCase().includes(query) || (t.key || "").toLowerCase().includes(query);
    if (!cocok) return false;
  }
  if (f.listFilterStatus && f.listFilterStatus !== "All" && t.status !== f.listFilterStatus)
    return false;
  if (f.listFilterPriority && f.listFilterPriority !== "All" && t.priority !== f.listFilterPriority)
    return false;
  if (
    f.listFilterAssignee &&
    f.listFilterAssignee !== "All" &&
    t.assigneeId !== f.listFilterAssignee
  )
    return false;
  if (f.listFilterCategory && f.listFilterCategory !== "All" && t.category !== f.listFilterCategory)
    return false;
  if (f.listFilterSprint && f.listFilterSprint !== "All") {
    if (f.listFilterSprint === "Backlog" && t.sprintId) return false;
    if (f.listFilterSprint !== "Backlog" && t.sprintId !== f.listFilterSprint) return false;
  }
  if (
    f.listFilterEnvironment &&
    f.listFilterEnvironment !== "All" &&
    t.environment !== f.listFilterEnvironment
  )
    return false;
  if (
    f.listFilterProjectRisk &&
    f.listFilterProjectRisk !== "All" &&
    t.projectRisk !== f.listFilterProjectRisk
  )
    return false;
  if (f.listFilterRelease && f.listFilterRelease !== "All" && t.release !== f.listFilterRelease)
    return false;
  if (
    f.listFilterResolution &&
    f.listFilterResolution !== "All" &&
    t.resolution !== f.listFilterResolution
  )
    return false;
  // #705 — jenis isu dibandingkan lewat MasterData, bukan string mentah.
  if (!cocokJenisIsu(mArr, t.type, f.listFilterType)) return false;
  if (f.listFilterLabel && f.listFilterLabel !== "All") {
    if (!t.labels || !Array.isArray(t.labels) || !t.labels.includes(f.listFilterLabel))
      return false;
  }
  if (f.listFilterStartDate || f.listFilterEndDate) {
    const col = f.listFilterDateType || "dueDate";
    const cek = (key: string): boolean => {
      const rawVal = t[key as keyof Task];
      if (!rawVal) return false;
      try {
        const itemDate = new Date(rawVal);
        if (isNaN(itemDate.getTime())) return false;
        const waktu = itemDate.getTime();
        const mulaiOk = f.listFilterStartDate
          ? waktu >= new Date(f.listFilterStartDate + "T00:00:00").getTime()
          : true;
        const akhirOk = f.listFilterEndDate
          ? waktu <= new Date(f.listFilterEndDate + "T23:59:59").getTime()
          : true;
        return mulaiOk && akhirOk;
      } catch {
        return false;
      }
    };

    if (col === "any") {
      const ada = ["startDate", "endDate", "dueDate", "createdAt"].some(cek);
      if (!ada) return false;
    } else {
      if (!cek(col)) return false;
    }
  }
  return true;
}
