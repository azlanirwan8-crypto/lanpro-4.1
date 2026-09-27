/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { useDashboard } from "./hooks";
import { DashboardViewProps } from "./types";
import { Task, Sprint, UserProfile, Project } from "../../types";

describe("Audit Logika: useDashboard & Metric Calculations (Item #16 / Fase F2)", () => {
  const dummyProject: Project = {
    id: "proj-1",
    name: "Proyek LanPro",
    key: "LAN",
    ownerId: "user-1",
    members: ["user-1", "user-2"],
    memberRoles: { "user-1": "owner", "user-2": "developer" },
    taskCounter: 10,
    createdAt: new Date().toISOString(),
  };

  const dummyMembers: UserProfile[] = [
    {
      id: "user-1",
      uid: "user-1",
      username: "budi",
      displayName: "Budi Santoso",
      email: "budi@rajonet.com",
      status: "approved",
      role: "admin",
      department: "Engineering",
      passwordHash: "hash123",
    },
    {
      id: "user-2",
      uid: "user-2",
      username: "ani",
      displayName: "Ani Wijaya",
      email: "ani@rajonet.com",
      status: "approved",
      role: "member",
      department: "QA",
      passwordHash: "hash456",
    },
  ];

  const defaultProps: DashboardViewProps = {
    tasks: [],
    sprints: [],
    projectMembers: dummyMembers,
    activityLogs: [],
    selectedProject: dummyProject,
    setCurrentView: jest.fn(),
    setSelectedTaskForDetail: jest.fn(),
    setIsTaskDetailModalOpen: jest.fn(),
    masterData: [
      { id: "s1", type: "status", label: "Done", code: "done", order: 5, isTerminal: true },
      { id: "s2", type: "status", label: "Selesai", code: "selesai", order: 6, isTerminal: true },
      { id: "s3", type: "status", label: "UAT", code: "uat", order: 4, isTerminal: true },
      { id: "s4", type: "status", label: "To Do", code: "todo", order: 1, isTerminal: false },
      { id: "s5", type: "status", label: "Backlog", code: "backlog", order: 0, isTerminal: false },
    ],
  };

  describe("1. Kalkulasi Progress Proyek & Persentase Penyelesaian", () => {
    it("menghasilkan 0% jika tidak ada task sama sekali (edge case 0 tasks)", () => {
      const { result } = renderHook(() => useDashboard(defaultProps));
      expect(result.current.totalTasks).toBe(0);
      expect(result.current.completionPercentage).toBe(0);
      expect(result.current.completedTasks.length).toBe(0);
    });

    it("menghitung persentase dengan tepat dan mengabaikan task bertipe epic", () => {
      const tasks: Task[] = [
        {
          id: "t1",
          projectId: "proj-1",
          key: "LAN-1",
          title: "Task 1",
          type: "task",
          status: "Done",
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t2",
          projectId: "proj-1",
          key: "LAN-2",
          title: "Task 2",
          type: "bug",
          status: "In Progress",
          priority: "Medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t3",
          projectId: "proj-1",
          key: "LAN-3",
          title: "Epic Utama",
          type: "epic",
          status: "Done",
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const { result } = renderHook(() => useDashboard({ ...defaultProps, tasks }));

      // Total non-epic tasks = 2 (t1 dan t2)
      expect(result.current.totalTasks).toBe(2);
      expect(result.current.completedTasks.length).toBe(1);
      // 1 dari 2 task selesai = 50%
      expect(result.current.completionPercentage).toBe(50);
    });

    it("mendukung status penyelesaian dwi-bahasa ('Done' dan 'Selesai')", () => {
      const tasks: Task[] = [
        {
          id: "t1",
          projectId: "proj-1",
          key: "LAN-1",
          title: "Task 1",
          type: "task",
          status: "Done",
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t2",
          projectId: "proj-1",
          key: "LAN-2",
          title: "Task 2",
          type: "task",
          status: "Selesai",
          priority: "Medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const { result } = renderHook(() => useDashboard({ ...defaultProps, tasks }));

      expect(result.current.totalTasks).toBe(2);
      expect(result.current.completedTasks.length).toBe(2);
      expect(result.current.completionPercentage).toBe(100);
    });
  });

  describe("2. Kalkulasi Metrik Sprint Aktif", () => {
    it("menghitung progress sprint aktif secara akurat", () => {
      const now = new Date();
      const sprintEndDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 hari ke depan

      const sprints: Sprint[] = [
        {
          id: "sprint-1",
          projectId: "proj-1",
          name: "Sprint 1",
          status: "active",
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          endDate: sprintEndDate,
          createdAt: new Date(),
        },
      ];

      const tasks: Task[] = [
        {
          id: "t1",
          projectId: "proj-1",
          sprintId: "sprint-1",
          key: "LAN-1",
          title: "Sprint Task 1",
          type: "task",
          status: "Done",
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t2",
          projectId: "proj-1",
          sprintId: "sprint-1",
          key: "LAN-2",
          title: "Sprint Task 2",
          type: "task",
          status: "In Progress",
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const { result } = renderHook(() => useDashboard({ ...defaultProps, sprints, tasks }));

      expect(result.current.activeSprint?.id).toBe("sprint-1");
      expect(result.current.sprintTotalTasks).toBe(2);
      expect(result.current.sprintCompletedTasks).toBe(1);
      expect(result.current.sprintProgress).toBe(50);
      expect(result.current.sprintDaysLeft).toBeGreaterThanOrEqual(4);
    });
  });

  describe("3. Analitik Beban Kerja (Workload Analytics)", () => {
    it("mengelompokkan task berdasarkan assignee dan department/tim secara tepat", () => {
      const tasks: Task[] = [
        {
          id: "t1",
          projectId: "proj-1",
          key: "LAN-1",
          title: "Task Budi Done",
          type: "task",
          status: "Done",
          assigneeId: "user-1",
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t2",
          projectId: "proj-1",
          key: "LAN-2",
          title: "Task Ani Active",
          type: "task",
          status: "In Progress",
          assigneeId: "user-2",
          priority: "Medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t3",
          projectId: "proj-1",
          key: "LAN-3",
          title: "Task Unassigned Active",
          type: "task",
          status: "Backlog",
          priority: "Low",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const { result } = renderHook(() => useDashboard({ ...defaultProps, tasks }));

      const userBudi = result.current.workloadData.find((w) => w.name === "Budi Santoso");
      expect(userBudi).toBeDefined();
      expect(userBudi?.Done).toBe(1);
      expect(userBudi?.Active).toBe(0);

      const userAni = result.current.workloadData.find((w) => w.name === "Ani Wijaya");
      expect(userAni).toBeDefined();
      expect(userAni?.Done).toBe(0);
      expect(userAni?.Active).toBe(1);

      const unassigned = result.current.workloadData.find((w) => w.name === "Unassigned");
      expect(unassigned).toBeDefined();
      expect(unassigned?.Active).toBe(1);

      // Team Workload
      const engTeam = result.current.teamWorkloadData.find((t) => t.name === "Engineering");
      expect(engTeam).toBeDefined();
      expect(engTeam?.Done).toBe(1);

      const qaTeam = result.current.teamWorkloadData.find((t) => t.name === "QA");
      expect(qaTeam).toBeDefined();
      expect(qaTeam?.Active).toBe(1);
    });
  });

  describe("4. Filter Boundary Waktu: Overdue, Due Soon, & Blocked Tasks", () => {
    it("mengidentifikasi task overdue, due soon, dan blocked dengan benar", () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 hari lalu
      const soonDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 hari ke depan

      const tasks: Task[] = [
        {
          id: "t1",
          projectId: "proj-1",
          key: "LAN-1",
          title: "Task Terlambat",
          type: "task",
          status: "In Progress",
          endDate: pastDate,
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t2",
          projectId: "proj-1",
          key: "LAN-2",
          title: "Task Segera Jatuh Tempo",
          type: "task",
          status: "In Progress",
          endDate: soonDate,
          priority: "Medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "t3",
          projectId: "proj-1",
          key: "LAN-3",
          title: "Task Terblokir",
          type: "task",
          status: "In Progress",
          isBlocked: true,
          priority: "High",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const { result } = renderHook(() => useDashboard({ ...defaultProps, tasks }));

      expect(result.current.overdueTasks.map((t) => t.id)).toContain("t1");
      expect(result.current.dueSoonTasks.map((t) => t.id)).toContain("t2");
      expect(result.current.blockedTasks.map((t) => t.id)).toContain("t3");
    });
  });

  describe("5. Kalkulasi Burndown Chart & Velocity", () => {
    it("menghitung garis ideal dan aktual burndown chart tanpa membagi dengan nol", () => {
      const now = new Date();
      const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const sprints: Sprint[] = [
        {
          id: "sprint-1",
          projectId: "proj-1",
          name: "Sprint 1",
          status: "active",
          startDate: start,
          endDate: end,
          createdAt: new Date(),
        },
      ];

      const tasks: Task[] = [
        {
          id: "t1",
          projectId: "proj-1",
          sprintId: "sprint-1",
          key: "LAN-1",
          title: "Task 1",
          type: "task",
          status: "Done",
          priority: "High",
          createdAt: start,
          updatedAt: now,
        },
        {
          id: "t2",
          projectId: "proj-1",
          sprintId: "sprint-1",
          key: "LAN-2",
          title: "Task 2",
          type: "task",
          status: "In Progress",
          priority: "Medium",
          createdAt: start,
          updatedAt: now,
        },
      ];

      const { result } = renderHook(() => useDashboard({ ...defaultProps, sprints, tasks }));

      expect(result.current.burndownData.length).toBeGreaterThan(0);
      const firstPoint = result.current.burndownData[0]; // Day 0 (start date, 2 hari lalu)
      expect(firstPoint.Ideal).toBe(2);
      expect(firstPoint.Actual).toBe(2); // Saat sprint mulai, belum ada task selesai (sisa 2)

      const todayPoint = result.current.burndownData[2]; // Day 2 (hari ini)
      expect(todayPoint.Actual).toBe(1); // 1 task telah selesai hari ini (sisa 1)
    });
  });
});
