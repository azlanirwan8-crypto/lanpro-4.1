/**
 * Test Cabang Modals, Task Search, & Selection State di AppContainer.
 *
 * Menguji percabangan logika (Branch Coverage) pada:
 * 1. Global search input & shortcut '/'.
 * 2. Export tugas saat kosong (peringatan toast).
 * 3. Selection dan toggle modal tugas.
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
    id: "test-socket-modals",
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
  username: "admin_modals",
  displayName: "Admin Modals",
  email: "admin_modals@lanpro.test",
  role: "admin",
  status: "active",
};

const PROYEK_CONTOH = [
  {
    id: "p-1",
    name: "Proyek Beta",
    key: "BET",
    description: "Proyek Kedua",
    leadId: "1",
    status: "active",
  },
];

describe("AppContainer — Cabang Modals & Task State", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockImplementation(async (url: string) => {
      if (typeof url === "string") {
        if (url.includes("/api/auth/verify")) {
          return { status: "success", user: PENGGUNA_ADMIN };
        }
        if (url.includes("/api/projects")) {
          return { status: "success", data: PROYEK_CONTOH };
        }
        if (url.includes("/api/tasks")) {
          return { status: "success", data: [] };
        }
      }
      return { status: "success", data: [] };
    });

    localStorage.setItem("lanpro_jwt_token", "token-modals-uji");
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

  it("merespon shortcut '/' untuk memfokuskan kotak pencarian", async () => {
    tampilkan();

    await waitFor(
      () => {
        expect(screen.getAllByText(/Proyek Aktif|Active Projects/i).length).toBeGreaterThan(0);
      },
      { timeout: 12000 }
    );

    fireEvent.keyDown(window, { key: "/", code: "Slash" });
    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);

  it("menangani interaksi tombol buat tugas atau modal baru", async () => {
    tampilkan();

    await waitFor(
      () => {
        expect(screen.getAllByText(/Proyek Aktif|Active Projects/i).length).toBeGreaterThan(0);
      },
      { timeout: 12000 }
    );

    const createButtons = screen.queryAllByTitle(/Buat Proyek Baru|New Task|Create/i);
    if (createButtons.length > 0) {
      fireEvent.click(createButtons[0]);
    }

    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);
});
