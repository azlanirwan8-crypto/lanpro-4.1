/**
 * #689 butir E3 — daftar `orderedIds` untuk `PUT /tasks/reorder`.
 *
 * Kenapa berdiri sendiri. `IssueListView.tsx:221-231` dulu menghitung
 * `absoluteSourceIndex = (halaman - 1) * perHalaman + index` lalu memakainya
 * memotong `displayRoots`. Dua hal itu tidak boleh disatukan begitu saja:
 *
 * - Saat paging server aktif, `displayRoots` SUDAH satu halaman (`:144-149`),
 *   jadi indeks halaman dua seperti 25 memotong array berisi 25 item: `removed`
 *   menjadi `undefined` dan `.map((r) => r.id)` melempar TypeError yang tertangkap
 *   — pengguna dapat toast berisi "Cannot read properties of undefined", dan
 *   reorder tidak pernah terjadi.
 * - Saat filter klien aktif di halaman satu, yang dikirim adalah SUBSET
 *   halaman. Aturan posisional di server lalu menempati ulang 0..n-1 dengan
 *   subset itu dan menabrak `orderIndex` akar yang tidak ikut dikirim.
 *
 * Aturannya sekarang: indeks selalu relatif ke array yang sama yang dipakai
 * memotongnya, dan pemotongan di luar batas tidak menghasilkan urutan —
 * menghasilkan `null`, yang membuat pemanggilnya tidak mengirim apa pun.
 */

export interface ArgumenUrutanAkar {
  /** Daftar akar yang jadi acuan payload (halaman, atau daftar penuh). */
  daftar: { id?: string | null }[] | null | undefined;
  /** `true` bila server yang memotong halaman: yang tampil sudah satu halaman. */
  memakaiServerPaging: boolean;
  /** Nomor halaman aktif, 1-based. */
  halaman: number;
  /** Jumlah baris per halaman. */
  perHalaman: number;
  /** Indeks sumber seperti yang diberikan perpustakaan seret-dan-lepas. */
  sumber: number;
  /** Indeks tujuan, pada skala yang sama dengan `sumber`. */
  tujuan: number;
}

const bilanganBulat = (nilai: unknown): nilai is number =>
  typeof nilai === "number" && Number.isInteger(nilai);

/**
 * Mengembalikan urutan id hasil pemindahan, atau `null` bila permintaannya tidak
 * sah. `null` BUKAN sinyal "tidak ada perubahan": pemanggil wajib berhenti dan
 * tidak memanggil server, karena mengirim apa pun di sini berarti menulis
 * urutan yang tidak diminta pengguna.
 */
export const susunUrutanAkar = (args: ArgumenUrutanAkar): string[] | null => {
  const { daftar, memakaiServerPaging, halaman, perHalaman, sumber, tujuan } = args;
  if (!Array.isArray(daftar) || daftar.length === 0) return null;

  // Server yang memotong halaman: array yang tampil = halaman itu, jadi indeks
  // seret-dan-lepas sudah absolut terhadap payload. Pemotongan lokal: indeks
  // perlu digeser ke posisi halaman di dalam daftar penuh.
  const offset = memakaiServerPaging ? 0 : (Math.max(1, halaman) - 1) * Math.max(1, perHalaman);

  if (!bilanganBulat(sumber) || !bilanganBulat(tujuan)) return null;
  const mulai = offset + sumber;
  const akhir = offset + tujuan;
  if (mulai < 0 || akhir < 0 || mulai >= daftar.length || akhir >= daftar.length) return null;

  const hasil = [...daftar];
  const [pindah] = hasil.splice(mulai, 1);
  if (!pindah) return null;
  hasil.splice(akhir, 0, pindah);

  const id = hasil.map((baris) => (typeof baris?.id === "string" ? baris.id : null));
  // Jaga-jaga terakhir: id yang hilang tidak boleh pernah menembus ke server.
  if (id.some((k) => k === null)) return null;

  return id as string[];
};
