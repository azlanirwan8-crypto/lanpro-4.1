import { fireEvent, render, screen, within } from "@testing-library/react";
import i18n from "../../../i18n";
import { useAppStore } from "../../../store/useAppStore";
import type { IssueReference } from "../../../types/issueReference";
import { listIssueReferences } from "../services/issueReferences.service";
import { IssueReferences } from "./IssueReferences";

jest.mock("../services/issueReferences.service");
const list = jest.mocked(listIssueReferences);

afterEach(() => {
  useAppStore.getState().setCurrentView("dashboard");
});

it("keeps three recent points in the preview and searches the full list before opening the exact point", async () => {
  await i18n.changeLanguage("en");
  const data: IssueReference[] = ["Recent A", "Recent B", "Recent C", "Old point"].map(
    (title, index) => ({
      kind: "meeting",
      id: String(index),
      title,
      meetingId: index === 3 ? "archived" : "current",
      meetingTitle: index === 3 ? "Archived meeting" : "Current meeting",
      date: null,
    })
  );
  const meeting = { data, unavailable: false, allowed: true };
  const flowchart = { data: [], unavailable: false, allowed: false };
  list.mockResolvedValue({ replies: [meeting, flowchart], meeting, flowchart });
  const { container } = render(<IssueReferences projectId="p" taskId="issue" />);
  expect(await screen.findByText("Meeting Point")).toBeInTheDocument();
  expect(screen.queryByText("Flowchart")).not.toBeInTheDocument();
  const preview = container.querySelector("details")!;
  expect(preview.open).toBe(false);
  preview.open = true;
  expect(within(preview).getByText("Recent C")).toBeVisible();
  expect(within(preview).queryByText("Old point")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View all 4" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "archived meeting" } });
  expect(screen.queryByText("Recent A")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Old point" }));
  expect(useAppStore.getState()).toMatchObject({
    currentView: "meetingNotes",
    issueReferenceTarget: { projectId: "p", meetingId: "archived", id: "3" },
  });
});
