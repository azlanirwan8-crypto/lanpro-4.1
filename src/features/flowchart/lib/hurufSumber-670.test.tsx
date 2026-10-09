/**
 * #670 — huruf dari berkas sumber: keluarga, miring, garis bawah, dan tebal
 * yang sebelumnya NAIK KE SELURUH BENTUK.
 *
 * BAGIAN PALING PENTING DI SINI ADALAH BATASNYA. draw.io bisa menebalkan satu
 * kata; label papan ini hidup di `textarea` dan tidak menampung gaya campuran.
 * Sebelum #670, `Kotak <b>tebal</b> dan` naik menjadi satu bentuk tebal utuh -
 * yaitu menampilkan teks yang tidak tebal di sumbernya sebagai tebal. Sekarang
 * yang berlaku: tebal hanya bila SEMUA teksnya tebal. Ini bukan "lebih baik",
 * ini pembacaan yang jujur terhadap berkas, dan sisanya butuh mesin label baru.
 */
import {
  tebalDariHtml,
  miringDariBitmask,
  garisBawahDariBitmask,
  tebalDariBitmask,
  gayaDrawIo,
} from "./gayaImpor";

describe("bitmask fontStyle draw.io dibaca penuh (#670)", () => {
  it.each([
    [1, "bold"],
    [2, "italic"],
    [4, "underline"],
  ])("bit %i hanya menyalakan %s", (bit, nama) => {
    expect(tebalDariBitmask(bit)).toBe(nama === "bold");
    expect(miringDariBitmask(bit)).toBe(nama === "italic");
    expect(garisBawahDariBitmask(bit)).toBe(nama === "underline");
  });

  it("fontStyle=3 adalah tebal DAN miring, seperti di draw.io", () => {
    const gaya = gayaDrawIo("fontStyle=3;fontFamily=Courier New");
    expect(gaya.bold).toBe(true);
    expect(gaya.italic).toBe(true);
    expect(gaya.underline).toBeUndefined();
    expect(gaya.fontFamily).toBe("Courier New");
  });

  it("fontFamily=default berarti ikut papan, bukan keluarga bernama default", () => {
    expect(gayaDrawIo("fontFamily=default").fontFamily).toBeUndefined();
  });
});

describe("tebal dari HTML hanya bila seluruh label tebal (#670)", () => {
  it("satu kata tebal di antara teks biasa TIDAK naik ke seluruh bentuk", () => {
    expect(tebalDariHtml("Kotak <b>tebal</b> dan dua baris")).toBe(false);
  });

  it("seluruh label di dalam <b> tetap tebal", () => {
    expect(tebalDariHtml("<b>Kritria password</b>")).toBe(true);
    expect(tebalDariHtml("<strong>Kritria password</strong>")).toBe(true);
  });

  it("satu wadah berat-tebal yang memuat semua baris tetap tebal", () => {
    expect(
      tebalDariHtml(
        '<div style="font-weight:700"><div>Ringkasan</div><div>Data Merchant</div></div>'
      )
    ).toBe(true);
  });

  it("baris pertama tebal dan baris kedua biasa bukan tebal seluruhnya", () => {
    expect(tebalDariHtml("<div><b>Ringkasan</b></div><div>Data Merchant</div>")).toBe(false);
  });

  it("tanpa teks tidak ada yang bisa disebut tebal", () => {
    expect(tebalDariHtml("")).toBe(false);
    expect(tebalDariHtml(undefined)).toBe(false);
    expect(tebalDariHtml("<b></b>")).toBe(false);
  });
});
