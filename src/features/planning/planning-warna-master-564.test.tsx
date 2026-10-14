/** @jest-environment jsdom */
/**
 * #564 — warna & ikon Planning harus SATU sumber dengan Master Data.
 *
 * Keluhan pemilik (14 Okt): kartu dan kepala epik di `?view=sprints` memakai
 * kamus warna Tailwind lokal — "High" selalu merah token, epik selalu ungu —
 * padahal pemilik sudah menetapkan warna sendiri di menu Master Data. Gerbang
 * konten (`planning-card-colors-491.test.ts`) hanya membuktikan string-nya
 * hilang; test ini membuktikan perilakunya: hex dari baris MasterData benar-benar
 * sampai ke DOM pada garis kiri kartu, chip priority/status, dan kepala epik.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanningView } from "./index";
import { useProjectStore } from "../../store/stores";
import type { MasterData, Task, UserProfile } from "../../types";

const UID = "uid-saya";

// Hex yang tidak mungkin muncul dari tabel BAKU: kalau warnanya datang dari
// mana pun selain baris MasterData di bawah, assertion-nya merah.
const HEX_PRIORITAS = "#123456";
const HEX_STATUS = "#0F1E2D";
const HEX_EPIK = "#ABCDEF";

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Judul ${id}`,
    type: "task",
    status: "todo",
    priority: "High",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const masterData: MasterData[] = [
  {
    id: "m-high",
    type: "priority",
    code: "high",
    label: "High",
    color: HEX_PRIORITAS,
    order: 1,
  } as MasterData,
  {
    id: "m-todo",
    type: "status",
    code: "todo",
    label: "To Do",
    color: HEX_STATUS,
    order: 1,
  } as MasterData,
  {
    id: "m-epic",
    type: "issue_type",
    code: "epic",
    label: "Epic",
    color: HEX_EPIK,
    icon: "zap",
    order: 1,
  } as MasterData,
];

const tasksProyek: Task[] = [
  tugas("epik-1", { type: "epic", title: "Epik Uji" }),
  tugas("anak-1", { parentId: "epik-1", assigneeId: UID }),
];

const props = {
  tasks: tasksProyek,
  sprints: [],
  masterData,
  userRole: "admin",
  currentUserProfile: { uid: UID, id: UID, email: "saya@contoh.test" } as UserProfile,
  user: { uid: UID, id: UID, email: "saya@contoh.test" } as UserProfile,
  projectMembers: [],
  expandedSprintId: null,
  setExpandedSprintId: () => {},
  setSelectedTaskForDetail: () => {},
  setIsTaskDetailModalOpen: () => {},
  setIsNewSprintModalOpen: () => {},
  setIsEditSprintModalOpen: () => {},
  setEditingSprint: () => {},
  handleStartSprint: () => {},
  handleCompleteSprint: () => {},
  handleDeleteSprint: () => {},
  handleDragEndPlanning: () => {},
};

const kartu = (judul: string) => {
  const el = screen.getByText(judul).closest("div.border-l-4");
  if (!el) throw new Error(`kartu ${judul} tidak punya garis kiri`);
  return el as HTMLElement;
};

describe("#564 warna Planning mengikuti Master Data", () => {
  beforeEach(() => useProjectStore.getState().setLingkupTugas("all"));
  afterEach(() => useProjectStore.getState().setLingkupTugas("all"));

  it("garis kiri kartu memakai hex priority milik Master Data", () => {
    render(<PlanningView {...(props as any)} />);
    fireEvent.click(screen.getByText("Epik Uji"));
    expect(kartu("Judul anak-1").style.borderLeftColor).toBe(rgb(HEX_PRIORITAS));
  });

  it("chip priority memakai hex & label milik Master Data", () => {
    const { container } = render(<PlanningView {...(props as any)} />);
    fireEvent.click(screen.getByText("Epik Uji"));
    const chip = [...container.querySelectorAll<HTMLElement>(".label-chip")].find((c) =>
      c.textContent?.includes("High")
    );
    expect(chip).toBeTruthy();
    expect(chip!.style.getPropertyValue("--lbr")).toBe(HEX_PRIORITAS);
  });

  it("chip status memakai hex & label milik Master Data", () => {
    const { container } = render(<PlanningView {...(props as any)} />);
    fireEvent.click(screen.getByText("Epik Uji"));
    const chip = [...container.querySelectorAll<HTMLElement>(".label-chip")].find((c) =>
      c.textContent?.includes("To Do")
    );
    expect(chip).toBeTruthy();
    expect(chip!.style.getPropertyValue("--lbr")).toBe(HEX_STATUS);
  });

  it("kepala epik memakai hex priority epiknya, bukan warna jenis isu", () => {
    render(<PlanningView {...(props as any)} />);
    expect(screen.getByText("Epik Uji").style.color).toBe(rgb(HEX_PRIORITAS));
  });

  it("epik tanpa priority jatuh ke hex jenis isu, bukan warna kosong", () => {
    render(
      <PlanningView
        {...({
          ...props,
          tasks: [
            tugas("epik-2", { type: "epic", title: "Epik Polos", priority: "" }),
            tugas("anak-2", { parentId: "epik-2", assigneeId: UID }),
          ],
        } as any)}
      />
    );
    expect(screen.getByText("Epik Polos").style.color).toBe(rgb(HEX_EPIK));
  });
});
