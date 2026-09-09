import React from "react";
import { render, screen } from "@testing-library/react";
import { IssueAdvancedFiltersPanel } from "./IssueAdvancedFiltersPanel";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const dasar = {
  issueSearch: "",
  setIssueSearch: jest.fn(),
  isFiltersPanelOpen: false,
  setIsFiltersPanelOpen: jest.fn(),
  listFilterStatus: "All",
  setListFilterStatus: jest.fn(),
  listFilterPriority: "All",
  setListFilterPriority: jest.fn(),
  listFilterAssignee: "All",
  setListFilterAssignee: jest.fn(),
  listFilterCategory: "All",
  setListFilterCategory: jest.fn(),
  listFilterSprint: "All",
  setListFilterSprint: jest.fn(),
  listFilterLabel: "All",
  setListFilterLabel: jest.fn(),
  listFilterEnvironment: "All",
  setListFilterEnvironment: jest.fn(),
  listFilterProjectRisk: "All",
  setListFilterProjectRisk: jest.fn(),
  listFilterRelease: "All",
  setListFilterRelease: jest.fn(),
  listFilterResolution: "All",
  setListFilterResolution: jest.fn(),
  listFilterDateType: "any",
  setListFilterDateType: jest.fn(),
  listFilterStartDate: "",
  setListFilterStartDate: jest.fn(),
  listFilterEndDate: "",
  setListFilterEndDate: jest.fn(),
  listFilterOverdue: false,
  setListFilterOverdue: jest.fn(),
  projectId: "proj-test",
  currentFilterSnapshot: {
    search: "",
    status: "All",
    priority: "All",
    assignee: "All",
    category: "All",
    sprint: "All",
    label: "All",
    environment: "All",
    projectRisk: "All",
    release: "All",
    resolution: "All",
    dateType: "any",
    startDate: "",
    endDate: "",
    overdue: false,
  },
  onApplySavedFilter: jest.fn(),
  projectMembers: [] as never[],
  sprints: [] as never[],
  masterData: [] as never[],
  allLabels: [] as string[],
  allEnvironments: [] as never[],
  allProjectRisks: [] as never[],
  allReleases: [] as never[],
  allResolutions: [] as never[],
  setIsConfigureColumnsOpen: jest.fn(),
};

describe("IssueAdvancedFiltersPanel (#484)", () => {
  it("Search ada di toolbar; Create Issue tidak (opsi A ala Jira)", () => {
    render(<IssueAdvancedFiltersPanel {...dasar} />);

    expect(screen.getByPlaceholderText("filters.searchIssues")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "newTask.createIssue" })).not.toBeInTheDocument();
  });
});
