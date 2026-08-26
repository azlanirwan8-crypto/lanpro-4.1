/**
 * Regresi untuk Item #155 dan #156 — layar detail pengguna.
 *
 * KENAPA TEST INI ADA, DAN KENAPA BENTUKNYA BEGINI.
 *
 * Kedua perbaikan ini hidup di halaman yang hanya bisa dibuka admin yang sudah
 * login. Verifikasi lewat peramban karena itu menuntut kredensial sungguhan —
 * yang tidak boleh dipakai. Jadi buktinya diambil dengan me-render komponennya
 * langsung: yang diuji adalah DOM yang benar-benar dihasilkan, bukan pembacaan
 * kode.
 *
 * Yang dikunci di sini bukan "komponennya ter-render", melainkan dua janji yang
 * gampang hilang senyap saat seseorang menyunting JSX-nya nanti:
 *
 *   #155 — input sandi WAJIB `type="password"`. Sebelumnya `type="text"`
 *          polos, sehingga sandi baru terbaca telanjang di layar dan ikut
 *          terekam saat layar dibagikan. Regresinya tidak akan terlihat oleh
 *          test mana pun yang cuma memeriksa "inputnya ada".
 *
 *   #156 — sel matriks izin WAJIB non-interaktif. Bila suatu saat seseorang
 *          mengembalikannya jadi <button>, panelnya kembali menjanjikan
 *          penegakan yang backend-nya tidak punya (hanya `list.update` dan
 *          `list.delete` yang benar-benar ditegakkan, 2 sel dari 96).
 *
 * Ditemukan lewat /qa pada 23 Agu 2026.
 */
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { UserDetailView } from "./UserDetailView";
import type { UserProfile } from "../../types";

// Komponen memanggil backend saat mount (daftar peran, master data). Test ini
// tidak menguji jaringan, jadi fetch-nya dibungkam — kalau dibiarkan, Jest
// mencatat unhandled rejection dan pesannya menutupi kegagalan yang sebenarnya.
beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: "success", data: [] }),
    })
  ) as unknown as typeof fetch;
});

const buatPengguna = (peran: string): UserProfile =>
  ({
    id: "u-1",
    uid: "u-1",
    username: "budi",
    displayName: "Budi",
    email: "budi@contoh.test",
    role: peran,
    status: "approved",
    permissions: null,
  }) as unknown as UserProfile;

const renderDetail = (peranPengguna: string, peranPeninjau: string) =>
  render(
    <UserDetailView
      user={buatPengguna(peranPengguna)}
      currentUser={buatPengguna(peranPeninjau)}
      onBack={() => {}}
      projects={[]}
      tasks={[]}
    />
  );

// Item #187 — layar ini kini dua mode: LIHAT (baca-saja, bawaan) dan EDIT
// (bertab: Personal Detail / Change Password / Project / Settings), dibuka
// lewat tombol "Edit Profil". Field sandi & matriks izin yang dulu selalu
// terlihat kini ada di mode edit, di balik tab masing-masing.
const bukaTab = (namaTab: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name: /edit profil|edit profile/i }));
  fireEvent.click(screen.getByRole("button", { name: namaTab }));
};

describe("Item #155 — input Perbarui Kata Sandi", () => {
  it("dibulatkan secara bawaan, bukan teks telanjang", () => {
    const { container } = renderDetail("user", "admin");
    bukaTab(/ubah kata sandi|change password/i);

    // Diambil lewat selektor atribut, BUKAN lewat getByRole("textbox"):
    // input bertipe password sengaja tidak punya role textbox, jadi query
    // itu justru akan hijau untuk keadaan yang salah.
    const sandi = container.querySelector<HTMLInputElement>('input[type="password"]');

    expect(sandi).not.toBeNull();
    expect(sandi!.getAttribute("type")).toBe("password");
  });

  it("tombol mata membuka lalu menutup kembali", () => {
    const { container } = renderDetail("user", "admin");
    bukaTab(/ubah kata sandi|change password/i);

    const newPasswordInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="Kosongkan jika tidak diubah..."], input[placeholder="Leave blank to keep current..."]'
    );
    expect(newPasswordInput).not.toBeNull();
    expect(newPasswordInput!.type).toBe("password");

    const tombol = screen.getByRole("button", { name: /tampilkan kata sandi|show password/i });

    fireEvent.click(tombol);
    expect(newPasswordInput!.type).toBe("text");

    // Menutup kembali diuji terpisah: pernah ada bentuk toggle yang hanya
    // bekerja satu arah karena state-nya disetel `true`, bukan dibalik.
    fireEvent.click(screen.getByRole("button", { name: /sembunyikan kata sandi|hide password/i }));
    expect(newPasswordInput!.type).toBe("password");
  });
});

describe("Item #156 — panel Izin Sistem Aktif & Penimpaan", () => {
  it("selnya tidak bisa diklik", () => {
    renderDetail("user", "admin");
    bukaTab(/pengaturan|settings/i);

    const judul = screen.getByText(/Izin Sistem Aktif & Penimpaan|Active System Permissions/i);
    const panel = judul.closest("div")!.parentElement!.parentElement!;
    const tabels = within(panel).getAllByRole("table");

    // Nol tombol di dalam seluruh tabel matriks grup. Ini yang membedakan panel baca-saja
    // dari panel yang sekadar terlihat pucat.
    tabels.forEach((tabel) => {
      expect(within(tabel).queryAllByRole("button")).toHaveLength(0);
    });
  });

  it("tidak lagi menawarkan Setel Ulang ke Peran Bawaan", () => {
    renderDetail("user", "admin");
    bukaTab(/pengaturan|settings/i);

    expect(
      screen.queryByRole("button", { name: /setel ulang ke peran bawaan|reset role default/i })
    ).toBeNull();
  });

  it("menyebut peran sebagai sumber kebenaran, bukan centangnya", () => {
    renderDetail("user", "admin");
    bukaTab(/pengaturan|settings/i);

    expect(screen.getByText(/panel ini baca-saja|this panel is read-only/i)).toBeInTheDocument();
  });
});
