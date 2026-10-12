import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { Task, Project, MasterData } from "../../types";
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
  Folder,
  Target,
  Calendar,
  Menu,
  X,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MilestonePanel } from "./MilestonePanel";
import {
  GANTT_ROW_PX,
  kumpulkanEdgeBlocks,
  pathSikuDep,
  tengahBaris,
} from "./ganttDependencyEdges";
import { can } from "../../lib/permissions";
import { gayaLabel, warnaDariMaster } from "../../lib/warnaLabel";
import { PageHeader } from "../../components/ui/PageHeader";
import { TugasScopeToggle } from "../../components/ui/TugasScopeToggle";
import { useLingkupTugas } from "../../hooks/useLingkupTugas";
import { indeksAnak, sumbuWaktu, susunBaris } from "./lib/hirarkiBaris";

interface TimelineProps {
  tasks: Task[];
  selectedProject: Project | null;
  updateTaskField: (taskId: string, field: string, value: any) => Promise<void>;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  currentUser?: any;
  /** #564 — warna status dibaca dari master data, sama seperti layar lain. */
  masterData?: MasterData[];
  /** #689 butir (f) — task yang permintaannya masih di jalan (lihat AppRoutes). */
  isUpdatingTask?: Record<string, boolean>;
}

/**
 * #698 — batang Gantt TIDAK lagi membawa peta warnanya sendiri. `SET_GANTT`
 * (enam set gradien keras: 60 kelas ungu/hijau yang memaksa hex MasterData
 * masuk ke salah satu rona, jadi "Sedang Berjalan" tercetak ungu apa pun warna
 * label aslinya) dan `getPriorityColor` (peta kata `p0`/`urgent`/`high` yang
 * dilarang AGENTS.md §3) dihapus. Warna batang sekarang datang dari `--lbr`
 * yang SAMA dengan chip di sebelahnya (#564), dilukis oleh `.gantt-bar` di
 * `src/index.css`; bentuk epik vs tugas dibedakan lewat `gantt-bar-epic`.
 */

/** #700 — tiga kolom tetap panel hierarki. Kepala DAN baris memakai objek yang
 *  sama, jadi label tidak bisa melenceng dari isinya. Kolom nama sisanya
 *  (`flex-1`) mengikuti lebar panel. Ketiganya `max-md:hidden`: laci hierarki di
 *  HP hanya 20 rem (#309) dan memuat empat kolom di sana akan memakan namanya
 *  sendiri. */
const KOLOM = {
  status: "w-24 shrink-0 max-md:hidden",
  prioritas: "w-20 shrink-0 max-md:hidden",
  tanggal: "w-28 shrink-0 max-md:hidden",
};
const LABEL_KEPALA =
  "font-normal text-[11px] sm:text-[11px] text-content-muted uppercase tracking-normal";

