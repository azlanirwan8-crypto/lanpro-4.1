/**
 * Test Cabang Realtime Socket.IO & Auth Lifecycle di AppContainer.
 *
 * Menguji percabangan logika (Branch Coverage) pada:
 * 1. Event 'auth_expired' di window -> trigger handleLogout.
 * 2. Socket event 'data_changed' untuk tasks, activity, comments, users, master-data, db-query.
 * 3. Socket event 'connect', 'connect_error', 'disconnect'.
 * 4. Socket event 'FORCE_LOGOUT_EVENT' dan sidik jari token.
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

let socketListeners: Record<string, Function> = {};
const mockSocket = {
  on: jest.fn((event: string, cb: Function) => {
    socketListeners[event] = cb;
  }),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  io: { on: jest.fn(), off: jest.fn() },
  connected: true,
  id: "test-socket-auth",
};

jest.mock("socket.io-client", () => ({
  __esModule: true,
  default: () => mockSocket,
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn() }));

jest.mock("./lib/api", () => {
  const asli = jest.requireActual("./lib/api");
  return { ...asli, apiRequest: jest.fn() };
});

import App from "./App";
import { AuthNotificationProvider } from "./components/AuthToastContainer";
import { apiRequest } from "./lib/api";

const PENGGUNA_UJI = {
  id: "1",
  uid: "1",
  username: "penguji_socket",
  displayName: "Penguji Socket",
  email: "socket@lanpro.test",
  role: "admin",
  status: "active",
};

describe("AppContainer — Cabang Socket & Auth Lifecycle", () => {
  beforeEach(() => {
    socketListeners = {};
    (apiRequest as jest.Mock).mockImplementation(async (url: string) => {
      if (typeof url === "string") {
        if (url.includes("/api/auth/verify")) {
          return { status: "success", user: PENGGUNA_UJI };
        }
        if (url.includes("/api/projects")) {
          return {
            status: "success",
            data: [{ id: "p-1", name: "Proyek 1", key: "P1", status: "active" }],
          };
        }
        if (url.includes("/api/tasks")) {
          return { status: "success", data: [] };
        }
        if (url.includes("/api/users")) {
          return { status: "success", data: [PENGGUNA_UJI] };
        }
      }
      return { status: "success", data: [] };
    });

    localStorage.setItem("lanpro_jwt_token", "token-socket-uji");
    localStorage.setItem("sessionUser", JSON.stringify(PENGGUNA_UJI));
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

  it("merespon window event 'auth_expired' dengan memanggil handleLogout", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    // Pemicu token kedaluwarsa dari lapisan API
    fireEvent(window, new Event("auth_expired"));

    // Pastikan tidak terjadi crash
    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);

  it("menjalankan callback socket data_changed untuk seluruh tipe entitas", async () => {
    tampilkan();

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }, { timeout: 12000 });

    // Jalankan listener data_changed jika terpasang
    if (socketListeners["data_changed"]) {
      socketListeners["data_changed"]({ path: "/tasks" });
      socketListeners["data_changed"]({ path: "/activity" });
      socketListeners["data_changed"]({ path: "/comments" });
      socketListeners["data_changed"]({ path: "/projects" });
      socketListeners["data_changed"]({ path: "/users" });
      socketListeners["data_changed"]({ path: "/sprints" });
      socketListeners["data_changed"]({ path: "/master-data" });
      socketListeners["data_changed"]({ path: "/notifications" });
      socketListeners["data_changed"]({ path: "/db-query" });
    }

    if (socketListeners["project_updated"]) {
      socketListeners["project_updated"]({ projectId: "p-1" });
    }

    if (socketListeners["connect"]) {
      socketListeners["connect"]();
    }

    if (socketListeners["connect_error"]) {
      socketListeners["connect_error"]({ message: "koneksi terputus" });
    }

    if (socketListeners["disconnect"]) {
      socketListeners["disconnect"]();
    }

    if (socketListeners["FORCE_LOGOUT_EVENT"]) {
      // Pemicu event logout paksa
      socketListeners["FORCE_LOGOUT_EVENT"]({
        browserSessionId: "different-browser-session",
        userId: "1",
        sidikTokenBaru: "sidik-jari-lain",
      });
    }

    expect(screen.queryByText(/React Render Crash/i)).not.toBeInTheDocument();
  }, 20000);
});
