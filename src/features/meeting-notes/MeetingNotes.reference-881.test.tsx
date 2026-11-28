import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import { useAppStore } from "../../store/useAppStore";
import { MeetingNotes } from "./MeetingNotes";
import { fetchReferencedPoint } from "./services/meeting.service";

jest.mock("../../lib/moduleDataCache", () => ({
  peekProjectMeetings: () => undefined,
  loadProjectMeetings: async () => ({ data: [] }),
}));
jest.mock("../../services/meetingService", () => ({ getUsers: async () => [] }));
jest.mock("./services/meeting.service", () => ({
  resolveUserId: () => "user",
  fetchReferencedPoint: jest.fn(),
}));
jest.mock("./DiscussionPointsTable", () => ({
  DiscussionPointsTable: () => <div>All discussion points</div>,
}));

afterEach(() => {
  useAppStore.getState().setCurrentView("dashboard");
});

it("opens only the tagged point even when its meeting is outside the current list page", async () => {
  await i18n.changeLanguage("en");
  jest.mocked(fetchReferencedPoint).mockResolvedValue({
    meeting: {
      id: "m2",
      projectId: "p1",
      title: "Archived meeting",
      description: "Unrelated agenda",
      authorId: "user",
      createdAt: "2026-11-28T00:00:00Z",
    },
    point: { id: "point-2", meetingId: "m2", concern: "Tagged point", status: "pending" },
  });
  useAppStore.getState().openIssueReference({
    kind: "meeting",
    id: "point-2",
    title: "Tagged point",
    meetingId: "m2",
    meetingTitle: "Archived meeting",
    date: null,
    projectId: "p1",
  });
  render(
    <MeetingNotes
      projectId="p1"
      userRole="viewer"
      currentUser={null}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
    />
  );
  expect(await screen.findByText("Tagged point")).toBeVisible();
  expect(screen.getByText("Archived meeting")).toBeVisible();
  expect(screen.queryByText("Unrelated agenda")).not.toBeInTheDocument();
  expect(screen.queryByText("All discussion points")).not.toBeInTheDocument();
  expect(fetchReferencedPoint).toHaveBeenCalledWith("m2", "point-2", expect.any(AbortSignal));

  fireEvent.click(screen.getByRole("button", { name: "View all meeting points" }));
  expect(await screen.findByText("All discussion points")).toBeVisible();
  expect(screen.queryByText("Tagged point")).not.toBeInTheDocument();
});
