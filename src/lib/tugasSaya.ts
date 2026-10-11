/**
 * #688 — SATU definisi "task ini milik saya".
 *
 * KENAPA BERDIRI SENDIRI. Sebelum ini repo punya tiga pengertian yang berbeda
 * untuk kalimat yang sama:
 *   - `DashboardView.tsx:124` menyaring `assigneeId` ATAU `assigneeEmail`, tetapi
 *     tidak melihat `assignees` (multi-assignee).
 *   - `features/issues/hooks.ts:208` membandingkan `assigneeId` SAJA, sehingga
 *     task yang ditugaskan lewat email tidak pernah muncul di filter assignee.
 *   - `GET /api/tasks/tenggat-saya` (#563) memakai assignee ATAU reporter, dan
 *     itu memang maksudnya: modal "yang jatuh tempo bagimu" boleh menampilkan
 *     apa yang kamu laporkan.
 * Tiga-tiganya benar untuk tujuannya masing-masing, dan itulah masalahnya —
 * tombol "My Tasks" yang sama tidak boleh berarti tiga hal berbeda tergantung
 * modul yang sedang dibuka.
 *
 * KEPUTUSAN PEMILIK PROYEK 10 OKT (item #688): "My Tasks" = **assignee saja**,
 * termasuk multi-assignee. Reporter TIDAK ikut — itu tetap jadi milik #563.
 *
 * YANG TIDAK BOLEH DIPAKAI. Label tampilan (`assigneeName`, `displayName`,
 * `nama_lengkap`) bukan kunci: dua orang bisa punya nama sama, dan nama bisa
 * berubah sementara tugasnya tidak. `src/lib/db.ts` tidak tersentuh di sini.
 *
 * `assigneeId` dan `assigneeEmail` diisi SALAH SATU, bukan keduanya
 * (`services/taskService.ts:11-21` memilih berdasarkan ada-tidaknya "@"), jadi
 * membandingkan hanya salah satunya akan membuang separuh data secara senyap.
 */

import { Task } from "../types";

/** Nilai togel "All Tasks" / "My Tasks". Default aman: `all`. */
export type LingkupTugas = "all" | "mine";

/** Identitas pemanggil yang dipakai untuk pencocokan. Hanya kunci, bukan label. */
export interface OrangYangLogin {
  uid?: string | null;
  id?: string | null;
  email?: string | null;
}

/**
 * Kunci yang boleh dicocokkan dengan medan assignee.
 *
 * `uid` dipakai lebih dulu, `id` sebagai cadangan — persis konvensi yang sudah
 * berjalan di repo ini (`issues.service.ts:21`, `useAuth`). Email ikut karena
 * penulisan lama menyimpan email di `assigneeEmail`, BUKAN karena email itu
 * label: ia identitas, dan tidak bisa ditimpa oleh perubahan nama tampilan.
 */
export const kunciAssigneeOrang = (
  orang?: OrangYangLogin | null
): { id: string[]; email: string | null } => {
  if (!orang) return { id: [], email: null };
  const id = [orang.uid, orang.id]
    .filter((nilai): nilai is string => typeof nilai === "string" && nilai.trim() !== "")
    .map((nilai) => nilai.trim());
  const email =
    typeof orang.email === "string" && orang.email.trim() !== ""
      ? orang.email.trim().toLowerCase()
      : null;
  return { id: Array.from(new Set(id)), email };
};

const adalahString = (nilai: unknown): nilai is string =>
  typeof nilai === "string" && nilai.trim() !== "";

/**
 * Task ini ditugaskan kepada `orang`?
 *
 * Tanpa identitas yang jelas jawabannya SELALU `false`: mode "mine" tidak boleh
 * diam-diam berubah menjadi "semua task" cuma karena sesi belum lengkap.
 * Sebaliknya, mode "all" tidak pernah memanggil fungsi ini.
 */
