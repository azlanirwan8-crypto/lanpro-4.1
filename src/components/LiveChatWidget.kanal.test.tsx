/**
 * #552 — daftar obrolan: hanya asisten yang jadi kanal, dan titik hijau benar-
 * benar berarti orangnya online.
 *
 * Dua hal yang diuji di sini pernah salah di layar:
 *  - "Grup Chat Tim" menempati kanal teratas walau tidak ada tim yang memakai
 *    percakapan grup di widget ini (diminta dihapus pemilik proyek 26 Sep).
 *  - Daftar presence memakai kunci `uid || id` (PresenceContext) sementara
 *    baris daftar menanyakan `id` — untuk pengguna yang uid-nya berbeda dari
 *    id-nya titik online tidak pernah muncul, seakan semua rekan offline.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";

jest.mock("../lib/api", () => ({
  apiRequest: jest.fn(async () => ({ status: "success", data: [] })),
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

describe("LiveChatWidget — kanal & presence (Item #552)", () => {
  beforeEach(() => {
    (globalThis as any).__onlineIds = [];
  });

  it("tidak lagi menampilkan kanal grup, hanya asisten", () => {
    const { container } = renderWidget();
    buka(container);

    const teks = container.textContent || "";
    expect(teks).not.toContain("Grup Chat Tim");
    expect(teks).toContain("LanPro AI Assistant");
    expect(teks).toContain("Rian Hidayat");
  });

  it("rekan tanpa presence tidak diberi penanda", () => {
    const { container } = renderWidget();
    buka(container);

    expect(titikOnline(container).length).toBe(0);
  });

  // Kunci presence adalah uid-atau-id; menanyakan salah satunya membuat
  // pengguna ini terbaca offline selamanya.
  it("rekan yang ada di daftar presence diberi penanda, lewat uid maupun id", () => {
    (globalThis as any).__onlineIds = ["77"];
    const a = renderWidget();
    buka(a.container);
    expect(titikOnline(a.container).length).toBeGreaterThan(0);
    a.unmount();

    (globalThis as any).__onlineIds = ["u-2"];
    const b = renderWidget();
    buka(b.container);
    expect(titikOnline(b.container).length).toBeGreaterThan(0);
    b.unmount();
  });
});
