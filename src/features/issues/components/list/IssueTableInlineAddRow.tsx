import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Zap, CheckCircle2, X } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { RenderIcon } from "../../../../components/RenderIcon";
import { StyledDropdown, TypeIcon } from "../../../../components/ui/CommonComponents";
import { gayaLabel, warnaDariMaster, warnaLabel } from "../../../../lib/warnaLabel";
import { MasterData, UserProfile } from "../../../../types";
import { styles } from "../../styles";
import { enterUntukSimpan } from "../../../../lib/enterSimpan";
import { kunciTipe, tipeBoleDitawarkan } from "../../hierarkiTipe";

interface IssueTableInlineAddRowProps {
  taskId: string;
  depth: number;
  canReorder: boolean;
  isCompact: boolean;
  issueTableColumns: any[];
  inlineTitleMap: Record<string, string>;
  setInlineTitleMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setInlineAddingTaskId: (id: string | null) => void;
  isInlineTypeOpen: string | null;
  setIsInlineTypeOpen: (open: string | null) => void;
  inlineAddPriority: string;
  setInlineAddPriority: (val: string) => void;
  inlineAddAssigneeId: string;
  setInlineAddAssigneeId: (val: string) => void;
  isCreating: boolean;
  /** #605 — tipe yang dipilih baris ini ikut dikirim, bukan dibaca dari state bersama. */
  createSubtask: (parentId: string, tipe?: string) => Promise<void>;
  masterData: MasterData[];
  projectMembers: UserProfile[];
  /**
   * #604 — tipe baris induk (null = baris puncak). Menentukan tipe apa yang
   * boleh dipilih di sini, supaya Epic tidak bisa lahir di bawah Task dan
   * Sub-task tidak berdiri tanpa induk.
   */
  tipeInduk?: string | null;
}

