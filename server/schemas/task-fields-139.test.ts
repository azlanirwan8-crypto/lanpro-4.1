/**
 * Item #139 — lima field tugas yang punya dropdown tetapi tidak pernah bisa
 * disimpan.
 *
 * Kegagalannya SENYAP dan berlapis tiga, dan menutup satu lapis saja tidak
 * memperbaiki apa pun:
 *
 *   1. `validasiBody` mengganti req.body dengan hasil parse zod, jadi field
 *      yang tidak terdaftar di skema dibuang sebelum rute melihatnya.
 *   2. Rute memakai allowlist eksplisit lewat `checkUpdate`.
 *   3. Tabel Tasks tidak punya kolom resolution/release/category.
 *
 * UI melakukan pembaruan optimistis, sehingga perubahannya tampak berhasil
 * sampai halaman dimuat ulang. Test ini menjaga lapis pertama — yang paling
 * mudah terlewat karena tidak meninggalkan jejak apa pun.
 */
import { updateTaskSchema } from "./task.schema";

const LIMA_FIELD = ["resolution", "release", "category", "environment", "projectRisk"] as const;

describe("updateTaskSchema — lima field dropdown tugas (#139)", () => {
  it.each(LIMA_FIELD)("mempertahankan %s alih-alih membuangnya", (field) => {
    const hasil = updateTaskSchema.safeParse({ [field]: "nilai-uji" });
    expect(hasil.success).toBe(true);
    expect(hasil.success && hasil.data).toHaveProperty(field, "nilai-uji");
  });

  it("mempertahankan kelimanya sekaligus", () => {
    const masuk = Object.fromEntries(LIMA_FIELD.map((f) => [f, "x"]));
    const hasil = updateTaskSchema.safeParse(masuk);
    expect(hasil.success).toBe(true);
    expect(Object.keys(hasil.success ? hasil.data : {}).sort()).toEqual([...LIMA_FIELD].sort());
  });

  it("tetap membuang field yang memang tidak dikenal", () => {
    const hasil = updateTaskSchema.safeParse({ fieldNgawur: "x", resolution: "Done" });
    expect(hasil.success).toBe(true);
    expect(hasil.success && hasil.data).not.toHaveProperty("fieldNgawur");
  });

  it("menerima null untuk mengosongkan nilai", () => {
    const hasil = updateTaskSchema.safeParse({ resolution: null });
    expect(hasil.success).toBe(true);
  });
});
