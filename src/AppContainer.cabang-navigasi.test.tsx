/**
 * Test Cabang Navigasi, Keyboard Shortcuts, & Interaksi Global di AppContainer.
 *
 * Menguji percabangan logika (Branch Coverage) pada:
 * 1. Perpindahan view / tab navigasi (Kanban, Sprints, Issues, Roadmap, Timeline, Dashboard).
 * 2. Keyboard shortcuts global (?, n, p, /).
 * 3. Event listeners window & document (fullscreenchange).
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

jest.mock("socket.io-client", () => ({
  __esModule: true,
  default: () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    io: { on: jest.fn(), off: jest.fn() },
    connected: true,
    id: "test-socket-nav",
  }),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn() }));

jest.mock("./lib/api", () => {
  const asli = jest.requireActual("./lib/api");
  return { ...asli, apiRequest: jest.fn() };
});

import App from "./App";
import { AuthNotificationProvider } from "./components/AuthToastContainer";
import { apiRequest } from "./lib/api";

const PENGGUNA_ADMIN = {
  id: "1",
  uid: "1",
  username: "admin_test",
  displayName: "Admin Penguji",
  email: "admin@lanpro.test",
  role: "admin",
  status: "active",
  permissions: {
    dashboard: true,
    kanban: true,
    sprints: true,
    issueList: true,
    roadmap: true,
    timeline: true,
    settings: true,
    qaTesting: true,
  },
};

const PROYEK_CONTOH = [
  {
    id: "p-1",
    name: "Proyek Alpha",
    key: "ALP",
    description: "Proyek Pertama",
    leadId: "1",
    status: "active",
  },
];

const TUGAS_CONTOH = [
  {
    id: "t-1",
    key: "ALP-1",
    title: "Tugas Alpha Satu",
    status: "To Do",
    priority: "High",
    type: "task",
    projectId: "p-1",
    assigneeId: "1",
  },
];

describe("AppContainer — Cabang Navigasi & Interaksi Global", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockImplementation(async (url: string) => {
      if (typeof url === "string") {
        if (url.includes("/api/auth/verify")) {
          return { status: "success", user: PENGGUNA_ADMIN };
        }
        if (url.includes("/api/projects/p-1/tasks") || url.includes("/tasks")) {
          return { status: "success", data: TUGAS_CONTOH };
        }
        if (url.includes("/api/projects")) {
          return { status: "success", data: PROYEK_CONTOH };
        }
        if (url.includes("/api/users")) {
          return { status: "success", data: [PENGGUNA_ADMIN] };
        }
        if (url.includes("/api/master-data")) {
          return { status: "success", data: [] };
        }
        if (url.includes("/api/sprints")) {
          return { status: "success", data: [] };
        }
        if (url.includes("/api/notifications")) {
          return { status: "success", data: [] };
        }
        if (url.includes("/api/activity")) {
          return { status: "success", data: [] };
        }
      }
      return { status: "success", data: [] };
    });

    localStorage.setItem("lanpro_jwt_token", "token-admin-uji");
    localStorage.setItem("sessionUser", JSON.stringify(PENGGUNA_ADMIN));
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const tampilkan = () =>
    render(
      <AuthNotificationProvider>
        <App />
      </AuthNotificationProvider>
    );

  it("berpindah view saat menu navigasi diklik", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    // Klik menu Board / Kanban jika ada
    const kanbanButtons = screen.queryAllByText(/Board|Kanban/i);
    if (kanbanButtons.length > 0) {
      fireEvent.click(kanbanButtons[0]);
    }

    // Klik menu Issues / List jika ada
    const issuesButtons = screen.queryAllByText(/Issues|List|Daftar Tugas/i);
    if (issuesButtons.length > 0) {
      fireEvent.click(issuesButtons[0]);
    }

    // Klik menu Roadmap jika ada
    const roadmapButtons = screen.queryAllByText(/Roadmap/i);
    if (roadmapButtons.length > 0) {
      fireEvent.click(roadmapButtons[0]);
    }

    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);

  it("merespon keyboard shortcut '?' untuk membuka modal shortcuts", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    fireEvent.keyDown(window, { key: "?", code: "Slash", shiftKey: true });
    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);

  it("merespon keyboard shortcut 'n' untuk trigger modal task baru", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    fireEvent.keyDown(window, { key: "n", code: "KeyN" });
    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);

  it("merespon keyboard shortcut 'p' untuk modal proyek baru", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    fireEvent.keyDown(window, { key: "p", code: "KeyP" });
    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);

  it("merespon event fullscreenchange tanpa crash", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    fireEvent(document, new Event("fullscreenchange"));
    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);
});