export const adalahTugasMilikSaya = (
  task: Task | null | undefined,
  orang?: OrangYangLogin | null
): boolean => {
  if (!task) return false;
  const { id, email } = kunciAssigneeOrang(orang);
  if (id.length === 0 && !email) return false;

  if (adalahString(task.assigneeId)) {
    const nilai = task.assigneeId.trim();
    if (id.includes(nilai)) return true;
    if (email && nilai.toLowerCase() === email) return true;
  }

  if (adalahString(task.assigneeEmail)) {
    const nilai = task.assigneeEmail.trim();
    if (email && nilai.toLowerCase() === email) return true;
    if (id.includes(nilai)) return true;
  }

  // Multi-assignee (#688): `assignees` JSONB berisi kunci, bukan label.
  const tambahan = Array.isArray(task.assignees) ? task.assignees : [];
  return tambahan.some((kunci) => {
    if (!adalahString(kunci)) return false;
    const nilai = kunci.trim();
    if (id.includes(nilai)) return true;
    return !!email && nilai.toLowerCase() === email;
  });
};

/**
 * Saring array task menurut lingkup.
 *
 * `lingkupTugas === "all"` mengembalikan array apa adanya — jalur default, dan
 * jalur aman saat `orang` null (belum login / profil belum termuat).
 */
export const saringMenurutLingkup = (
  tasks: (Task | null | undefined)[] | null | undefined,
  orang: OrangYangLogin | null | undefined,
  lingkup: LingkupTugas
): (Task | null | undefined)[] => {
  const daftar = Array.isArray(tasks) ? tasks : [];
  if (lingkup !== "mine") return daftar;
  return daftar.filter((task) => adalahTugasMilikSaya(task, orang));
};

/**
 * #689 — kembalikan leluhur dari task yang tersaring, JANGAN kartu orang lain.
 *
 * `saringMenurutLingkup` menjawab "kartu siapa ini", tetapi layar yang
 * MENGELAMPOKKAN per induk (Papan dan Planning) butuh satu hal lagi: kartu
 * milik saya yang bergendong di bawah epic milik orang lain kehilangan baris
 * induknya, jadi ia tidak dirender di mana pun sementara penghitungnya tetap
 * ikut menghitung. Hasilnya "ada 3 tugas" di atas layar yang menampilkan 2.
 *
 * Batas yang disengaja: hanya simpul antara (induk, dan induknya induk) yang
 * ikut kembali — dan hanya kalau ia memang leluhur dari sesuatu yang tampil.
 * Kartu daun milik orang lain tidak pernah masuk, karena ia bukan penyebab
 * baris ini ada.
 *
 * Dipakai di tempat pengelompokan saja. Dashboard menampilkan daftar RATA, jadi
 * di sana penyaringnya tetap `saringMenurutLingkup` apa adanya — menutup
 * leluhur di sana berarti menampilkan epic orang lain tanpa alasan.
 */
export const tutupLeluhur = <T extends Task>(
  tersaring: T[] | null | undefined,
  semua: readonly T[] | null | undefined
): T[] => {
  const tampil: T[] = Array.isArray(tersaring) ? tersaring : [];
  const daftarSemua: readonly T[] = Array.isArray(semua) ? semua : [];
  if (daftarSemua.length === 0) return tampil;

  const olehId = new Map<string, T>();
  for (const task of daftarSemua) {
    if (task && typeof task.id === "string" && !olehId.has(task.id)) olehId.set(task.id, task);
  }

  const sudahTampil = new Set<string>();
  for (const task of tampil) {
    if (task && typeof task.id === "string") sudahTampil.add(task.id);
  }

  const tambahan: T[] = [];
  for (const task of tampil) {
    // `parentId` yang tidak dikenal di layar ini (bukan milik siapa pun) sudah
    // dipisahkan sebagai "standalone" oleh pemakai, jadi jalan ke atas berhenti
    // sendiri di sana.
    const naik = new Set<string>();
    let idInduk = task?.parentId;
    while (idInduk && !sudahTampil.has(idInduk) && !naik.has(idInduk)) {
      const induk = olehId.get(idInduk);
      if (!induk) break;
      naik.add(idInduk);
      tambahan.push(induk);
      idInduk = induk.parentId;
    }
  }

  // Tidak ada yang perlu ditutup: array yang masuk dikembalikan apa adanya,
  // supaya identitas memo di pemakai tidak bergeser tiap render.
  if (tambahan.length === 0) return tampil;
  // Urutan dipertahankan: kartu yang memang milik saya lebih dulu, lalu baris
  // induk yang ditambahkan — supaya layar yang mengandalkan urutan tidak berubah.
  const seen = new Set<string>();
  const unik = tambahan.filter((t) => {
    if (sudahTampil.has(t.id) || seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  return [...tampil, ...unik];
};
