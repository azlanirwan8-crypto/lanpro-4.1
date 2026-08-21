/**
 * Cabang pemulihan sesi `AppContainer` yang belum pernah dijalankan test.
 *
 * KENAPA CABANG, BUKAN SEKADAR TAMBAHAN TEST. §19.30 mengukur `AppContainer`:
 * pernyataan 23,7% tetapi **cabang 8,2%**. Jarak antara keduanya berarti test
 * yang ada membuktikan komponennya BISA TAMPIL, bukan bahwa ia BEKERJA BENAR.
 * Menambah test smoke akan menaikkan jumlah test tanpa menyentuh angka yang
 * penting.
 *
 * DUA CABANG DI BAWAH DIVALIDASI DULU DI SUMBERNYA (`AppContainer.tsx:480-493`)
 * sebelum testnya ditulis, bukan diduga dari nama fungsinya:
 *
 *   1. `safeSessionStorage.getItem(...) || safeLocalStorage.getItem(...)`
 *      Test yang ada hanya mengisi localStorage, sehingga sisi KIRI `||` —
 *      jalur "jangan ingat saya" — tidak pernah dijalankan.
 *
 *   2. `try { JSON.parse(sessionPayload) } catch { console.error(...) }`
 *      Cabang `catch` tidak pernah dijalankan. Padahal isi storage bisa rusak
 *      karena versi lama, penyuntingan manual, atau penulisan yang terpotong —
 *      dan bila ia membuat aplikasi crash, pengguna terkunci di layar putih
 *      tanpa cara memulihkan diri selain membersihkan storage lewat devtools.
 *
 * Harness-nya sengaja menempuh jalur produksi yang sebenarnya (menyemai
 * storage), bukan memalsukan `useAuth` — sama seperti
 * `AppContainer.loggedin.test.tsx`, dengan alasan yang sama.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("socket.io-client", () => ({
  __esModule: true,
  default: () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    io: { on: jest.fn(), off: jest.fn() },
    connected: false,
    id: "test-socket",
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

const PENGGUNA_UJI = {
  id: "1",
  uid: "1",
  username: "penguji",
  displayName: "Pengguna Uji",
  email: "penguji@lanpro.test",
  role: "admin",
  status: "active",
};

const tampilkan = () =>
  render(
    <AuthNotificationProvider>
      <App />
    </AuthNotificationProvider>
  );

beforeEach(() => {
  // resetMocks: true di jest.config.cjs menghapus implementasi mock, jadi ia
  // WAJIB dipasang di sini dan bukan di dalam factory `jest.mock`.
  (apiRequest as jest.Mock).mockImplementation(async (url: string) => {
    if (typeof url === "string" && url.includes("/api/auth/verify")) {
      return { status: "success", user: PENGGUNA_UJI };
    }
    return { status: "success", data: [] };
  });
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("pemulihan sesi dari sessionStorage — jalur 'jangan ingat saya'", () => {
  it("memulihkan sesi saat token dan profil sama-sama di sessionStorage (localStorage benar-benar kosong)", async () => {
    sessionStorage.setItem("lanpro_jwt_token", "token-uji");
    sessionStorage.setItem("sessionUser", JSON.stringify(PENGGUNA_UJI));
    expect(localStorage.getItem("lanpro_jwt_token")).toBeNull();
    expect(localStorage.getItem("sessionUser")).toBeNull();

    tampilkan();

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument(), {
      timeout: 12000,
    });
    expect(
      screen.queryByText(/Masuk untuk melanjutkan ke LanPro Workspace/i)
    ).not.toBeInTheDocument();
  }, 20000);

  it("memulihkan sesi walau localStorage KOSONG", async () => {
    localStorage.setItem("lanpro_jwt_token", "token-uji");
    sessionStorage.setItem("sessionUser", JSON.stringify(PENGGUNA_UJI));
    expect(localStorage.getItem("sessionUser")).toBeNull();

    tampilkan();

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument(), {
      timeout: 12000,
    });
    expect(
      screen.queryByText(/Masuk untuk melanjutkan ke LanPro Workspace/i)
    ).not.toBeInTheDocument();
  }, 20000);
});

describe("isi storage yang RUSAK tidak boleh mengunci pengguna", () => {
  it("JSON rusak tidak membuat aplikasi crash", async () => {
    localStorage.setItem("lanpro_jwt_token", "token-uji");
    localStorage.setItem("sessionUser", "{ini-bukan-json");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => tampilkan()).not.toThrow();

    // React melaporkan kegagalan render lewat console.error, bukan lewat
    // lemparan. Tanpa pemeriksaan ini, komponen yang crash tetap lolos.
    await waitFor(() => {
      const gagalRender = errorSpy.mock.calls.filter((c) =>
        String(c[0]).includes("The above error occurred")
      );
      expect(gagalRender).toHaveLength(0);
    });

    errorSpy.mockRestore();
  });

  it("kegagalannya DICATAT, bukan ditelan diam-diam", async () => {
    localStorage.setItem("lanpro_jwt_token", "token-uji");
    localStorage.setItem("sessionUser", "{ini-bukan-json");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    tampilkan();

    // Tanpa catatan ini, sesi yang gagal dipulihkan terlihat sama persis
    // dengan pengguna yang memang belum pernah login.
    await waitFor(() => {
      const dicatat = errorSpy.mock.calls.some((c) =>
        String(c[0]).includes("Failed to restore session")
      );
      expect(dicatat).toBe(true);
    });

    errorSpy.mockRestore();
  });

  it("pengguna diantar ke layar login, bukan ke layar kosong", async () => {
    // Inilah yang membuat cabang ini penting: pengguna dengan storage rusak
    // harus punya jalan keluar tanpa membuka devtools.
    localStorage.setItem("sessionUser", "{ini-bukan-json");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    tampilkan();

    await waitFor(
      () =>
        expect(
          screen.getByText(/Masuk untuk melanjutkan ke LanPro Workspace/i)
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );

    errorSpy.mockRestore();
  });
});