export const IssueTableInlineAddRow: React.FC<IssueTableInlineAddRowProps> = ({
  taskId,
  depth,
  canReorder,
  isCompact,
  issueTableColumns,
  inlineTitleMap,
  setInlineTitleMap,
  setInlineAddingTaskId,
  isInlineTypeOpen,
  setIsInlineTypeOpen,
  inlineAddPriority,
  setInlineAddPriority,
  inlineAddAssigneeId,
  setInlineAddAssigneeId,
  isCreating,
  createSubtask,
  masterData,
  projectMembers,
  tipeInduk = null,
}) => {
  const { t } = useTranslation();
  const mArr = masterData || [];
  const judulRef = useRef<HTMLInputElement>(null);

  // #604 — hanya tipe yang legal untuk baris ini yang boleh dipilih.
  //
  // #605 — nilainya MILIK BARIS INI SENDIRI, bukan state bersama milik bilah
  // cepat. Sebelumnya keduanya menulis ke `inlineAddType` yang sama sambil
  // "mengoreksi" nilai ke bawaan masing-masing (puncak minta Epic, anak Task
  // minta Sub-task), jadi kedua efek saling menimpa tanpa henti: chip tipe
  // berkedik dan ikonnya jatuh ke bentuk cadangan. Itu laporan pemilik proyek
  // 03 Okt: "kok label[i]nya ini error gerak aja, cek di icon jenis task".
  const labelTipe = useMemo(
    () => mArr.filter((m) => m.type === "issue_type").map((m) => m.label),
    [mArr]
  );
  const tipeLegalList = useMemo(
    () => tipeBoleDitawarkan(tipeInduk, labelTipe),
    [tipeInduk, labelTipe]
  );
  const daftarLegal = tipeLegalList.map(kunciTipe).join("|");

  const [tipe, setTipe] = useState("");
  useEffect(() => {
    if (!tipeLegalList.length) return;
    if (tipeLegalList.map(kunciTipe).includes(kunciTipe(tipe))) return;
    // Anak Task karena itu otomatis Sub-task; anak Epic otomatis Story.
    setTipe(tipeLegalList[0]);
  }, [daftarLegal, tipe]);

  // Sama seperti IssueQuickCreateBar (#592): memilih nilai di dropdown menutup
  // panelnya dan fokus hilang ke <body>, jadi Enter tidak menyentuh apa pun.
  const pilihLaluFokus =
    <T,>(setter: (val: T) => void) =>
    (val: T) => {
      setter(val);
      judulRef.current?.focus();
    };

  const simpanEnter = enterUntukSimpan(() => void createSubtask(taskId, tipe));

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
      className={styles.inlineAddRow}
    >
      {canReorder && (
        <td className="w-8 border-y-2 border-blue-500 border-r border-border-faint/50 bg-surface" />
      )}
      <td
        className={cn(
          "px-4 border-r border-border-faint/50 border-y-2 border-blue-500",
          isCompact ? "py-0.5" : "py-1.5"
        )}
      />
      {issueTableColumns
        .filter((c) => c.visible)
        .map((col) => (
          <td
            key={col.id}
            className={cn(styles.inlineAddBorderedCell, col.id === "work" && "z-20")}
          >
            {col.id === "work" ? (
              <div
                className="flex items-center gap-2 p-2 bg-surface h-full"
                style={{ paddingLeft: `${(depth + 1) * 24}px` }}
              >
                {/*
                  #604 — Simpan/Batal pindah ke DEPAN. Keduanya dulu duduk di sel
                  TERAKHIR baris, yang pada layar sempit baru terlihat setelah
                  menggulir tabel ke kanan — jadi aksi yang paling sering dipakai
                  justru yang paling jauh. Di sini keduanya selalu terlihat, dan
                  Enter tetap menyimpan (#592).
                */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void createSubtask(taskId, tipe)}
                    disabled={isCreating}
                    title={t("common.save")}
                    aria-label={t("common.save")}
                    className="p-1 px-2 bg-blue-600 text-content-inverse rounded text-xs sm:text-[10px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {isCreating ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineAddingTaskId(null);
                      setInlineTitleMap((prev) => {
                        const next = { ...prev };
                        delete next[taskId];
                        return next;
                      });
                    }}
                    title={t("common.cancel")}
                    aria-label={t("common.cancel")}
                    className="p-1 px-2 bg-surface-muted text-content-subtle rounded text-xs sm:text-[10px] font-medium hover:bg-surface-strong transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() =>
                      setIsInlineTypeOpen(isInlineTypeOpen === "inline" ? null : "inline")
                    }
                    style={gayaLabel(warnaDariMaster(mArr, "issue_type", tipe))}
                    className="label-chip flex items-center gap-1.5 px-1.5 py-1 rounded border transition-all font-medium text-[10px] leading-none whitespace-nowrap"
                  >
                    <TypeIcon type={tipe || ""} className="w-3.5 h-3.5" masterData={mArr} />
                    {/* #605 — chip ini dulu HANYA ikon. Kalau labelnya tidak ada
                        di Master Data (mis. bawaan "Epic" padahal data pemilik
                        proyek tidak punya Epic), yang tampil cuma lingkaran
                        cadangan tanpa penjelasan — "labelnya error". Nama tipe
                        kini ikut ditulis, sama seperti chip di baris task. */}
                    <span>{tipe}</span>
                    <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>
                  {/*
                    #604 — panelnya dulu muncul SEKETIKA, tanpa gerakan masuk.
                    Itu yang terasa "patah-patah" di caret tipe. Sekarang memakai
                    `animate-dropdown` — kelas yang sama dengan panel StyledDropdown
                    (#403, velzon-in 120 ms cubic-bezier(0.16,1,0.3,1)) — supaya satu
                    aplikasi hanya punya SATU rasa gerakan, dan `prefers-reduced-motion`
                    ikut hormat (blok di index.css mematikan kelas itu).
                  */}
                  {isInlineTypeOpen === "inline" && (
                    <div className="absolute left-0 top-full mt-2 w-48 bg-surface border border-border-subtle rounded-lg shadow-xl z-[100] overflow-hidden animate-dropdown">
                      {mArr
                        .filter((m) => m.type === "issue_type")
                        .filter((m) => tipeLegalList.includes(m.label))
                        .map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              pilihLaluFokus(setTipe)(t.label);
                              setIsInlineTypeOpen(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs sm:text-[11px] font-medium text-content-secondary hover:bg-surface-sunken flex items-center gap-2"
                          >
                            {t.icon ? (
                              <RenderIcon
                                iconName={t.icon}
                                className="w-3.5 h-3.5"
                                style={{
                                  color: warnaLabel({
                                    kelompok: "issue_type",
                                    label: t.label,
                                    kode: t.code,
                                    warnaMaster: t.color,
                                  }),
                                }}
                              />
                            ) : (
                              <Zap className="w-3.5 h-3.5" style={{ color: t.color }} />
                            )}
                            <span>{t.label}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    autoFocus
                    ref={judulRef}
                    enterKeyHint="enter"
                    value={inlineTitleMap[taskId] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInlineTitleMap((prev) => ({ ...prev, [taskId]: val }));
                    }}
                    placeholder={t("subtasks.whatToDo")}
                    onKeyDown={simpanEnter}
                    className={styles.inlineAddInput}
                  />
                </div>
              </div>
            ) : col.id === "assignee" ? (
              <div className="p-2 bg-surface h-full min-w-[150px] flex items-center">
                <StyledDropdown
                  value={inlineAddAssigneeId}
                  onChange={pilihLaluFokus(setInlineAddAssigneeId)}
                  options={[
                    { id: "", label: t("newTask.unassigned") },
                    ...projectMembers.map((m) => ({
                      id: m?.uid || "",
                      label: m?.displayName || m?.email || "Unknown",
                    })),
                  ]}
                  members={projectMembers}
                  type="member"
                  masterData={mArr}
                  className="w-full"
                />
              </div>
            ) : col.id === "priority" ? (
              <div className="flex items-center p-2 bg-surface h-full min-w-[120px]">
                <StyledDropdown
                  value={inlineAddPriority || "Medium"}
                  onChange={pilihLaluFokus(setInlineAddPriority)}
                  options={mArr
                    .filter((m) => m.type === "priority")
                    .map((p) => ({
                      id: p.label,
                      label: p.label,
                      icon: p.icon,
                      color: p.color,
                    }))}
                  type="priority"
                  masterData={mArr}
                  className="w-[100px]"
                />
              </div>
            ) : (
              <div className="bg-surface h-full border-r border-border-faint/50" />
            )}
          </td>
        ))}
      {/* Sel penutup kolom aksi: isinya sudah pindah ke depan, tapi jumlah sel
          baris ini harus tetap sama dengan header tabel. */}
      <td className="border-y-2 border-blue-500 bg-surface" />
    </motion.tr>
  );
};
