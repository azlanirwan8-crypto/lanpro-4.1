import React from "react";
import { render, screen } from "@testing-library/react";
import { IssueAdvancedFiltersPanel } from "./IssueAdvancedFiltersPanel";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    // #705 — panel yang DIBUKA merender LanproDatePicker, dan ia membaca
    // `i18n.language`. Mock tanpa `i18n` membuat panel tertutup lolos dan panel
    // terbuka pecah, jadi kunci itu ikut disediakan.
    i18n: { language: "id", exists: () => true },
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
  listFilterType: "All",
  setListFilterType: jest.fn(),
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
    type: "All",
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
  allTypes: [] as never[],
  setIsConfigureColumnsOpen: jest.fn(),
};

describe("IssueAdvancedFiltersPanel (#484)", () => {
  it("Search ada di toolbar; Create Issue tidak (opsi A ala Jira)", () => {
    render(<IssueAdvancedFiltersPanel {...dasar} />);

    expect(screen.getByPlaceholderText("filters.searchIssues")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "newTask.createIssue" })).not.toBeInTheDocument();
  });

  /**
   * #705 — dulu Advanced Filters punya sepuluh penyaring dan TIDAK SATU PUN untuk
   * jenis isu, padahal kolom WORK menampilkan ikon jenisnya. Test ini mengunci
   * dropdown-nya benar-benar ada di panel yang dibuka, bukan hanya di state.
   */
  it("#705 panel terbuka menampilkan dropdown Tipe Isu", () => {
    render(
      <IssueAdvancedFiltersPanel
        {...dasar}
        isFiltersPanelOpen
        allTypes={[
          { id: "Bug", label: "Bug", icon: "AlertCircle", color: "#EF4444" },
          { id: "Epic", label: "Epic", icon: "Layers", color: "#8B5CF6" },
        ]}
      />
    );

    // Teks pill terbagi beberapa text node ("filters.issueType" + "Bug"), jadi
    // pencocok persis testing-library tidak dipakai di sini.
    expect(screen.getAllByText(/filters\.issueType/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/filters\.allTypes/).length).toBeGreaterThan(0);
  });

  it("#705 jenis yang dipilih jadi pill dan ikut dihitung di tombol filter", () => {
    render(<IssueAdvancedFiltersPanel {...dasar} listFilterType="Bug" />);

    const pill = screen.getByText(/filters\.issueType/).closest("span");
    expect(pill?.textContent).toContain("Bug");
    // Tombol "Advanced Filters" memuat penghitung filter aktif.
    const tombol = screen.getByRole("button", { name: "filters.toggleFilterPanel" });
    expect(tombol.textContent).toContain("1");
  });
});
