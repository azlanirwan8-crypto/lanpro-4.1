import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("IssueAdvancedFiltersPanel (#424)", () => {
  it("Search + Tambah ada di toolbar kartu", () => {
    const onAddIssue = jest.fn();
    render(<IssueAdvancedFiltersPanel {...dasar} canCreateIssue onAddIssue={onAddIssue} />);

    expect(screen.getByPlaceholderText("filters.searchIssues")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "newTask.createIssue" }));
    expect(onAddIssue).toHaveBeenCalledTimes(1);
  });

  it("tanpa izin create, tombol Tambah tidak tampil", () => {
    render(<IssueAdvancedFiltersPanel {...dasar} />);
    expect(screen.queryByRole("button", { name: "newTask.createIssue" })).not.toBeInTheDocument();
  });
});
