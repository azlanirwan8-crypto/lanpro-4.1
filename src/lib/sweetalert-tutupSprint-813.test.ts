/**
 * #813 — dialog tutup sprint: opsi "Biarkan" kini membawa caveat konsekuensi.
 *
 * Sebelum perbaikan, label radio-nya hanya "Biarkan tugas di sprint ini".
 * Padahal begitu sprint completed, lingkupnya terkunci (#461): tugas yang
 * dibiarkan tidak bisa dipindah lagi tanpa mengembalikan sprint ke planned.
 * Yang diuji di sini: teks peringatan itu HADIR, ia hidup di dalam label
 * leave (bukan menggantung di luar), dan opsi lain tidak ikut berubah.
 */
import Swal from "sweetalert2";
import i18n from "../i18n";
import { confirmCompleteSprintAlert } from "./sweetalert";

jest.mock("sweetalert2", () => ({
  __esModule: true,
  default: { fire: jest.fn() },
}));

const fireMock = Swal.fire as jest.Mock;
const configHtml = () => (fireMock.mock.calls[0][0] as { html: string }).html;

describe("#813 — caveat opsi Biarkan di dialog tutup sprint", () => {
  beforeEach(async () => {
    fireMock.mockReset();
    fireMock.mockResolvedValue({ isDismissed: true });
    await i18n.changeLanguage("id");
  });

  it("html dialog memuat peringatan konsekuensi di dalam label leave", async () => {
    await confirmCompleteSprintAlert("Selesaikan Sprint?", "teks");
    const html = configHtml();

    expect(html).toContain("Tugas yang dibiarkan terkunci di sprint selesai");
    expect(html).toContain('value="leave"');
    expect(html).toContain("Biarkan tugas di sprint ini");

    // Peringatan harus berada DI DALAM label yang sama dengan radio leave —
    // bukan elemen mengambang, supaya terbaca sebagai bagian dari opsi itu.
    const labelLeave = html.match(/<label[\s\S]*?value="leave"[\s\S]*?<\/label>/)?.[0] ?? "";
    expect(labelLeave).toContain("velzon-swal-peringatan");
  });

  it("opsi backlog dan next tidak berubah; peringatan hanya satu", async () => {
    await confirmCompleteSprintAlert("Selesaikan Sprint?", "teks", {
      id: "s-2",
      name: "Fase 2",
    });
    const html = configHtml();

    expect(html).toContain('value="backlog" checked');
    expect(html).toContain('value="next"');
    expect(html).toContain("Fase 2");
    expect(html.match(/velzon-swal-peringatan/g)).toHaveLength(1);
  });

  it("bahasa Inggris memakai caveat versi en", async () => {
    await i18n.changeLanguage("en");
    await confirmCompleteSprintAlert("Complete Sprint?", "text");
    expect(configHtml()).toContain("locked in the completed sprint");
  });
});
