import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { Task, Project } from "../../types";
import {
  format,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  addDays,
  differenceInDays,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ensureDate, cn } from "../../lib/utils";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { exportTimelinePdf } from "./exportTimelinePdf";
import {
  Download,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Plus,
  Minus,
  Zap,
  ListTodo,
  Target,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TimelineProps {
  tasks: Task[];
  selectedProject: Project | null;
  updateTaskField: (taskId: string, field: string, value: any) => Promise<void>;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
}

// Provide default helpers for mapping status and priorities to Tailwind colors
const getStatusColors = (status: string = "", isEpic: boolean) => {
  if (isEpic) {
    return {
      bg: "bg-gradient-to-r from-purple-100 to-purple-50/50",
      border: "border-purple-500/30 hover:border-purple-500/30",
      text: "text-purple-900",
      activeBg: "bg-purple-950 ring-2 ring-purple-400 border-purple-800",
      handle: "hover:bg-purple-600/15 active:bg-purple-600/25 group/l-handle",
      handleBar: "bg-purple-400/80 border-purple-400/20 group-hover/l-handle:bg-purple-600",
      handleR: "hover:bg-purple-600/15 active:bg-purple-600/25 group/r-handle",
      handleBarR: "bg-purple-400/80 border-purple-400/20 group-hover/r-handle:bg-purple-600",
      tooltipText: "text-purple-300",
      tooltipBadge: "bg-purple-500/30 text-purple-200",
    };
  }

  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete")) {
    return {
      bg: "bg-gradient-to-r from-emerald-50 to-white",
      border: "border-emerald-500/30 hover:border-emerald-500/30",
      text: "text-emerald-900",
      activeBg: "bg-emerald-950 ring-2 ring-emerald-400 border-emerald-800",
      handle: "hover:bg-emerald-600/15 active:bg-emerald-600/25 group/l-handle",
      handleBar: "bg-emerald-400/80 border-emerald-400/20 group-hover/l-handle:bg-emerald-600",
      handleR: "hover:bg-emerald-600/15 active:bg-emerald-600/25 group/r-handle",
      handleBarR: "bg-emerald-400/80 border-emerald-400/20 group-hover/r-handle:bg-emerald-600",
      tooltipText: "text-emerald-300",
      tooltipBadge: "bg-emerald-500/30 text-emerald-200",
    };
  }
  if (s.includes("progress") || s.includes("active") || s.includes("review") || s.includes("uat")) {
    return {
      bg: "bg-gradient-to-r from-indigo-50 to-white",
      border: "border-indigo-500/30 hover:border-indigo-500/30",
      text: "text-indigo-900",
      activeBg: "bg-indigo-950 ring-2 ring-indigo-400 border-indigo-800",
      handle: "hover:bg-indigo-600/15 active:bg-indigo-600/25 group/l-handle",
      handleBar: "bg-indigo-400/80 border-indigo-400/20 group-hover/l-handle:bg-indigo-600",
      handleR: "hover:bg-indigo-600/15 active:bg-indigo-600/25 group/r-handle",
      handleBarR: "bg-indigo-400/80 border-indigo-400/20 group-hover/r-handle:bg-indigo-600",
      tooltipText: "text-indigo-300",
      tooltipBadge: "bg-indigo-500/30 text-indigo-200",
    };
  }

  // Default (To Do / Backlog)
  return {
    bg: "bg-gradient-to-r from-slate-50 to-white",
    border: "border-border-subtle/80 hover:border-border-subtle",
    text: "text-content",
    activeBg: "bg-slate-950 ring-2 ring-slate-400 border-border-inverse",
    handle: "hover:bg-slate-600/15 active:bg-slate-600/25 group/l-handle",
    handleBar: "bg-slate-400/80 border-slate-400/20 group-hover/l-handle:bg-slate-600",
    handleR: "hover:bg-slate-600/15 active:bg-slate-600/25 group/r-handle",
    handleBarR: "bg-slate-400/80 border-slate-400/20 group-hover/r-handle:bg-slate-600",
    tooltipText: "text-content-subtle",
    tooltipBadge: "bg-slate-500/30 text-content-inverse-muted",
  };
};

const getPriorityColor = (priority: string = "") => {
  const p = priority.toLowerCase();
  if (p.includes("p0") || p.includes("urgent") || p.includes("blocker") || p.includes("highest"))
    return "border-l-rose-500 shadow-rose-900/5";
  if (p.includes("p1") || p.includes("high")) return "border-l-orange-500 shadow-orange-900/5";
  if (p.includes("p2") || p.includes("medium")) return "border-l-amber-400 shadow-amber-900/5";
  if (p.includes("p3") || p.includes("low")) return "border-l-blue-400 shadow-blue-900/5";
  // Default
  return "border-l-slate-400 shadow-slate-900/5";
};

