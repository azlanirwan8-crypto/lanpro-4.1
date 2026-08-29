import { useTranslation } from "react-i18next";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, List } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "../../lib/utils";
import { reorderTasks } from "./services/issues.service";
import { toast } from "sonner";
import { Task } from "../../types";
import { useAppStore } from "../../store/useAppStore";
import { IssueListViewProps } from "./types";
import { useIssueList } from "./hooks";
import { styles } from "./styles";
import { ConfigureColumnsModal } from "./ConfigureColumnsModal";
import { IssueAdvancedFiltersPanel } from "./components/list/IssueAdvancedFiltersPanel";
import { IssueTableRow } from "./components/list/IssueTableRow";
import { IssueQuickCreateBar } from "./components/list/IssueQuickCreateBar";
import { IssueBulkActionsBar } from "./components/list/IssueBulkActionsBar";
import {
  isUserReporter as isUserReporterFn,
  canDeleteIssue as canDeleteIssueFn,
  canManageIssue as canManageIssueFn,
  canEditIssue as canEditIssueFn,
  IssuePermissionContext,
} from "./issuePermissions";

export const IssueListView: React.FC<IssueListViewProps> = (props) => {
  const { t } = useTranslation();
  const { density, setCurrentView } = useAppStore();
  const isCompact = density === "compact";
  const {
    projectRole,
    tasks = [],
    projectMembers = [],
    masterData = [],
    userRole,
    currentUserProfile,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    hasPermission,
    deleteTask,
    bulkDeleteTasks,
    selectedProject,
    user,
    fetchTasks,
    sprints = [],
    updateTaskField,
  } = props;

  const isProjectMember = projectRole?.toLowerCase() === "member";
  const canReorder =
    (userRole === "admin" || userRole === "head" || userRole === "manager") && !isProjectMember;

  const {
    displayRoots,
    handleToggleSelectAll,
    handleToggleSelectOne,
    listFilterStatus,
    setListFilterStatus,
    listFilterPriority,
    setListFilterPriority,
    listFilterAssignee,
    setListFilterAssignee,
    listFilterCategory,
    setListFilterCategory,
    listFilterSprint,
    setListFilterSprint,
    listFilterLabel,
    setListFilterLabel,
    listFilterEnvironment,
    setListFilterEnvironment,
    listFilterProjectRisk,
    setListFilterProjectRisk,
    listFilterRelease,
    setListFilterRelease,
    listFilterResolution,
    setListFilterResolution,
    listFilterDateType,
    setListFilterDateType,
    listFilterStartDate,
    setListFilterStartDate,
    listFilterEndDate,
    setListFilterEndDate,
    issueSearch,
    setIssueSearch,
    listPage,
    setListPage,
    itemsPerPage,
    setItemsPerPage,
    expandedTasks,
    selectedTaskIds,
    setSelectedTaskIds,
    issueTableColumns,
    setIssueTableColumns,
    isConfigureColumnsOpen,
    setIsConfigureColumnsOpen,
    inlineAddingTaskId,
    setInlineAddingTaskId,
    inlineAddType,
    setInlineAddType,
    inlineAddPriority,
    setInlineAddPriority,
    inlineAddAssigneeId,
    setInlineAddAssigneeId,
    isInlineTypeOpen,
    setIsInlineTypeOpen,
    isCreating,
    toggleTaskExpansion,
    handleInlineAdd,
    handleReorderColumns,
  } = useIssueList({ ...props, updateTaskField });

  const [inlineAddSprintId, setInlineAddSprintId] = useState("");

  // Item #200/#201 — aturan izin (Delete/Assignee/Reporter hanya
  // Admin/Manager/Head atau Reporter; Assignee cuma boleh edit field lain
  // di task yang diberikan ke mereka) dipindah ke modul murni
  // `issuePermissions.ts` yang terkunci test (`issuePermissions.test.ts`) —
  // JANGAN tulis ulang logikanya di sini. Riwayat lengkap kenapa (termasuk
  // bug #200 yang sempat salah memakai `hasPermission("list","update")` yang
  // ternyata selalu `true` untuk role "user") ada di komentar modul itu.
  const permCtx: IssuePermissionContext = { userRole, currentUserProfile, user, hasPermission };
  const isUserReporter = (issue: Task) => isUserReporterFn(issue, permCtx);
  const canDeleteIssue = (issue: Task) => canDeleteIssueFn(issue, permCtx);
  const canManageIssue = (issue: Task) => canManageIssueFn(issue, permCtx);
  const canEditIssue = (issue: Task) => canEditIssueFn(issue, permCtx);

  const rawTasks = Array.isArray(tasks) ? tasks : [];
  const mArr = Array.isArray(masterData) ? masterData : [];

  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false);
  const [activeContextMenuTaskId, setActiveContextMenuTaskId] = useState<string | null>(null);

  const [inlineTitleMap, setInlineTitleMap] = useState<Record<string, string>>({});
  const [quickCreateTitle, setQuickCreateTitle] = useState("");

  const createSubtask = async (parentId: string) => {
    const title = inlineTitleMap[parentId] || "";
    if (!title.trim()) {
      toast.error(t("toast.bulkTitleEmpty"));
      return;
    }
    await handleInlineAdd(parentId, title);
    setInlineTitleMap((prev) => ({ ...prev, [parentId]: "" }));
  };

  const createGlobalIssue = async () => {
    if (!quickCreateTitle.trim()) {
      toast.error(t("toast.bulkTitleEmpty"));
      return;
    }
    await handleInlineAdd(null, quickCreateTitle);
    setQuickCreateTitle("");
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const startIndex = (listPage - 1) * itemsPerPage;
    const absoluteSourceIndex = startIndex + result.source.index;
    const absoluteDestinationIndex = startIndex + result.destination.index;

    const reorderedRoots = Array.from(displayRoots);
    const [removed] = reorderedRoots.splice(absoluteSourceIndex, 1);
    reorderedRoots.splice(absoluteDestinationIndex, 0, removed);

    const toastId = toast.loading(t("toast.reorderingBacklog"));
    try {
      const orderedIds = reorderedRoots.map((r) => r.id);

      const response = await reorderTasks(selectedProject.id, orderedIds);

      if (response.status === "success") {
        toast.success(t("toast.backlogPrioritized"), { id: toastId });
        if (fetchTasks) {
          fetchTasks();
        }
      } else {
        throw new Error(response.message || "Failed to reorder");
      }
    } catch (err: any) {
      console.error("Failed to reorder tasks:", err);
      toast.error(err.message || "Failed to prioritize tasks", { id: toastId });
    }
  };

  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    rawTasks.forEach((t) => {
      if (Array.isArray(t.labels)) {
        t.labels.forEach((l) => {
          if (l) labelSet.add(l.trim());
        });
      }
    });
    return Array.from(labelSet).sort();
  }, [rawTasks]);

  /**
   * Item #146 — pilihan filter dibentuk sebagai objek, bukan lagi daftar teks,
   * supaya ikon MasterData bisa ikut ditampilkan.
   *
   * Sumbernya SENGAJA dua: MasterData sebagai benih, lalu nilai yang benar-
   * benar dipakai tugas. Yang kedua tidak selalu ada di MasterData — nilai
   * lama bisa saja tertinggal di sana — sehingga baris seperti itu MEMANG
   * tidak punya ikon. Filter ini karena itu berikon SEBAGIAN, dan itu jujur:
   * ikon hanya muncul untuk nilai yang benar-benar dikenal MasterData.
   *
   * Empat filter sebelumnya menulis blok yang nyaris sama satu per satu.
   */
  const opsiFilter = React.useCallback(
    (tipeMaster: string, ambilNilai: (t: Task) => string | undefined | null) => {
      const peta = new Map<string, { id: string; label: string; icon?: string; color?: string }>();
      mArr
        .filter((m) => m.type === tipeMaster && m.label)
        .forEach((m) =>
          peta.set(m.label as string, {
            id: m.label as string,
            label: m.label as string,
            icon: (m as { icon?: string }).icon,
            color: (m as { color?: string }).color,
          })
        );
      rawTasks.forEach((t) => {
        const nilai = ambilNilai(t);
        if (nilai && !peta.has(nilai)) peta.set(nilai, { id: nilai, label: nilai });
      });
      return Array.from(peta.values()).sort((a, b) => a.label.localeCompare(b.label));
    },
    [rawTasks, mArr]
  );

  const allEnvironments = useMemo(
    () => opsiFilter("environment", (t) => t.environment),
    [opsiFilter]
  );
  const allProjectRisks = useMemo(
    () => opsiFilter("project_risk", (t) => (t as { projectRisk?: string }).projectRisk),
    [opsiFilter]
  );
  const allReleases = useMemo(() => opsiFilter("release", (t) => t.release), [opsiFilter]);
  const allResolutions = useMemo(
    () => opsiFilter("resolution", (t) => (t as { resolution?: string }).resolution),
    [opsiFilter]
  );

  return (
    <div className="flex-1 p-2 sm:p-4 md:p-6 bg-surface-sunken overflow-hidden flex flex-col w-full h-full">
      <div className={cn(styles.container, "rounded-xl flex-1 flex flex-col")}>
        {/* Header Toolbar & Advanced Filters */}
        <IssueAdvancedFiltersPanel
          issueSearch={issueSearch}
          setIssueSearch={setIssueSearch}
          isFiltersPanelOpen={isFiltersPanelOpen}
          setIsFiltersPanelOpen={setIsFiltersPanelOpen}
          listFilterStatus={listFilterStatus}
          setListFilterStatus={setListFilterStatus}
          listFilterPriority={listFilterPriority}
          setListFilterPriority={setListFilterPriority}
          listFilterAssignee={listFilterAssignee}
          setListFilterAssignee={setListFilterAssignee}
          listFilterCategory={listFilterCategory}
          setListFilterCategory={setListFilterCategory}
          listFilterSprint={listFilterSprint}
          setListFilterSprint={setListFilterSprint}
          listFilterLabel={listFilterLabel}
          setListFilterLabel={setListFilterLabel}
          listFilterEnvironment={listFilterEnvironment}
          setListFilterEnvironment={setListFilterEnvironment}
          listFilterProjectRisk={listFilterProjectRisk}
          setListFilterProjectRisk={setListFilterProjectRisk}
          listFilterRelease={listFilterRelease}
          setListFilterRelease={setListFilterRelease}
          listFilterResolution={listFilterResolution}
          setListFilterResolution={setListFilterResolution}
          listFilterDateType={listFilterDateType}
          setListFilterDateType={setListFilterDateType}
          listFilterStartDate={listFilterStartDate}
          setListFilterStartDate={setListFilterStartDate}
          listFilterEndDate={listFilterEndDate}
          setListFilterEndDate={setListFilterEndDate}
          projectMembers={projectMembers}
          sprints={sprints}
          masterData={mArr}
          allLabels={allLabels}
          allEnvironments={allEnvironments}
          allProjectRisks={allProjectRisks}
          allReleases={allReleases}
          allResolutions={allResolutions}
          setIsConfigureColumnsOpen={setIsConfigureColumnsOpen}
        />

        {/* Table Content Area */}
        <div className="overflow-x-auto w-full flex-1 flex flex-col min-h-0">
          <div className={cn(styles.tableWrapper, "flex-1")}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="min-w-max flex flex-col">
                <Droppable droppableId="backlog-droppable" type="backlog-tasks">
                  {(providedDroppable) => (
                    <table
                      className={styles.table}
                      style={{
                        minWidth: issueTableColumns
                          .filter((c) => c.visible)
                          .reduce(
                            (acc: number, c: any) => acc + (acc > 0 ? c.width || 100 : 0),
                            100
                          ),
                      }}
                      ref={providedDroppable.innerRef}
                      {...providedDroppable.droppableProps}
                    >
                      <thead>
                        <tr className={styles.tableHeader}>
                          {canReorder && <th className="w-8 px-1 text-center bg-surface-sunken" />}
                          <th className={cn("w-12 px-4", isCompact ? "py-1" : "py-2.5")}>
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={
                                  selectedTaskIds.size === displayRoots.length &&
                                  displayRoots.length > 0
                                }
                                onChange={handleToggleSelectAll}
                                className="w-4 h-4 rounded border-border-subtle text-indigo-600 focus:ring-indigo-500 shadow-soft transition-all cursor-pointer"
                              />
                            </div>
                          </th>
                          {issueTableColumns
                            .filter((c: any) => c.visible)
                            .map((col: any) => (
                              <th
                                key={col.id}
                                className={cn(
                                  styles.tableHeaderCell,
                                  isCompact ? "py-1 text-xs sm:text-[10px]" : "py-2.5"
                                )}
                                style={{ width: col.width }}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{t(col.label)}</span>
                                </div>
                                <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-surface-strong" />
                              </th>
                            ))}
                          <th
                            className={cn(
                              "w-12 px-2 sticky right-0 bg-surface-sunken z-[30]",
                              isCompact ? "py-1" : "py-2.5"
                            )}
                          >
                            <List className="w-4 h-4 text-content-subtle mx-auto" />
                          </th>
                        </tr>
                      </thead>
                      {displayRoots.length === 0 ? (
                        <tbody className="divide-y divide-border-faint italic-rows text-xs font-normal">
                          <tr>
                            <td
                              colSpan={
                                issueTableColumns.filter((c: any) => c.visible).length +
                                2 +
                                (canReorder ? 1 : 0)
                              }
                              className="px-10 py-20 text-center"
                            >
                              <div className="flex flex-col items-center gap-3 opacity-40">
                                <Search className="w-8 h-8 text-content-subtle" />
                                <p className="text-xs font-normal text-content-muted uppercase tracking-wider">
                                  {t("issues.noMatchingRecordsFound")}
                                </p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      ) : (
                        <AnimatePresence mode="popLayout" initial={false}>
                          {displayRoots
                            .slice((listPage - 1) * itemsPerPage, listPage * itemsPerPage)
                            .map((root: Task, index: number) => (
                              <Draggable
                                key={root.id ? `drag-${root.id}-${index}` : `drag-${index}`}
                                draggableId={root.id || `drag-${index}`}
                                index={index}
                                isDragDisabled={!canReorder}
                              >
                                {(providedDraggable, snapshot) => (
                                  <tbody
                                    ref={providedDraggable.innerRef}
                                    {...providedDraggable.draggableProps}
                                    className={cn(
                                      "divide-y divide-border-faint italic-rows text-xs font-normal",
                                      snapshot.isDragging &&
                                        "bg-surface-muted/50 shadow-soft border border-indigo-500/30"
                                    )}
                                    style={providedDraggable.draggableProps.style}
                                  >
                                    <IssueTableRow
                                      task={root}
                                      depth={0}
                                      dragHandleProps={providedDraggable.dragHandleProps}
                                      canReorder={canReorder}
                                      isCompact={isCompact}
                                      isSelected={selectedTaskIds.has(root.id)}
                                      handleToggleSelectOne={handleToggleSelectOne}
                                      issueTableColumns={issueTableColumns}
                                      expandedTasks={expandedTasks}
                                      toggleTaskExpansion={toggleTaskExpansion}
                                      inlineAddingTaskId={inlineAddingTaskId}
                                      setInlineAddingTaskId={setInlineAddingTaskId}
                                      inlineTitleMap={inlineTitleMap}
                                      setInlineTitleMap={setInlineTitleMap}
                                      inlineAddType={inlineAddType}
                                      setInlineAddType={setInlineAddType}
                                      isInlineTypeOpen={isInlineTypeOpen}
                                      setIsInlineTypeOpen={setIsInlineTypeOpen}
                                      inlineAddPriority={inlineAddPriority}
                                      setInlineAddPriority={setInlineAddPriority}
                                      inlineAddAssigneeId={inlineAddAssigneeId}
                                      setInlineAddAssigneeId={setInlineAddAssigneeId}
                                      isCreating={isCreating}
                                      createSubtask={createSubtask}
                                      tasks={rawTasks}
                                      masterData={mArr}
                                      projectMembers={projectMembers}
                                      sprints={sprints}
                                      isUserReporter={isUserReporter}
                                      canDeleteIssue={canDeleteIssue}
                                      canEditIssue={canEditIssue}
                                      canManageIssue={canManageIssue}
                                      deleteTask={deleteTask}
                                      setSelectedTaskForDetail={setSelectedTaskForDetail}
                                      setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
                                      setCurrentView={setCurrentView}
                                      updateTaskField={updateTaskField}
                                      activeContextMenuTaskId={activeContextMenuTaskId}
                                      setActiveContextMenuTaskId={setActiveContextMenuTaskId}
                                      issueSearch={issueSearch}
                                      listFilterStatus={listFilterStatus}
                                      listFilterPriority={listFilterPriority}
                                      listFilterAssignee={listFilterAssignee}
                                      listFilterCategory={listFilterCategory}
                                      listFilterSprint={listFilterSprint}
                                      listFilterEnvironment={listFilterEnvironment}
                                      listFilterProjectRisk={listFilterProjectRisk}
                                      listFilterRelease={listFilterRelease}
                                      listFilterResolution={listFilterResolution}
                                      listFilterLabel={listFilterLabel}
                                      listFilterStartDate={listFilterStartDate}
                                      listFilterEndDate={listFilterEndDate}
                                      listFilterDateType={listFilterDateType}
                                    />
                                  </tbody>
                                )}
                              </Draggable>
                            ))}
                        </AnimatePresence>
                      )}

                      {providedDroppable.placeholder}
                    </table>
                  )}
                </Droppable>
              </div>
            </DragDropContext>
          </div>
        </div>

        {/* Global Inline Quick Create Bar */}
        <IssueQuickCreateBar
          quickCreateTitle={quickCreateTitle}
          setQuickCreateTitle={setQuickCreateTitle}
          createGlobalIssue={createGlobalIssue}
          isCreating={isCreating}
          inlineAddType={inlineAddType}
          setInlineAddType={setInlineAddType}
          isInlineTypeOpen={isInlineTypeOpen}
          setIsInlineTypeOpen={setIsInlineTypeOpen}
          inlineAddPriority={inlineAddPriority}
          setInlineAddPriority={setInlineAddPriority}
          inlineAddAssigneeId={inlineAddAssigneeId}
          setInlineAddAssigneeId={setInlineAddAssigneeId}
          inlineAddSprintId={inlineAddSprintId}
          setInlineAddSprintId={setInlineAddSprintId}
          masterData={mArr}
          projectMembers={projectMembers}
          sprints={sprints}
        />

        {/* Pagination & Bulk Action Bar */}
        <IssueBulkActionsBar
          displayRoots={displayRoots}
          listPage={listPage}
          setListPage={setListPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          selectedTaskIds={selectedTaskIds}
          setSelectedTaskIds={setSelectedTaskIds}
          tasks={rawTasks}
          masterData={mArr}
          projectMembers={projectMembers}
          updateTaskField={updateTaskField}
          deleteTask={deleteTask}
          bulkDeleteTasks={bulkDeleteTasks}
          canDeleteIssue={canDeleteIssue}
        />

        <ConfigureColumnsModal
          isOpen={isConfigureColumnsOpen}
          onClose={() => setIsConfigureColumnsOpen(false)}
          issueTableColumns={issueTableColumns}
          setIssueTableColumns={setIssueTableColumns}
          handleReorderColumns={handleReorderColumns}
        />
      </div>
    </div>
  );
};

export default IssueListView;
