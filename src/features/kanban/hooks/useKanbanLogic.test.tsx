import { renderHook } from "@testing-library/react";
import { useBoard } from "./useKanbanLogic";
import { KanbanBoardProps } from "../types";

describe("useBoard - Kanban Swimlane Grouping Logic", () => {
  const mockMasterData = [
    { type: "status", label: "TO DO", order: 1 },
    { type: "status", label: "IN PROGRESS", order: 2 },
    { type: "status", label: "DONE", order: 3 },
  ];

  const mockEpics = [
    { id: "epic-1", title: "Epic 1", key: "PRJ-1", type: "epic" },
    { id: "epic-2", title: "Epic 2", key: "PRJ-2", type: "epic" },
  ];

  const mockTasks = [
    ...mockEpics,
    { id: "task-1", title: "Task 1", parentId: "epic-1", status: "TO DO", type: "task" },
    { id: "task-2", title: "Task 2", parentId: "epic-1", status: "TO DO", type: "task" },
    { id: "task-3", title: "Task 3", parentId: "epic-2", status: "IN PROGRESS", type: "task" },
    { id: "task-4", title: "Standalone Task", parentId: null, status: "TO DO", type: "task" },
  ];

  const defaultProps: KanbanBoardProps = {
    masterData: mockMasterData,
    tasks: mockTasks,
    projectMembers: [],
    userRole: "admin",
    user: { uid: "user-1" } as any,
    selectedProject: { id: "p-1" } as any,
    setSelectedTaskForDetail: jest.fn(),
    setIsTaskDetailModalOpen: jest.fn(),
  };

  it("correctly groups tasks by epic without extraneous prefixes", () => {
    const { result } = renderHook(() => useBoard(defaultProps, "epic"));

    expect(result.current.epics).toHaveLength(2);
    expect(result.current.standaloneTasks).toHaveLength(1);
    expect(result.current.standaloneTasks[0].id).toBe("task-4");

    // Check epic-1 grouping
    const epic1Tasks = result.current.groupedTasks["epic-1:TO DO"];
    expect(epic1Tasks).toBeDefined();
    expect(epic1Tasks).toHaveLength(2);
    expect(epic1Tasks.map((t) => t.id)).toEqual(["task-1", "task-2"]);

    // Check epic-2 grouping
    const epic2Tasks = result.current.groupedTasks["epic-2:IN PROGRESS"];
    expect(epic2Tasks).toBeDefined();
    expect(epic2Tasks).toHaveLength(1);
    expect(epic2Tasks[0].id).toBe("task-3");

    // Check standalone grouping
    const standaloneTasks = result.current.groupedTasks["standalone:TO DO"];
    expect(standaloneTasks).toBeDefined();
    expect(standaloneTasks).toHaveLength(1);
    expect(standaloneTasks[0].id).toBe("task-4");
  });

  it("correctly groups tasks by assignee", () => {
    const tasksWithAssignees = [
      { id: "t-1", title: "T1", assigneeId: "u-1", status: "TO DO", type: "task" },
      { id: "t-2", title: "T2", assigneeId: "u-1", status: "DONE", type: "task" },
      { id: "t-3", title: "T3", assigneeId: null, status: "TO DO", type: "task" },
    ];

    const props: KanbanBoardProps = {
      ...defaultProps,
      tasks: tasksWithAssignees,
    };

    const { result } = renderHook(() => useBoard(props, "assignee"));

    expect(result.current.groupedTasks["u-1:TO DO"]).toHaveLength(1);
    expect(result.current.groupedTasks["u-1:DONE"]).toHaveLength(1);
    expect(result.current.groupedTasks["unassigned:TO DO"]).toHaveLength(1);
  });
});
