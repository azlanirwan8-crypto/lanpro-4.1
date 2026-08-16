/**
 * Test untuk item #62 & #63 (§13.8).
 *
 * Inti temuannya: cabang `catch` yang memeriksa kode galat MySQL adalah kode
 * mati di atas PostgreSQL, tetapi TERLIHAT seperti penanganan galat yang benar.
 * Test ini mengunci dua hal sekaligus — kode Postgres dikenali, dan kode MySQL
 * lama TIDAK lagi dianggap cocok sehingga tidak ada yang mengembalikannya
 * karena mengira keduanya setara.
 */

import {
  adalahDuplikat,
  adalahTabelTidakAda,
  KODE_DUPLIKAT,
  KODE_TABEL_TIDAK_ADA,
} from "./pgErrors";

describe("#63 pelanggaran keunikan — SQLSTATE 23505", () => {
  it("mengenali galat duplikat sungguhan dari PostgreSQL", () => {
    // Bentuk galat node-postgres: `code` berisi SQLSTATE.
    const galat = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: "23505",
      constraint: "Users_email_key",
    });

    expect(adalahDuplikat(galat)).toBe(true);
    expect(KODE_DUPLIKAT).toBe("23505");
  });

  it("TIDAK mengenali kode MySQL lama — itu yang membuatnya jadi kode mati", () => {
    expect(adalahDuplikat({ code: "ER_DUP_ENTRY" })).toBe(false);
    expect(adalahDuplikat({ errno: 1062 })).toBe(false);
  });

  it("tidak salah mengenali galat lain sebagai duplikat", () => {
    expect(adalahDuplikat({ code: "42P01" })).toBe(false);
    expect(adalahDuplikat({ code: "23503" })).toBe(false); // foreign_key_violation
    expect(adalahDuplikat(new Error("koneksi terputus"))).toBe(false);
  });

  it("aman terhadap masukan kosong", () => {
    expect(adalahDuplikat(null)).toBe(false);
    expect(adalahDuplikat(undefined)).toBe(false);
    expect(adalahDuplikat({})).toBe(false);
  });
});

describe("#62 tabel tidak ada — SQLSTATE 42P01", () => {
  it("mengenali galat tabel tidak ada dari PostgreSQL", () => {
    const galat = Object.assign(new Error('relation "QATestSuites" does not exist'), {
      code: "42P01",
    });

    expect(adalahTabelTidakAda(galat)).toBe(true);
    expect(KODE_TABEL_TIDAK_ADA).toBe("42P01");
  });

  it("TIDAK mengenali kode MySQL lama", () => {
    expect(adalahTabelTidakAda({ code: "ER_NO_SUCH_TABLE" })).toBe(false);
    expect(adalahTabelTidakAda({ code: "ER_BAD_TABLE_ERROR" })).toBe(false);
  });

  it("tidak lagi menebak dari teks pesan", () => {
    // Versi lama juga melewati galat APA PUN yang pesannya memuat "exist".
    // Itu terlalu longgar: "column ... does not exist" dan "role ... does not
    // exist" ikut tertelan, menyembunyikan schema yang benar-benar salah.
    expect(adalahTabelTidakAda(new Error('column "foo" does not exist'))).toBe(false);
    expect(adalahTabelTidakAda(new Error('role "bar" does not exist'))).toBe(false);
  });

  it("aman terhadap masukan kosong", () => {
    expect(adalahTabelTidakAda(null)).toBe(false);
    expect(adalahTabelTidakAda({})).toBe(false);
  });
});
