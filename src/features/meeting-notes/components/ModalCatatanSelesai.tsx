import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { kakiBatalKelas, kakiSimpanKelas, labelKelas, textareaKelas } from "./FormDiskusi";

/**
 * #765 — popup SATU isian yang muncul ketika sebuah titik diskusi ditandai
 * selesai.
 *
 * MINTA: field yang sama dengan yang ada di laci sunting dan baris tambah —
 * Catatan/Keterangan — hanya entry point-nya berbeda. Karena itu kontrolnya tidak
 * dikarang ulang: `textareaKelas`, `labelKelas`, dan kedua tombol kaki diimpor
 * dari `FormDiskusi.tsx` supaya "sama" benar-benar berarti sama, dan tidak ada
 * dua tempat yang boleh bergeser bentuknya di kemudian hari.
 *
 * YANG TIDAK ADA DI SINI, dan sengaja tidak ada:
 *  - Field kedua. Satu textarea, satu Simpan.
 *  - Catatan wajib. Pemilik proyek memutuskan isian ini BOLEH kosong (16 Okt),
 *    jadi tidak ada validasi yang menahan tombol — titik diskusi memang sering
 *    selesai tanpa perlu dijelaskan.
 *  - Konfirmasi modal di atas modal. `showSuccessAlert` milik `useSelesaiCatatan`
 *    baru dibunyikan SesUDAH server menjawab; popup ini menutup sendiri saat
 *    Simpan ditekan.
 *
 * Baris concern ikut ditampilkan (bukan sebagai isian) karena papan ini memuat
 * catatan panjang yang mirip satu sama lain: tanpa baris itu, pengguna menulis
 * keterangan untuk titik diskusi yang salah dan tidak punya cara mengetahuinya
 * sebelum papan dimuat ulang.
 */
interface ModalCatatanSelesaiProps {
  /** Judul titik diskusi yang sedang diselesaikan — hanya dibaca, tidak diedit. */
  concern: string;
  catatan: string;
  onCatatan: (teks: string) => void;
  onSimpan: () => void;
  onBatal: () => void;
  mengirim: boolean;
}

export const ModalCatatanSelesai: React.FC<ModalCatatanSelesaiProps> = ({
  concern,
  catatan,
  onCatatan,
  onSimpan,
  onBatal,
  mengirim,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen
      onClose={onBatal}
      title={t("discussion.catatanSelesaiJudul")}
      maxWidth="max-w-lg"
      bodyClassName="space-y-4"
      footer={
        <>
          <button type="button" onClick={onBatal} disabled={mengirim} className={kakiBatalKelas}>
            {t("discussion.cancel")}
          </button>
          <button type="button" onClick={onSimpan} disabled={mengirim} className={kakiSimpanKelas}>
            {mengirim ? t("common.saving") : t("discussion.simpanSelesai")}
          </button>
        </>
      }
    >
      <div className="min-w-0">
        <span className={labelKelas}>{t("discussion.concernTopic")}</span>
        <div className="mt-1 text-xs text-content-body whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
          {concern}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="diskusi-catatan-selesai" className={labelKelas}>
          {t("discussion.notesLabel")}
        </label>
        <textarea
          id="diskusi-catatan-selesai"
          autoFocus
          className={textareaKelas}
          value={catatan}
          onChange={(e) => onCatatan(e.target.value)}
          placeholder={t("discussion.notesPlaceholder")}
        />
        <p className="text-[11px] text-content-subtle flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success-text" />
          {t("discussion.catatanSelesaiJejak")}
        </p>
      </div>
    </Modal>
  );
};
