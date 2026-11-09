/**
 * #831 — kartu kanban diseret dari SELURUH permukaan kartu, setara Jira.
 *
 * Dulu `dragHandleProps` hanya dipasang pada tombol GripVertical, jadi seret
 * hanya bisa dimulai dari titik tiga. Test ini mengunci tiga hal yang membuat
 * perubahan itu aman: pegangan dan node yang di-drag adalah elemen YANG SAMA,
 * tidak ada tombol pegangan tersisa, dan kartu tidak memakai `touch-action:
 * none` (yang akan mematikan gulir kolom di HP).
 *
 * Klik dan Enter tetap membuka detail: seret baru dimulai sesudah ambang
 * gerak/tahan, dan Enter disediakan karena Spasi kini dipakai untuk
 * mengangkat kartu.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { KanbanColumn } from "./KanbanColumn";

jest.mock("@hello-pangea/dnd", () => ({
  Droppable: ({ children }: any) =>
    children({ droppableProps: {}, innerRef: jest.fn() }, { isDraggingOver: false }),
  Draggable: ({ children }: any) =>
    children(
      {
        draggableProps: { "data-rfd-draggable-id": "t1" },
        dragHandleProps: {
          "data-rfd-drag-handle-draggable-id": "t1",
          role: "button",
          tabIndex: 0,
        },
        innerRef: jest.fn(),
      },
      { isDragging: false }
    ),
}));

jest.mock("./KanbanCard", () => ({
  KanbanCard: ({ onClick }: any) => <div data-testid="card" onClick={onClick} />,
}));

jest.mock("../../../store/useAppStore", () => ({
  useAppStore: () => ({ density: "comfortable" }),
}));

describe("KanbanColumn — seret dari seluruh kartu (#831)", () => {
  const status = { label: "To Do", code: "todo", color: "#00f" };
  const tugas = [{ id: "t1", title: "Pengajuan EDC" }];

  const renderKolom = () => {
    const onTaskClick = jest.fn();
    const hasil = render(
      <KanbanColumn status={status} tasks={tugas} mArr={[]} pArr={[]} onTaskClick={onTaskClick} />
    );
    return { ...hasil, onTaskClick };
  };

  it("pegangan seret dan node draggable berada di elemen yang sama", () => {
    const { container } = renderKolom();
    const permukaan = container.querySelector('[data-rfd-draggable-id="t1"]') as HTMLElement;
    expect(permukaan).not.toBeNull();
    expect(permukaan).toHaveAttribute("data-rfd-drag-handle-draggable-id", "t1");
    expect(permukaan).toHaveAttribute("role", "button");
    expect(permukaan).toHaveAttribute("tabindex", "0");
  });

  it("tidak ada lagi tombol titik tiga sebagai pegangan terpisah", () => {
    const { container } = renderKolom();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector(".lucide-grip-vertical")).toBeNull();
  });

  it("kartu tidak memakai touch-action:none sehingga gulir kolom tetap jalan", () => {
    const { container } = renderKolom();
    const permukaan = container.querySelector('[data-rfd-draggable-id="t1"]') as HTMLElement;
    expect(permukaan.style.touchAction).not.toBe("none");
  });

  it("klik kartu tetap membuka detail", () => {
    const { onTaskClick } = renderKolom();
    fireEvent.click(screen.getByTestId("card"));
    expect(onTaskClick).toHaveBeenCalledWith(tugas[0]);
  });

  it("Enter pada kartu membuka detail karena Spasi dipakai mengangkat kartu", () => {
    const { container, onTaskClick } = renderKolom();
    const permukaan = container.querySelector('[data-rfd-draggable-id="t1"]') as HTMLElement;
    fireEvent.keyDown(permukaan, { key: "Enter" });
    expect(onTaskClick).toHaveBeenCalledWith(tugas[0]);
  });
});