export const TimelinePanel: React.FC<TimelineProps> = ({
  tasks,
  selectedProject,
  updateTaskField,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
}) => {
  const { t } = useTranslation();
  const [pixelsPerDay, setPixelsPerDay] = useState<number>(24);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [timelineInteraction, setTimelineInteraction] = useState<{
    taskId: string;
    type: "move" | "resize-start" | "resize-end";
    startX: number;
    initialStart: Date;
    initialEnd: Date;
  } | null>(null);
  const [tempDates, setTempDates] = useState<
    Record<string, { startDate: string; endDate: string }>
  >({});

  // Backlog and epic hierarchy expansion state: default to expanded (true)
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({
      ...prev,
      [epicId]: prev[epicId] === false ? true : false,
    }));
  };

  // Build a highly-scannable, vertically synchronized parent-child presentation list
  const renderedRows = React.useMemo(() => {
    const list: Array<{
      task: Task;
      isChild: boolean;
      depth: number;
      parentId?: string;
      isLastChild?: boolean;
    }> = [];

    // Find top-level parents (tasks of type Epic, or tasks with no parent, or tasks whose parent is not loaded)
    const topLevels = tasks.filter((t) => !t.parentId || !tasks.some((p) => p.id === t.parentId));

    // Put Epics first, then others, sorting to keep structure nice
    const sortedTopLevels = [...topLevels].sort((a, b) => {
      const aIsEpic = (a.type || "").toLowerCase() === "epic";
      const bIsEpic = (b.type || "").toLowerCase() === "epic";
      if (aIsEpic && !bIsEpic) return -1;
      if (!aIsEpic && bIsEpic) return 1;
      return 0;
    });

    sortedTopLevels.forEach((task) => {
      list.push({ task, isChild: false, depth: 0, isLastChild: false });

      const children = tasks.filter((t) => t.parentId === task.id);
      if (children.length > 0) {
        // Epics are expanded by default unless explicitly clicked to collapse
        const isCollapsed = expandedEpics[task.id] === false;
        if (!isCollapsed) {
          const addChildren = (currentChildren: Task[], currentDepth: number) => {
            currentChildren.forEach((child, idx) => {
              const isLastChild = idx === currentChildren.length - 1;
              list.push({
                task: child,
                isChild: true,
                depth: currentDepth,
                parentId: child.parentId,
                isLastChild,
              });

              // Add grand-children if any, keeping them visually grouped under this child
              // Note: we can use the same expandedEpics state to let users collapse ANY parent if we want,
              // but for now we follow the same collapse state as before
              const grandChildren = tasks.filter((t) => t.parentId === child.id);
              if (grandChildren.length > 0 && expandedEpics[child.id] !== false) {
                addChildren(grandChildren, currentDepth + 1);
              }
            });
          };
          addChildren(children, 1);
        }
      }
    });

    return list;
  }, [tasks, expandedEpics]);

  const [isDraggingToPan, setIsDraggingToPan] = useState(false);
  const dragPanStartRef = useRef({ x: 0, scrollLeft: 0 });
  const touchStartRef = useRef<{
    x1: number;
    y1: number;
    x2: number | null;
    y2: number | null;
    initialDist: number | null;
    initialPixelsPerDay: number;
    initialScrollLeft: number;
  } | null>(null);

  const timelineListRef = useRef<HTMLDivElement>(null);
  const timelineMainRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const timelineZoom = pixelsPerDay >= 45 ? "days" : pixelsPerDay >= 15 ? "weeks" : "months";

  // --- MOUSE HOVER/DRAG PANNING ---
  const handleDragPanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left mouse button (0)
    if (e.button !== 0) return;

    // Do not initiate drag pan if clicking on a task bar or resize handle or other interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest(".cursor-grab") ||
      target.closest(".cursor-ew-resize") ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input")
    ) {
      return;
    }

    setIsDraggingToPan(true);
    dragPanStartRef.current = {
      x: e.clientX,
      scrollLeft: timelineMainRef.current ? timelineMainRef.current.scrollLeft : 0,
    };
  };

  useEffect(() => {
    if (!isDraggingToPan) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (timelineMainRef.current) {
        const dx = e.clientX - dragPanStartRef.current.x;
        timelineMainRef.current.scrollLeft = dragPanStartRef.current.scrollLeft - dx;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingToPan(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingToPan]);

  // --- CONTROLS: WHEEL ZOOM AND TOUCH GESTURES (PAN & PINCH) ---
  useEffect(() => {
    const mainEl = timelineMainRef.current;
    if (!mainEl) return;

    // --- MOUSE WHEEL ZOOM ---
    const handleWheel = (e: WheelEvent) => {
      // Zoom on wheel ONLY when Ctrl key is pressed (standard trackpad pinch or Ctrl + mouse wheel)
      if (e.ctrlKey) {
        e.preventDefault();

        const rect = mainEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + mainEl.scrollLeft;
        const dayOffset = mouseX / pixelsPerDay;

        const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        let newPixelsPerDay = pixelsPerDay * zoomFactor;
        newPixelsPerDay = Math.max(4, Math.min(150, newPixelsPerDay));

        setPixelsPerDay(newPixelsPerDay);

        const newScrollLeft = dayOffset * newPixelsPerDay - (e.clientX - rect.left);
        mainEl.scrollLeft = newScrollLeft;
      }
    };

    // --- TOUCH PAN AND PINCH ZOOM ---
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x1: e.touches[0].clientX,
          y1: e.touches[0].clientY,
          x2: null,
          y2: null,
          initialDist: null,
          initialPixelsPerDay: pixelsPerDay,
          initialScrollLeft: mainEl.scrollLeft,
        };
      } else if (e.touches.length === 2) {
        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;
        const dist = Math.hypot(x2 - x1, y2 - y1);

        touchStartRef.current = {
          x1,
          y1,
          x2,
          y2,
          initialDist: dist,
          initialPixelsPerDay: pixelsPerDay,
          initialScrollLeft: mainEl.scrollLeft,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;

      if (e.touches.length === 1 && start.initialDist === null) {
        // Horizontal pan with single finger
        const dx = e.touches[0].clientX - start.x1;
        const dy = e.touches[0].clientY - start.y1;

        // Block page vertically-dominant scroll if horizontal dragging is clear
        if (Math.abs(dx) > Math.abs(dy)) {
          e.preventDefault();
          mainEl.scrollLeft = start.initialScrollLeft - dx;
        }
      } else if (e.touches.length === 2 && start.initialDist !== null) {
        // Pinch-to-zoom with two fingers
        e.preventDefault();
        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;
        const dist = Math.hypot(x2 - x1, y2 - y1);

        const zoomFactor = dist / start.initialDist;
        let newPixelsPerDay = start.initialPixelsPerDay * zoomFactor;
        newPixelsPerDay = Math.max(4, Math.min(150, newPixelsPerDay));

        // Center of user's fingers relative to viewport
        const rect = mainEl.getBoundingClientRect();
        const midX = (x1 + x2) / 2 - rect.left;
        const midXInContent = midX + start.initialScrollLeft;
        const dayOffset = midXInContent / start.initialPixelsPerDay;

        setPixelsPerDay(newPixelsPerDay);

        const newScrollLeft = dayOffset * newPixelsPerDay - midX;
        mainEl.scrollLeft = newScrollLeft;
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    mainEl.addEventListener("wheel", handleWheel, { passive: false });
    mainEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    mainEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    mainEl.addEventListener("touchend", handleTouchEnd);

    return () => {
      mainEl.removeEventListener("wheel", handleWheel);
      mainEl.removeEventListener("touchstart", handleTouchStart);
      mainEl.removeEventListener("touchmove", handleTouchMove);
      mainEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pixelsPerDay]);

  const handleTimelineVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (timelineListRef.current && target === timelineMainRef.current) {
      timelineListRef.current.scrollTop = target.scrollTop;
    } else if (timelineMainRef.current && target === timelineListRef.current) {
      timelineMainRef.current.scrollTop = target.scrollTop;
    }
  };

  const exportTimelineToPng = async () => {
    if (!timelineContainerRef.current) return;
    const toastId = toast.loading(t("toast.exportingPng"));
    try {
      const canvas = await html2canvas(timelineContainerRef.current, { scale: 2 });
      const link = document.createElement("a");
      link.download = `Roadmap_${selectedProject?.key || "Export"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(t("toast.pngExported"), { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(t("toast.pngExportFailed"), { id: toastId });
    }
  };

  const exportTimelineToPdf = async () => {
    await exportTimelinePdf({
      timelineContainer: timelineContainerRef.current,
      selectedProject,
      tasks,
      renderedRows,
    });
  };

  const getTimelineBounds = () => {
    let minDate = new Date("2099-12-31");
    let maxDate = new Date("2000-01-01");
    let hasDates = false;

    (tasks || []).forEach((task) => {
      if (task.startDate) {
        const start = ensureDate(task.startDate);
        if (start < minDate) minDate = start;
        hasDates = true;
      }
      if (task.endDate) {
        const end = ensureDate(task.endDate);
        if (end > maxDate) maxDate = end;
        hasDates = true;
      }
    });

    if (!hasDates) {
      minDate = startOfMonth(new Date());
      maxDate = endOfMonth(addDays(new Date(), 90));
    } else {
      minDate = startOfMonth(minDate);
      maxDate = endOfMonth(addDays(maxDate, 90));
    }

    const targetMin = new Date("2026-03-01");
    const targetMax = new Date("2026-05-31");
    if (minDate > targetMin) minDate = targetMin;
    if (maxDate < targetMax) maxDate = targetMax;

    minDate = startOfMonth(minDate);
    maxDate = endOfMonth(maxDate);

    if (minDate > maxDate) {
      maxDate = endOfMonth(addDays(minDate, 90));
    }

    const totalDays = differenceInDays(maxDate, minDate);
    const months = [];
    let current = startOfMonth(minDate);
    while (current <= maxDate) {
      months.push(current);
      current = addDays(endOfMonth(current), 1);
    }

    const weeks = [];
    let currentWeek = startOfWeek(minDate);
    while (currentWeek <= maxDate) {
      weeks.push(currentWeek);
      currentWeek = addDays(endOfWeek(currentWeek), 1);
    }

    const days = [];
    for (let i = 0; i <= totalDays; i++) {
      days.push(addDays(minDate, i));
    }

    const years = [];
    let currentYear = startOfYear(minDate);
    while (currentYear <= maxDate) {
      years.push(currentYear);
      currentYear = addDays(endOfYear(currentYear), 1);
    }

    return { minDate, maxDate, totalDays, months, weeks, days, years };
  };

  useEffect(() => {
    if (!timelineInteraction) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - timelineInteraction.startX;
      const daysDiff = Math.round(dx / pixelsPerDay);

      const newDates = { ...tempDates };
      const task = tasks.find((t) => t.id === timelineInteraction.taskId);
      if (!task) return;

      let newStart = timelineInteraction.initialStart;
      let newEnd = timelineInteraction.initialEnd;

      if (timelineInteraction.type === "move") {
        newStart = addDays(timelineInteraction.initialStart, daysDiff);
        newEnd = addDays(timelineInteraction.initialEnd, daysDiff);
      } else if (timelineInteraction.type === "resize-start") {
        newStart = addDays(timelineInteraction.initialStart, daysDiff);
        if (newStart > newEnd) newStart = newEnd;
      } else if (timelineInteraction.type === "resize-end") {
        newEnd = addDays(timelineInteraction.initialEnd, daysDiff);
        if (newEnd < newStart) newEnd = newStart;
      }

      newDates[task.id] = {
        startDate: format(newStart, "yyyy-MM-dd"),
        endDate: format(newEnd, "yyyy-MM-dd"),
      };
      setTempDates(newDates);
    };

    const handleMouseUp = async () => {
      const pending = tempDates[timelineInteraction.taskId];
      if (pending) {
        await updateTaskField(timelineInteraction.taskId, "dates", {
          startDate: pending.startDate,
          endDate: pending.endDate,
        });
      }
      setTimelineInteraction(null);
      setTempDates({});
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [timelineInteraction, tasks, tempDates, pixelsPerDay, updateTaskField]);

  const {
    minDate,
    totalDays,
    months: timelineMonths,
    days: timelineDays,
    weeks: timelineWeeks,
    years: timelineYears,
  } = getTimelineBounds();
  const today = new Date();
  let todayLeft = 0;
  if (today >= minDate) {
    todayLeft = (differenceInDays(today, minDate) / (totalDays || 1)) * 100;
  }

  const getEarliestTaskDate = () => {
    let earliest: Date | null = null;
    (tasks || []).forEach((task) => {
      if (task.startDate) {
        const d = ensureDate(task.startDate);
        if (!earliest || d < earliest) {
          earliest = d;
        }
      }
    });
    return earliest || new Date();
  };

  const scrollToDate = (targetDate: Date, behavior: ScrollBehavior = "smooth") => {
    if (!timelineMainRef.current) return;
    const daysFromStart = differenceInDays(targetDate, minDate);
    const scrollX = Math.max(0, daysFromStart * pixelsPerDay - 100);
    timelineMainRef.current.scrollTo({
      left: scrollX,
      behavior,
    });
  };

  const hasAutoScrolledRef = useRef(false);
  useEffect(() => {
    if (!hasAutoScrolledRef.current && tasks && tasks.length > 0) {
      const earliest = getEarliestTaskDate();
      setTimeout(() => {
        scrollToDate(earliest, "auto");
        hasAutoScrolledRef.current = true;
      }, 150);
    }
  }, [tasks, pixelsPerDay]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-muted p-4 md:p-5 gap-4 text-left">
      {/* Timeline Controls Header */}
      <div className="bg-surface px-5 py-3.5 rounded-md border border-border-subtle/80 shadow-2xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-content-strong tracking-tight">
              {t("roadmap.title")}
            </h2>
            <p className="text-xs font-medium text-content-muted mt-0.5">{t("roadmap.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-1.5 bg-surface-sunken/80 p-1 rounded-md border border-border-subtle/80">
            <button
              type="button"
              onClick={() => {
                const earliest = getEarliestTaskDate();
                scrollToDate(earliest, "smooth");
                toast.success(t("toast.focusFirstTask"));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-surface-muted text-content-body rounded-md text-xs font-medium shadow-2xs transition-all border border-border-subtle/80 cursor-pointer active:scale-95"
              title={t("roadmap.focusFirstTask")}
            >
              <Target className="w-3.5 h-3.5 text-primary" />
              <span>{t("roadmap.focusFirstTask")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                scrollToDate(new Date(), "smooth");
                toast.success(t("toast.jumpToToday"));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-surface-muted text-content-body rounded-md text-xs font-medium shadow-2xs transition-all border border-border-subtle/80 cursor-pointer active:scale-95"
              title={t("roadmap.jumpToday")}
            >
              <Calendar className="w-3.5 h-3.5 text-success-text" />
              <span>{t("roadmap.today")}</span>
            </button>
          </div>

          <div className="flex bg-surface rounded-md border border-border-subtle/80 p-1 shadow-2xs items-center gap-0.5">
            <button
              type="button"
              onClick={() => setPixelsPerDay((prev) => Math.max(4, prev - 4))}
              className="p-1.5 text-xs text-content-muted hover:text-content-strong hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
              title={t("roadmap.zoomOut")}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-surface-strong mx-1" />

            {(["days", "weeks", "months"] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => {
                  if (z === "days") setPixelsPerDay(60);
                  else if (z === "weeks") setPixelsPerDay(24);
                  else if (z === "months") setPixelsPerDay(8);
                }}
                className={`px-3 py-1 text-xs uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  timelineZoom === z
                    ? "bg-indigo-600 text-content-inverse font-semibold shadow-2xs"
                    : "text-content-muted hover:text-content-strong hover:bg-surface-sunken font-medium"
                }`}
              >
                {z}
              </button>
            ))}

            <div className="w-px h-4 bg-surface-strong mx-1" />
            <button
              type="button"
              onClick={() => setPixelsPerDay((prev) => Math.min(150, prev + 4))}
              className="p-1.5 text-xs text-content-muted hover:text-content-strong hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
              title={t("roadmap.zoomIn")}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              onBlur={() => setTimeout(() => setIsExportMenuOpen(false), 200)}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-content-inverse rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("roadmap.exportAs")}</span> <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-md border border-border-subtle/80 py-1.5 z-50">
                <button
                  onClick={exportTimelineToPdf}
                  className="w-full text-left px-3.5 py-2 hover:bg-surface-sunken text-xs font-medium text-content-body flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4 text-danger-text" />
                  <span>{t("roadmap.pdfDocument")}</span>
                </button>
                <button
                  onClick={exportTimelineToPng}
                  className="w-full text-left px-3.5 py-2 hover:bg-surface-sunken text-xs font-medium text-content-body flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-secondary" />
                  <span>{t("roadmap.pngImage")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex min-h-0">
        <div
          ref={timelineContainerRef}
          className="print-roadmap-container flex flex-1 w-full relative bg-surface rounded-lg border border-border-subtle/80 shadow-2xs overflow-hidden select-none"
        >
          <div className="w-64 md:w-80 shrink-0 border-r border-border-subtle/80 flex flex-col z-20 bg-surface relative">
            <div className="sticky top-0 z-30 h-[73px] bg-surface-sunken/90 backdrop-blur-sm border-b border-border-subtle px-5 flex items-center justify-between">
              <span className="font-normal text-xs sm:text-[11px] text-content-muted uppercase tracking-widest">
                {t("roadmap.itemHierarchy")}
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto no-scrollbar pb-10 pt-4 border-t border-border-subtle"
              ref={timelineListRef}
              onScroll={handleTimelineVerticalScroll}
            >
              <AnimatePresence initial={false}>
                {renderedRows.map(({ task, isChild, depth, isLastChild }, rowIdx) => {
                  const hasChildren = tasks.some((t) => t.parentId === task.id);
                  const expanded = expandedEpics[task.id] !== false;
                  const isEpic = (task.type || "").toLowerCase() === "epic";

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 56, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className={cn(
                        "h-14 flex items-center gap-2 border-b border-border-faint transition-colors relative z-10 overflow-hidden",
                        rowIdx % 2 === 1
                          ? "bg-surface-sunken/40 hover:bg-surface-sunken/80"
                          : "bg-surface hover:bg-surface-sunken/40",
                        isChild ? "pr-3" : "px-3"
                      )}
                      style={{
                        ...(isChild ? { paddingLeft: `${14 + depth * 20}px` } : {}),
                        willChange: "transform, opacity, height",
                      }}
                    >
                      {isChild && (
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none"
                          style={{ left: 0, width: `${14 + depth * 20}px` }}
                        >
                          {Array.from({ length: depth }).map((_, i) => {
                            const isCurrentDepth = i === depth - 1;
                            return (
                              <React.Fragment key={i}>
                                <div
                                  className={cn(
                                    "absolute top-0 w-[2px] bg-surface-strong/80",
                                    isCurrentDepth && isLastChild ? "h-7 rounded-bl-lg" : "h-full"
                                  )}
                                  style={{ left: `${14 + i * 20}px` }}
                                />
                                {isCurrentDepth && (
                                  <div
                                    className="absolute top-7 w-[20px] h-[2px] bg-surface-strong/80 rounded-tr-lg"
                                    style={{ left: `${14 + i * 20}px` }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}

                      {/* Spacer/Chevron for Tree Hierarchy */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleEpic(task.id)}
                          className="p-1 rounded hover:bg-surface-muted text-content-subtle hover:text-content-secondary transition-all shrink-0 active:scale-95 z-20 bg-inherit"
                        >
                          <ChevronRight
                            className={cn(
                              "w-3.5 h-3.5 transform transition-transform duration-200 ease-in-out",
                              expanded ? "rotate-90 " : "text-content-subtle"
                            )}
                          />
                        </button>
                      ) : (
                        // Spacer to align icons if there is no chevron trigger
                        <div className="w-[22px] shrink-0" />
                      )}

                      {/* Task type icon */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isEpic ? (
                          <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 shadow-soft border border-purple-500/30">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
                            <ListTodo className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-xs sm:text-[11px] truncate leading-tight tracking-tight select-none",
                            isChild
                              ? "font-medium text-content-secondary"
                              : "font-medium text-content"
                          )}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskForDetail(task);
                              setIsTaskDetailModalOpen(true);
                            }}
                            className="text-[9px] leading-none font-semibold text-primary bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/30 rounded px-1 py-0.5 tracking-tight text-left uppercase transition-colors shrink-0"
                          >
                            {task.key}
                          </button>
                          <span className="text-[9px] text-content-subtle font-bold px-0.5 shrink-0">
                            •
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-tight shrink-0",
                              task.status === "Done"
                                ? "text-emerald-600"
                                : task.status === "In Progress"
                                  ? "text-blue-600"
                                  : "text-content-muted"
                            )}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
          <div
            className={`flex-1 flex flex-col overflow-auto relative bg-surface ${isDraggingToPan ? "cursor-grabbing" : "cursor-grab"}`}
            ref={timelineMainRef}
            onScroll={handleTimelineVerticalScroll}
            onMouseDown={handleDragPanMouseDown}
          >
            <motion.div
              key={timelineZoom}
              initial={{ opacity: 0.3, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-w-max relative"
              style={{
                width: `${totalDays * pixelsPerDay}px`,
                minHeight: "100%",
                willChange: "transform, opacity",
              }}
            >
              <div className="sticky top-0 z-30 h-[73px] bg-surface-sunken/90 backdrop-blur-sm border-b border-border-subtle shadow-soft box-border flex flex-col">
                <div className="flex h-8 border-b border-border-subtle/50">
                  {timelineZoom !== "months"
                    ? timelineMonths.map((m: any) => {
                        const mStart = startOfMonth(m);
                        const actualStart = mStart < minDate ? minDate : mStart;
                        const mEnd = endOfMonth(m);
                        const expectedEnd =
                          mEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : mEnd;
                        const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                        return (
                          <div
                            key={m.toISOString()}
                            className="flex items-center px-2 py-1 border-r border-border-subtle/50"
                            style={{ width: `${actualDays * pixelsPerDay}px` }}
                          >
                            <span className="text-xs sm:text-[11px] font-normal text-content-secondary uppercase tracking-wider">
                              {format(m, "MMM yyyy")}
                            </span>
                          </div>
                        );
                      })
                    : timelineYears.map((y: any) => {
                        const yStart = startOfYear(y);
                        const actualStart = yStart < minDate ? minDate : yStart;
                        const yEnd = endOfYear(y);
                        const expectedEnd =
                          yEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : yEnd;
                        const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                        return (
                          <div
                            key={y.toISOString()}
                            className="flex items-center px-2 py-1 border-r border-border-subtle/50"
                            style={{ width: `${actualDays * pixelsPerDay}px` }}
                          >
                            <span className="text-xs sm:text-[11px] font-normal text-content-secondary uppercase tracking-wider">
                              {format(y, "yyyy")}
                            </span>
                          </div>
                        );
                      })}
                </div>
                <div className="flex h-10">
                  {timelineZoom === "days" &&
                    timelineDays.map((d: any, i: number) => (
                      <div
                        key={d.toISOString()}
                        className="flex items-center justify-center border-r border-border-subtle/50 shrink-0"
                        style={{ width: `${pixelsPerDay}px` }}
                      >
                        <span className="text-xs sm:text-[10px] font-normal text-content-subtle">
                          {format(d, "d")}
                        </span>
                      </div>
                    ))}
                  {timelineZoom === "weeks" &&
                    timelineWeeks.map((w: any, i: number) => {
                      const wStart = startOfWeek(w);
                      const actualStart = wStart < minDate ? minDate : wStart;
                      const wEnd = endOfWeek(w);
                      const expectedEnd =
                        wEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : wEnd;
                      const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                      return (
                        <div
                          key={w.toISOString()}
                          className="flex items-center justify-center border-r border-border-subtle/50 shrink-0"
                          style={{ width: `${actualDays * pixelsPerDay}px` }}
                        >
                          <span className="text-xs sm:text-[10px] font-normal text-content-subtle">
                            W{format(w, "w")}
                          </span>
                        </div>
                      );
                    })}
                  {timelineZoom === "months" &&
                    timelineMonths.map((m: any, i: number) => {
                      const mStart = startOfMonth(m);
                      const actualStart = mStart < minDate ? minDate : mStart;
                      const mEnd = endOfMonth(m);
                      const expectedEnd =
                        mEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : mEnd;
                      const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                      return (
                        <div
                          key={m.toISOString()}
                          className="flex items-center justify-center border-r border-border-subtle/50 shrink-0"
                          style={{ width: `${actualDays * pixelsPerDay}px` }}
                        >
                          <span className="text-xs sm:text-[10px] font-normal text-content-subtle">
                            {format(m, "MMM")}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none flex z-10 pt-[73px]">
                {timelineZoom === "days" &&
                  timelineDays.map((d: any, i: number) => (
                    <div
                      key={"grid-" + d.toISOString()}
                      className={`shrink-0 border-r ${d.getDay() === 0 || d.getDay() === 6 ? "bg-surface-muted/40 border-border-subtle/50" : "border-border-faint/50"}`}
                      style={{ width: `${pixelsPerDay}px` }}
                    />
                  ))}
                {timelineZoom === "weeks" &&
                  timelineWeeks.map((w: any, i: number) => {
                    const wStart = startOfWeek(w);
                    const actualStart = wStart < minDate ? minDate : wStart;
                    const wEnd = endOfWeek(w);
                    const expectedEnd =
                      wEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : wEnd;
                    const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                    return (
                      <div
                        key={"grid-" + w.toISOString()}
                        className="shrink-0 border-r border-border-faint/50"
                        style={{ width: `${actualDays * pixelsPerDay}px` }}
                      />
                    );
                  })}
                {timelineZoom === "months" &&
                  timelineMonths.map((m: any, i: number) => {
                    const mStart = startOfMonth(m);
                    const actualStart = mStart < minDate ? minDate : mStart;
                    const mEnd = endOfMonth(m);
                    const expectedEnd =
                      mEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : mEnd;
                    const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                    return (
                      <div
                        key={"grid-" + m.toISOString()}
                        className="shrink-0 border-r border-border-faint/50"
                        style={{ width: `${actualDays * pixelsPerDay}px` }}
                      />
                    );
                  })}
              </div>
              <div className="relative pt-4 z-20 pb-10 border-t border-border-subtle">
                <AnimatePresence initial={false}>
                  {renderedRows.map(({ task, isChild }) => {
                    const dates = tempDates[task.id] || {
                      startDate: task.startDate,
                      endDate: task.endDate,
                    };
                    if (!dates.startDate || !dates.endDate) {
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 56, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="h-14 relative border-b border-border-faint bg-transparent flex items-center group/row hover:bg-surface-sunken/50 transition-colors overflow-hidden"
                          style={{ willChange: "transform, opacity, height" }}
                        >
                          <motion.button
                            whileHover={{
                              scale: 1.04,
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                            }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            onClick={() => {
                              setSelectedTaskForDetail(task);
                              setIsTaskDetailModalOpen(true);
                            }}
                            className="absolute left-6 h-8 px-4 rounded-xl flex items-center bg-surface-sunken/60 border border-border-subtle border-dashed hover:border-indigo-400 hover:bg-surface group-hover/row:bg-surface text-xs sm:text-[10px] font-medium text-content-subtle hover:text-indigo-600 hover:shadow-soft transition-all cursor-pointer gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-surface-marker group-hover/row:bg-indigo-500 animate-pulse transition-colors" />
                            {t("roadmap.notPlotted")}
                          </motion.button>
                        </motion.div>
                      );
                    }
                    const start = ensureDate(dates.startDate);
                    const end = ensureDate(dates.endDate);
                    const left = (differenceInDays(start, minDate) / (totalDays || 1)) * 100;
                    const width = Math.max(
                      0.5,
                      ((differenceInDays(end, start) + 1) / (totalDays || 1)) * 100
                    );
                    const isEpic = (task.type || "").toLowerCase() === "epic";

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 56, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="h-14 relative border-b border-border-faint bg-transparent flex items-center group/row hover:bg-surface-sunken/50 transition-colors overflow-hidden"
                        style={{ willChange: "transform, opacity, height" }}
                      >
                        <motion.div
                          whileHover={{
                            scale: 1.02,
                            y: "-50%",
                            boxShadow:
                              "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                          }}
                          transition={
                            timelineInteraction?.taskId === task.id
                              ? { type: "tween", duration: 0 }
                              : { type: "spring", stiffness: 350, damping: 25 }
                          }
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-soft flex items-center border overflow-hidden",
                            getStatusColors(task.status, isEpic).bg,
                            getStatusColors(task.status, isEpic).border,
                            getStatusColors(task.status, isEpic).text,
                            getPriorityColor(task.priority),
                            !isEpic && "border-l-[3.5px]",
                            isEpic && "border-l-[3.5px]",
                            "group/bar",
                            timelineInteraction?.taskId === task.id
                              ? cn(
                                  "scale-[1.01] shadow-md z-30",
                                  getStatusColors(task.status, isEpic).activeBg
                                )
                              : "transition-all"
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            minWidth: "24px",
                            willChange: "transform, left, width",
                          }}
                        >
                          {/* Dynamic Floating Tooltip */}
                          <div
                            className={cn(
                              "absolute -top-12 left-1/2 -translate-x-1/2 bg-surface-inverse-strong border border-border-inverse text-content-inverse text-xs sm:text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 origin-bottom scale-90 opacity-0",
                              "group-hover/bar:opacity-100 group-hover/bar:scale-100",
                              timelineInteraction?.taskId === task.id
                                ? "opacity-100 scale-100 ring-2"
                                : ""
                            )}
                          >
                            <span
                              className={cn(
                                "font-medium",
                                getStatusColors(task.status, isEpic).tooltipText
                              )}
                            >
                              {format(start, "dd MMM yyyy")}
                            </span>
                            <span className="text-content-subtle">→</span>
                            <span
                              className={cn(
                                "font-medium",
                                getStatusColors(task.status, isEpic).tooltipText
                              )}
                            >
                              {format(end, "dd MMM yyyy")}
                            </span>
                            <span
                              className={cn(
                                "font-medium px-1.5 py-0.5 rounded text-xs sm:text-[11px] sm:text-[9px] ml-1",
                                getStatusColors(task.status, isEpic).tooltipBadge
                              )}
                            >
                              {t("rakit.daysCount", { count: differenceInDays(end, start) + 1 })}
                            </span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
                          </div>

                          {/* Visually Rich Left Resize Handle */}
                          <div
                            className={cn(
                              "absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-25",
                              "transition-colors",
                              getStatusColors(task.status, isEpic).handle
                            )}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setTimelineInteraction({
                                taskId: task.id,
                                type: "resize-start",
                                startX: e.clientX,
                                initialStart: start,
                                initialEnd: end,
                              });
                            }}
                            title={t("roadmap.dragLeft")}
                          >
                            <div
                              className={cn(
                                "w-[3px] h-3.5 border-l border-r rounded-full transition-colors shadow-soft",
                                getStatusColors(task.status, isEpic).handleBar
                              )}
                            />
                          </div>

                          {/* Drag and Move Row Area */}
                          <div
                            className="flex-1 h-full px-3 flex items-center justify-between min-w-0 cursor-grab active:cursor-grabbing overflow-hidden"
                            onMouseDown={(e) => {
                              // Only trigger move if clicked outside the resize handles
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              if (clickX > 12 && clickX < rect.width - 12) {
                                e.stopPropagation();
                                setTimelineInteraction({
                                  taskId: task.id,
                                  type: "move",
                                  startX: e.clientX,
                                  initialStart: start,
                                  initialEnd: end,
                                });
                              }
                            }}
                          >
                            <span
                              className={cn(
                                "text-xs sm:text-[10.5px] font-semibold truncate tracking-tight select-none pr-1",
                                getStatusColors(task.status, isEpic).text
                              )}
                            >
                              {task.title}
                            </span>
                            <div className="w-5 h-5 rounded-full bg-indigo-600/90 text-content-inverse font-bold text-[9px] flex items-center justify-center shrink-0 ml-1.5 shadow-xs uppercase">
                              {task.assigneeId ? task.assigneeId.slice(0, 2) : "AL"}
                            </div>
                          </div>

                          {/* Visually Rich Right Resize Handle */}
                          <div
                            className={cn(
                              "absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-25 rounded-r-lg",
                              "transition-colors",
                              getStatusColors(task.status, isEpic).handleR
                            )}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setTimelineInteraction({
                                taskId: task.id,
                                type: "resize-end",
                                startX: e.clientX,
                                initialStart: start,
                                initialEnd: end,
                              });
                            }}
                            title={t("roadmap.dragRight")}
                          >
                            <div
                              className={cn(
                                "w-[3px] h-3.5 border-l border-r rounded-full transition-colors shadow-soft",
                                getStatusColors(task.status, isEpic).handleBarR
                              )}
                            />
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {todayLeft >= 0 && todayLeft <= 100 && (
                <div
                  className="absolute top-0 bottom-0 z-20 border-l-2 border-danger border-dashed pointer-events-none"
                  style={{ left: `${todayLeft}%` }}
                >
                  <div className="bg-danger-surface text-content-inverse text-xs sm:text-[11px] sm:text-[9px] font-semibold px-2 py-0.5 rounded-md absolute top-1.5 -translate-x-1/2 shadow-soft flex items-center gap-1 z-30 tracking-wider">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-surface opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-surface"></span>
                    </span>
                    {t("roadmap.todayMarker")}
                  </div>
                  {/* Glowing pulsing indicator dot right below sticky header */}
                  <div className="absolute top-[73px] -translate-x-1/2 flex items-center justify-center w-4 h-4 z-30">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-danger/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-surface shadow-2xs"></span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
