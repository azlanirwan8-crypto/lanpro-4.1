/**
 * Item #312 — panel Milestone terpasang di Timeline (smoke render).
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MilestonePanel } from "./MilestonePanel";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("./milestone.service", () => ({
  fetchMilestones: async () => [
    {
      id: "m1",
      projectId: "p1",
      name: "Alpha",
      status: "planned",
      dueDate: "2026-10-01",
      progress: 0,
    },
  ],
  createMilestone: async () => undefined,
  updateMilestone: async () => undefined,
  deleteMilestone: async () => undefined,
}));

jest.mock("../../lib/sweetalert", () => ({
  confirmDeleteAlert: jest.fn(async () => false),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("MilestonePanel (#312)", () => {
  it("menampilkan daftar milestone dari API", async () => {
    render(<MilestonePanel projectId="p1" canWrite={false} />);
    expect(screen.getByTestId("milestone-panel")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });
});
