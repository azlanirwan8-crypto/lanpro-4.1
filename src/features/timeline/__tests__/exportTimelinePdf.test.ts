/**
 * @jest-environment jsdom
 */
import { exportTimelinePdf } from "../exportTimelinePdf";
import i18n from "../../../i18n";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Task, Project } from "../../../types";

jest.mock("html2canvas", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockDocInstance = {
  setFillColor: jest.fn(),
  setDrawColor: jest.fn(),
  setLineWidth: jest.fn(),
  setTextColor: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  rect: jest.fn(),
  roundedRect: jest.fn(),
  line: jest.fn(),
  text: jest.fn(),
  addPage: jest.fn(),
  addImage: jest.fn(),
  save: jest.fn(),
};

jest.mock("jspdf", () => ({
  __esModule: true,
  jsPDF: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("exportTimelinePdf i18n (item #152)", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Proyek Alpha",
    key: "ALP",
    description: "Deskripsi",
    ownerId: "u1",
    members: [],
    memberRoles: {},
    createdAt: new Date().toISOString(),
    taskCounter: 2,
  };

  const dummyTasks: Task[] = [
    {
      id: "t1",
      key: "ALP-1",
      title: "Epic Utama",
      projectId: "p1",
      type: "epic",
      status: "In Progress",
      priority: "High",
      startDate: "2026-08-01",
      endDate: "2026-08-15",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "t2",
      key: "ALP-2",
      title: "Tugas Selesai",
      projectId: "p1",
      type: "task",
      status: "Done",
      priority: "Medium",
      startDate: "2026-08-05",
      endDate: "2026-08-10",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const dummyRows = [
    { task: dummyTasks[0], isChild: false },
    { task: dummyTasks[1], isChild: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (html2canvas as unknown as jest.Mock).mockResolvedValue({
      width: 800,
      height: 600,
      toDataURL: () => "data:image/png;base64,mock",
    });
    (jsPDF as unknown as jest.Mock).mockImplementation(() => mockDocInstance);
    (toast.loading as unknown as jest.Mock).mockReturnValue("toast-123");
  });

  it("menghasilkan dokumen PDF dengan teks dan header berbahasa Indonesia saat bahasa aktif 'id'", async () => {
    await i18n.changeLanguage("id");

    const container = document.createElement("div");
    await exportTimelinePdf({
      timelineContainer: container,
      selectedProject: dummyProject,
      tasks: dummyTasks,
      renderedRows: dummyRows,
    });

    expect(jsPDF).toHaveBeenCalledWith("p", "mm", "a4");

    // Verifikasi teks header dan banner
    expect(mockDocInstance.text).toHaveBeenCalledWith("LAPORAN PROYEK EKSEKUTIF & ROADMAP", 12, 16);
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      "PROYEK: PROYEK ALPHA  |  LEVEL: LAPORAN EKSEKUTIF",
      12,
      24
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      expect.stringContaining("Cakupan Jadwal:"),
      120,
      43
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith("TOTAL TUGAS", 15, 65);
    expect(mockDocInstance.text).toHaveBeenCalledWith("SELESAI", 63, 65);
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      "RINGKASAN EKSEKUTIF",
      12,
      expect.any(Number)
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      "IKHTISAR EPIC MILESTONE",
      12,
      expect.any(Number)
    );

    // Verifikasi penyimpanan nama file ID
    expect(mockDocInstance.save).toHaveBeenCalledWith("Roadmap_Laporan_Eksekutif_ALP.pdf");
    expect(toast.success).toHaveBeenCalledWith("Berhasil mengekspor ringkasan PDF eksekutif!", {
      id: "toast-123",
    });
  });

  it("menghasilkan dokumen PDF dengan teks dan header berbahasa Inggris saat bahasa aktif 'en'", async () => {
    await i18n.changeLanguage("en");

    const container = document.createElement("div");
    await exportTimelinePdf({
      timelineContainer: container,
      selectedProject: dummyProject,
      tasks: dummyTasks,
      renderedRows: dummyRows,
    });

    // Verifikasi teks header dan banner EN
    expect(mockDocInstance.text).toHaveBeenCalledWith("EXECUTIVE PROJECT REPORT & ROADMAP", 12, 16);
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      "PROJECT: PROYEK ALPHA  |  LEVEL: EXECUTIVE REPORT",
      12,
      24
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      expect.stringContaining("Schedule Coverage:"),
      120,
      43
    );
    expect(mockDocInstance.text).toHaveBeenCalledWith("TOTAL TASKS", 15, 65);
    expect(mockDocInstance.text).toHaveBeenCalledWith("DONE", 63, 65);
    expect(mockDocInstance.text).toHaveBeenCalledWith("EXECUTIVE SUMMARY", 12, expect.any(Number));
    expect(mockDocInstance.text).toHaveBeenCalledWith(
      "EPIC MILESTONE OVERVIEW",
      12,
      expect.any(Number)
    );

    // Verifikasi penyimpanan nama file EN
    expect(mockDocInstance.save).toHaveBeenCalledWith("Executive_Report_Roadmap_ALP.pdf");
    expect(toast.success).toHaveBeenCalledWith("Executive PDF summary exported.", {
      id: "toast-123",
    });
  });
});
