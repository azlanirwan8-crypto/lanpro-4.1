/**
 * Regresi hitung mundur layar sukses SSO — item #166.
 * Ditemukan `/design-review` 24 Agustus 2026.
 *
 * #166 — Setelah pendaftaran berhasil, layar menampilkan "Akun Anda menunggu
 *        persetujuan admin" lalu melempar pengguna ke halaman masuk dalam 5
 *        detik, tanpa cara membatalkan. Justru kalimat itulah yang paling
 *        perlu waktu baca: pengguna baru saja mendaftar dan perlu tahu bahwa
 *        ia BELUM bisa masuk.
 *
 * Perbaikannya: interaksi apa pun menghentikan hitung mundur untuk seterusnya.
 * Tombolnya tetap ada, jadi pengguna yang memang ingin kembali tidak dihalangi.
 */
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import { CompleteRegistrationScreen } from "./CompleteRegistrationScreen";
import { kirimLengkapiPendaftaran } from "./services/sso.service";

jest.mock("./services/sso.service", () => ({
  kirimLengkapiPendaftaran: jest.fn(),
}));

const mockKirim = kirimLengkapiPendaftaran as jest.MockedFunction<typeof kirimLengkapiPendaftaran>;

const buatProps = () => ({
  email: "azlan@example.com",
  onSelesai: jest.fn(),
  onBatal: jest.fn(),
});

/** Membawa layar ke keadaan sukses lewat jalur yang sebenarnya, bukan pintasan. */
const sampaiLayarSukses = async () => {
  const props = buatProps();
  const { container } = render(<CompleteRegistrationScreen {...props} />);

  await act(async () => {
    fireEvent.submit(container.querySelector("form")!);
  });

  await waitFor(() => expect(screen.getByText("Pendaftaran Berhasil")).toBeInTheDocument());
  return props;
};

/**
 * Hitung mundur menjadwalkan tick BERIKUTNYA hanya setelah React me-render
 * ulang, jadi satu lompatan besar tidak menjalankannya sampai habis. Detiknya
 * dimajukan satu per satu, masing-masing dalam `act` sendiri.
 */
const majuDetik = async (jumlah: number) => {
  for (let i = 0; i < jumlah; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
};

describe("#166 hitung mundur layar sukses bisa dihentikan", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockKirim.mockResolvedValue({
      berhasil: true,
      pesan: "Pendaftaran berhasil. Akun Anda menunggu persetujuan admin.",
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("tanpa interaksi, hitung mundur tetap membawa pengguna kembali", async () => {
    const props = await sampaiLayarSukses();

    await majuDetik(6);

    expect(props.onSelesai).toHaveBeenCalled();
  });

  it("interaksi menghentikan hitung mundur dan pengguna TIDAK terlempar", async () => {
    const props = await sampaiLayarSukses();

    // Satu gerakan tetikus sudah cukup — pertanda pengguna masih membaca.
    fireEvent.mouseMove(window);

    await majuDetik(30);

    expect(props.onSelesai).not.toHaveBeenCalled();
  });

  it("kalimat hitung mundur diganti keterangan setelah dihentikan", async () => {
    await sampaiLayarSukses();

    expect(screen.getByText(/Otomatis kembali ke halaman masuk/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Tab" });

    await waitFor(() => {
      expect(screen.queryByText(/Otomatis kembali ke halaman masuk/)).not.toBeInTheDocument();
    });
  });

  it("tombol kembali tetap bekerja setelah hitung mundur dihentikan", async () => {
    const props = await sampaiLayarSukses();

    fireEvent.mouseMove(window);
    fireEvent.click(screen.getByRole("button", { name: /Kembali ke Halaman Masuk/ }));

    expect(props.onSelesai).toHaveBeenCalled();
  });

  it("pesan persetujuan admin tetap tampil selama hitung mundur berjalan", async () => {
    await sampaiLayarSukses();

    await majuDetik(2);

    expect(
      screen.getByText("Pendaftaran berhasil. Akun Anda menunggu persetujuan admin.")
    ).toBeInTheDocument();
  });
});
