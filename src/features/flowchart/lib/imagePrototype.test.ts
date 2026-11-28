import { compareClick } from "./imagePrototype";
describe("perbandingan aksi pada gambar dengan ekspektasi flowchart", () => {
  it.each([
    ["b", "b", "Sesuai"],
    ["c", "b", "Berbeda"],
    ["", "b", "Belum diuji"],
    ["b", "", "Belum diuji"],
  ])("tujuan aktual %s dan tujuan yang diharapkan %s", (actual, expected, status) => {
    expect(compareClick("a", "Kirim", actual, expected).status).toBe(status);
  });
});
