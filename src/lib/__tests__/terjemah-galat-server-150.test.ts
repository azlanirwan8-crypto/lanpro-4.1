/**
 * @jest-environment jsdom
 */
import i18n from "../../i18n/index";
import { apiRequest } from "../api";

/**
 * #150 — titik cekik terjemahan galat server, diuji lewat jalur produksi.
 *
 * Verifikasi lewat antarmuka tidak dapat menjangkau sebagian besar pesan ini:
 * banyak yang dijaga validasi sisi klien atau berada di balik sesi masuk, dan
 * pemilik proyek sendiri yang harus masuk (AGENTS.md §3). Yang benar-benar
 * perlu dibuktikan adalah bahwa `apiRequest` menukar `code` dari server menjadi
 * kalimat berbahasa aktif — dan itu dibuktikan di sini, tanpa menebak.
 */
const responsGalat = (badan: unknown) =>
  Promise.resolve({
    ok: false,
    status: 400,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(badan),
    text: () => Promise.resolve(JSON.stringify(badan)),
  } as unknown as Response);

const pesanDari = async () => {
  try {
    await apiRequest("/api/uji", {}, 0);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

describe("#150 terjemahan galat server", () => {
  const aslinya = global.fetch;
  const bahasaAwal = i18n.language;

  afterEach(async () => {
    global.fetch = aslinya;
    await i18n.changeLanguage(bahasaAwal);
  });

  const pasang = (badan: unknown) => {
    global.fetch = (() => responsGalat(badan)) as unknown as typeof fetch;
  };

  it("kode non-auth diterjemahkan mengikuti bahasa aktif", async () => {
    pasang({ code: "srv.alamat_email_tidak_valid", message: "Alamat email tidak valid." });

    await i18n.changeLanguage("id");
    const id = await pesanDari();
    await i18n.changeLanguage("en");
    const en = await pesanDari();

    expect(id).toBe("Alamat email tidak valid.");
    expect(en).toBe("Invalid email address.");
    expect(id).not.toBe(en);
  });

  it("kode bertitik panjang tetap terambil, bukan jatuh ke pesan bawaan server", async () => {
    // Titik adalah pemisah tingkat di i18next; kunci datar bertitik hanya
    // terambil lewat penggabungan ulang jalur. Bila perilaku itu berubah,
    // pesannya diam-diam kembali berbahasa Indonesia di layar Inggris.
    pasang({
      code: "srv.akses_ditolak_anda_hanya_5",
      message: "Akses ditolak: Anda hanya dapat memperbarui foto profil Anda sendiri.",
    });
    await i18n.changeLanguage("en");
    expect(await pesanDari()).toBe("Access denied: you can only update your own profile photo.");
  });

  it("kode yang belum dikenal kamus jatuh ke pesan bawaan server", async () => {
    pasang({ code: "srv.kode_yang_tidak_pernah_ada", message: "Pesan bawaan server." });
    await i18n.changeLanguage("en");
    expect(await pesanDari()).toBe("Pesan bawaan server.");
  });
});
