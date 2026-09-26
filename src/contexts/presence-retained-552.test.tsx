/**
 * #552 — snapshot presence di localStorage ada supaya tumpukan avatar tidak
 * berkedip saat satu respons kosong. Tanpa batas umur ia berubah jadi bohong:
 * orang yang keluar sejak kemarin masih ditandai online, dan itu persis yang
 * dibaca pengguna dari titik hijau di daftar obrolan.
 */
import React from "react";
import { render, waitFor } from "@testing-library/react";

jest.mock("../lib/api", () => ({
  apiRequest: jest.fn(async () => ({ status: "success", onlineUsers: [], allUsers: [] })),
}));

import { PresenceProvider, usePresence } from "./PresenceContext";
import { UserProfile } from "../types";

const aku: UserProfile = {
  id: "u-1",
  uid: "u-1",
  username: "alice",
  displayName: "Alice",
  email: "a@lanpro.com",
  role: "developer" as any,
  status: "approved",
  passwordHash: "x",
} as UserProfile;

const rekan: UserProfile = {
  id: "u-2",
  uid: "77",
  username: "rian",
  displayName: "Rian",
  email: "r@lanpro.com",
  role: "manager" as any,
  status: "approved",
  passwordHash: "x",
} as UserProfile;

const Perekam: React.FC = () => {
  const { onlineUserIds } = usePresence();
  return <span data-testid="ids">{onlineUserIds.join(",")}</span>;
};

const seed = (umurMs: number) => {
  window.localStorage.setItem(
    "lanpro_last_online_users",
    JSON.stringify({ disimpan: Date.now() - umurMs, daftar: [rekan] })
  );
};

const pasang = () =>
  render(
    <PresenceProvider
      currentUser={aku}
      socket={{ on: jest.fn(), off: jest.fn(), emit: jest.fn(), connected: false } as any}
      allUsers={[aku, rekan]}
    >
      <Perekam />
    </PresenceProvider>
  );

describe("PresenceContext — umur snapshot retained (Item #552)", () => {
  beforeEach(() => window.localStorage.clear());

  it("memakai snapshot yang masih segar", async () => {
    seed(0);
    const { getByTestId } = pasang();
    await waitFor(() => expect(getByTestId("ids").textContent).toContain("77"));
  });

  it("membuang snapshot yang sudah lewat dua menit", async () => {
    seed(121000);
    const { getByTestId } = pasang();
    await waitFor(() => expect(getByTestId("ids").textContent).not.toContain("77"));
    expect(getByTestId("ids").textContent).toContain("u-1");
  });

  // Format lama menyimpan array telanjang tanpa cap waktu: umurnya tidak
  // diketahui, jadi tidak boleh dipercaya.
  it("format lama tanpa cap waktu dianggap kedaluwarsa", async () => {
    window.localStorage.setItem("lanpro_last_online_users", JSON.stringify([rekan]));
    const { getByTestId } = pasang();
    await waitFor(() => expect(getByTestId("ids").textContent).not.toContain("77"));
  });
});
