import { useTranslation } from "react-i18next";
import { safeLocalStorage } from "../../lib/safeStorage";
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import {
  CheckCircle2,
  Activity,
  Zap,
  PackageOpen,
  Clock,
  TrendingUp,
  LayoutGrid,
  PieChartIcon,
  Users,
  ArrowUpRight,
  Minus,
  AlertTriangle,
  ShieldAlert,
  Target,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import { DashboardViewProps } from "./types";
import { useDashboard, COLORS } from "./hooks";
import { styles } from "./styles";
import { ensureDate } from "../../lib/utils";
import { cn } from "../../lib/utils";
import { fetchMeetings, fetchDocuments } from "./services/dashboard.service";
import { SidebarWidgetsStack } from "./components/SidebarWidgetsStack";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { StyledDropdown } from "../../components/ui/CommonComponents";

const defaultChartOrder = [
  "status-distribution",
  "priority-distribution",
  "user-workload-analytics",
  "team-workload-analytics",
  "tasks-per-user-list",
  "tasks-by-category",
  "sprint-velocity-history",
];

export function DashboardView(props: DashboardViewProps) {
  const { t } = useTranslation();
  const {
    tasks,
    nonEpicTasks,
    dueSoonTasks,
    overdueTasks,
    completedTasks,
    inProgressTasks,
    totalTasks,
    completionPercentage,
    activeSprint,
    sprintProgress,
    sprintTotalTasks,
    sprintCompletedTasks,
    sprintDaysLeft,
    blockedTasks,
    priorityData,
    statusData,
    categoryData,
    workloadData,
    teamWorkloadData,
    sprintWorkloadData,
    burndownData,
    last7DaysData,
    weeklyVelocity,
    velocityData,
    estimationAccuracyData,
    estimationStats,
  } = useDashboard(props);

  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>("ALL");

  const filteredTasks = useMemo(() => {
    if (selectedSprintFilter === "ALL") return tasks;
    return tasks.filter((t) => String(t.sprintId || "") === selectedSprintFilter);
  }, [tasks, selectedSprintFilter]);

  // 1. KODE REFACTOR AGREGASI DATA (REACT / HELPER FUNCTION)
  const myPersonalMetrics = useMemo(() => {
    const currentUser = props.currentUser;
    if (!currentUser) {
      return {
        myTasks: [],
        myTodayTasks: [],
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionPercentage: 0,
        statusData: [],
      };
    }

    const currentUserId = currentUser.uid || currentUser.id;
    const currentUserEmail = currentUser.email;

    // Filter STRICT ASSIGNEE
    const myTasks = tasks.filter((t) => {
      // Handle array or single string for assigneeId if needed, but usually string
      const isAssignee = t.assigneeId === currentUserId || t.assigneeEmail === currentUserEmail;

      // Exclude Parent tasks (Epic/Story) if they are not explicitly assigned to this user
      // Assuming tasks have a type/issueType property or we rely strictly on assignee
      return isAssignee;
    });

    const now = new Date();

    // Total Denominator
    const total = myTasks.length;

    // Task categories
    const completedTasks = myTasks.filter(
      (t) => t.status?.toLowerCase() === "done" || t.status?.toLowerCase() === "selesai"
    );
    const completed = completedTasks.length;

    const inProgressTasks = myTasks.filter(
      (t) => !["done", "selesai", "backlog"].includes(t.status?.toLowerCase() || "")
    );
    const inProgress = inProgressTasks.length;

    const overdueTasks = myTasks.filter(
      (t) =>
        !["done", "selesai"].includes(t.status?.toLowerCase() || "") &&
        t.endDate &&
        ensureDate(t.endDate).getTime() < now.getTime()
    );
    const overdue = overdueTasks.length;

    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Today's task logic
    const myTodayTasks = myTasks.filter((t) => {
      let isDueToday = false;
      if (t.dueDate || t.endDate) {
        const dateToUse = t.dueDate ? ensureDate(t.dueDate) : ensureDate(t.endDate!);
        isDueToday = isSameDay(dateToUse, now);
      }
      const isActive = !["done", "archive", "closed", "canceled", "selesai"].includes(
        t.status?.toLowerCase() || ""
      );
      return isDueToday || isActive;
    });

    const statusMap: Record<string, number> = {};
    myTodayTasks.forEach((t) => {
      const s = t.status || "To Do";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const todayTotal = myTodayTasks.length;

    const statusData = Object.entries(statusMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        current_count: count,
        total_count: todayTotal,
        color_code: COLORS[i % COLORS.length],
      }));

    return {
      myTasks,
      myTodayTasks,
      total,
      completed,
      inProgress,
      overdue,
      completionPercentage,
      statusData,
    };
  }, [tasks, props.currentUser]);

  const formattedStatusData = myPersonalMetrics.statusData;

  const [revenueFilter, setRevenueFilter] = useState<"ALL" | "1M" | "6M" | "1Y">("ALL");
  const [productSort, setProductSort] = useState<string>("Today");

  const {
    selectedProject,
    setCurrentView,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    projectMembers,
    activityLogs,
    userRole,
    currentUser,
  } = props;

  const cardStyleClass = (id: string) => {
    const isStacked = [
      "sdlc",
      "sprint-banner",
      "sprint-user-tasks",
      "velocity-bar",
      "velocity-line",
      "sidebar-widgets-stack",
    ].includes(id);
    const heightClass = isStacked ? "h-auto" : "h-full";

    if (id === "sdlc") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg transition-all duration-300 relative w-full bg-surface-inverse-strong border border-border-inverse text-content-inverse shadow-2xl pb-8 overflow-y-auto no-scrollbar"
      );
    }
    if (id === "sidebar-widgets-stack") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg bg-surface border border-border-subtle text-content-strong shadow-soft p-6 transition-all duration-300 relative overflow-hidden"
      );
    }
    if (id === "sprint-banner") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg transition-all duration-300 relative bg-transparent overflow-hidden"
      );
    }
    if (id === "velocity-bar" || id === "velocity-line") {
      return cn(
        heightClass,
        "flex flex-col rounded-lg bg-surface-inverse-strong border border-border-inverse text-content-inverse shadow-xl p-5 hover:border-border-inverse transition-all duration-300 relative overflow-hidden"
      );
    }
    return cn(
      heightClass,
      "flex flex-col rounded-lg transition-all duration-300 relative border border-border-subtle bg-surface text-content-strong shadow-soft p-6 overflow-hidden"
    );
  };

  const myActiveTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(
      (t) =>
        t.assigneeId === currentUser.uid &&
        !["done", "archive", "closed", "canceled"].includes(t.status?.toLowerCase() || "")
    );
  }, [tasks, currentUser]);

  const sprintFilterOptions = useMemo(() => {
    const allOption = {
      id: "ALL",
      label: t("dashboard.allSprints", { count: tasks.length }),
      icon: "Layers",
      color: "#6366F1",
    };
    const list = props.sprints.map((s) => ({
      id: s.id,
      label: s.name,
      icon:
        s.status === "active" ? "Flame" : s.status === "completed" ? "CheckCircle2" : "Calendar",
      color: s.status === "active" ? "#F97316" : s.status === "completed" ? "#10B981" : "#3B82F6",
    }));
    return [allOption, ...list];
  }, [props.sprints, tasks.length, t]);

  const [meetings, setMeetings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [waterfallGates, setWaterfallGates] = useState<
    Record<string, { approved: boolean; approvedBy: boolean | string; approvedAt: string }>
  >(() => {
    try {
      const saved = safeLocalStorage.getItem(`waterfall_gates_${selectedProject?.id || "default"}`);
      return saved
        ? JSON.parse(saved)
        : {
            requirements: { approved: false, approvedBy: "", approvedAt: "" },
            design: { approved: false, approvedBy: "", approvedAt: "" },
            coding: { approved: false, approvedBy: "", approvedAt: "" },
            sit: { approved: false, approvedBy: "", approvedAt: "" },
            uat: { approved: false, approvedBy: "", approvedAt: "" },
            golive: { approved: false, approvedBy: "", approvedAt: "" },
          };
    } catch {
      return {
        requirements: { approved: false, approvedBy: "", approvedAt: "" },
        design: { approved: false, approvedBy: "", approvedAt: "" },
        coding: { approved: false, approvedBy: "", approvedAt: "" },
        sit: { approved: false, approvedBy: "", approvedAt: "" },
        uat: { approved: false, approvedBy: "", approvedAt: "" },
        golive: { approved: false, approvedBy: "", approvedAt: "" },
      };
    }
  });

  const [activeWaterfallTab, setActiveWaterfallTab] = useState<string>("requirements");

  const waterfallPhaseTaskCounts = useMemo(() => {
    const phases = {
      requirements: { total: 0, done: 0 },
      design: { total: 0, done: 0 },
      coding: { total: 0, done: 0 },
      sit: { total: 0, done: 0 },
      uat: { total: 0, done: 0 },
      golive: { total: 0, done: 0 },
    };

    tasks.forEach((t) => {
      const cat = (t.category || "").toLowerCase();
      const status = (t.status || "").toLowerCase();
      const isDone = status === "done" || status === "closed";

      if (
        cat.includes("req") ||
        cat.includes("analis") ||
        cat.includes("kebutuhan") ||
        cat.includes("initiation")
      ) {
        phases.requirements.total++;
        if (isDone) phases.requirements.done++;
      } else if (
        cat.includes("design") ||
        cat.includes("desain") ||
        cat.includes("arsitektur") ||
        cat.includes("architecture")
      ) {
        phases.design.total++;
        if (isDone) phases.design.done++;
      } else if (
        cat.includes("code") ||
        cat.includes("dev") ||
        cat.includes("pengembangan") ||
        cat.includes("rekayasa")
      ) {
        phases.coding.total++;
        if (isDone) phases.coding.done++;
      } else if (
        cat.includes("sit") ||
        cat.includes("integras") ||
        cat.includes("system test") ||
        cat.includes("interoperab")
      ) {
        phases.sit.total++;
        if (isDone) phases.sit.done++;
      } else if (
        cat.includes("uat") ||
        cat.includes("acceptance") ||
        cat.includes("pengujian") ||
        cat.includes("user test")
      ) {
        phases.uat.total++;
        if (isDone) phases.uat.done++;
      } else if (
        cat.includes("deploy") ||
        cat.includes("live") ||
        cat.includes("implementas") ||
        cat.includes("release")
      ) {
        phases.golive.total++;
        if (isDone) phases.golive.done++;
      }
    });

    return phases;
  }, [tasks]);

  useEffect(() => {
    if (!selectedProject) return;
    try {
      const saved = safeLocalStorage.getItem(`waterfall_gates_${selectedProject.id}`);
      if (saved) {
        setWaterfallGates(JSON.parse(saved));
      } else {
        setWaterfallGates({
          requirements: { approved: false, approvedBy: "", approvedAt: "" },
          design: { approved: false, approvedBy: "", approvedAt: "" },
          coding: { approved: false, approvedBy: "", approvedAt: "" },
          sit: { approved: false, approvedBy: "", approvedAt: "" },
          uat: { approved: false, approvedBy: "", approvedAt: "" },
          golive: { approved: false, approvedBy: "", approvedAt: "" },
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedProject]);

  const handleToggleGate = (gateId: string) => {
    if (!selectedProject) return;
    const isAuthorized = userRole === "admin" || userRole === "manager" || userRole === "head";
    if (!isAuthorized) {
      toast.error(t("toast.gateApprovalDenied"));
      return;
    }

    const currentApproved = waterfallGates[gateId]?.approved;
    const updated = {
      ...waterfallGates,
      [gateId]: {
        approved: !currentApproved,
        approvedBy: !currentApproved
          ? currentUser?.displayName || currentUser?.username || "User Auth"
          : "",
        approvedAt: !currentApproved ? format(new Date(), "yyyy-MM-dd HH:mm") : "",
      },
    };

    setWaterfallGates(updated);
    safeLocalStorage.setItem(`waterfall_gates_${selectedProject.id}`, JSON.stringify(updated));
  };

  useEffect(() => {
    if (!selectedProject) return;
    const effectiveUserId = currentUser?.uid || "guest";

    fetchMeetings(selectedProject.id, effectiveUserId)
      .then((data) => {
        if (data.status === "success") {
          setMeetings(data.data.slice(0, 3));
        }
      })
      .catch(console.error);

    fetchDocuments(selectedProject.id, effectiveUserId)
      .then((data) => {
        if (data.status === "success") {
          setDocuments(data.data.slice(0, 3));
        }
      })
      .catch(console.error);
  }, [selectedProject, currentUser]);

  const taskTypeBreakdown = useMemo(() => {
    const scopeTasks = filteredTasks;
    const counts: Record<string, number> = {
      epic: 0,
      story: 0,
      task: 0,
      bug: 0,
      subtask: 0,
    };
    scopeTasks.forEach((t) => {
      const type = (t.type || "task").toLowerCase();
      if (counts[type] !== undefined) counts[type]++;
      else counts["task"]++;
    });

    const totalScopeCount = Object.values(counts).reduce((a, b) => a + b, 0);

    return [
      {
        name: "Epic",
        value: counts.epic || 0,
        color: "#8b5cf6",
        pct: totalScopeCount ? Math.round(((counts.epic || 0) / totalScopeCount) * 100) : 0,
      },
      {
        name: "Story",
        value: counts.story || 0,
        color: "#10b981",
        pct: totalScopeCount ? Math.round(((counts.story || 0) / totalScopeCount) * 100) : 0,
      },
      {
        name: "Task",
        value: counts.task || 0,
        color: "#3b82f6",
        pct: totalScopeCount ? Math.round(((counts.task || 0) / totalScopeCount) * 100) : 0,
      },
      {
        name: "Bug",
        value: counts.bug || 0,
        color: "#ef4444",
        pct: totalScopeCount ? Math.round(((counts.bug || 0) / totalScopeCount) * 100) : 0,
      },
      {
        name: "Subtask",
        value: counts.subtask || 0,
        color: "#06b6d4",
        pct: totalScopeCount ? Math.round(((counts.subtask || 0) / totalScopeCount) * 100) : 0,
      },
    ];
  }, [filteredTasks]);

  const statusBreakdown = useMemo(() => {
    const scopeTasks = filteredTasks;
    const statusMap: Record<string, number> = {
      "To Do": 0,
      "In Progress": 0,
      "In Review": 0,
      Done: 0,
      Blocked: 0,
    };
    scopeTasks.forEach((t) => {
      const s = t.status || "To Do";
      if (statusMap[s] !== undefined) statusMap[s]++;
      else statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const totalScopeCount = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return Object.entries(statusMap).map(([name, value]) => ({
      name,
      value,
      pct: totalScopeCount ? Math.round((value / totalScopeCount) * 100) : 0,
      color:
        name === "Done" || name === "Selesai"
          ? "#10b981"
          : name === "In Progress"
            ? "#3b82f6"
            : name === "In Review"
              ? "#8b5cf6"
              : name === "Blocked"
                ? "#ef4444"
                : "#64748b",
    }));
  }, [filteredTasks]);

  const epicsList = useMemo(() => {
    const epicTasks = tasks.filter(
      (t) => t.type?.toLowerCase() === "epic" || t.category?.toLowerCase() === "epic"
    );
    return epicTasks.map((epic) => {
      const epicIdStr = String(epic.id || "").toLowerCase();
      const epicKeyStr = String(epic.key || "").toLowerCase();
      const childTasks = tasks.filter((t) => {
        const pId = String(t.parentId || "").toLowerCase();
        const eId = String((t as any).epicId || "").toLowerCase();
        const lId = String((t as any).linkedEpicId || "").toLowerCase();
        return (
          (pId && (pId === epicIdStr || pId === epicKeyStr)) ||
          (eId && (eId === epicIdStr || eId === epicKeyStr)) ||
          (lId && (lId === epicIdStr || lId === epicKeyStr))
        );
      });
      const childTotal = childTasks.length;
      const childCompleted = childTasks.filter(
        (t) => t.status === "Done" || t.status === "Selesai"
      ).length;
      const progress =
        childTotal === 0
          ? epic.status === "Done" || epic.status === "Selesai"
            ? 100
            : 0
          : Math.round((childCompleted / childTotal) * 100);
      return {
        id: epic.id,
        key: epic.key,
        title: epic.title,
        status: epic.status,
        endDate: epic.endDate,
        childTotal,
        childCompleted,
        progress,
      };
    });
  }, [tasks]);

  const timeTrackingStats = useMemo(() => {
    let totalEst = 0;
    let totalLog = 0;
    tasks.forEach((t) => {
      totalEst += Number(t.estimatedHours) || Number(t.storyPoints) || 0;
      totalLog += Number(t.loggedHours) || 0;
    });
    const diff = totalEst - totalLog;
    const accuracy =
      totalEst === 0 ? 100 : Math.min(100, Math.round((totalLog / (totalEst || 1)) * 100));
    return { totalEst, totalLog, diff, accuracy };
  }, [tasks]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greetingMorning");
    if (hour < 18) return t("dashboard.greetingAfternoon");
    return t("dashboard.greetingNight");
  };

  const realVelocityChartData = useMemo(() => {
    if (velocityData && velocityData.length > 0) return velocityData;
    if (activeSprint) {
      return [
        {
          name: activeSprint.name,
          Planned: sprintTotalTasks,
          Completed: sprintCompletedTasks,
        },
      ];
    }
    return [
      {
        name: t("dashboard.allTasks"),
        Planned: totalTasks,
        Completed: completedTasks.length,
      },
    ];
  }, [
    velocityData,
    activeSprint,
    sprintTotalTasks,
    sprintCompletedTasks,
    totalTasks,
    completedTasks,
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Velzon Agile Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs">
          <div>
            <h2 className="text-xl font-medium text-content-strong flex items-center gap-2">
              {getGreeting()}, {currentUser?.displayName || "Administrator"}!
            </h2>
            <p className="text-xs text-content-muted mt-1">{t("dashboard.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Global Filter by Sprint */}
            <div className="min-w-[220px]">
              <StyledDropdown
                value={selectedSprintFilter}
                onChange={(val) => setSelectedSprintFilter(val)}
                options={sprintFilterOptions}
                masterData={[]}
                className="w-full"
                buttonClassName="h-10 bg-surface-muted rounded-lg border border-border-subtle hover:border-border-subtle shadow-2xs px-3 text-xs font-medium text-content-body"
              />
            </div>

            <div className="flex items-center gap-2 bg-info/10 px-3 py-2 rounded-lg border border-info/20 text-xs font-medium text-info-text">
              <Zap className="w-3.5 h-3.5 text-info-text" />
              <span>
                {t("dashboard.activeSprintChip", {
                  name: activeSprint?.name || t("dashboard.noActiveSprint"),
                  days: sprintDaysLeft,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Agile Top 4 KPI Metric Cards
            #129 — keempat kartu ini menghitung `nonEpicTasks`, sedangkan
            dropdown sprint dan kedua kartu "Rincian Tugas" menghitung `tasks`
            (Epic ikut). Selisihnya nyata (3 lawan 12) dan sebelumnya tidak
            berlabel, sehingga terbaca sebagai angka yang bertentangan. */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
            {t("dashboard.taskSummary")}
          </span>
          <span className="text-xs sm:text-[11px] font-normal text-content-muted">
            {t("dashboard.epicExcluded")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {/* Card 1: Total Tasks */}
          <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
                  {t("dashboard.totalTasks")}
                </span>
                <h3 className="text-2xl font-medium text-content-strong mt-1">{totalTasks}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-success-text border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-border-faint pt-3">
              {/* #105 — panah NAIK hanya bila memang ada kenaikan. Saat 0%
                  tidak ada yang tumbuh, jadi ikonnya netral dan warnanya bukan
                  hijau "bertumbuh". */}
              <span
                className={`flex items-center gap-1 font-medium ${
                  completionPercentage > 0 ? "text-success-text" : "text-content-muted"
                }`}
              >
                {completionPercentage > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}{" "}
                {t("dashboard.percentDone", { percent: completionPercentage })}
              </span>
              <button
                onClick={() => props.setCurrentView("board")}
                className="text-content-subtle hover:text-primary text-xs sm:text-[11px] font-medium underline transition inline-flex items-center min-h-11 py-2"
              >
                {t("dashboard.viewAllTasks")}
              </button>
            </div>
          </div>

          {/* Card 2: Pending & Active Tasks */}
          <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
                  {t("dashboard.runningTasks")}
                </span>
                <h3 className="text-2xl font-medium text-content-strong mt-1">
                  {nonEpicTasks.filter((t) => t.status !== "Done" && t.status !== "Selesai").length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-info-text border border-blue-500/30">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-border-faint pt-3">
              <span className="font-medium text-info-text">
                {t("dashboard.notDoneYet", { count: inProgressTasks.length })}
              </span>
              <button
                onClick={() => props.setCurrentView("board")}
                className="text-content-subtle hover:text-primary text-xs sm:text-[11px] font-medium underline transition inline-flex items-center min-h-11 py-2"
              >
                {t("dashboard.viewActiveBoard")}
              </button>
            </div>
          </div>

          {/* Card 3: Done Tasks */}
          <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
                  {t("dashboard.doneTasks")}
                </span>
                <h3 className="text-2xl font-medium text-content-strong mt-1">
                  {completedTasks.length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-primary border border-indigo-500/30">
                <PackageOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-border-faint pt-3">
              {/* #105 — idem. Tanda `+` ikut disembunyikan saat nol; "+0%"
                  membaca seperti pertumbuhan yang tidak terjadi. */}
              <span
                className={`flex items-center gap-1 font-medium ${
                  completionPercentage > 0 ? "text-success-text" : "text-content-muted"
                }`}
              >
                {completionPercentage > 0 ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />{" "}
                    {t("dashboard.percentRate", { percent: completionPercentage })}
                  </>
                ) : (
                  <>
                    <Minus className="w-3.5 h-3.5" />{" "}
                    {t("dashboard.percentRate", { percent: completionPercentage })}
                  </>
                )}
              </span>
              <button
                onClick={() => props.setCurrentView("board")}
                className="text-content-subtle hover:text-primary text-xs sm:text-[11px] font-medium underline transition inline-flex items-center min-h-11 py-2"
              >
                {t("dashboard.viewDoneListLink")}
              </button>
            </div>
          </div>

          {/* Card 4: Blocked & Critical Issues */}
          <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
                  {t("dashboard.blockedTasks")}
                </span>
                {/* #111 — nol berarti TIDAK ADA yang tersumbat, itu kabar baik.
                    Mewarnainya merah membuat pemindaian sekilas menyimpulkan ada
                    masalah. Merah hanya bila memang ada yang tersumbat. Token
                    `danger-text` menggantikan `rose-600`: §22.3 menyebut peran
                    TEKS berwarna milik `{aksen}-text`, dan `rose-600` hanya
                    mencapai 3,84 di mode gelap. */}
                <h3
                  className={`text-2xl font-medium mt-1 ${
                    blockedTasks.length + overdueTasks.length > 0
                      ? "text-danger-text"
                      : "text-content-strong"
                  }`}
                >
                  {blockedTasks.length + overdueTasks.length}
                </h3>
              </div>
              {/* Ikon menandai IDENTITAS kartu, bukan nilainya, jadi ia tetap
                  merah di keadaan mana pun — hanya tokennya yang diselaraskan. */}
              <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger-text border border-danger/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs border-t border-border-faint pt-3">
              <span
                className={`font-medium ${
                  blockedTasks.length + overdueTasks.length > 0
                    ? "text-danger-text"
                    : "text-content-muted"
                }`}
              >
                {t("dashboard.blockedOverdueChip", {
                  blocked: blockedTasks.length,
                  overdue: overdueTasks.length,
                })}
              </span>
              <button
                onClick={() => props.setCurrentView("board")}
                className="text-content-subtle hover:text-primary text-xs sm:text-[11px] font-medium underline transition inline-flex items-center min-h-11 py-2"
              >
                {t("dashboard.handleBlockersLink")}
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Dashboard Panels Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          {/* Main Column: Left Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Sprint Velocity & Progress Chart */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    {t("dashboard.sprintOverview")}
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-md">
                  {(["ALL", "1M", "6M", "1Y"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRevenueFilter(filter)}
                      className={cn(
                        "px-3 py-2.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded text-xs sm:text-[11px] font-medium transition cursor-pointer",
                        revenueFilter === filter
                          ? "bg-indigo-600 text-content-inverse shadow-2xs"
                          : "text-content-secondary hover:text-content"
                      )}
                    >
                      {filter === "ALL" ? t("dashboard.rangeAll") : filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sprint Sub-metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 bg-surface-sunken rounded-lg border border-border-subtle/60 ">
                <div>
                  <span className="text-xs sm:text-[11px] font-normal text-content-subtle uppercase">
                    {t("dashboard.activeSprint")}
                  </span>
                  <p className="text-sm font-normal text-content-strong mt-0.5 truncate">
                    {activeSprint?.name || "No Sprint"}
                  </p>
                </div>
                <div>
                  <span className="text-xs sm:text-[11px] font-normal text-content-subtle uppercase">
                    {t("dashboard.sprintProgress")}
                  </span>
                  <p className="text-sm font-normal text-success-text mt-0.5">
                    {t("dashboard.sprintProgressValue", {
                      percent: sprintProgress,
                      done: sprintCompletedTasks,
                      total: sprintTotalTasks,
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-xs sm:text-[11px] font-normal text-content-subtle uppercase">
                    {t("dashboard.weeklyVelocity")}
                  </span>
                  <p className="text-sm font-normal text-primary mt-0.5">
                    {t("rakit.pointsPerSprint", { nilai: weeklyVelocity ? weeklyVelocity : "0.0" })}
                  </p>
                </div>
                <div>
                  <span className="text-xs sm:text-[11px] font-normal text-content-subtle uppercase">
                    {t("dashboard.daysLeft")}
                  </span>
                  <p className="text-sm font-medium text-content-strong mt-0.5">
                    {t("rakit.daysLeft", { count: sprintDaysLeft })}
                  </p>
                </div>
              </div>

              {/* Sprint Velocity Chart */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={realVelocityChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* #117 — satuannya task dan story point, keduanya cacahan.
                        Tanpa `allowDecimals={false}` Recharts membagi rentang
                        jadi empat, sehingga sumbu berbunyi 0,25 / 0,5 / 0,75
                        setiap kali nilai maksimumnya kecil. 0,75 task tidak
                        ada wujudnya. */}
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "none",
                        background: "#1e293b",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    {/* #126 — Recharts mewarnai TEKS legenda sama dengan warna
                        serinya lewat inline style, jadi labelnya terbaca 2,54 di
                        KEDUA mode. Yang diperbaiki hanya teksnya; KOTAK penanda
                        tetap memakai warna seri apa adanya, karena §22.5
                        menyatakan palet chart adalah warna DATA, bukan tema.
                        `content-body` lolos jauh: 10,4 terang · 11,7 gelap. */}
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-content-body">{value}</span>
                      )}
                    />
                    <Bar
                      dataKey="Completed"
                      name={t("dashboard.seriesCompleted")}
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="Planned"
                      name={t("dashboard.seriesPlanned")}
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Breakdown Grid (Jenis Task & Status Breakdown) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* {t("dashboard.breakdownByType")} (Epic, Story, Task, Bug, Subtask) */}
              <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-purple-500" />
                    {t("dashboard.breakdownByType")}
                  </h3>
                  {/* #112 — judul WAJIB menjumlahkan isi yang ditampilkan.
                      Sebelumnya ia memakai `totalTasks` sementara isinya
                      dihitung dari `filteredTasks`, jadi "3 Total" berdiri di
                      atas daftar yang berjumlah 12. Itu bukan ambigu, itu
                      salah. */}
                  <span className="text-xs sm:text-[11px] font-medium text-content-subtle">
                    {t("rakit.totalCount", {
                      count: taskTypeBreakdown.reduce((a: number, x) => a + x.value, 0),
                    })}
                  </span>
                </div>

                <div className="space-y-3">
                  {taskTypeBreakdown.map((t, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium text-content-body ">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          <span>{t.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-content-strong ">{t.value}</span>
                          <span className="text-xs sm:text-[11px] text-content-subtle">
                            ({t.pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* {t("dashboard.breakdownByStatus")} (To Do, In Progress, Review, Done, Blocked) */}
              <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-500" />
                    {t("dashboard.breakdownByStatus")}
                  </h3>
                  {/* #112 — idem, dijumlahkan dari isinya sendiri. */}
                  <span className="text-xs sm:text-[11px] font-medium text-content-subtle">
                    {t("rakit.totalCount", {
                      count: statusBreakdown.reduce((a: number, x) => a + x.value, 0),
                    })}
                  </span>
                </div>

                <div className="space-y-3">
                  {statusBreakdown.map((s, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium text-content-body ">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span>{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-content-strong ">{s.value}</span>
                          <span className="text-xs sm:text-[11px] text-content-subtle">
                            ({s.pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Allocation per Team Member (Workload per User) */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-border-faint pb-3 gap-2">
                <div>
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    {t("dashboard.workloadTitle")}
                  </h3>
                  <p className="text-xs sm:text-[11px] text-content-subtle mt-0.5 font-medium">
                    {t("dashboard.workloadSubtitle")}
                  </p>
                </div>
                <button
                  onClick={() => props.setCurrentView("team")}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer inline-flex items-center min-h-11 py-2"
                >
                  {t("dashboard.manageTeam")}
                </button>
              </div>

              <div className="overflow-x-auto">
                <ResponsiveTable className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-faint text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
                      <th className="py-2.5 px-2">{t("dashboard.thMember")}</th>
                      <th className="py-2.5 px-2">{t("dashboard.thRunning")}</th>
                      <th className="py-2.5 px-2">{t("dashboard.thDone")}</th>
                      <th className="py-2.5 px-2">{t("dashboard.thAllocated")}</th>
                      <th className="py-2.5 px-2">{t("dashboard.thLoadStatus")}</th>
                      <th className="py-2.5 px-2 text-right">{t("dashboard.thProgress")}</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-border-faint font-medium text-content-body ">
                    {workloadData.length > 0 ? (
                      workloadData.map((user, idx) => {
                        const totalUserTasks = user.Done + user.Active;
                        const pct = totalUserTasks
                          ? Math.round((user.Done / totalUserTasks) * 100)
                          : 0;

                        let capacityBadge = null;
                        if (user.Active >= 5) {
                          capacityBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] leading-none font-bold bg-rose-500/15 text-rose-700 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3" /> Overload ({user.Active})
                            </span>
                          );
                        } else if (user.Active >= 3) {
                          capacityBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] leading-none font-medium bg-amber-500/15 text-amber-800 border border-amber-500/30">
                              <Zap className="w-3 h-3" /> Heavy ({user.Active})
                            </span>
                          );
                        } else if (user.Active >= 1) {
                          capacityBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] leading-none font-medium bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Balanced ({user.Active})
                            </span>
                          );
                        } else {
                          capacityBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[10px] font-medium bg-surface-muted text-content-secondary border border-border-subtle">
                              <Minus className="w-3 h-3" /> {t("dashboard.available")}
                            </span>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-surface-sunken transition">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-700 text-content-inverse flex items-center justify-center font-medium text-xs">
                                  {user.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium text-content-strong ">
                                  {user.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 font-medium text-info-text">{user.Active}</td>
                            <td className="py-3 px-2 font-medium text-success-text">{user.Done}</td>
                            <td className="py-3 px-2 font-medium text-content-strong ">
                              {totalUserTasks}
                            </td>
                            <td className="py-3 px-2">{capacityBadge}</td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs sm:text-[11px] font-medium text-content-muted w-9">
                                  {pct}%
                                </span>
                                <div className="w-24 h-2 bg-surface-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-content-subtle italic">
                          {t("dashboard.noTasksAllocatedToTeam")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </ResponsiveTable>
              </div>
            </div>

            {/* Widget 4: Epic & Roadmap Delivery Status (Waterfall & Agile Milestone Tracker) */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                <div>
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    {t("dashboard.epicTitle")}
                  </h3>
                  <p className="text-xs sm:text-[11px] text-content-subtle mt-0.5 font-medium">
                    {t("dashboard.epicSubtitle")}
                  </p>
                </div>
                <button
                  onClick={() => props.setCurrentView("timeline")}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center min-h-11 py-2"
                >
                  {t("dashboard.viewRoadmap")}
                </button>
              </div>

              <div className="space-y-3">
                {epicsList.length > 0 ? (
                  epicsList.slice(0, 4).map((epic, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-surface-sunken/70 rounded-lg border border-border-subtle/60 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] leading-none font-mono font-medium text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/30">
                            {epic.key || "EPIC"}
                          </span>
                          <span className="font-medium text-content-strong truncate">
                            {epic.title}
                          </span>
                        </div>
                        <span className="text-xs sm:text-[11px] font-medium text-content-muted shrink-0">
                          {epic.childCompleted}/{epic.childTotal} {t("dashboard.childTasks")} (
                          {epic.progress}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface-strong/80 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            epic.progress === 100 ? "bg-emerald-500" : "bg-purple-600"
                          )}
                          style={{ width: `${epic.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center bg-surface-sunken/50 rounded-lg border border-dashed border-border-subtle text-xs text-content-subtle">
                    {t("dashboard.noEpicsConfiguredYetCreate")}
                  </div>
                )}
              </div>
            </div>

            {/* Widget 5: Sprint Time Tracking & Estimation Accuracy */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                <div>
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {t("dashboard.timeTitle")}
                  </h3>
                  <p className="text-xs sm:text-[11px] text-content-subtle mt-0.5 font-medium">
                    {t("dashboard.timeSubtitle")}
                  </p>
                </div>
                <span className="text-[10px] leading-none font-medium text-primary bg-indigo-500/10 px-2 py-[3px] rounded border border-indigo-500/30">
                  {t("dashboard.accuracy", { percent: timeTrackingStats.accuracy })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-surface-sunken rounded-lg border border-border-subtle/60 ">
                  <span className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase">
                    {t("dashboard.estimatedHours")}
                  </span>
                  <p className="text-lg font-medium text-content-strong mt-0.5">
                    {timeTrackingStats.totalEst} {t("dashboard.hours")}
                  </p>
                </div>
                <div className="p-3 bg-surface-sunken rounded-lg border border-border-subtle/60 ">
                  <span className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase">
                    {t("dashboard.loggedHours")}
                  </span>
                  <p className="text-lg font-medium text-primary mt-0.5">
                    {timeTrackingStats.totalLog} {t("dashboard.hours")}
                  </p>
                </div>
                <div className="p-3 bg-surface-sunken rounded-lg border border-border-subtle/60 ">
                  <span className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase">
                    {t("dashboard.remainingDiff")}
                  </span>
                  <p className="text-lg font-medium text-success-text mt-0.5">
                    {timeTrackingStats.diff >= 0
                      ? `${timeTrackingStats.diff} ${t("dashboard.hoursLeftLabel")}`
                      : `${Math.abs(timeTrackingStats.diff)} Hours Over`}
                  </p>
                </div>
              </div>
            </div>

            {/* Widget 6: 7-Day Activity Trend & Task Creation Rate */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                <div>
                  <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    {t("dashboard.trendTitle")}
                  </h3>
                  <p className="text-xs sm:text-[11px] text-content-subtle mt-0.5 font-medium">
                    {t("dashboard.trendSubtitle")}
                  </p>
                </div>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      last7DaysData && last7DaysData.length > 0
                        ? last7DaysData
                        : [
                            { name: t("dashboard.mon"), Activity: 4, Completed: 3 },
                            { name: t("dashboard.tue"), Activity: 6, Completed: 5 },
                            { name: t("dashboard.wed"), Activity: 8, Completed: 7 },
                            { name: t("dashboard.thu"), Activity: 5, Completed: 6 },
                            { name: t("dashboard.fri"), Activity: 9, Completed: 8 },
                            { name: t("dashboard.sat"), Activity: 2, Completed: 4 },
                            { name: t("dashboard.sun"), Activity: 1, Completed: 2 },
                          ]
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* #117 — cacat yang SAMA. Belum tampak karena data
                        contohnya kebetulan mencapai 9, tetapi Activity dan
                        Completed juga cacahan dan akan pecah begitu angkanya
                        mengecil. */}
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "none",
                        background: "#1e293b",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    {/* #126 — Recharts mewarnai TEKS legenda sama dengan warna
                        serinya lewat inline style, jadi labelnya terbaca 2,54 di
                        KEDUA mode. Yang diperbaiki hanya teksnya; KOTAK penanda
                        tetap memakai warna seri apa adanya, karena §22.5
                        menyatakan palet chart adalah warna DATA, bukan tema.
                        `content-body` lolos jauh: 10,4 terang · 11,7 gelap. */}
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      formatter={(value: string) => (
                        <span className="text-content-body">{value}</span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="Completed"
                      name={t("dashboard.tasksCompleted")}
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Created"
                      name={t("dashboard.tasksCreated")}
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Priority Distribution & Watchlist */}
          <div className="lg:col-span-4 space-y-6">
            {/* Priority Breakdown */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  {t("dashboard.priorityBreakdown")}
                </h3>
                <button
                  onClick={() => props.setCurrentView("board")}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center min-h-11 py-2"
                >
                  {t("dashboard.filter")}
                </button>
              </div>

              <div className="space-y-3">
                {priorityData.map((p, idx) => {
                  const pct = totalTasks ? Math.round((p.value / totalTasks) * 100) : 0;
                  const color =
                    p.name === "Highest" || p.name === "High"
                      ? "#ef4444"
                      : p.name === "Medium"
                        ? "#f59e0b"
                        : "#3b82f6";
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-content-body flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {t("rakit.priorityOf", { nama: p.name })}
                        </span>
                        <span className="text-content-strong font-medium">
                          {p.value} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Blocked & Overdue Watchlist */}
            <div className="bg-surface p-5 rounded-lg border border-border-subtle shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-faint pb-3 gap-2">
                <h3 className="text-xs font-normal text-content-strong uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  {t("dashboard.blockedOverdueTitle")}
                </h3>
                <span className="text-[10px] leading-none font-medium text-rose-600 bg-rose-500/10 px-2 py-[3px] rounded border border-rose-500/30">
                  {t("dashboard.needAction", { count: blockedTasks.length + overdueTasks.length })}
                </span>
              </div>

              <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
                {[...blockedTasks, ...overdueTasks].map((issue, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      props.setSelectedTaskForDetail(issue);
                      props.setIsTaskDetailModalOpen(true);
                    }}
                    className="p-3 rounded-lg border border-border-subtle/70 bg-surface-sunken/50 hover:bg-surface hover:border-indigo-500/30 transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[10px] font-mono font-medium text-content-subtle uppercase">
                          {issue.key}
                        </span>
                        {issue.isBlocked && (
                          <span className="text-[10px] leading-none sm:text-[9px] font-medium text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/30">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-content-strong truncate mt-0.5 group-hover:text-primary transition">
                        {issue.title}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-content-subtle group-hover:text-primary transition shrink-0" />
                  </div>
                ))}
                {blockedTasks.length === 0 && overdueTasks.length === 0 && (
                  <div className="py-4 text-center text-xs text-content-subtle italic">
                    {t("dashboard.noBlockedOverdue")}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Widgets Stack for remaining tools */}
            <SidebarWidgetsStack
              myActiveTasks={inProgressTasks}
              blockedTasks={blockedTasks}
              overdueTasks={overdueTasks}
              dueSoonTasks={dueSoonTasks}
              meetings={props.activityLogs || []}
              documents={[]}
              activityLogs={props.activityLogs || []}
              projectMembers={props.projectMembers || []}
              setSelectedTaskForDetail={props.setSelectedTaskForDetail}
              setIsTaskDetailModalOpen={props.setIsTaskDetailModalOpen}
              setCurrentView={props.setCurrentView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default DashboardView;
