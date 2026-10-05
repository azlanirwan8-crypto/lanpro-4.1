/**
 * Geometri bentuk saat disentuh — item #629.
 *
 * MENGAPA TEST INI ADA. Bentuk papan ini MEMBESAR ketika dipakai: 1,07 saat
 * diseret, 1,05 saat menjadi sumber sambungan, 1,03 saat dipilih, 1,02 saat
 * disentuh kursor, dan 0,97 saat ditekan. Ditambah lagi dua cincin seleksi
 * sekaligus (box-shadow 3 px DAN ring `border-2`) yang berdenyut selamanya
 * (`repeat: Infinity`). draw.io dan Miro tidak mengubah ukuran bentuk karena
 * interaksi — hanya penanda di sekelilingnya. Angka-angka itu adalah sebab papan
 * terasa "gemuk" walaupun isinya sama.
 *
 * Dikunci sebagai angka, bukan screenshot: jsdom tidak menjalankan layout
 * `transform`, jadi yang bisa dibuktikan adalah nilai yang dikirim ke perender.
 */
import { cincinBentuk, gayaBentuk, PUTAR_BENTUK, SKALA_BENTUK } from "./gayaBentuk";

const h = (opsi: Partial<Parameters<typeof gayaBentuk>[0]> = {}) =>
  gayaBentuk({
    isDragging: false,
    isSelected: false,
    isHovered: false,
    isSourceOfConnect: false,
    adaSumberSambung: false,
    isSvgShape: false,
    ...opsi,
  });

describe("gayaBentuk (#629)", () => {
  it("ukuran bentuk tidak pernah berubah karena interaksi apa pun", () => {
    for (const keadaan of [
      {},
      { isDragging: true },
      { isSelected: true },
      { isHovered: true },
      { isSourceOfConnect: true },
      { isSourceOfConnect: true, adaSumberSambung: true },
      { isDragging: true, isSelected: true, isHovered: true },
    ]) {
      expect(h(keadaan).scale).toBe(SKALA_BENTUK);
      expect(SKALA_BENTUK).toBe(1);
      expect(h(keadaan).rotate).toBe(PUTAR_BENTUK);
    }
  });

  it("tidak ada getaran rotate pada sumber sambungan maupun saat menyeret", () => {
    // Dulu: rotate = [0, -1.2, 1.2, -1.2, 0] saat menarik garis, 1.2 saat diseret.
    expect(h({ isSourceOfConnect: true }).rotate).toBe(0);
    expect(h({ isDragging: true }).rotate).toBe(0);
  });

  it("bentuk diam dan terpilih tidak membawa bayangan; hanya seret dan santai yang boleh", () => {
    expect(h().boxShadow).toBe("none");
    expect(h({ isSelected: true }).boxShadow).toBe("none");
    expect(h({ isSourceOfConnect: true }).boxShadow).toBe("none");
    // Seleksi tak lagi menyalin glow 3 px — cincin border yang menanganinya.
    expect(h({ isSelected: true }).boxShadow).not.toMatch(/0 0 0 3px/);
  });

  it("bayangan seret satu lapisan tipis, bukan dua lapisan 40 px", () => {
    const seret = h({ isDragging: true }).boxShadow;
    // Dulu: "0 25px 40px -10px rgba(0, 0, 0, 0.25), 0 12px 20px -8px rgba(0, 0, 0, 0.18)".
    expect(seret).toBe("0 2px 8px -2px rgba(0, 0, 0, 0.18)");
    expect(seret).not.toContain("40px");
    expect(seret.match(/rgba/g)).toHaveLength(1);
  });

  it("bentuk SVG tidak pernah dibayangi", () => {
    expect(h({ isSvgShape: true, isDragging: true }).boxShadow).toBe("none");
    expect(h({ isSvgShape: true, isHovered: true }).boxShadow).toBe("none");
  });

  it("satu keadaan = satu cincin, dan bentuk SVG tidak mendapat cincin HTML", () => {
    expect(
      cincinBentuk({
        isDragging: false,
        isSelected: true,
        isHovered: false,
        isSourceOfConnect: false,
        adaSumberSambung: false,
        isSvgShape: false,
      })
    ).toEqual({ seleksi: true, sumberSambung: false });
    expect(
      cincinBentuk({
        isDragging: false,
        isSelected: true,
        isHovered: false,
        isSourceOfConnect: false,
        adaSumberSambung: false,
        isSvgShape: true,
      })
    ).toEqual({ seleksi: false, sumberSambung: false });
  });
});
