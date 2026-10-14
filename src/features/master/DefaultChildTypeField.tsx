import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import { MasterData } from "../../types";

/**
 * #737 — pemilih "jenis anak bawaan" untuk satu baris `issue_type`.
 *
 * Dipakai DUA kali di MasterDataPanel (form tambah dan modal sunting) dengan
 * isi yang identik, dan berkas itu sudah jauh melewati batas 800 baris — jadi
 * kontrolnya hidup di sini, bukan menjadi duplikat kedua di sana.
 *
 * Yang disimpan adalah `code`, bukan label (AGENTS.md §3). Baris yang sedang
 * disunting dibuang dari daftar lewat `kecualiId`: sebuah jenis tidak boleh
 * menjadi anak bawaannya sendiri.
 */
export const DefaultChildTypeField = ({
  value,
  onChange,
  baris,
  kecualiId,
}: {
  value: string;
  onChange: (code: string) => void;
  baris: MasterData[];
  kecualiId?: string;
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-normal mb-1.5 ml-1">
        {t("master.defaultChildType")}
      </label>
      <StyledDropdown
        value={value}
        onChange={onChange}
        options={[
          { id: "", label: t("master.defaultChildNone") },
          ...baris
            .filter((d) => d.type === "issue_type" && d.id !== kecualiId)
            .map((d) => ({ id: d.code || d.label, label: d.label })),
        ]}
        buttonClassName="w-full px-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm text-left font-normal text-content-strong"
      />
    </div>
  );
};
