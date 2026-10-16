import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { showSuccessAlert } from "../../../lib/sweetalert";
import { suppressDiscussionPointsRefresh } from "../../../lib/taskRefreshControl";
import { updateDiscussionPoint } from "../../../services/meetingService";
import type { DiscussionPoint, UserProfile } from "../../../types";

/**
 * #765 — klik "Selesai" pada satu titik diskusi: popup catatan + tulis status.
 *
 * MENGAPA DI SINI. `DiscussionPointsTable.tsx` berdiri di 788 baris dari batas
 * 800 §4 dan sudah kehilangan empat bloknya ke `components/` (#703) serta satu
 * ke `lib/lampiran.ts` (#709). Ini potongan berikutnya tanpa state layar sendiri.
 *
 * MENGAPA SATU PINTU UNTUK DUA ARAH. `tekanStatus` dipakai pil desktop DAN kartu
 * HP — keduanya dulu memanggil `handleToggleStatus` yang sama. Kalau logika
 * "selesai" pindah ke komponen popup saja, kartu HP akan tetap men-toggle dua
 * arah dan perbedaan itu bukan disengaja, hanya belum ada yang memindahkan
 * pintunya.
 *
 * MENGAPA HANYA DUA KOLOM YANG DIKIRIM. `updatePoint` di repository menulis
 * SATU PER SATU kolom yang nilainya `!== undefined`
 * (`server/repositories/discussion-points.repository.ts:289-332`), jadi
 * `{ status, keterangan }` tidak bisa menimpa concern, PIC, atau tautan. Itu
 * alasan popup satu kolom ini aman dipakai dari mana pun, dan alasan `keterangan`
 * selalu ikut dikirim walau isinya sama: yang kosong pun harus bisa mengosongkan.
 *
 * MENGAPA OPTIMISTIS TETAP ADA (dan `suppressDiscussionPointsRefresh` ikut
 * dipasang). Pola papan ini — `handleLiveQuickAdd` dan `saveEdit` — sudah
 * menulis state lebih dulu lalu membekukan segarkan socket 8 detik supaya
 * `data_changed` dari tab lain tidak menimpa layar yang sedang berubah.
 * `handleToggleStatus` adalah satu-satunya mutasi yang lupa memasang pembekuan
 * itu; #765 memakainya karena status adalah satu-satunya aksi yang hasil
 * popup-nya bisa hilang sebelum dibaca.
 */
interface KeadaanSelesaiCatatan {
  projectId: string;
  meetingId: string;
  pengguna: UserProfile | null;
  setPoints: Dispatch<SetStateAction<DiscussionPoint[]>>;
  /** Dipanggil hanya ketika server menolak: papan harus kembali ke isinya yang benar. */
  muatUlang: () => void;
}

export function useSelesaiCatatan({
  projectId,
  meetingId,
  pengguna,
  setPoints,
  muatUlang,
}: KeadaanSelesaiCatatan) {
  const { t } = useTranslation();
  const [titik, setTitik] = useState<DiscussionPoint | null>(null);
  const [catatan, setCatatan] = useState("");
  const [mengirim, setMengirim] = useState(false);

  const tulis = useCallback(
    async (point: DiscussionPoint, status: "pending" | "completed", keterangan?: string) => {
      if (!point.id) return;
      const perubahan: Partial<DiscussionPoint> =
        keterangan === undefined ? { status } : { status, keterangan };
      const sebelumnya = { status: point.status, keterangan: point.keterangan };

      setPoints((prev) => prev.map((p) => (p.id === point.id ? { ...p, ...perubahan } : p)));
      suppressDiscussionPointsRefresh(8000);
      setMengirim(true);
      try {
        await updateDiscussionPoint(projectId, meetingId, point.id, perubahan, pengguna?.uid);
        showSuccessAlert(
          t("alerts.successTitle"),
          t("alerts.statusChanged", {
            status:
              status === "completed" ? t("discussion.statusDone") : t("discussion.statusPending"),
          })
        );
      } catch (error: any) {
        setPoints((prev) => prev.map((p) => (p.id === point.id ? { ...p, ...sebelumnya } : p)));
        muatUlang();
        toast.error(t("toast.statusChangeFailed") + error.message);
        return false;
      } finally {
        setMengirim(false);
      }
      return true;
    },
    [meetingId, muatUlang, pengguna?.uid, projectId, setPoints, t]
  );

  /**
   * Pending → selesai: popup dibuka, TIDAK ADA yang berubah sebelum pengguna
   * menekan Simpan. Selesai → pending: langsung, satu klik seperti sebelumnya —
   * memaksa catatan untuk MEMBATALKAN selesai berarti menghukum jalan kembali.
   */
  const tekanStatus = useCallback(
    (point: DiscussionPoint) => {
      if (point.status === "completed") {
        void tulis(point, "pending");
        return;
      }
      setTitik(point);
      setCatatan(point.keterangan ?? "");
    },
    [tulis]
  );

  const simpan = useCallback(async () => {
    if (!titik) return;
    /* Popup TETAP TERBUKA kalau server menolak: yang sedang diketik adalah
     * catatan, dan membuangnya bersama galat berarti pengguna mengetik ulang
     * sesuatu yang sebenarnya hanya perlu dikirim sekali lagi. */
    if (await tulis(titik, "completed", catatan)) setTitik(null);
  }, [catatan, titik, tulis]);

  const batal = useCallback(() => {
    setTitik(null);
    setCatatan("");
  }, []);

  return { titik, catatan, ubahCatatan: setCatatan, mengirim, tekanStatus, simpan, batal };
}
