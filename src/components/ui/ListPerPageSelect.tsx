import React from "react";
import { useTranslation } from "react-i18next";
import { StyledDropdown } from "./CommonComponents";

/**
 * #639 — satu ukuran halaman untuk SEMUA datatable daftar.
 *
 * Alasannya terukur: daftar Flowchart dulu mengunci 5 baris per halaman tanpa
 * cara mengubahnya (`useFlowchartList.ts:23`; `setItemsPerPage` tidak pernah
 * dipanggil di mana pun), jadi enam papan masuk halaman 2 sementara kartu tabel
 * yang memanjang menyisakan ruang kosong - "ada spasi yang kosong padahal
 * datanya 6" (laporan pemilik proyek 05 Okt). Dokumentasi/Wiki 8, Meeting Notes
 * 8, Discussion Points 5, sedangkan Pengguna dan Isu sudah lama punya pemilih
 * 10/25/50/100. Komponen ini menutup bedanya sekali, di empat tempat.
 *
 * 100 masih aman di server: `parsePaginationQuery` memotong di `MAX_LIMIT` 200
 * (`server/lib/pagination.ts:12`) dan skema Zod memakai batas yang sama.
 */
const PILIHAN_BARIS_PER_HALAMAN = [10, 25, 50, 100];

export const ListPerPageSelect: React.FC<{
  value: number;
  onChange: (jumlah: number) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 text-xs sm:text-[10px] text-content-muted font-normal">
      <span>{t("common.rowsPerPage")}</span>
      <StyledDropdown
        value={String(value)}
        onChange={(val) => onChange(Number(val))}
        options={PILIHAN_BARIS_PER_HALAMAN.map((n) => ({ id: String(n), label: String(n) }))}
        buttonClassName="bg-surface border border-border-subtle rounded-md px-2 py-1 text-xs sm:text-[10px] text-left font-normal text-content-body"
      />
    </div>
  );
};
