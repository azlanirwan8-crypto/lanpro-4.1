/**
 * Tampilan daftar flowchart — kartu, tabel, dan paginasinya.
 *
 * Sebelumnya berupa `renderDashboard()` di dalam FlowchartContainer. JSX-nya
 * dipindah verbatim; yang berubah hanya cara ia memperoleh data — dari closure
 * atas state komponen induk menjadi props eksplisit.
 *
 * Komponen ini sengaja dibuat tanpa state sendiri. Seluruh state paginasi,
 * pencarian, dan daftar tetap tinggal di container, karena kanvas editor juga
 * membacanya. Memindahkannya ke sini akan memecah satu sumber kebenaran
 * menjadi dua.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Workflow, Search, Plus, Eye, Edit3, Trash2 } from "lucide-react";
import { ResponsiveTable } from "../../../components/ResponsiveTable";
import { getInitials } from "../lib/nodeTheme";
import { tampilanNamaPembuat } from "../lib/authorIdentity";
import { FlowchartMobileCardView } from "./FlowchartMobileCardView";
import { useMobileAction } from "../../../contexts/MobileActionContext";
import { PageHeader } from "../../../components/ui/PageHeader";
import {
  ListPageShell,
  LIST_SEARCH_INPUT_CLASS,
  LIST_TABLE_WRAP_CLASS,
  LIST_THEAD_ROW_CLASS,
} from "../../../components/ui/ListPageShell";
import type { FlowchartData } from "../types";
import type { Task } from "../../../types";

interface FlowchartDashboardProps {
  /** Kata kunci pencarian judul dan deskripsi. */
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  /** Paginasi. `setCurrentPage` menerima fungsi pembaru, jadi tipenya Dispatch. */
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  /** Satu halaman hasil yang sudah tersaring dan terurut. */
  currentItems: FlowchartData[];
  /** Dipakai untuk menampilkan Epic yang tertaut pada tiap flowchart. */
  tasks: Task[];
  openCreateModal: () => void;
  getResolvedAuthor: () => string;
  handleSelectFlowchart: (id: string, listToUse?: FlowchartData[]) => void;
  setIsEditorActive: (value: boolean) => void;
  canModifyFlowchart: (fw: FlowchartData) => boolean;
  /**
   * Membuka form ubah metadata (nama, kategori, epic, deskripsi, tautan).
   * Ikon Edit dulu memanggil `handleSelectFlowchart` — persis sama dengan
   * ikon Lihat — sehingga keduanya membuka kanvas dan tidak ada cara sama
   * sekali mengubah metadata dari daftar.
   */
  openEditModal: (flow: FlowchartData, e: React.MouseEvent) => void;
  handleDeleteFlowchart: (id: string, e: React.MouseEvent) => void;
}

