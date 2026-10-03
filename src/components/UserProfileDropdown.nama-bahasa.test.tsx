/**
 * #601 — nama pengguna tampil utuh, dan menu mengikuti bahasa aktif.
 *
 * DUA HAL DIUJUNG KEDUANYA.
 *
 * (1) POTONG. Pemicu header dulu mengunci namanya dengan `truncate
 *     max-w-[120px]`, jadi "Mohamad Rifky Prasetyo" tampil sebagai
 *     "Mohamad Rifky Pra…" — dilaporkan pemilik proyek lewat tangkapan layar.
 *     Daftar opsi `StyledDropdown` lebih parah: lebarnya dipatok persis selebar
 *     pemicunya, jadi nama panjang terpotong dua kali, termasuk di dalam daftar
 *     yang sedang dibuka untuk DIPILIH. Yang diuji di sini adalah kontrak
 *     kelasnya (tidak ada `truncate` pada label nama) karena jsdom tidak
 *     melakukan layout — px-nya tidak bisa diukur di sini, tapi "pemotongnya
 *     masih terpasang" bisa.
 *
 * (2) BAHASA. Semua label menu sudah lewat `t()`, jadi yang diuji adalah
 *     perilakunya saat bahasa ditukar: teks Indonesia tidak boleh tertinggal di
 *     mode English dan sebaliknya.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import i18n from "../i18n";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { StyledDropdown } from "./ui/CommonComponents";

const NAMA = "Mohamad Rifky Prasetyo";

const props = {
  currentUser: { displayName: NAMA, username: "mrifky", role: "Administrator" },
  currentUserProfile: null as any,
  user: null as any,
  userRole: null as any,
  masterData: [] as any[],
  onOpenProfile: jest.fn(),
  handleLogout: jest.fn(),
};

/** Pemicu header: avatar + nama + jabatan + chevron. */
const pemicuHeader = () => screen.getByRole("button", { expanded: false });

describe("UserProfileDropdown — nama tidak dipotong (#601)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("id");
  });
  afterEach(async () => {
    await i18n.changeLanguage("id");
  });

  it("menampilkan nama lengkap di pemicu, tanpa kelas pemotong", () => {
    render(<UserProfileDropdown {...props} />);

    const label = screen.getByText(NAMA);
    expect(label.className).not.toMatch(/truncate|text-ellipsis/);
    expect(label.className).toMatch(/whitespace-nowrap/);
    // Nilai utuh tetap tersedia lewat tooltip untuk keadaan paling sempit sekali pun.
    expect(pemicuHeader().getAttribute("title")).toBe(NAMA);
  });

  it("sapaan di dalam menu tidak memotong nama", () => {
    render(<UserProfileDropdown {...props} />);
    fireEvent.click(pemicuHeader());

    const sapaan = screen.getByText(`Selamat Datang ${NAMA}!`);
    expect(sapaan.className).not.toMatch(/truncate/);
  });
});

describe("UserProfileDropdown — bahasa aktif (#601)", () => {
  const ITEM_ID = ["Profil", "Pesan", "Bantuan", "Keluar"];
  const ITEM_EN = ["Profile", "Messages", "Help", "Logout"];

  const buka = () => {
    render(<UserProfileDropdown {...props} />);
    fireEvent.click(pemicuHeader());
  };

  it("id", async () => {
    await i18n.changeLanguage("id");
    buka();
    ITEM_ID.forEach((teks) => expect(screen.getByRole("menuitem", { name: teks })).toBeTruthy());
    expect(screen.getByText(`Selamat Datang ${NAMA}!`)).toBeTruthy();
    ITEM_EN.filter((t) => t !== "Help").forEach((teks) =>
      expect(screen.queryByRole("menuitem", { name: teks })).toBeNull()
    );
  });

  it("en", async () => {
    await i18n.changeLanguage("en");
    buka();
    ITEM_EN.forEach((teks) => expect(screen.getByRole("menuitem", { name: teks })).toBeTruthy());
    expect(screen.getByText(`Welcome ${NAMA}!`)).toBeTruthy();
    ITEM_ID.forEach((teks) => expect(screen.queryByRole("menuitem", { name: teks })).toBeNull());
  });
});

describe("StyledDropdown — daftar opsi tidak memotong nama (#601)", () => {
  const ANGGOTA = [
    { id: "u1", label: NAMA },
    { id: "u2", label: "Siti" },
  ];

  beforeEach(async () => {
    await i18n.changeLanguage("id");
  });

  it("label opsi tidak membawa pemotong, dan panel boleh melebar melewati lebar pemicunya", () => {
    render(
      <StyledDropdown
        masterData={[]}
        type="member"
        value="u1"
        onChange={jest.fn()}
        options={ANGGOTA}
        members={ANGGOTA as any}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: new RegExp(NAMA) }));

    const daftar = screen.getByRole("listbox");
    const panel = daftar.parentElement!;
    expect(panel.style.width).toBe("max-content");
    expect(panel.style.maxWidth).toBe("min(28rem, 92vw)");
    // Pemicu boleh sempit — tapi daftarnya tidak boleh ikut membatasi namanya.
    expect(panel.style.minWidth).not.toBe("");

    const opsi = screen.getByRole("option", { name: new RegExp(NAMA) });
    // Isinya inisial avatar + nama — yang diuji: nama lengkapnya ada di situ,
    // utuh, dan tidak ada pemotong yang menyembunyikan sisanya.
    expect(opsi.textContent).toContain(NAMA);
    expect(opsi.innerHTML).not.toMatch(/truncate/);
  });

  it("pemicu yang sempit tetap menyimpan nilai utuh di tooltip", () => {
    render(
      <StyledDropdown
        masterData={[]}
        type="member"
        value="u1"
        onChange={jest.fn()}
        options={ANGGOTA}
        members={ANGGOTA as any}
      />
    );
    expect(screen.getByRole("button", { name: new RegExp(NAMA) }).getAttribute("title")).toBe(NAMA);
  });
});
