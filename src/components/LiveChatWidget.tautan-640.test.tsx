/**
 * #640 — teks percakapan tidak boleh jadi tempat menaruh skrip.
 *
 * Pemindai lampiran di `LiveChatWidget` menerima pesan apa pun yang DIAWALI
 * `[FILE:` / `[IMAGE:` (bukan hanya pesan yang benar-benar dikirim lewat tombol
 * lampir), jadi orang yang bisa menulis ke percakapan ini bisa mengetik format
 * itu sebagai teks biasa. Dua jalur eksekusi yang dikunci di sini:
 *
 * 1. `href={url}` tanpa saring skema -> tautan `javascript:` siap diklik.
 * 2. `window.open()` + `document.write(\`<img src="${url}" .../>\`)` -> satu
 *    tanda kutip menutup atribut src, dan skrip berjalan di popup yang
 *    ber-origin SAMA dengan aplikasi (about:blank mewarisi origin pembuka).
 *    Merah terbukti sebelum perbaikan: popup menerima
 *    `<img src="" onload="alert(1)" .../>`.
 *
 * Yang diuji lewat render dan klik sungguhan, bukan pembacaan sumber: dua-duanya
 * adalah aksi pengguna (membuka obrolan, klik gambar). Kalau keputusan skema
 * ada di fungsi murni tapi komponennya tidak memanggilnya, test ini tetap merah.
 *
 * Lampiran yang SAH ikut diuji. Menutup XSS dengan membuat tombol unduh mati
 * bukanlah perbaikan; itu memindahkan kerugian ke pengguna.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../contexts/PresenceContext", () => ({
  usePresence: () => ({
    onlineUserIds: [],
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

const PDF_SAH = "data:application/pdf;base64,JVBERi0xLjQK";
const PNG_SAH = "data:image/png;base64,iVBORw0KGgo=";

/**
 * Popup palsu berisi HANYA anggota yang dipakai kode obrolan. Bentuknya juga
 * mengunci Cara yang benar: elemen dibuat lewat `createElement` lalu dipasang
 * lewat `appendChild` — bukan deretan HTML yang ditulis sebagai teks.
 */
const buatPopup = () => {
  const dipasang: any[] = [];
  const write = jest.fn();
  return {
    pasangannya: dipasang,
    write,
    popup: {
      document: {
        write,
        createElement: (tag: string) => document.createElement(tag),
        body: { appendChild: (el: any) => dipasang.push(el) },
      },
    } as any,
  };
};

const pesan = (isi: string) => ({
  id: `m-${Math.random().toString(36).slice(2)}`,
  senderId: "lanpro-ai",
  receiverId: "u-1",
  message: isi,
  timestamp: new Date().toISOString(),
  read: true,
});

/** Buka widget, masuk ke kanal asisten, dan tunggu riwayatnya tampil. */
const bukaPercakapan = async (isiPesan: string[], namaTampil: string) => {
  (apiRequest as jest.Mock).mockImplementation(async (url: string) => {
    if (String(url).startsWith("/api/chat/messages?")) {
      return { status: "success", data: isiPesan.map(pesan) };
    }
    return { status: "success", data: [] };
  });

  const hasil = render(
    <LiveChatWidget
      socket={{ on: jest.fn(), off: jest.fn(), emit: jest.fn(), connected: true } as any}
      currentUser={aku}
      allUsers={[aku]}
    />
  );

  fireEvent.click(hasil.container.querySelector("button") as Element);
  const label = Array.from(hasil.container.querySelectorAll("span")).find(
    (s) => s.textContent === "LanPro AI Assistant"
  );
  if (!label) throw new Error("kanal asisten tidak muncul di daftar");
  fireEvent.click(label);

  // Nama lampiran dipakai sebagai penanda "selesai muat" untuk SEMUA kasus,
  // termasuk kasus tertolak yang memang tidak boleh merender apa pun.
  await waitFor(() => expect(hasil.container.textContent).toContain(namaTampil));
  return hasil;
};

describe("LiveChatWidget — isi pesan tidak bisa jadi skrip (Item #640)", () => {
  beforeAll(() => {
    // jsdom tidak mengimplementasikan scrollIntoView; efek gelinding pesan
    // memanggilnya begitu riwayat muncul. Tidak ada hubungannya dengan skema.
    (Element.prototype as any).scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    (apiRequest as jest.Mock).mockReset();
  });

  it("lampiran javascript: tidak pernah masuk ke href", async () => {
    const { container } = await bukaPercakapan(
      ["[FILE: javascript:alert(document.cookie) | tagihan.pdf]"],
      "tagihan.pdf"
    );

    expect(container.querySelectorAll('a[href^="javascript:"]')).toHaveLength(0);
    expect(container.querySelectorAll("a")).toHaveLength(0);
    // Tidak boleh diam-diam hilang: nama berkasnya tetap terbaca.
    expect(container.textContent).toContain("tagihan.pdf");
  });

  it("lampiran data URL yang sah masih bisa diunduh", async () => {
    const { container } = await bukaPercakapan([`[FILE: ${PDF_SAH} | sah.pdf]`], "sah.pdf");

    const unduh = Array.from(container.querySelectorAll("a")).find((a) =>
      (a.getAttribute("href") || "").startsWith("data:application/pdf")
    );
    if (!unduh) throw new Error(`lampiran sah tidak bisa diunduh: href tak ditemukan`);
    expect(unduh.getAttribute("rel")).toContain("noopener");
  });

  it("gambar bersetrip kutip tidak meraih layar maupun popup", async () => {
    const { container } = await bukaPercakapan(
      ['[IMAGE: " onload="alert(1) | jebolt.png]'],
      "jebolt.png"
    );
    const { popup, write } = buatPopup();
    const buka = jest.spyOn(window, "open").mockReturnValue(popup);

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("jebolt.png");
    expect(write).not.toHaveBeenCalled();
    expect(buka).not.toHaveBeenCalled();
    buka.mockRestore();
  });

  it("klik gambar yang sah membuka peninjauan lewat elemen, bukan HTML teks", async () => {
    const { container } = await bukaPercakapan([`[IMAGE: ${PNG_SAH} | sah.png]`], "sah.png");
    const { popup, write, pasangannya } = buatPopup();
    const buka = jest.spyOn(window, "open").mockReturnValue(popup);

    const gambar = container.querySelector("img") as HTMLImageElement;
    if (!gambar) throw new Error("gambar sah tidak dirender");
    fireEvent.click(gambar);

    expect(write).not.toHaveBeenCalled();
    expect(pasangannya).toHaveLength(1);
    expect(pasangannya[0].tagName).toBe("IMG");
    expect(pasangannya[0].getAttribute("src")).toBe(PNG_SAH);
    buka.mockRestore();
  });
});