export const TimelinePanel: React.FC<TimelineProps> = ({
  tasks: tasksProp,
  selectedProject,
  updateTaskField,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  currentUser,
  masterData = [],
  isUpdatingTask = {},
}) => {
  const { t } = useTranslation();
  // #688 — satu titik saring sebelum baris Gantt disusun. Menyaring di penyusun
  // baris SAJA akan meninggalkan garis dependensi dan hitungan yang dihitung dari
  // array penuh.
  const { lingkup, setLingkup, saring } = useLingkupTugas(currentUser);
  const tasks = React.useMemo(() => saring(tasksProp), [tasksProp, saring]);
  const canWriteMilestone = can("C", "timeline", {
    user: currentUser,
    project: selectedProject,
  });
  const [pixelsPerDay, setPixelsPerDay] = useState<number>(24);
  const [milestoneExpanded, setMilestoneExpanded] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );
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

  // Daftar baris yang tampil, tersusun induk → anak → cucu.
  // #689 — penyusunnya pindah ke `lib/hirarkiBaris.ts`: `parentId -> anak`
  // dibangun SEKALI, bukan `filter` per induk + `some` per baris. Keluarannya
  // dikunci identik dengan algoritma lama oleh `hirarkiBaris-689.test.ts`.
  const renderedRows = React.useMemo(
    () => susunBaris(tasks, expandedEpics),
    [tasks, expandedEpics]
  );

  // #689 — pertanyaan "baris ini punya anak?" dulu `tasks.some(...)` per baris
  // per render (≈ n×n tiap frame, termasuk setiap langkah seretan tanggal).
  const indukDikenal = React.useMemo(() => new Set(indeksAnak(tasks).keys()), [tasks]);

  // #689 — `will-change` adalah HINT ke kompositor, bukan hiasan. Ditempel ke
  // SEMUA baris berarti browser menyiapkan layer untuk ratusan elemen yang tidak
  // pernah bergerak; yang benar-benar bergerak hanya baris yang sedang diseret.
  const sedangDiseret = (id: string) => timelineInteraction?.taskId === id;

  /* #700 B1 — tinggi baris tidak lagi dipaku ke `GANTT_ROW_PX`. Nama boleh
   * turun ke baris dua, tiga, dan seterusnya, jadi PANEL HIERARKI yang mengukur
   * dirinya sendiri dan lajur Gantt hanya MENGIKUTI angka hasil ukur itu.
   *
   * KENAPA HARUS DIUKUR, BUKAN DITETAPKAN. Kedua kolom adalah dua loop render
   * yang terpisah dan hanya berbagi satu angka. Begitu satu baris lebih tinggi
   * dari angka itu, seluruh baris di bawahnya bergeser — dan panah dependensi,
   * yang menghitung `y` dari indeks baris, menunjuk ke pekerjaan yang salah.
   * `GANTT_ROW_PX` tetap berlaku sebagai LANTAI (#608), bukan sebagai paku.
   *
   * jsdom tidak punya `ResizeObserver`. Tanpa penjagaan di bawah, seluruh test
   * panel akan melempar; dengan penjagaan itu, peta hasil ukur tetap kosong dan
   * kedua kolom sepakat di angka lantainya — perilaku lama, bukan perilaku rusak.
   */
  const [tinggiRow, setTinggiRow] = useState<Record<string, number>>({});
  const pengamatRow = useRef<ResizeObserver | null>(null);
  const elRow = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entri) => {
      setTinggiRow((lama) => {
        let berubah = false;
        const berikut = { ...lama };
        for (const e of entri) {
          const id = (e.target as HTMLElement).dataset.rowId;
          const t = (e.target as HTMLElement).offsetHeight;
          if (!id || !t) continue;
          if (berikut[id] !== t) {
            berikut[id] = t;
            berubah = true;
          }
        }
        return berubah ? berikut : lama;
      });
    });
    pengamatRow.current = ro;
    elRow.current.forEach((el) => ro.observe(el));
    return () => {
      ro.disconnect();
      pengamatRow.current = null;
    };
  }, []);

  // Ref callback dengan IDENTITAS TETAP. Fungsi baru tiap render membuat React
  // melepas lalu memasang pengukur di SETIAP baris pada SETIAP frame seretan
  // tanggal — jalur paling panas di layar ini (#521/#545/#689).
  const pasangRef = useRef(new Map<string, (el: HTMLDivElement | null) => void>());
  const ukurRow = (id: string) => {
    const tersimpan = pasangRef.current.get(id);
    if (tersimpan) return tersimpan;
    const pasang = (el: HTMLDivElement | null) => {
      if (el) {
        elRow.current.set(id, el);
        pengamatRow.current?.observe(el);
      } else {
        const lama = elRow.current.get(id);
        if (lama) pengamatRow.current?.unobserve(lama);
        elRow.current.delete(id);
        pasangRef.current.delete(id);
      }
    };
    pasangRef.current.set(id, pasang);
    return pasang;
  };

  const [isDraggingToPan, setIsDraggingToPan] = useState(false);
  /** #309 gelombang 2 — hierarki jadi laci di bawah md agar Gantt punya lebar penuh. */
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
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

  // #689 — sumbu waktu DIPEROLEH DARI DATA. Versi lama menarik paksa rentang ke
  // satu kuartal tetap yang tertulis di kode, sehingga semua proyek membuka
  // ruang kosong dan batangnya menyusut. Fungsi lama juga dipanggil SETIAP
  // render sambil membangun ulang array bulan, minggu, hari, dan tahunnya.
  const sumbu = React.useMemo(() => sumbuWaktu(tasks), [tasks]);
  const {
    minDate,
    totalDays,
    months: timelineMonths,
    days: timelineDays,
    weeks: timelineWeeks,
    years: timelineYears,
    punyaTanggal,
  } = sumbu;
  const today = new Date();
  let todayLeft = 0;
  if (today >= minDate) {
    todayLeft = (differenceInDays(today, minDate) / (totalDays || 1)) * 100;
  }

  /** #457 — geometri bar + edge blocks untuk overlay SVG */
  const ganttDepOverlay = React.useMemo(() => {
    const bars = renderedRows.map(({ task }) => {
      const dates = tempDates[task.id] || {
        startDate: task.startDate,
        endDate: task.endDate,
      };
      if (!dates.startDate || !dates.endDate) {
        return { left: 0, width: 0, hasDates: false as const };
      }
      const start = ensureDate(dates.startDate);
      const end = ensureDate(dates.endDate);
      const left = (differenceInDays(start, minDate) / (totalDays || 1)) * 100;
      const width = Math.max(0.5, ((differenceInDays(end, start) + 1) / (totalDays || 1)) * 100);
      return { left, width, hasDates: true as const };
    });
    const edges = kumpulkanEdgeBlocks(renderedRows, tasks || []).filter(
      (e) => bars[e.fromIndex]?.hasDates && bars[e.toIndex]?.hasDates
    );
    // #700 B1 — `y` sebuah baris bukan lagi `indeks × 40`: sejak tinggi bisa
    // berbeda per baris, posisinya adalah JUMLAH KUMULATIF tinggi baris di
    // atasnya ditambah setengah tingginya sendiri.
    // #700 B1 — `y` sebuah baris bukan lagi `indeks × 40`: sejak tinggi bisa
    // berbeda per baris, rumusnya pindah ke `tengahBaris()` dan bahan bakunya
    // adalah hasil ukur panel hierarki.
    const geo = tengahBaris(renderedRows.map(({ task }) => tinggiRow[task.id] ?? GANTT_ROW_PX));
    return { bars, edges, yTengah: geo.titik, heightPx: geo.total };
  }, [renderedRows, tasks, tempDates, minDate, totalDays, tinggiRow]);

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

  /**
   * #698 — menu Ekspor dulu ditutup lewat `onBlur` pada tombolnya plus
   * `setTimeout(200)`: item menu lebih dulu membuat tombol kehilangan fokus,
   * dan penundaan itulah yang membuat semuanya terasa benar — satu-satunya
   * jalan lain adalah menutup menu SEBELUM itemnya sempat terpakai. Sekarang
   * penutupan diikat ke klik di luar pembungkusnya dan ke Escape.
   */
  const exportWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isExportMenuOpen) return;
    const tutupBilaDiLuar = (e: PointerEvent) => {
      if (!exportWrapRef.current?.contains(e.target as Node)) setIsExportMenuOpen(false);
    };
    const tutupEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExportMenuOpen(false);
    };
    document.addEventListener("pointerdown", tutupBilaDiLuar);
    document.addEventListener("keydown", tutupEscape);
    return () => {
      document.removeEventListener("pointerdown", tutupBilaDiLuar);
      document.removeEventListener("keydown", tutupEscape);
    };
  }, [isExportMenuOpen]);

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
    <div className="flex-1 flex flex-col min-h-0 bg-surface-muted text-left">
      <PageHeader
        breadcrumbs={[
          { label: t("nav.roadmap", "Roadmap") },
          { label: t("roadmap.title"), current: true },
        ]}
        title={t("roadmap.title")}
        actions={
          <div className="flex items-center gap-2 md:gap-3 flex-wrap w-full md:w-auto">
            <TugasScopeToggle value={lingkup} onChange={setLingkup} />
            <div className="flex items-center gap-1 md:gap-1.5 bg-surface-sunken/80 p-1 rounded-md border border-border-subtle/80">
              <button
                type="button"
                onClick={() => {
                  const earliest = getEarliestTaskDate();
                  scrollToDate(earliest, "smooth");
                  toast.success(t("toast.focusFirstTask"));
                }}
                className="flex items-center gap-1.5 px-2 md:px-2.5 py-1 bg-surface hover:bg-surface-muted text-content-body rounded-md text-xs font-medium shadow-2xs transition-all border border-border-subtle/80 cursor-pointer active:scale-95"
                title={t("roadmap.focusFirstTask")}
              >
                <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="hidden sm:inline">{t("roadmap.focusFirstTask")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  scrollToDate(new Date(), "smooth");
                  toast.success(t("toast.jumpToToday"));
                }}
                className="flex items-center gap-1.5 px-2 md:px-2.5 py-1 bg-surface hover:bg-surface-muted text-content-body rounded-md text-xs font-medium shadow-2xs transition-all border border-border-subtle/80 cursor-pointer active:scale-95"
                title={t("roadmap.jumpToday")}
              >
                <Calendar className="w-3.5 h-3.5 text-success-text shrink-0" />
                <span className="hidden sm:inline">{t("roadmap.today")}</span>
              </button>
            </div>

            <div className="flex bg-surface rounded-md border border-border-subtle/80 p-1 shadow-2xs items-center gap-0.5">
              <button
                type="button"
                onClick={() => setPixelsPerDay((prev) => Math.max(4, prev - 4))}
                className="min-h-11 min-w-11 inline-flex items-center justify-center text-xs text-content-muted hover:text-content-strong hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                title={t("roadmap.zoomOut")}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-surface-strong mx-0.5 md:mx-1" />

              {(["days", "weeks", "months"] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => {
                    if (z === "days") setPixelsPerDay(60);
                    else if (z === "weeks") setPixelsPerDay(24);
                    else if (z === "months") setPixelsPerDay(8);
                  }}
                  className={`min-h-11 px-2.5 md:px-3 text-[10px] md:text-xs uppercase tracking-normal rounded-md transition-all cursor-pointer ${
                    timelineZoom === z
                      ? "bg-primary-surface text-content-inverse font-normal shadow-2xs"
                      : "text-content-muted hover:text-content-strong hover:bg-surface-sunken font-normal"
                  }`}
                >
                  {z === "days"
                    ? t("roadmap.zoomDays")
                    : z === "weeks"
                      ? t("roadmap.zoomWeeks")
                      : t("roadmap.zoomMonths")}
                </button>
              ))}

              <div className="w-px h-4 bg-surface-strong mx-0.5 md:mx-1" />
              <button
                type="button"
                onClick={() => setPixelsPerDay((prev) => Math.min(150, prev + 4))}
                className="min-h-11 min-w-11 inline-flex items-center justify-center text-xs text-content-muted hover:text-content-strong hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                title={t("roadmap.zoomIn")}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* #426 — Add Milestone sejajar toolbar */}
            {canWriteMilestone && (
              <button
                type="button"
                onClick={() => setMilestoneExpanded(true)}
                className="h-9 px-3 md:px-4 bg-success-surface hover:bg-success-hover text-content-inverse rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title={t("roadmap.milestoneAdd")}
              >
                <Flag className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("roadmap.milestoneAdd")}</span>
              </button>
            )}
            {/* #698 — Ekspor jadi tombol utama + pemisah menu: aksi yang paling
                sering dipakai (PDF) tidak lagi butuh dua klik, dan menunya
                tertutup karena klik di luar, bukan karena `setTimeout(200)`. */}
            <div
              ref={exportWrapRef}
              className="relative ml-auto md:ml-0 flex items-stretch rounded-lg shadow-xs"
            >
              <button
                type="button"
                onClick={exportTimelineToPdf}
                className="h-9 px-3 md:px-4 rounded-l-lg bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title={t("roadmap.pdfDocument")}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("roadmap.exportAs")}</span>
              </button>
              <span className="w-px bg-surface-inverse/25" aria-hidden />
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isExportMenuOpen}
                onClick={() => setIsExportMenuOpen((buka) => !buka)}
                className="h-9 px-2 rounded-r-lg bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse transition-all flex items-center justify-center cursor-pointer"
                title={t("roadmap.exportAs")}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isExportMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-md border border-border-subtle/80 py-1.5 z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      void exportTimelineToPdf();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-sunken text-xs font-medium text-content-body flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-danger-text" />
                    <span>{t("roadmap.pdfDocument")}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      void exportTimelineToPng();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-sunken text-xs font-medium text-content-body flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-secondary" />
                    <span>{t("roadmap.pngImage")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {selectedProject?.id && (
        <div className="px-2 md:px-5 pt-2">
          <MilestonePanel
            projectId={selectedProject.id}
            canWrite={canWriteMilestone}
            expanded={milestoneExpanded}
            onToggleExpanded={setMilestoneExpanded}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 gap-2 px-2 md:px-5 pt-3 pb-2 md:pb-5">
        {/* #689 — layar ini TIDAK punya pesan apa pun: proyek tanpa tugas, proyek
            yang tugasnya belum bertanggal, dan "My Tasks" yang kosong tampil
            identik — kanvas kosong tanpa penjelasan. */}
        {tasks.length === 0 || !punyaTanggal ? (
          <div className="shrink-0 rounded-lg border border-dashed border-border-subtle/80 bg-surface-muted/40 px-4 py-5 text-center">
            <p className="text-xs font-medium text-content-body">
              {tasks.length === 0
                ? lingkup === "mine"
                  ? t("roadmap.emptyMyTasks")
                  : t("roadmap.emptyProject")
                : t("roadmap.emptyDates")}
            </p>
          </div>
        ) : null}

        {/* #309 — pemicu hierarki di HP/tablet */}
        <button
          type="button"
          onClick={() => setHierarchyOpen(true)}
          className="md:hidden flex items-center gap-2 px-3 py-2 bg-surface border border-border-subtle/80 rounded-lg text-xs font-medium text-content-strong shadow-2xs cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4 text-primary shrink-0" />
          <span>{t("roadmap.itemHierarchy")}</span>
        </button>

        <div
          ref={timelineContainerRef}
          className="print-roadmap-container flex flex-1 w-full relative bg-surface rounded-lg border border-border-subtle/80 shadow-2xs overflow-hidden select-none min-h-0"
        >
          {hierarchyOpen && (
            <button
              type="button"
              aria-label={t("roadmap.closeHierarchy", "Tutup hierarki")}
              className="fixed inset-0 z-40 bg-overlay/50 md:hidden cursor-pointer"
              onClick={() => setHierarchyOpen(false)}
            />
          )}

          <div
            className={cn(
              // #700 — lebar panel jadi PASTI, bukan `w-max` lagi. Empat kolom
              // hanya bisa sejajar kalau lebarnya tidak ditentukan isi. B1
              // (12 Okt) mencabut konsekuensi yang dulu ditarik dari situ: judul
              // panjang TIDAK dipotong, ia turun ke baris dua dan barisnya yang
              // tumbuh — lihat `tinggiRow`. Batas bawah/atas (#566) dipertahankan
              // supaya satu judul 200 karakter tidak pernah memakan papan Gantt.
              "w-[34rem] min-w-[30rem] max-w-[min(52vw,40rem)] shrink-0 border-r border-border-subtle/80 flex flex-col z-20 bg-surface relative",
              "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[min(80vw,20rem)] max-md:shadow-xl max-md:border-y-0 max-md:border-l-0",
              "max-md:transition-transform max-md:duration-200",
              hierarchyOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
            )}
          >
            <div className="sticky top-0 z-30 h-[73px] bg-surface-sunken/90 backdrop-blur-sm border-b border-border-subtle px-3 flex items-center gap-2">
              <span className={cn(LABEL_KEPALA, "min-w-0 flex-1")}>
                {t("roadmap.itemHierarchy")}
              </span>
              <span className={cn(LABEL_KEPALA, KOLOM.status)}>{t("roadmap.colStatus")}</span>
              <span className={cn(LABEL_KEPALA, KOLOM.prioritas)}>{t("roadmap.colPriority")}</span>
              <span className={cn(LABEL_KEPALA, KOLOM.tanggal)}>{t("roadmap.colStartEnd")}</span>
              <button
                type="button"
                className="md:hidden absolute right-2 top-1.5 p-1.5 rounded-md text-content-muted hover:bg-surface-muted cursor-pointer"
                onClick={() => setHierarchyOpen(false)}
                aria-label={t("roadmap.closeHierarchy", "Tutup hierarki")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar pb-10 pt-4 border-t border-border-subtle"
              ref={timelineListRef}
              onScroll={handleTimelineVerticalScroll}
            >
              <AnimatePresence initial={false}>
                {renderedRows.map(({ task, isChild, depth, isLastChild }, rowIdx) => {
                  const hasChildren = indukDikenal.has(task.id);
                  const expanded = expandedEpics[task.id] !== false;
                  const isEpic = (task.type || "").toLowerCase() === "epic";
                  // #564 — label status DAN batang Gantt memakai hex yang sama:
                  // warna labelnya sendiri (master data, lalu tabel baku).
                  const hexStatus = warnaDariMaster(masterData, "status", task.status);
                  const hexPrioritas = warnaDariMaster(masterData, "priority", task.priority);
                  // #700 — kolom "Start – End" membaca tanggal yang SAMA dengan
                  // batang Gantt, termasuk `tempDates` ketika tanggal sedang
                  // diseret, supaya angka di kolom dan posisi batang tidak pernah
                  // berbeda cerita.
                  const rentangTampil = tempDates[task.id] || {
                    startDate: task.startDate,
                    endDate: task.endDate,
                  };
                  const mulaiTampil = rentangTampil.startDate
                    ? format(ensureDate(rentangTampil.startDate), "d MMM")
                    : "";
                  const akhirTampil = rentangTampil.endDate
                    ? format(ensureDate(rentangTampil.endDate), "d MMM")
                    : "";
                  const teksTanggal =
                    mulaiTampil && akhirTampil ? `${mulaiTampil} – ${akhirTampil}` : "—";
                  // #700 B1 — lantai 40 px (#608) tetap; yang di atas itu adalah
                  // hasil ukur baris ini sendiri, dan lajur Gantt membacanya.
                  const tinggi = tinggiRow[task.id] ?? GANTT_ROW_PX;

                  return (
                    <motion.div
                      key={task.id}
                      ref={ukurRow(task.id)}
                      data-row-id={task.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className={cn(
                        // #700 — `w-full`, bukan `w-max`: barisnya harus selebar
                        // panel supaya tiga kolom kanannya duduk di tempat yang
                        // sama pada setiap kedalaman. Indensi anak pindah ke
                        // kolom pertama (lihat di bawah), garis penghubungnya
                        // tetap milik baris.
                        "w-full flex items-center gap-2 border-b border-border-faint transition-colors relative z-10 overflow-hidden",
                        rowIdx % 2 === 1
                          ? "bg-surface-sunken/40 hover:bg-surface-sunken/80"
                          : "bg-surface hover:bg-surface-sunken/40",
                        isChild ? "pr-3" : "px-3"
                      )}
                      style={{
                        minHeight: GANTT_ROW_PX,
                        ...(sedangDiseret(task.id)
                          ? { willChange: "transform, opacity, height" }
                          : undefined),
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
                                    isCurrentDepth && isLastChild && "rounded-bl-lg"
                                  )}
                                  style={{
                                    left: `${14 + i * 20}px`,
                                    // Garis vertikal anak terakhir berhenti di tengah baris.
                                    height: isCurrentDepth && isLastChild ? tinggi / 2 : "100%",
                                  }}
                                />
                                {isCurrentDepth && (
                                  <div
                                    className="absolute w-[20px] h-[2px] bg-surface-strong/80 rounded-tr-lg"
                                    style={{ left: `${14 + i * 20}px`, top: tinggi / 2 - 1 }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}

                      {/* #700 — KOLOM 1: nama. Indensi anak hidup di sini, bukan
                          di barisnya, supaya tiga kolom kanan tetap sejajar pada
                          setiap kedalaman. Ikonnya jenis baris (folder = epik,
                          dokumen = tugas) dan pindah ke kolom ini; chip status
                          tinggal chip. Kode tugas tetap tidak ditampilkan (#562). */}
                      <div
                        className="flex items-center gap-2 min-w-0 flex-1"
                        style={isChild ? { paddingLeft: `${14 + depth * 20}px` } : undefined}
                      >
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
                          <div className="w-[22px] shrink-0" />
                        )}
                        {isEpic ? (
                          <Folder className="w-4 h-4 shrink-0 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 shrink-0 text-content-subtle" />
                        )}
                        {/* #700 B1 — nama TIDAK dipotong lagi. Pemilik proyek,
                            12 Okt: "tidak boleh ada yang kepotong ... kalau
                            panjang di buat ke bawah nya aja". Yang panjang jadi
                            dua baris atau lebih, dan barisnya yang tumbuh —
                            lihat `tinggiRow` di atas. `truncate` + `title=`
                            versionya sudah dicabut di sini. */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskForDetail(task);
                            setIsTaskDetailModalOpen(true);
                          }}
                          className={cn(
                            "min-w-0 flex-1 break-words text-left text-xs sm:text-[11px] font-medium leading-tight tracking-tight select-none hover:text-content-strong",
                            isChild ? "text-content-secondary" : "text-content"
                          )}
                        >
                          {task.title}
                        </button>
                      </div>

                      {/* KOLOM 2 dan 3: labelnya tetap `label-chip` + `--lbr`,
                          jadi warnanya masih dari MasterData (#564). */}
                      <span className={cn(KOLOM.status, "flex items-center")}>
                        <span
                          style={gayaLabel(hexStatus)}
                          className="label-chip shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-tight"
                        >
                          {task.status}
                        </span>
                      </span>
                      <span className={cn(KOLOM.prioritas, "flex items-center")}>
                        {!!task.priority && (
                          <span
                            style={gayaLabel(hexPrioritas)}
                            className="label-chip shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-tight"
                          >
                            {task.priority}
                          </span>
                        )}
                      </span>

                      {/* KOLOM 4: rentang tanggal, sebelumnya hanya ada di
                          tooltip batang. */}
                      <span
                        className={cn(
                          KOLOM.tanggal,
                          "text-[11px] leading-tight text-content-muted whitespace-nowrap"
                        )}
                      >
                        {teksTanggal}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
          <div
            className={`flex-1 flex flex-col overflow-auto relative bg-surface min-w-0 touch-pan-x ${isDraggingToPan ? "cursor-grabbing" : "cursor-grab"}`}
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
                ...(timelineInteraction || isDraggingToPan
                  ? { willChange: "transform, opacity" }
                  : {}),
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
                            <span className="text-xs sm:text-[11px] font-normal text-content-secondary uppercase tracking-normal">
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
                            <span className="text-xs sm:text-[11px] font-normal text-content-secondary uppercase tracking-normal">
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
                          className="flex flex-col items-center justify-center gap-0 border-r border-border-subtle/50 shrink-0"
                          style={{ width: `${actualDays * pixelsPerDay}px` }}
                        >
                          <span className="text-xs sm:text-[10px] font-normal text-content-secondary leading-tight">
                            W{format(w, "w")}
                          </span>
                          {/* #698 — nomor minggu saja tidak cukup dibaca: tanpa
                              rentang tanggalnya, "W38" menuntut pengguna menghitung
                              sendiri. Tanggal yang dicetak adalah yang TERLIHAT
                              (`actualStart`/`expectedEnd`), bukan minggu penuh di
                              luar sumbu. */}
                          <span className="text-[9px] font-normal text-content-subtle leading-tight whitespace-nowrap">
                            {format(actualStart, "d MMM")} – {format(expectedEnd, "d MMM")}
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
                          data-row-id={task.id}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: tinggiRow[task.id] ?? GANTT_ROW_PX, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="relative border-b border-border-faint bg-transparent flex items-center group/row hover:bg-surface-sunken/50 transition-colors overflow-hidden"
                          style={
                            sedangDiseret(task.id)
                              ? { willChange: "transform, opacity, height" }
                              : undefined
                          }
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
                            className="absolute left-6 h-6 px-4 rounded-xl flex items-center bg-surface-sunken/60 border border-border-subtle border-dashed hover:border-primary hover:bg-surface group-hover/row:bg-surface text-xs sm:text-[10px] font-medium text-content-subtle hover:text-primary hover:shadow-soft transition-all cursor-pointer gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-surface-marker group-hover/row:bg-primary/100 animate-pulse transition-colors" />
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
                    const hexStatus = warnaDariMaster(masterData, "status", task.status);

                    return (
                      <motion.div
                        key={task.id}
                        data-row-id={task.id}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: tinggiRow[task.id] ?? GANTT_ROW_PX, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="relative border-b border-border-faint bg-transparent flex items-center group/row hover:bg-surface-sunken/50 transition-colors overflow-hidden"
                        style={
                          sedangDiseret(task.id)
                            ? { willChange: "transform, opacity, height" }
                            : undefined
                        }
                      >
                        {/* #689 butir (f) — geser tanggal bersifat optimistik:
                            barisnya pindah SEBELUM server menjawab. Tanpa penanda
                            ini, permintaan yang masih di jalan (atau yang sedang
                            diantre jaringan) tampak seperti sudah tersimpan. */}
                        {isUpdatingTask[task.id] && (
                          <span
                            data-testid={`roadmap-menyimpan-${task.id}`}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 inline-flex items-center px-1.5 py-0.5 rounded border border-border-subtle bg-surface text-[10px] font-medium text-content-muted"
                          >
                            {t("roadmap.savingDates")}
                          </span>
                        )}
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
                            // #698 — warna batang datang dari `--lbr` (hex label
                            // dari master data) lewat `.gantt-bar`, bukan dari
                            // enam set gradien. Epik lebih pucat dan ramping
                            // karena ia RENTANG, bukan satu pekerjaan; ujungnya
                            // yang menandai batas awal–akhir.
                            //
                            // Bentuk epik dan bentuk tugas ditulis SALING
                            // EKSKLUSIF, bukan ditumpuk: `cn()` di repo ini
                            // hanyalah gabung spasi (src/lib/utils.ts:4), jadi
                            // `h-6` + `h-4` dimenangkan urutan stylesheet, bukan
                            // oleh niat penulisnya — pelajaran #692.
                            "gantt-bar absolute top-1/2 -translate-y-1/2 flex items-center border overflow-hidden shadow-soft",
                            // Awalan `h-4` bukan gaya: pemindai #602 mengenali
                            // sebuah string sebagai kelas dari token pertamanya.
                            isEpic ? "h-4 rounded-md gantt-bar-epic" : "h-6 rounded-lg",
                            "group/bar",
                            timelineInteraction?.taskId === task.id && "gantt-bar-aktif",
                            timelineInteraction?.taskId === task.id
                              ? "scale-[1.01] shadow-md z-30"
                              : "transition-all"
                          )}
                          style={{
                            ...gayaLabel(hexStatus),
                            left: `${left}%`,
                            width: `${width}%`,
                            minWidth: "24px",
                            ...(sedangDiseret(task.id)
                              ? { willChange: "transform, left, width" }
                              : {}),
                          }}
                        >
                          {isEpic && (
                            <>
                              <div className="gantt-bar-ujung pointer-events-none absolute left-0 top-0 bottom-0 w-[3px]" />
                              <div className="gantt-bar-ujung pointer-events-none absolute right-0 top-0 bottom-0 w-[3px]" />
                            </>
                          )}
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
                            {/* #698 — tanggal di dalam tooltip tidak lagi ikut
                                rona status: latar tooltip sudah `surface-inverse-strong`,
                                jadi teksnya cukup `content-inverse`. */}
                            <span className="font-medium">{format(start, "dd MMM yyyy")}</span>
                            <span className="text-content-inverse-muted">→</span>
                            <span className="font-medium">{format(end, "dd MMM yyyy")}</span>
                            <span className="font-medium px-1.5 py-0.5 rounded text-xs sm:text-[11px] sm:text-[9px] ml-1 bg-surface-inverse/60 text-content-inverse">
                              {t("rakit.daysCount", { count: differenceInDays(end, start) + 1 })}
                            </span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-surface-inverse-strong" />
                          </div>

                          {/* Visually Rich Left Resize Handle */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-25 transition-colors hover:bg-surface-strong/10 active:bg-surface-strong/25 group/l-handle"
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
                            <div className="gantt-bar-ujung w-[3px] h-3.5 rounded-full transition-colors shadow-soft group-hover/l-handle:opacity-80" />
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
                            <span className="text-xs sm:text-[10.5px] font-semibold truncate tracking-tight select-none">
                              {task.title}
                            </span>
                            {/* #698 — cakram inisial penerima dibuang. Ia mencetak
                                dua karakter PERDANA `assigneeId` (bukan nama), dan
                                "AL" yang tampil di semua batang tanpa penerima itu
                                string keras di JSX. Nama penerima sudah terbaca di
                                detail tugas; batang yang bersih lebih berguna. */}
                          </div>

                          {/* Visually Rich Right Resize Handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-25 rounded-r-lg transition-colors hover:bg-surface-strong/10 active:bg-surface-strong/25 group/r-handle"
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
                            <div className="gantt-bar-ujung w-[3px] h-3.5 rounded-full transition-colors shadow-soft group-hover/r-handle:opacity-80" />
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {/* #457 — garis dependency blocks (iris tipis, bukan CPM) */}
                {ganttDepOverlay.edges.length > 0 && ganttDepOverlay.heightPx > 0 && (
                  <svg
                    className="absolute left-0 right-0 top-4 pointer-events-none z-[25] overflow-visible"
                    style={{ height: ganttDepOverlay.heightPx }}
                    viewBox={`0 0 100 ${ganttDepOverlay.heightPx}`}
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <defs>
                      <marker
                        id="gantt-dep-arrow-457"
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-primary)" />
                      </marker>
                    </defs>
                    {ganttDepOverlay.edges.map((edge) => {
                      const from = ganttDepOverlay.bars[edge.fromIndex];
                      const to = ganttDepOverlay.bars[edge.toIndex];
                      if (!from?.hasDates || !to?.hasDates) return null;
                      const x1 = from.left + from.width;
                      const x2 = to.left;
                      const y1 = ganttDepOverlay.yTengah[edge.fromIndex];
                      const y2 = ganttDepOverlay.yTengah[edge.toIndex];
                      return (
                        <path
                          key={edge.id}
                          d={pathSikuDep(x1, y1, x2, y2)}
                          fill="none"
                          stroke="var(--color-primary)"
                          strokeWidth={1.25}
                          strokeOpacity={0.55}
                          vectorEffect="non-scaling-stroke"
                          markerEnd="url(#gantt-dep-arrow-457)"
                        />
                      );
                    })}
                  </svg>
                )}
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
