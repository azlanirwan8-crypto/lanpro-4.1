import { useMemo } from "react";
import { warnaDariMaster } from "../../../lib/warnaLabel";
import type { MasterData } from "../../../types";
import type { OpsiJamak } from "../components/PemilihJamak";

/**
 * #765 — chip "Konteks / Tag" ikut warna PRIORITAS isu tertaut.
 *
 * MENGAPA KODE, BUKAN HEX, YANG DIAMBIL DARI DATA. `opsiIsu` datang dari
 * `fetchTasks`, dan satu baris isu menyimpan `priority` sebagai KODE MasterData
 * (`src/types/task.ts:50`). Hex-nya dihitung di sini lewat
 * `warnaDariMaster(masterData, "priority", kode)` — helper yang sama yang dipakai
 * Issue List (`IssueTableRow.tsx:470-484` lewat `StyledDropdown`), jadi chip di
 * papan rapat dan chip di daftar isu warnanya berasal dari satu sumber yang sama.
 * Menyalin hex ke catatan rapat akan membekukannya: ubah warna prioritas di Master
 * Data hari ini, papan rapat masih memakai warna kemarin — persis cacat yang
 * dilarang #564 dan #590, dan gerbang `audit:label` menolak pemetaan
 * label→warna yang ditulis tangan.
 *
 * MENGAPA DI `lib/`. `DiscussionPointsTable.tsx` berdiri di 794 baris dari batas
 * 800 §4; dua `useMemo` plus komentarnya tidak boleh tinggal di induknya.
 *
 * YANG TIDAK DITANGANI: isu yang sudah dihapus. Tag-nya tetap menyimpan `label`
 * (snapshot, `src/types/meeting.ts:4-6`) tapi tidak lagi punya prioritas untuk
 * dicari, jadi chip-nya jatuh ke warna merek seperti sebelum #765 — bukan warna
 * yang salah, hanya tidak informatif.
 */
export function useWarnaTagIsu(opsiIsu: OpsiJamak[], masterData: MasterData[]) {
  /** id isu → hex prioritas, untuk pemanggil yang merender chip dari id saja. */
  const warnaIsu = useMemo(() => {
    const peta: Record<string, string> = {};
    for (const o of opsiIsu) {
      if (o.prioritas) peta[o.id] = warnaDariMaster(masterData, "priority", o.prioritas);
    }
    return peta;
  }, [opsiIsu, masterData]);

  /** Opsi untuk `PemilihJamak`: label + hex, supaya chip di dalam laci sunting
   *  dan baris cepat berwarna sama seperti di papan (#645: satu perilaku). */
  const opsiTag = useMemo(
    () => opsiIsu.map((o) => ({ ...o, warna: warnaIsu[o.id] ?? null })),
    [opsiIsu, warnaIsu]
  );

  return { warnaIsu, opsiTag };
}
