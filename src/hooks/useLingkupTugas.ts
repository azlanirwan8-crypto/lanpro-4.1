/**
 * #688 — satu status "All Tasks" / "My Tasks" untuk semua modul.
 *
 * KENAPA HOOK, BUKAN PROP. Keenam modul task tidak menerima array yang sama:
 * `AppContainer.tsx:1169,1209-1220` mengubah isi `tasks` tergantung tampilan yang
 * sedang dibuka — Issue List mendapat SATU HALAMAN root, sisanya mendapat seluruh
 * proyek. Menaruh status ini di prop berarti setiap pemanggil harus meneruskan
 * nilai yang sama, dan satu modul yang lupa meneruskannya akan tampak seperti
 * filternya rusak sendiri. Satu store + hook menghilangkan kelas bug itu.
 *
 * Identitas TIDAK dibaca sendiri oleh hook ini — lihat `orangDipanggil` di
 * bawah: `useAuth` bukan context, dan memanggilnya dari komponen fitur justru
 * menghasilkan sesi kosong. Aturan pencocokannya (`uid` lalu `id`, email hanya
 * sebagai kunci kolom assignee, bukan sebagai label) ada di
 * `src/lib/tugasSaya.ts`.
 */

import React from "react";
import { useProjectStore } from "../store/stores";
import {
  LingkupTugas,
  OrangYangLogin,
  kunciAssigneeOrang,
  adalahTugasMilikSaya,
} from "../lib/tugasSaya";
import type { Task } from "../types";

export interface useLingkupTugasHasil {
  lingkup: LingkupTugas;
  setLingkup: (nilai: LingkupTugas) => void;
  /** Kunci pemanggil untuk query server; email tidak boleh dikirim ke server. */
  sedangMine: boolean;
  /** Saring array task yang sudah ada di memori (Kanban, Planning, Timeline, Dashboard). */
  saring: <T extends Task>(tasks: T[] | null | undefined) => T[];
  punyaIdentitas: boolean;
}

/**
 * `orang` DIISI OLEH PEMANGGIL, dan itu bukan kelalaian.
 *
 * Rencananya jelas: ambil identitas dari `useAuth()`. Ternyata `useAuth` BUKAN
 * context — tidak ada Provider, dan seluruh state-nya `useState` lokal
 * (`src/hooks/useAuth.ts:101-111`). Memanggilnya dari komponen fitur membuat
 * INSTANSI BARU yang mulai dari `currentUser = null`, sehingga "My Tasks" akan
 * selalu kosong. Efeknya lebih dari itu: hook itu juga memasang `useEffect`
 * socket dan listener `user_profile_updated` untuk dirinya sendiri
 * (`useAuth.ts:471-516`), jadi lima modul task akan menjalankan lima sesi
 * autentikasi paralel.
 *
 * Identitas karena itu lewat argumen — setiap modul fitur SUDAH menerimanya dari
 * `AppRoutes` (`src/routes/AppRoutes.tsx:364-410`), hanya namanya yang berbeda
 * (`user`, `currentUser`, `currentUserProfile`). Memakai prop yang sudah ada
 * berarti filter memakai identitas yang sama dengan yang dipakai modul itu untuk
 * hal lain, tanpa lapisan baru.
 */
export const useLingkupTugas = (orangDipanggil?: OrangYangLogin | null): useLingkupTugasHasil => {
  const lingkup = useProjectStore((s) => s.lingkupTugas);
  const setLingkup = useProjectStore((s) => s.setLingkupTugas);

  // Bergantung pada PRIMITIF, bukan pada objeknya. Komponen induk merender ulang
  // dengan objek props baru setiap render; kalau `orang` ikut berubah, `saring`
  // berubah, `useMemo` di setiap modul dihitung ulang, dan daftar task dapat
  // referensi baru padahal isinya sama. Mode "all" tidak terpengaruh (ia
  // mengembalikan array yang sama), mode "mine" sangat terpengaruh.
  const uid = orangDipanggil?.uid ?? null;
  const id = orangDipanggil?.id ?? null;
  const email = orangDipanggil?.email ?? null;

  const orang = React.useMemo(() => ({ uid, id, email }), [uid, id, email]);

  const kunci = React.useMemo(() => kunciAssigneeOrang(orang), [orang]);

  const saring = React.useCallback(
    <T extends Task>(tasks: T[] | null | undefined): T[] => {
      const daftar = Array.isArray(tasks) ? tasks : [];
      // "all" adalah jalur default dan jalur aman: tanpa identitas pun daftar
      // tidak boleh hilang. Untuk "mine", tanpa identitas hasilnya kosong —
      // bukan diam-diam seluruh isi.
      if (lingkup !== "mine") return daftar;
      return daftar.filter((task) => adalahTugasMilikSaya(task, orang));
    },
    [lingkup, orang]
  );

  return {
    lingkup,
    setLingkup,
    sedangMine: lingkup === "mine",
    saring,
    punyaIdentitas: kunci.id.length > 0 || !!kunci.email,
  };
};
