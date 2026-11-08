/**
 * @jest-environment jsdom
 *
 * #815 — potongan JS yang gagal dimuat sesudah deploy dijawab dengan muat ulang
 * SEKALI per tab. Bila penandanya tidak bekerja, halaman yang berkasnya memang
 * hilang akan memuat ulang tanpa henti; bila pendengar ini tidak ada, galatnya
 * diteruskan ke ErrorBoundary dan pengguna melihat layar rusak padahal satu
 * muat ulang cukup.
 */
import { pasangMuatUlangAset } from "./muatUlangAset";

const KUNCI = "aset-muat-ulang";

describe("Pemulihan aset yang gagal dimuat (#815)", () => {
  let reload: jest.Mock;
  let lepas: () => void;

  const kirimGalatPreload = () => {
    const peristiwa = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(peristiwa);
    return peristiwa;
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    reload = jest.fn();
    lepas = pasangMuatUlangAset(reload);
  });

  afterEach(() => {
    lepas();
  });

  it("memuat ulang sekali dan menghentikan galat agar tidak sampai ke ErrorBoundary", () => {
    const peristiwa = kirimGalatPreload();

    expect(peristiwa.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(KUNCI)).toBeTruthy();
  });

  it("tidak memuat ulang lagi bila berkasnya tetap tidak ada — tidak ada lingkaran", () => {
    kirimGalatPreload();
    kirimGalatPreload();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("menghormati penanda yang sudah ada sebelum pendengar dipasang", () => {
    lepas();
    window.sessionStorage.setItem(KUNCI, "1");
    lepas = pasangMuatUlangAset(reload);

    kirimGalatPreload();

    expect(reload).not.toHaveBeenCalled();
  });

  it("berhenti mendengar sesudah dibongkar", () => {
    lepas();
    const peristiwa = kirimGalatPreload();

    expect(reload).not.toHaveBeenCalled();
    expect(peristiwa.defaultPrevented).toBe(false);
  });
});
