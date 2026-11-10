/**
 * #835 — garis lama yang "tidak bisa diluruskan".
 *
 * SEBAB TEST INI ADA. #833 menulis SELURUH jalur router ke `edge.waypoints`.
 * Selama daftar itu tidak kosong, `FlowchartEdges` tidak pernah memanggil
 * router otomatis: jalurnya diambil apa adanya sebagai `[start, ...waypoints,
 * end]`. Titik-titik salinan itu lalu tampak seperti belokan yang disengaja,
 * dan satu-satunya cara meluruskannya adalah menghapusnya satu per satu.
 *
 * `tekukanEfektif` adalah obatnya: titik yang duduk di rute otomatis (≤2 px)
 * tidak menambah bentuk apa pun, jadi tidak dihitung sebagai tekukan. Titik
 * yang benar-benar membelokkan garis tetap dipertahankan.
 */
import { tekukanEfektif } from "./ruteOrtogonal";

// Rute ortogonal sederhana: kanan, turun, kanan.
const RUTE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 200, y: 100 },
];

describe("#835 tekukanEfektif", () => {
  it("membuang semua salinan rute lama, sehingga garis kembali otomatis", () => {
    expect(
      tekukanEfektif(
        [
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
        RUTE
      )
    ).toEqual([]);
  });

  it("mempertahankan titik yang benar-benar di luar rute", () => {
    expect(
      tekukanEfektif(
        [
          { x: 100, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 },
        ],
        RUTE
      )
    ).toEqual([{ x: 50, y: 50 }]);
  });

  it("toleransi 2 px membuang simpangan yang tidak terlihat", () => {
    expect(tekukanEfektif([{ x: 50, y: 1.5 }], RUTE)).toEqual([]);
    expect(tekukanEfektif([{ x: 50, y: 5 }], RUTE)).toEqual([{ x: 50, y: 5 }]);
  });

  it("tanpa waypoint, hasilnya kosong tanpa menghitung apa pun", () => {
    expect(tekukanEfektif([], RUTE)).toEqual([]);
  });

  it("rute yang tidak bisa dipakai tidak menghapus tekukan", () => {
    // Satu titik bukan rute: tidak ada ruas untuk mengukur jarak, jadi jangan
    // menebak dan jangan membuang niat pengguna.
    expect(tekukanEfektif([{ x: 10, y: 10 }], [{ x: 0, y: 0 }])).toEqual([{ x: 10, y: 10 }]);
  });
});
