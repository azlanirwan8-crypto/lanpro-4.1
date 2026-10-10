import React from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "./Tabs";
import type { LingkupTugas } from "../../lib/tugasSaya";

/**
 * #688 — tombol "All Tasks" / "My Tasks".
 *
 * DIBUNGKUS SEKALI, DIPAKAI SEMUA MODUL. Ini komponen stateless: nilainya datang
 * dari store (`useLingkupTugas`), sehingga Dashboard, Issue List, Kanban,
 * Planning, dan Timeline tidak bisa lagi punya pendapat sendiri tentang apa
 * artinya "tugas saya".
 *
 * Dasar pemilihnya `Tabs variant="pills"` yang sudah ada (#432): sudah
 * token-based (§22 — warna keras dan override mode-gelap manual keduanya tidak
 * dipakai di sana), sudah `role="tablist"` + `aria-selected` untuk pembaca
 * layar, dan labelnya menyusut di viewport sempit — jadi perilakunya di HP sama
 * dengan yang sudah diuji pengguna di tempat lain.
 */

interface Props {
  value: LingkupTugas;
  onChange: (nilai: LingkupTugas) => void;
  className?: string;
}

export const TugasScopeToggle: React.FC<Props> = ({ value, onChange, className }) => {
  const { t } = useTranslation();

  return (
    <Tabs<LingkupTugas>
      variant="pills"
      className={className}
      value={value}
      onChange={onChange}
      tabs={[
        { id: "all", label: t("filters.allTasks"), shortLabel: t("filters.allTasksShort") },
        { id: "mine", label: t("filters.myTasks"), shortLabel: t("filters.myTasksShort") },
      ]}
    />
  );
};

export default TugasScopeToggle;
