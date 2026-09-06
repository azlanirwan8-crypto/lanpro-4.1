import { kumpulkanEdgeBlocks, pathSikuDep, GANTT_ROW_PX } from "./ganttDependencyEdges";

describe("ganttDependencyEdges #457", () => {
  const tasks = [
    {
      id: "a",
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      linkedTasks: [{ targetTaskId: "b", relationType: "blocks" }],
    },
    {
      id: "b",
      startDate: "2026-01-06",
      endDate: "2026-01-10",
      linkedTasks: [{ targetTaskId: "a", relationType: "is_blocked_by" }],
    },
    { id: "c", startDate: "2026-01-01", endDate: "2026-01-02", linkedTasks: [] },
  ];

  it("mengumpulkan edge blocks sekali (dedup inverse)", () => {
    const rows = tasks.map((task) => ({ task }));
    const edges = kumpulkanEdgeBlocks(rows, tasks);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ fromId: "a", toId: "b", fromIndex: 0, toIndex: 1 });
  });

  it("melewati task tanpa tanggal atau di luar rows", () => {
    const rows = [
      {
        task: {
          id: "a",
          startDate: "2026-01-01",
          endDate: "2026-01-02",
          linkedTasks: [{ targetTaskId: "x", relationType: "blocks" }],
        },
      },
      { task: { id: "b", linkedTasks: [] } },
    ];
    expect(kumpulkanEdgeBlocks(rows)).toHaveLength(0);
  });

  it("pathSikuDep lurus bila y sama", () => {
    expect(pathSikuDep(10, 20, 40, 20)).toBe("M 10 20 L 40 20");
    expect(pathSikuDep(10, 20, 40, 80)).toContain("H ");
    expect(pathSikuDep(10, 20, 40, 80)).toContain("V ");
  });

  it("GANTT_ROW_PX = 56 selaras h-14", () => {
    expect(GANTT_ROW_PX).toBe(56);
  });
});
