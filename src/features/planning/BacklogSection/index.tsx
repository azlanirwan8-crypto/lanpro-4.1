import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Search, LayoutGrid, Filter, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Task, MasterData } from "../../../types";
import { StyledDropdown, TypeIcon } from "../../../components/ui/CommonComponents";
import { getAllDescendants, getTaskDepth } from "../../../lib/taskTree";
import { gayaLabel, warnaDariMaster } from "../../../lib/warnaLabel";

interface BacklogSectionProps {
  tasks: Task[];
  masterData: MasterData[];
  renderDraggableTask: (task: Task, index: number, variant: "card" | "row") => React.ReactNode;
  canEditPlanning?: boolean;
  onAddSprint?: () => void;
}

export const BacklogSection: React.FC<BacklogSectionProps> = ({
  tasks,
  masterData,
  renderDraggableTask,
  canEditPlanning = false,
  onAddSprint,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  // Permintaan pemilik 15 Okt: kelompok (epic/standalone) default TERTUTUP —
  // pengguna sendiri yang membuka lewat chevron; simpul pohon di dalamnya tetap
  // default terbuka supaya begitu kelompok terbuka, drag-drop langsung hidup.
  // Yang disimpan hanya kunci yang di-toggle dari defaultnya.
  const [diToggle, setDiToggle] = useState<Set<string>>(new Set());

  const toggleExpand = (parentId: string) => {
    setDiToggle((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const terbuka = (kunci: string) =>
    kunci.startsWith("node-") ? !diToggle.has(kunci) : diToggle.has(kunci);

  // #689 butir (g) — satu kali jalan, bukan saringan berulang per baris.
  // Dulu: `backlogTasks` (n), `filteredBacklogTasks` (n), `epics` (n), lalu
  // `getTasksForParent` menyaring `filteredBacklogTasks` SEKALI LAGI untuk tiap
  // epik yang dirender (e × n). Pada 600 backlog dengan 40 epik itu ±24.000
  // iterasi per render, dan render terjadi setiap kali satu karakter diketik di
  // kotak pencarian atau satu kartu diseret.
  // UPDATE: Sekarang mengumpulkan SEMUA descendant secara rekursif (bukan hanya direct children)
  // untuk menampilkan hierarki sub-task bertingkat lengkap.
  const { filteredBacklogTasks, epics, kelompok, anakPeta, backlogIds } = React.useMemo(() => {
    const backlog = tasks.filter((t) => !t.sprintId && (t.type || "").toLowerCase() !== "epic");
    const kata = search.toLowerCase();

    const tersaring = backlog.filter((t) => {
      if (kata && !t.title.toLowerCase().includes(kata) && !t.key?.toLowerCase().includes(kata))
        return false;
      if (priorityFilter !== "All Priorities" && t.priority !== priorityFilter) return false;
      return true;
    });

    // Kumpulkan semua epic
    const epicsList = tasks.filter((t) => (t.type || "").toLowerCase() === "epic");

    // Untuk setiap epic, kumpulkan SEMUA descendant (bukan hanya direct children)
    const peta = new Map<string, { task: Task; depth: number }[]>();

    const dorong = (kunci: string, task: Task, depth: number) => {
      const wadah = peta.get(kunci);
      if (wadah) wadah.push({ task, depth });
      else peta.set(kunci, [{ task, depth }]);
    };

    // Proses setiap epic: kumpulkan semua descendant
    epicsList.forEach((epic) => {
      const allDescendants = getAllDescendants(epic.id, tasks);
      // Filter hanya yang ada di backlog (tidak di sprint)
      const backlogDescendants = allDescendants.filter((t) => !t.sprintId);

      backlogDescendants.forEach((descendant) => {
        const depth = getTaskDepth(descendant, tasks);
        dorong(epic.id, descendant, depth);
      });
    });

    // Standalone tasks (tanpa parent dan bukan epic)
    const standaloneTasks = tersaring.filter(
      (t) => !t.parentId && (t.type || "").toLowerCase() !== "epic"
    );
    standaloneTasks.forEach((t) => dorong("standalone", t, 0));

    // Peta anak langsung (induk → anak, urutan tasks) untuk pohon rekursif:
    // tiap task yang punya anak mendapat chevron dropdown sendiri.
    const anakPeta = new Map<string, Task[]>();
    const backlogIds = new Set<string>();
    for (const t of tasks) {
      if (t.sprintId || (t.type || "").toLowerCase() === "epic") continue;
      backlogIds.add(t.id);
      if (!t.parentId) continue;
      const wadah = anakPeta.get(t.parentId);
      if (wadah) wadah.push(t);
      else anakPeta.set(t.parentId, [t]);
    }

    return {
      filteredBacklogTasks: tersaring,
      epics: epicsList,
      kelompok: peta,
      anakPeta,
      backlogIds,
    };
  }, [tasks, search, priorityFilter]);

  const getTasksForParent = (parentId: string | null) => kelompok.get(parentId ?? "") ?? [];

  // #689 butir (g) — "backlog kosong" dan "tidak ada yang cocok" adalah dua
  // kabar yang berbeda; yang pertama berarti tidak ada kerja, yang kedua berarti
  // saringannya terlalu sempit.
  const adaSaringan = Boolean(search.trim()) || priorityFilter !== "All Priorities";

  let _draggablesRenderedCount = 0;

  const garisTepi = (depth: number) =>
    depth === 1
      ? "rgb(var(--color-primary) / 0.4)"
      : depth === 2
        ? "rgb(var(--color-primary) / 0.25)"
        : "rgb(var(--color-primary) / 0.15)";

  // Pohon rekursif: setiap task yang punya anak mendapat chevron sendiri di
  // kiri kartunya, sehingga sub-sub (dan seterusnya) bisa dibuka/tutup per
  // induk. Chevron berada DI LUAR Draggable agar klik toggle tidak mulai drag.
  const renderPohon = (task: Task, depth: number): React.ReactNode => {
    const anak = anakPeta.get(task.id) ?? [];
    const kunci = `node-${task.id}`;
    const isOpen = terbuka(kunci);
    const dndIndex = _draggablesRenderedCount++;

    return (
      <div key={task.id}>
        <div
          className="mb-2 relative flex items-center gap-1"
          style={{
            paddingLeft: `${depth * 8 + 8}px`,
            borderLeft: depth > 0 ? `2px solid ${garisTepi(depth)}` : undefined,
          }}
        >
          {anak.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleExpand(kunci)}
              className="w-4 h-4 shrink-0 flex items-center justify-center text-content-muted hover:text-content-strong cursor-pointer rounded-sm"
            >
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" aria-hidden />
              )}
            </button>
          ) : depth >= 2 ? (
            <span className="w-4 shrink-0 flex items-center justify-center" aria-hidden>
              <span className="w-1 h-1 rounded-full bg-primary/40" />
            </span>
          ) : (
            <span className="w-4 shrink-0" aria-hidden />
          )}
          <div className="flex-1 min-w-0">{renderDraggableTask(task, dndIndex, "card")}</div>
        </div>
        {isOpen && anak.map((a) => renderPohon(a, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-border-subtle/80 flex flex-col gap-2.5 shrink-0 bg-surface shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-3.5 h-3.5 text-content-muted shrink-0" />
            <h3 className="font-semibold text-content-strong text-xs tracking-tight truncate">
              {t("planning.backlogTasks")}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 px-2 inline-flex items-center bg-primary/10 border border-primary/30 rounded-md text-[10px] font-medium text-primary">
              {t("planning.issueCount", { count: filteredBacklogTasks.length })}
            </div>
            {canEditPlanning && onAddSprint && (
              <button
                type="button"
                onClick={onAddSprint}
                title={t("planning.newSprint")}
                className="h-6 px-2 sm:px-2.5 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse rounded-md text-[10px] font-medium shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">{t("planning.newSprint")}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="relative min-w-0 flex-1">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none" />
            <input
              placeholder={t("planning.searchBacklog")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 h-7 bg-surface-sunken/70 border border-border-subtle/80 rounded-md text-[11px] font-normal outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-surface transition-all shadow-2xs"
            />
          </div>
          <div className="w-[42%] max-w-[9.5rem] shrink-0 flex items-center gap-1.5 min-w-0">
            <Filter className="w-3 h-3 text-content-subtle shrink-0 hidden xs:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <StyledDropdown
                value={priorityFilter}
                onChange={(val) => setPriorityFilter(val)}
                options={[
                  { id: "All Priorities", label: t("planning.allPriorities") },
                  ...masterData
                    .filter((m) => m.type === "priority")
                    .map((p) => ({ id: p.label, label: p.label, icon: p.icon, color: p.color })),
                ]}
                type="priority"
                masterData={masterData}
                className="w-full"
                buttonClassName="h-7 w-full bg-surface rounded-md border border-border-subtle/80 hover:border-border-subtle shadow-2xs px-2 text-[11px] font-normal"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 bg-surface-sunken/40 min-h-0 custom-scrollbar">
        {epics.flatMap((epic) => {
          const items = getTasksForParent(epic.id);
          if (items.length === 0) return [];

          const isExpanded = terbuka(`epic-${epic.id}`);
          // #564 — warna baris epik mengikuti PRIORITY epiknya sendiri, supaya
          // sembilan epik tidak lagi tampil satu warna; hex issue_type hanya
          // jatuh balik untuk epik tanpa priority. Ikon tetap pilihan Master
          // Data, hanya warnanya yang ditimpa lewat `warna`.
          const jenisEpic = epic.type || "epic";
          const hexEpic = epic.priority
            ? warnaDariMaster(masterData, "priority", epic.priority)
            : warnaDariMaster(masterData, "issue_type", jenisEpic);

          return [
            <div
              key={`header-${epic.id}`}
              className="group flex items-center gap-2 px-1 mt-3 mb-2 cursor-pointer hover:bg-surface-muted/60 rounded-md py-1 transition-colors"
              onClick={() => toggleExpand(`epic-${epic.id}`)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: hexEpic }} />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: hexEpic }} />
              )}
              <TypeIcon
                type={jenisEpic}
                className="w-3.5 h-3.5 shrink-0"
                masterData={masterData}
                warna={hexEpic}
              />
              <span className="text-xs font-normal leading-none" style={{ color: hexEpic }}>
                {epic.title}
              </span>
              <div
                className="label-chip ml-auto text-[10px] leading-none font-normal px-1.5 py-1 rounded-md border"
                style={gayaLabel(hexEpic)}
              >
                {items.length}
              </div>
            </div>,
            ...(isExpanded
              ? items
                  .filter(
                    (i) => i.task.parentId === epic.id || !backlogIds.has(i.task.parentId as string)
                  )
                  .map((i) => renderPohon(i.task, i.depth))
              : []),
          ];
        })}

        {(() => {
          const items = getTasksForParent("standalone");
          if (items.length === 0) return [];

          const isExpanded = terbuka("standalone");

          return [
            <div
              key="header-standalone"
              className="flex items-center gap-2 px-1 mt-3 mb-2 cursor-pointer hover:bg-surface-muted/50 rounded-md py-1 transition-colors"
              onClick={() => toggleExpand("standalone")}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-content-muted" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-content-muted" />
              )}
              <TypeIcon type="task" className="w-3.5 h-3.5 shrink-0" masterData={masterData} />
              <span className="text-xs font-normal text-content-secondary leading-none">
                {t("planning.standaloneBacklog")}
              </span>
              <div className="ml-auto text-[10px] font-normal text-content-secondary bg-surface-muted px-1.5 py-1 rounded-md border border-border-subtle/60">
                {items.length}
              </div>
            </div>,
            ...(isExpanded ? items.map((i) => renderPohon(i.task, i.depth)) : []),
          ];
        })()}

        {filteredBacklogTasks.length === 0 && (
          <div className="py-12 text-center text-xs font-normal text-content-subtle italic">
            {/* Dua cabang, bukan `data-testid` ternary — lihat penjaga #602. */}
            {adaSaringan ? (
              <span data-testid="backlog-tidak-cocok">{t("planning.emptyBacklogFilter")}</span>
            ) : (
              <span data-testid="backlog-kosong">{t("planning.emptyBacklog")}</span>
            )}
          </div>
        )}
      </div>
    </>
  );
};
