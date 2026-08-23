import i18n from "../index";

/**
 * Paritas kamus Indonesia ⇄ Inggris.
 *
 * Kegagalan yang ditangkap di sini tidak punya gejala apa pun: `fallbackLng`
 * bernilai "id", jadi kunci yang hilang dari kamus Inggris TIDAK memunculkan
 * nama kunci mentah dan TIDAK menulis galat — layar Inggris cuma menampilkan
 * satu kalimat Indonesia di tengah halaman. Persis "bahasanya masih campur"
 * yang berulang kali dilaporkan pemilik proyek.
 *
 * Dibaca dari bundel runtime, bukan dari teks berkas, supaya kunci berkutip
 * (mis. "srv.akses_ditolak") ikut terhitung — pembaca berbasis baris di
 * kunci-terpakai.test.ts melewatkan bentuk itu.
 */
const rata = (o: unknown, awalan = "", keluar: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (v && typeof v === "object") rata(v, awalan + k + ".", keluar);
    else keluar[awalan + k] = String(v);
  }
  return keluar;
};

describe("paritas kamus", () => {
  const id = rata(i18n.getResourceBundle("id", "translation"));
  const en = rata(i18n.getResourceBundle("en", "translation"));

  it("kedua kamus terisi", () => {
    expect(Object.keys(id).length).toBeGreaterThan(1000);
  });

  it("tidak ada kunci Indonesia yang hilang dari kamus Inggris", () => {
    expect(Object.keys(id).filter((k) => !(k in en))).toEqual([]);
  });

  it("tidak ada kunci Inggris yang hilang dari kamus Indonesia", () => {
    expect(Object.keys(en).filter((k) => !(k in id))).toEqual([]);
  });

  it("tidak ada nilai kosong di kedua kamus", () => {
    const kosong = [
      ...Object.keys(id).filter((k) => id[k].trim() === ""),
      ...Object.keys(en).filter((k) => en[k].trim() === ""),
    ];
    expect(kosong).toEqual([]);
  });
});