export const FlowchartDashboard: React.FC<FlowchartDashboardProps> = ({
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  currentItems,
  tasks,
  openCreateModal,
  getResolvedAuthor,
  handleSelectFlowchart,
  setIsEditorActive,
  canModifyFlowchart,
  openEditModal,
  handleDeleteFlowchart,
}) => {
  const { t } = useTranslation();
  const { registerAction, unregisterAction } = useMobileAction();

  React.useEffect(() => {
    registerAction({
      id: "flowchart-add-new",
      label: t("flowchart.addModalTitle") || "Buat Diagram Baru",
      onClick: openCreateModal,
      canCreate: true,
    });
    return () => unregisterAction("flowchart-add-new");
  }, [openCreateModal, registerAction, unregisterAction, t]);
  return (
    <ListPageShell
      className="font-sans overflow-y-auto"
      header={<PageHeader title={t("flowchart.editorTitle")} />}
      toolbar={
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 sm:ml-auto">
          <div className="relative flex-1 min-w-0 sm:w-64 sm:flex-none sm:max-w-[16rem]">
            <input
              type="text"
              placeholder={t("flowchart.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={LIST_SEARCH_INPUT_CLASS}
            />
            <Search className="w-3.5 h-3.5 text-content-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={openCreateModal}
            className="btn-animation waves-effect waves-light btn-primary h-9 px-2.5 sm:px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
            title={t("flowchart.addFlowchart")}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("flowchart.addFlowchart")}</span>
          </button>
        </div>
      }
    >
      {/* Data Table (Desktop sm+) */}
      <div className={LIST_TABLE_WRAP_CLASS}>
        <ResponsiveTable className="w-full text-left border-collapse min-w-[880px]">
          <thead>
            <tr className={LIST_THEAD_ROW_CLASS}>
              <th className="py-3 px-4 w-14 text-center">No</th>
              <th className="py-3 px-4 min-w-[180px] max-w-[280px]">{t("flowchart.thTitle")}</th>
              <th className="py-3 px-4 w-36">{t("flowchart.thCategory")}</th>
              <th className="py-3 px-4 min-w-[180px] max-w-[280px]">
                {t("flowchart.thDescription")}
              </th>
              <th className="py-3 px-4 w-44">{t("flowchart.thLinkedEpic")}</th>
              <th className="py-3 px-4 w-40">{t("flowchart.thAuthor")}</th>
              <th className="py-3 px-4 w-36">{t("wiki.thLastUpdated")}</th>
              <th className="py-3 px-4 w-28 text-center">{t("flowchart.thAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-faint text-xs font-medium text-content-body">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-content-subtle">
                  <div className="w-14 h-14 rounded-md bg-primary-surface/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <Workflow className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-medium text-content-strong text-sm">
                    {t("flowchart.emptyTitle")}
                  </p>
                  <p className="text-xs text-content-subtle mt-1 mb-4">
                    {t("flowchart.emptyHint")}
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse rounded-md text-xs font-medium transition-all shadow-xs shadow-primary/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> {t("flowchart.addFlowchart")}
                  </button>
                </td>
              </tr>
            ) : (
              currentItems.map((fw, index) => {
                const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                const activeAuthor = getResolvedAuthor();
                const createdBy = tampilanNamaPembuat(fw, activeAuthor);
                const formatDateSafe = (dateVal?: string) => {
                  if (!dateVal) return "-";
                  if (dateVal.includes(",") || dateVal.includes("/")) return dateVal;
                  const d = new Date(dateVal);
                  if (isNaN(d.getTime())) return dateVal;
                  return d.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                };
                const lastEditedAt = formatDateSafe(fw.lastEditedAt || fw.createdAt);
                const initials = getInitials(createdBy);
                const linkedEpic = tasks.find((t) => t.id === fw.epicTaskId);

                return (
                  <tr
                    key={fw.id}
                    onClick={() => {
                      handleSelectFlowchart(fw.id);
                      setIsEditorActive(true);
                    }}
                    className="hover:bg-surface-sunken/70 transition-colors duration-200 group cursor-pointer h-14 whitespace-nowrap"
                  >
                    <td className="py-3 px-4 text-center text-content-subtle font-medium whitespace-nowrap">
                      {String(srNo).padStart(2, "0")}
                    </td>
                    <td className="py-3 px-4 font-medium text-content group-hover:text-primary transition-colors max-w-[220px] truncate whitespace-nowrap">
                      {fw.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 text-[10px] leading-none font-medium rounded-md uppercase">
                        {fw.category || t("flowchart.uncategorized")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-content-muted font-medium max-w-[260px] truncate whitespace-nowrap">
                      {fw.description ? (
                        fw.description
                      ) : (
                        <span className="text-content-subtle italic">
                          {t("flowchart.noDescription")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {linkedEpic ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 text-[10px] leading-none font-medium rounded-md max-w-[180px] truncate"
                          title={linkedEpic.title}
                        >
                          🎯 {linkedEpic.title}
                        </span>
                      ) : (
                        <span className="text-content-subtle font-normal text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-content-body font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-surface/10 text-primary flex items-center justify-center text-[10px] leading-none font-medium shrink-0">
                          {initials}
                        </div>
                        <span className="truncate max-w-[120px]">{createdBy}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-content-muted font-medium whitespace-nowrap">
                      {lastEditedAt}
                    </td>
                    <td
                      className="py-3 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            handleSelectFlowchart(fw.id);
                            setIsEditorActive(true);
                          }}
                          className="p-1.5 text-content-muted hover:text-primary hover:bg-primary-surface/10 rounded-md transition-all cursor-pointer"
                          title={t("flowchart.viewCanvas")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canModifyFlowchart(fw) && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => openEditModal(fw, e)}
                              className="p-1.5 text-content-muted hover:text-primary hover:bg-primary-surface/10 rounded-md transition-all cursor-pointer"
                              title={t("flowchart.editFlowchart")}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteFlowchart(fw.id, e)}
                              className="p-1.5 text-content-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                              title={t("flowchart.deleteFlowchart")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </ResponsiveTable>
      </div>

      {/* Mobile Card List View (< 640px) */}
      <div className="sm:hidden flex-1 overflow-y-auto p-4 space-y-3">
        <FlowchartMobileCardView
          flowcharts={currentItems}
          tasks={tasks}
          onSelectFlowchart={(id) => {
            handleSelectFlowchart(id);
            setIsEditorActive(true);
          }}
          onEditFlowchart={(flow, e) => openEditModal(flow, e)}
          onDeleteFlowchart={(id, e) => handleDeleteFlowchart(id, e)}
          canModifyFlowchart={canModifyFlowchart}
          getResolvedAuthor={getResolvedAuthor}
          onOpenCreate={openCreateModal}
        />
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-border-subtle bg-surface-sunken/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="text-xs sm:text-[10px] text-content-muted font-normal">
          {t("common.showing")} {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}{" "}
          {t("common.to")} {Math.min(currentPage * itemsPerPage, totalItems)} {t("common.of")}{" "}
          {totalItems} {t("common.entries")}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-surface border border-border-subtle text-content-secondary hover:bg-surface-sunken rounded-md text-xs sm:text-[10px] font-normal disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
            >
              {t("flowchart.previous")}
            </button>
            <span className="px-3.5 py-1.5 bg-primary-surface text-content-inverse rounded-md text-xs sm:text-[10px] font-normal shadow-xs">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-surface border border-border-subtle text-content-secondary hover:bg-surface-sunken rounded-md text-xs sm:text-[10px] font-normal disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
            >
              {t("flowchart.next")}
            </button>
          </div>
        )}
      </div>
    </ListPageShell>
  );
};
