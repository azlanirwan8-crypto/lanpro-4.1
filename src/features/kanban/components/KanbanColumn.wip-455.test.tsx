import React from "react";
import { render, screen } from "@testing-library/react";
import { KanbanColumn, DEFAULT_KANBAN_WIP_LIMIT } from "./KanbanColumn";

jest.mock("@hello-pangea/dnd", () => ({
  Droppable: ({ children }: any) =>
    children({ droppableProps: {}, innerRef: jest.fn() }, { isDraggingOver: false }),
  Draggable: ({ children }: any) =>
    children({ draggableProps: {}, dragHandleProps: {}, innerRef: jest.fn() }, {}),
}));

jest.mock("./KanbanCard", () => ({
  KanbanCard: () => <div data-testid="card" />,
}));

jest.mock("../../../store/useAppStore", () => ({
  useAppStore: () => ({ density: "comfortable" }),
}));

describe("KanbanColumn WIP #455", () => {
  const status = { label: "Doing", code: "doing", color: "#00f" };

  it("menampilkan hitungan vs batas WIP default", () => {
    const tasks = Array.from({ length: 3 }, (_, i) => ({ id: `t${i}` }));
    render(
      <KanbanColumn status={status} tasks={tasks} mArr={[]} pArr={[]} onTaskClick={() => {}} />
    );
    expect(screen.getByText(`3/${DEFAULT_KANBAN_WIP_LIMIT}`)).toBeInTheDocument();
  });

  it("menandai over-WIP saat melebihi batas", () => {
    const tasks = Array.from({ length: 9 }, (_, i) => ({ id: `t${i}` }));
    const { container } = render(
      <KanbanColumn
        status={status}
        tasks={tasks}
        mArr={[]}
        pArr={[]}
        onTaskClick={() => {}}
        wipLimit={8}
      />
    );
    expect(screen.getByText("9/8")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("border-warning/50");
  });
});
