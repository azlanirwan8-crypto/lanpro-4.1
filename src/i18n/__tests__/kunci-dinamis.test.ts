import { evaluatePasswordStrength } from "../../lib/registrationSchema";
import i18n from "../index";

/**
 * Kunci i18n yang dipanggil lewat VARIABEL, bukan literal.
 *
 * Gerbang #135 memindai `t("...")` literal, jadi `t(passStrength.label)` tidak
 * terlihat olehnya sama sekali. Kunci yang hilang di sini tidak memerahkan uji
 * mana pun dan tidak menulis galat — layar cuma menampilkan nama kuncinya
 * mentah-mentah, mis. "register.strengthWeak".
 *
 * Nilai `label` sengaja berupa kunci, bukan teks: hasilnya dihitung di dalam
 * useMemo([password]) di RegisterScreen, sehingga teks jadi akan membeku pada
 * bahasa yang aktif saat pertama kali dihitung.
 */
const bundel = (bahasa: "id" | "en") =>
  i18n.getResourceBundle(bahasa, "translation") as Record<string, Record<string, string>>;

const adaKunci = (bahasa: "id" | "en", kunci: string) => {
  const [blok, nama] = kunci.split(".");
  const nilai = bundel(bahasa)[blok]?.[nama];
  return typeof nilai === "string" && nilai.trim() !== "";
};

describe("kunci i18n yang dipakai dinamis", () => {
  const contoh = ["", "abc", "abcdefgh1A", "Abcdefgh1!"];

  it("setiap label kekuatan kata sandi memulangkan kunci, bukan teks jadi", () => {
    for (const p of contoh) {
      expect(evaluatePasswordStrength(p).label).toMatch(/^register\.strength[A-Z]/);
    }
  });

  it("setiap kunci itu benar-benar ada di kedua kamus", () => {
    const kurang: string[] = [];
    for (const p of contoh) {
      const k = evaluatePasswordStrength(p).label;
      for (const bahasa of ["id", "en"] as const) {
        if (!adaKunci(bahasa, k)) kurang.push(`${bahasa}:${k}`);
      }
    }
    expect(kurang).toEqual([]);
  });

  it("keempat tingkat kekuatan terwakili, bukan hanya satu cabang", () => {
    const unik = new Set(contoh.map((p) => evaluatePasswordStrength(p).label));
    expect(unik.size).toBe(4);
  });
});
