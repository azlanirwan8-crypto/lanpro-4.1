/**
 * Test untuk item #82 (§19.12) — katalog peran sebagai satu-satunya sumber.
 *
 * Yang dikunci di sini bukan sekadar "fungsinya mengembalikan array", melainkan
 * tiga hal yang dulu benar-benar rusak:
 *
 *   1. SYSTEM dan PROJECT tidak boleh tercampur. Dropdown lama menampilkan
 *      `Project Manager` sebagai peran sistem.
 *   2. Nilai yang dipakai adalah `code`, bukan `label`. Dulu satu peran bisa
 *      tersimpan sebagai `head` ATAU `"Department Head"` tergantung baris mana
 *      yang dipilih pengguna — dan salah satunya tidak dikenal penjaga rute.
 *   3. Baris tanpa `code` DILEWATI, tidak ditebak dari label.
 */

import {
  katalogPeranSistem,
  katalogPeranProyek,
  ambilKatalogPeran,
  cariPeran,
  labelPeran,
} from "./roleCatalog";

const CONTOH = [
  { id: "a", type: "project_role", code: "admin", label: "Administrator", order: 1, role_type: "SYSTEM" },
  { id: "b", type: "project_role", code: "head", label: "Department Head", order: 2, role_type: "SYSTEM" },
  { id: "c", type: "project_role", code: "owner", label: "Project Owner", order: 1, role_type: "PROJECT" },
  { id: "d", type: "project_role", code: "qa", label: "QA", order: 7, role_type: "PROJECT" },
  { id: "e", type: "project_role", code: "developer", label: "Developer", order: 6, role_type: "PROJECT" },
  // Bukan peran — tidak boleh ikut terbawa
  { id: "f", type: "jabatan", code: "be", label: "Backend Engineer", order: 1, role_type: null },
  { id: "g", type: "priority", label: "High", order: 1, role_type: null },
];

describe("#82 katalog peran dibaca dari Master Data", () => {
  it("memisahkan SYSTEM dari PROJECT — keduanya tidak boleh tercampur", () => {
    expect(katalogPeranSistem(CONTOH).map((p) => p.code)).toEqual(["admin", "head"]);
    expect(katalogPeranProyek(CONTOH).map((p) => p.code)).toEqual(["owner", "developer", "qa"]);
  });

  it("mengurutkan berdasarkan kolom order, bukan urutan baris dari API", () => {
    // developer (6) harus mendahului qa (7) meski di data qa muncul lebih dulu.
    expect(katalogPeranProyek(CONTOH).map((p) => p.label)).toEqual([
      "Project Owner",
      "Developer",
      "QA",
    ]);
  });

  it("mengabaikan baris yang bukan peran", () => {
    const semua = [...katalogPeranSistem(CONTOH), ...katalogPeranProyek(CONTOH)];
    expect(semua.find((p) => p.label === "Backend Engineer")).toBeUndefined();
    expect(semua.find((p) => p.label === "High")).toBeUndefined();
  });

  it("MELEWATI baris tanpa code — tidak menebaknya dari label", () => {
    // Menebak kode dari label persis cara "Department Head" dulu tersimpan
    // sebagai "Department Head" alih-alih `head`.
    const adaYangKosong = [
      ...CONTOH,
      { id: "x", type: "project_role", label: "Tanpa Kode", order: 9, role_type: "PROJECT" },
      { id: "y", type: "project_role", code: "   ", label: "Kode Spasi", order: 10, role_type: "PROJECT" },
    ];
    const hasil = katalogPeranProyek(adaYangKosong).map((p) => p.label);
    expect(hasil).not.toContain("Tanpa Kode");
    expect(hasil).not.toContain("Kode Spasi");
  });

  it("menerima roleType maupun role_type — dua jalur API mengirim beda", () => {
    const camel = [{ id: "z", type: "project_role", code: "viewer", label: "Viewer", order: 8, roleType: "PROJECT" }];
    expect(katalogPeranProyek(camel).map((p) => p.code)).toEqual(["viewer"]);
  });

  it("aman terhadap masukan kosong atau bukan array", () => {
    expect(ambilKatalogPeran(null, "SYSTEM")).toEqual([]);
    expect(ambilKatalogPeran(undefined, "PROJECT")).toEqual([]);
    expect(ambilKatalogPeran([], "SYSTEM")).toEqual([]);
  });

  it("mencari peran tanpa peduli huruf besar-kecil — data lama campur aduk", () => {
    const k = katalogPeranSistem(CONTOH);
    expect(cariPeran(k, "ADMIN")?.label).toBe("Administrator");
    expect(cariPeran(k, " head ")?.label).toBe("Department Head");
    expect(cariPeran(k, "tidak-ada")).toBeNull();
    expect(cariPeran(k, null)).toBeNull();
  });

  it("menampilkan kode MENTAH bila peran tidak ada di katalog", () => {
    // Nilai lama yang menyimpang harus TERLIHAT, bukan disembunyikan di balik
    // teks ramah — supaya ketahuan bahwa ada data yang perlu dimigrasikan.
    const k = katalogPeranProyek(CONTOH);
    expect(labelPeran(k, "member")).toBe("member");
    expect(labelPeran(k, "qa")).toBe("QA");
  });
});
