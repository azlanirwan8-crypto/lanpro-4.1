/**
 * #552 + #557 — daftar obrolan: hanya asisten yang jadi kanal, dan daftar
 * "Rekan Kerja (DM)" hanya berisi orang yang sedang online, dengan titik hijau
 * ala Facebook di avatarnya.
 *
 * Yang diuji di sini pernah salah di layar:
 *  - "Grup Chat Tim" menempati kanal teratas walau tidak ada yang memakai
 *    percakapan grup di widget ini (diminta dihapus pemilik proyek 26 Sep).
 *  - Daftar presence memakai kunci `uid || id` (PresenceContext) sementara
 *    baris daftar menanyakan `id` — untuk pengguna yang uid-nya berbeda dari
 *    id-nya titik online tidak pernah muncul, seakan semua rekan offline.
 *  - Pemilik proyek menegur hal yang sama 27 Sep: tujuh nama terdaftar, tidak
 *    satu pun bisa diajak bicara. Yang offline sekarang tidak ditampilkan,
 *    KECUALI kalau ia meninggalkan pesan belum dibaca.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../lib/api", () => ({
  apiRequest: jest.fn(async (url: string) => {
    if (String(url).startsWith("/api/chat/unread-counts")) {
      return { status: "success", data: (globalThis as any).__unread || [] };
    }
    return { status: "success", data: [] };
  }),
}));

// Nilai presence dibaca lewat global: factory jest.mock dievaluasi sebelum
// variabel modul sempat terinisialisasi.
jest.mock("../contexts/PresenceContext", () => ({
  usePresence: () => ({
    onlineUserIds: (globalThis as any).__onlineIds || [],
    onlineUsers: [],
    isConnected: true,
    reconnectPresence: async () => {},
  }),
}));

import { LiveChatWidget } from "./LiveChatWidget";
import { apiRequest } from "../lib/api";
import { UserProfile } from "../types";

const aku: UserProfile = {
  id: "u-1",
  uid: "u-1",
  username: "alice",
  displayName: "Alice Aku",
  email: "alice@lanpro.com",
  role: "developer" as any,
  status: "approved",
  passwordHash: "x",
} as UserProfile;

// uid sengaja berbeda dari id: inilah bentuk data yang membuat kunci lama meleset.
const rekan: UserProfile = {
  id: "u-2",
  uid: "77",
  username: "rian",
  displayName: "Rian Hidayat",
  email: "rian@lanpro.com",
  role: "manager" as any,
  status: "approved",
  passwordHash: "x",
} as UserProfile;

const socket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true,
} as any;

const buka = (container: HTMLElement) => {
  fireEvent.click(container.querySelector("button") as Element);
};

const titikOnline = (container: HTMLElement) => container.querySelectorAll("span.bg-emerald-500");

const renderWidget = () =>
  render(<LiveChatWidget socket={socket} currentUser={aku} allUsers={[aku, rekan]} />);

describe("LiveChatWidget — kanal & presence (Item #552, #557)", () => {
  beforeEach(() => {
    (globalThis as any).__onlineIds = [];
    (globalThis as any).__unread = [];
    // resetMocks:true mengosongkan implementasi dari factory jest.mock, jadi
    // bentuk respons harus dipasang ulang di sini.
    (apiRequest as jest.Mock).mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/chat/unread-counts")) {
        return { status: "success", data: (globalThis as any).__unread || [] };
      }
      return { status: "success", data: [] };
    });
  });

  it("tidak lagi menampilkan kanal grup, hanya asisten", () => {
    const { container } = renderWidget();
    buka(container);

    const teks = container.textContent || "";
    expect(teks).not.toContain("Grup Chat Tim");
    expect(teks).toContain("LanPro AI Assistant");
  });

  it("rekan offline tidak lagi menempati daftar", async () => {
    const { container } = renderWidget();
    buka(container);

    await waitFor(() =>
      expect(container.textContent || "").toContain("Tidak ada rekan yang sedang online")
    );
    expect(container.textContent).not.toContain("Rian Hidayat");
    expect(titikOnline(container).length).toBe(0);
  });

  // Kunci presence adalah uid-atau-id; menanyakan salah satunya membuat
  // pengguna ini terbaca offline selamanya — dan setelah #557 namanya hilang
  // dari daftar, bukan cuma titiknya.
  it("rekan yang online muncul, dikenali lewat uid maupun id, lengkap dengan titiknya", async () => {
    (globalThis as any).__onlineIds = ["77"];
    const a = renderWidget();
    buka(a.container);
    await waitFor(() => expect(a.container.textContent).toContain("Rian Hidayat"));
    expect(titikOnline(a.container).length).toBe(1);
    a.unmount();

    (globalThis as any).__onlineIds = ["u-2"];
    const b = renderWidget();
    buka(b.container);
    await waitFor(() => expect(b.container.textContent).toContain("Rian Hidayat"));
    expect(titikOnline(b.container).length).toBe(1);
    b.unmount();
  });

  it("pesan belum dibaca tidak hilang hanya karena pengirimnya offline", async () => {
    (globalThis as any).__unread = [{ senderId: "u-2", count: 2 }];
    const { container } = renderWidget();
    buka(container);

    await waitFor(() => expect(container.textContent).toContain("Rian Hidayat"));
    expect(titikOnline(container).length).toBe(0);
  });
});
