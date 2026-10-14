/**
 * #705 — SATU pencocok "isu ini jenisnya apa" untuk seluruh layar.
 *
 * KENAPA DI `src/lib` (#730). Mulanya berkas ini hidup di
 * `features/issues/lib` karena pemakai pertamanya filter Daftar Isu. Kartu
 * TASK BREAKDOWN BY TYPE di dashboard kemudian butuh pencocok yang SAMA —
 * sebelum pindah, ia membandingkan string mentah terhadap lima nama harfiah
 * dan melipat semua jenis lain ke "Task" (lihat baris #730 di AUDIT.md).
 * Memakai pencocok ini lintas fitur berarti impor melintasi batas folder,
 * dan §4 melarang itu; presedennya persis berkas ini: `warnaLabel.ts` dan
 * `tingkatIsu.ts` berdiri di `src/lib` karena dipakai lebih dari satu fitur.
 *
 * KENAPA BERDIRI SENDIRI. Kolom `type` pada tugas TIDAK ditulis dari satu sumber,
 * dan keempat penulisnya dulu tidak sepakat soal bentuk: `hooks.ts` menyimpan
 * `tipeDipakai.toLowerCase()` padahal yang dikirim bilah cepat dan baris anak
 * adalah label apa adanya (`"Sub-task"`); `components/modals/NewTaskModal.tsx`
 * memakai `id` berupa label yang dilowerkan; dan `AppContainer.handleQuickCreate`
 * menyimpan `type` TANPA dinormalkan sama sekali. Nilai lama ada yang berupa
 * `code` master data. Satu kolom karenanya memuat tiga bentuk untuk satu jenis:
 * `"Epic"`, `"epic"`, dan `code` barisnya.
 *
 * #609 menutup jalur tulis itu: keempat penulis sekarang memanggil
 * `kunciJenisIsu()` sebelum menyimpan, jadi yang masuk database adalah `code`
 * MasterData dalam bentuk kunci kanonik — SATU definisi untuk tulis dan baca.
 * Baris lama dibersihkan migrasi satu arah di `src/lib/pg-migrate.ts`. Fungsi ini
 * karenanya bukan lagi sekadar pencocok tampilan: ia adalah penerjemah tunggal
 * label ↔ `code` (§3 AGENTS.md melarang menyimpan label).
 *
 * Filter yang membandingkan string mentah akan tampak benar pada proyek yang
 * kodenya kebetulan sama dengan labelnya, dan memulangkan KOSONG pada proyek yang
 * labelnya diubah — sunyi, tanpa galat.
 *
 * Aturan yang dipakai badge dan ikon kolom WORK sudah ada: `cariMaster()`
 * (`src/lib/warnaLabel.ts:156`) mencari `code` lalu `id` lalu `label`. Filter ini
 * mengikuti sumber kebenaran yang SAMA, bukan menurunkan aturan baru.
 *
 * §3 AGENTS.md: daftar jenis isu berasal dari MasterData. Berkas ini tidak
 * menyimpan daftar apa pun — ia hanya menormalkan.
 */
import { MasterData } from "../types";
import { cariMaster } from "./warnaLabel";

/** Nilai togel "semua jenis" — sebutan yang sama dengan sepuluh dropdown saudaranya. */
export const SEMUA_JENIS = "All";

/**
 * Kunci kanonik sebuah nilai jenis: `code` master data bila dikenal.
 *
 * #609 — inilah nilai yang DISIMPAN ke `Tasks.type`, bukan hanya kunci
 * pembanding di layar. Bentuknya `LOWER(TRIM(code))` supaya tulis, baca, dan
 * migrasi memakai satu definisi yang sama.
 */
export const kunciJenisIsu = (
  masterData: MasterData[] | undefined | null,
  nilai?: string | null
): string => {
  const mentah = (nilai || "").trim();
  if (!mentah) return "";
  const baris = cariMaster(masterData || [], "issue_type", mentah);
  return (baris?.code || baris?.label || mentah).trim().toLowerCase();
};

/**
 * Apakah tugas ini lolos filter jenis?
 *
 * `SEMUA_JENIS` dan nilai kosong SELALU lolos — filter yang belum diset tidak
 * boleh menyembunyikan apa pun, termasuk tugas tanpa jenis.
 */
export const cocokJenisIsu = (
  masterData: MasterData[] | undefined | null,
  jenisTugas: string | undefined | null,
  filter: string | undefined | null
): boolean => {
  if (!filter || filter === SEMUA_JENIS) return true;
  const acuan = kunciJenisIsu(masterData, filter);
  if (!acuan) return true;
  return kunciJenisIsu(masterData, jenisTugas) === acuan;
};

/**
 * #705 — daftar pilihan filter jenis isu: SATU entri per jenis.
 *
 * `opsiFilter()` (`IssueListView.tsx:325`) sengaja menyatu dari dua sumber: label
 * MasterData dan nilai mentah pada tugas. Untuk `issue_type` keduanya hampir
 * selalu berbeda huruf besar-kecil — label `"Bug"`, tersimpan `"bug"` — sehingga
 * tanpa penyusutan dropdown-nya menampilkan satu jenis DUA KALI. Keduanya
 * menghasilkan baris yang sama persis lewat `cocokJenisIsu`, jadi yang salah di
 * sini bukan hasilnya, melainkan daftarnya.
 *
 * Nilai tugas yang tidak dikenal MasterData TETAP muncul: itu alasan `opsiFilter()`
 * ada, dan baris seperti itu jangan sampai tak-tersaring.
 */
export const rapikanOpsiJenisIsu = <T extends { id: string; label: string; icon?: string }>(
  masterData: MasterData[] | undefined | null,
  opsi: T[]
): T[] => {
  const perJenis = new Map<string, T>();
  for (const o of opsi) {
    const kunci = kunciJenisIsu(masterData, o.id) || o.id.trim().toLowerCase();
    const yangAda = perJenis.get(kunci);
    // Entri MasterData menang karena ia bawa ikon dan warna; yang mentah tidak.
    if (!yangAda || (!yangAda.icon && o.icon)) perJenis.set(kunci, o);
  }
  return Array.from(perJenis.values()).sort((a, b) => a.label.localeCompare(b.label));
};
