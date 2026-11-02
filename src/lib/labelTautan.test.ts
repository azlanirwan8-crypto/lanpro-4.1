/**
 * #648 — label manusia untuk tautan berkas.
 *
 * Angka yang diuji adalah baris yang benar-benar ada di screenshot pemilik
 * proyek 06 Okt: alamat SharePoint ±200 karakter yang tidak muat dibaca di
 * kartu mana pun.
 */
import { labelTautan } from "./labelTautan";

const URL_SHAREPOINT =
  "https://bankbniitbk-my.sharepoint.com/p/r/personal/56910_br_bni_co_id/Documents/DAC%20wondr%20merchant%20201.1%20(squad%20201%2026%20202).pptx?d=wcd23c65d3eb545faa889fdec83c1e6b6&csf=1&web=1&e=YbCQMC";

describe("labelTautan (#648)", () => {
  it("memakai baris nyata dari screenshot: host dan nama berkas, tanpa token mesin", () => {
    const label = labelTautan(URL_SHAREPOINT);
    expect(label.host).toBe("bankbniitbk-my.sharepoint.com");
    expect(label.berkas).toBe("DAC wondr merchant 201.1 (squad 201 26 202).pptx");
    // Inilah yang membuat kartu jelek: query token tidak boleh ikut tampil.
    expect(label.berkas).not.toContain("wcd23c65d3eb");
    expect(label.berkas).not.toContain("?");
  });

  it("melepas www.", () => {
    expect(labelTautan("https://www.figma.com/file/abc/Nama").host).toBe("figma.com");
  });

  it("path tanpa nama berkas tetap memberi host", () => {
    const label = labelTautan("https://confluence.perusahaan.id/");
    expect(label.host).toBe("confluence.perusahaan.id");
    expect(label.berkas).toBe("");
  });

  it("data URL lampiran perangkat TIDAK diuraikan jadi sampah", () => {
    // `new URL` menerima data URL dan pathname-nya "application/pdf;base64,JVB";
    // tanpa penjagaan host-nya kosong tapi "nama berkas"-nya jadi "pdf;base64,JVB".
    const label = labelTautan("data:application/pdf;base64,JVBERi0xLjQK");
    expect(label).toEqual({ host: "", berkas: "" });
  });

  it("teks bebas dan alamat tanpa protokol tidak menghasilkan label palsu", () => {
    expect(labelTautan("lihat dokumen di sharepoint")).toEqual({ host: "", berkas: "" });
    expect(labelTautan("")).toEqual({ host: "", berkas: "" });
    expect(labelTautan(undefined)).toEqual({ host: "", berkas: "" });
    expect(labelTautan(null)).toEqual({ host: "", berkas: "" });
  });

  it("percent-encoding rusak tidak membuang nama berkas", () => {
    const label = labelTautan("https://contoh.id/Laporan%202026.pptx");
    expect(label.berkas).toBe("Laporan 2026.pptx");
    // `%2` di akhir tidak bisa didekode; yang tersisa harus tetap terbaca.
    expect(labelTautan("https://contoh.id/Lap%2").berkas).toContain("Lap");
  });
});
