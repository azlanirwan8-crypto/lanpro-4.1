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
 * MENGAPA HANYA TIGA KOLOM YANG DIKIRIM. `updatePoint` di repository menulis
 * SATU PER SATU kolom yang nilainya `!== undefined`
 * (`server/repositories/discussion-points.repository.ts:289-332`), jadi
 * `{ status, keterangan, tanggalUpdateStatus }` tidak bisa menimpa concern, PIC,
 * atau tautan. Itu alasan popup satu kolom ini aman dipakai dari mana pun, dan
 * alasan `keterangan` selalu ikut dikirim walau isinya sama: yang kosong pun
 * harus bisa mengosongkan.
 *
 * #793 — `tanggalUpdateStatus` ikut naik ke daftar itu. Kolomnya SUDAH ada di
 * database sejak lama (`src/lib/pg-migrate.ts:546`), sudah menembus skema Zod,
 * rute, dan repository INSERT maupun UPDATE — yang belum pernah ada hanyalah
 * yang MENULISNYA. Jadi item ini tidak menambah migrasi; ia menghidupkan kolom
 * yang selama ini mati, dan melakukannya di satu pintu karena pil desktop dan
 * kartu HP sudah berbagi `tekanStatus` yang sama.
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

/**
 * #793 — "hari ini" sebagai `YYYY-MM-DD`, disusun dari komponen LOKAL.
 *
 * `toISOString()` sengaja TIDAK dipakai: ia membaca tanggal dalam UTC, jadi di
 * zona mana pun yang bukan Greenwich nilainya bergeser satu hari — "selesai
 * pukul 01.00" tercatat kemarin. Mesin kerja pemilik proyek ada di UTC+7, jadi
 * itu bukan teori.
 *
 * Formatnya pun bukan pilihan bebas. `targetDate` sudah disimpan `YYYY-MM-DD`
 * oleh `LanproDatePicker`, yang menyusun "hari ini" dari komponen lokal juga
 * (`LanproDatePicker.tsx:218`), dan `server/lib/sortirDiskusi.ts` mencatat bahwa
 * urutan leksikografis format itu SAMA dengan urutan kronologis. Satu format
 * untuk dua kolom tanggal di tabel yang sama, supaya membandingkannya tidak
 * perlu menebak.
 */
const hariIniLokal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

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
      /* #793 — selesai mencatat harinya, batal mengosongkannya lagi. Kolom yang
       * masih berisi tanggal sementara statusnya "Tertunda" adalah data yang
       * berbantahan, dan pembaca papan tidak punya cara tahu mana yang benar. */
      const perubahan: Partial<DiscussionPoint> = {
        status,
        tanggalUpdateStatus: status === "completed" ? hariIniLokal() : null,
        ...(keterangan === undefined ? {} : { keterangan }),
      };
      const sebelumnya = {
        status: point.status,
        keterangan: point.keterangan,
        tanggalUpdateStatus: point.tanggalUpdateStatus,
      };

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
