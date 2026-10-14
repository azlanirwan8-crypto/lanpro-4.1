import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";

/**
 * #706 — keadaan kosong papan Discussion Points, dipakai dua kali oleh induknya
 * (daftar kartu HP dan sel `colSpan` desktop).
 *
 * Sebelumnya keempat pembacaan di induk meminjam kamus layar DAFTAR rapat —
 * "No meetings found" dan "Create a new meeting or adjust your search keyword"
 * — padahal papan ini berada DI DALAM satu rapat yang sedang dibuka dan tombol
 * menambahnya "Add", bukan "buat rapat baru". Pesannya salah layar, bukan
 * sekadar kurang ramah. Sekarang kuncinya milik papan ini sendiri, dan keadaan
 * "tidak ada hasil cari" dipisah dari "papan masih kosong" supaya orang yang
 * tidak pernah mengetik apa pun tidak disuruh mengubah kata kuncinya.
 */
export const KeadaanKosongDiskusi = ({ cari }: { cari: boolean }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary shadow-2xs">
        <MessageSquare className="w-5 h-5" />
      </div>
      <p className="font-normal text-content-strong text-xs">
        {t(cari ? "discussion.emptySearchTitle" : "discussion.emptyTitle")}
      </p>
      <p className="text-[11px] text-content-subtle mt-0.5">
        {t(cari ? "discussion.emptySearchHint" : "discussion.emptyHint")}
      </p>
    </>
  );
};
