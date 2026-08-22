/**
 * Item #140 — penjaga agar daftar pilihan tidak kembali ditulis keras.
 *
 * Cacat aslinya bukan "ada daftar keras", melainkan daftar keras yang KEMBAR:
 * SIT/UAT/PTR ditulis di AddSuiteModal DAN di QASuiteSidebar. Menambah satu
 * fase menuntut penyuntingan keduanya, dan melewatkan salah satu tidak
 * menimbulkan galat apa pun — hanya dua layar yang diam-diam berbeda.
 *
 * Test ini membaca sumber karena yang dijaga adalah dari MANA daftarnya
 * berasal, bukan perilaku runtime-nya.
 *
 * Konstanta bernama CADANGAN_* sengaja dikecualikan: ia memang daftar keras,
 * tetapi hanya dipakai bila MasterData belum tersemai, dan ketiadaannya justru
 * membuat dropdown kosong tanpa penjelasan.
 */
import fs from "fs";
import path from "path";

const akar = path.join(__dirname, "..");
const baca = (p: string) => fs.readFileSync(path.join(akar, p), "utf8");

/** Membuang blok konstanta cadangan sebelum memeriksa sisa berkas. */
const tanpaCadangan = (isi: string) =>
  isi
    .split(/\r?\n/)
    .filter((baris) => !/^\s*(const CADANGAN_|\{ id: "|"[A-Z]+",)/.test(baris))
    .join("\n");

const TITIK = [
  { berkas: "components/modals/AddSuiteModal.tsx", tipe: "qa_phase" },
  { berkas: "features/qa/components/QASuiteSidebar.tsx", tipe: "qa_phase" },
  { berkas: "features/qa/components/QATestCaseTable.tsx", tipe: "qa_status" },
  { berkas: "components/modals/EditSprintModal.tsx", tipe: "sprint_status" },
];

describe("dropdown mengambil pilihan dari MasterData (#140)", () => {
  it.each(TITIK)("$berkas membaca $tipe", ({ berkas, tipe }) => {
    expect(baca(berkas)).toContain(`"${tipe}"`);
  });

  it("IssueListView menyemai Project Risk dari MasterData", () => {
    const isi = baca("features/issues/IssueListView.tsx");
    expect(isi).toContain('m.type === "project_risk"');
    // Benih daftar keras lamanya harus benar-benar hilang.
    expect(isi).not.toContain('new Set<string>(["Low", "Medium", "High"])');
  });

  it("SIT/UAT/PTR tidak lagi ditulis kembar di dua berkas QA", () => {
    const berkasFase = [
      "components/modals/AddSuiteModal.tsx",
      "features/qa/components/QASuiteSidebar.tsx",
    ];
    for (const b of berkasFase) {
      const sisa = tanpaCadangan(baca(b));
      expect(sisa).not.toContain('value="SIT"');
      expect(sisa).not.toContain('id: "UAT"');
    }
  });
});
