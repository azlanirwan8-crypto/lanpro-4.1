/**
 * Regresi keutuhan kamus dwibahasa — item #134.
 *
 * Kegagalan paling berbahaya pada i18n bukan salah terjemah, melainkan kunci
 * yang HILANG di salah satu kamus: i18next diam-diam jatuh ke fallback, dan
 * layar tampil setengah berganti bahasa tanpa satu pun galat di konsol.
 *
 * Test ini membandingkan STRUKTUR kedua kamus, bukan isinya, sehingga tetap
 * hijau saat kata-katanya diperbaiki tapi merah begitu ada kunci yang lupa
 * ditambahkan di salah satu sisi.
 */
import { id } from "./id";
import { en } from "./en";

const ratakan = (obj: Record<string, unknown>, awalan = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) => {
    const jalur = awalan ? `${awalan}.${k}` : k;
    return v && typeof v === "object" ? ratakan(v as Record<string, unknown>, jalur) : [jalur];
  });

const kunciId = ratakan(id).sort();
const kunciEn = ratakan(en).sort();

describe("#134 keutuhan kamus id/en", () => {
  it("kedua kamus punya kunci yang sama persis", () => {
    expect(kunciEn).toEqual(kunciId);
  });

  it("tidak ada nilai kosong di kedua kamus", () => {
    const kosong = (obj: Record<string, unknown>, awalan = ""): string[] =>
      Object.entries(obj).flatMap(([k, v]) => {
        const jalur = awalan ? `${awalan}.${k}` : k;
        if (v && typeof v === "object") return kosong(v as Record<string, unknown>, jalur);
        return typeof v === "string" && v.trim() === "" ? [jalur] : [];
      });
    expect(kosong(id)).toEqual([]);
    expect(kosong(en)).toEqual([]);
  });

  it("placeholder interpolasi cocok antara id dan en", () => {
    // "{{count}} belum selesai" dan "{{count}} not yet done" harus memakai
    // nama placeholder yang sama, kalau tidak salah satu bahasa kehilangan
    // angkanya di layar.
    const ambil = (obj: Record<string, unknown>, awalan = ""): Record<string, string[]> =>
      Object.entries(obj).reduce(
        (acc, [k, v]) => {
          const jalur = awalan ? `${awalan}.${k}` : k;
          if (v && typeof v === "object")
            return { ...acc, ...ambil(v as Record<string, unknown>, jalur) };
          if (typeof v === "string") {
            const p = (v.match(/\{\{(\w+)\}\}/g) || []).sort();
            if (p.length) acc[jalur] = p;
          }
          return acc;
        },
        {} as Record<string, string[]>
      );

    expect(ambil(en)).toEqual(ambil(id));
  });

  it("bahasa bawaan Indonesia memuat area yang sudah dipindah", () => {
    expect(kunciId).toEqual(
      expect.arrayContaining([
        "sidebar.dashboard",
        "sidebar.issueList",
        "dashboard.taskSummary",
        "widgets.stoppersBlocked",
        "language.switchTo",
      ])
    );
  });
});
