/**
 * Regresi Item #252 — kedipan jaringan tidak boleh membuang sesi.
 *
 * GEJALA. Pemilik proyek berkali-kali terlempar ke layar Masuk padahal
 * tokennya masih sah. Log server memuat `read ECONNRESET` pada pool
 * PostgreSQL dan kegagalan koneksi Neon; karena putusnya acak, gejalanya
 * terbaca "kadang bisa kadang tidak" dan sempat disangka menu tertentu rusak.
 *
 * SEBABNYA. `verifySession` di `AppContainer` memanggil `handleLogout(true)`
 * untuk SEMUA kegagalan `verifyAuth()`. Ia tidak membedakan "server menolak
 * token" dari "server tidak terjawab" — padahal yang kedua tidak mengatakan
 * apa pun tentang keabsahan sesi.
 *
 * YANG DIKUNCI DI SINI adalah pembedaan itu, dari dua arah sekaligus. Menguji
 * satu arah saja berbahaya: perbaikan yang tidak pernah mengeluarkan siapa pun
 * akan lulus kalau hanya arah pertama yang diperiksa, dan itu justru lubang
 * keamanan — token yang sudah dicabut jadi hidup selamanya.
 *
 * Kenapa lewat `verifyAuth` yang dipalsukan, bukan `fetch`: `apiRequest`
 * mengulang tiga kali dengan backoff, sehingga menjatuhkan `fetch` membuat
 * test berjalan belasan detik tanpa menambah keyakinan apa pun. Yang diuji di
 * sini keputusan AppContainer atas BENTUK galatnya, dan bentuk itu kontrak
 * `ApiError` yang sudah pasti.
 *
 * Ditemukan lewat /qa pada 24 Agu 2026.
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

const verifyAuthMock = jest.fn();
jest.mock("./services/userService", () => ({
  ...jest.requireActual("./services/userService"),
  verifyAuth: (...a: unknown[]) => verifyAuthMock(...a),
}));

import App from "./App";
import { AuthNotificationProvider } from "./components/AuthToastContainer";
import { ApiError } from "./lib/api";

const KUNCI_TOKEN = "lanpro_jwt_token";

function tokenSah() {
  const klaim = { username: "budi", role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 };
  return `x.${btoa(JSON.stringify(klaim)).replace(/=+$/, "")}.y`;
}

const penggunaTersimpan = {
  id: "u-1",
  uid: "u-1",
  username: "budi",
  displayName: "Budi",
  role: "admin",
  permissions: null,
};

/** Keadaan awal: sudah pernah masuk di tab ini, token + profil tersimpan. */
function pasangSesiTersimpan() {
  sessionStorage.setItem(KUNCI_TOKEN, tokenSah());
  sessionStorage.setItem("sessionUser", JSON.stringify(penggunaTersimpan));
}

const diLayarMasuk = () =>
  screen.queryAllByText(/Masuk untuk melanjutkan|Sign in to continue/i).length > 0;

function pasang() {
  return render(
    <AuthNotificationProvider>
      <App />
    </AuthNotificationProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  verifyAuthMock.mockReset();
});

describe("Item #252 — sesi bertahan saat server tidak terjawab", () => {
  it("gagal jaringan (503 networkError): sesi DIPERTAHANKAN dan token tidak dihapus", async () => {
    pasangSesiTersimpan();
    verifyAuthMock.mockRejectedValue(
      new ApiError("Gagal terhubung ke server. Silakan periksa koneksi internet Anda.", 503, {
        networkError: true,
      })
    );

    pasang();

    await waitFor(() => expect(verifyAuthMock).toHaveBeenCalled());
    // Diberi kesempatan seandainya logout-nya tertunda satu-dua putaran.
    await new Promise((r) => setTimeout(r, 60));

    expect(diLayarMasuk()).toBe(false);
    expect(sessionStorage.getItem(KUNCI_TOKEN)).not.toBeNull();
  });

  it("galat server 500 (mis. basis data putus): sesi juga DIPERTAHANKAN", async () => {
    pasangSesiTersimpan();
    verifyAuthMock.mockRejectedValue(new ApiError("Kesalahan internal server", 500, {}));

    pasang();

    await waitFor(() => expect(verifyAuthMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 60));

    expect(diLayarMasuk()).toBe(false);
    expect(sessionStorage.getItem(KUNCI_TOKEN)).not.toBeNull();
  });

  it("token DITOLAK (401): tetap dikeluarkan — arah sebaliknya wajib ikut terkunci", async () => {
    // Tanpa test ini, perbaikan yang tidak pernah mengeluarkan siapa pun akan
    // lulus. Itu bukan perbaikan, itu token yang hidup selamanya.
    pasangSesiTersimpan();
    verifyAuthMock.mockRejectedValue(
      new ApiError("Sesi berakhir. Silakan login kembali.", 401, { authError: true })
    );

    pasang();

    await waitFor(() => expect(sessionStorage.getItem(KUNCI_TOKEN)).toBeNull(), { timeout: 5000 });
  });
});
