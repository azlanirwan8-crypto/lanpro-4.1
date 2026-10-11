/**
 * #689 butir E3 — aturan indeks untuk payload reorder.
 *
 * Ini test SATU-FUNGSI karena kesalahannya memang satu aturan aritmetika:
 * mencampur indeks seret-dan-lepas (relatif terhadap yang tampil) dengan indeks
 * halaman (absolut terhadap daftar penuh). Yang diuji di sini: pemanggil tidak
 * pernah bisa mengirim daftar yang bolong, dan tidak pernah bisa mengirim
 * urutan yang salah halaman.
 */
import { susunUrutanAkar } from "./urutanAkar";

const akar = (dari: number, jumlah: number) =>
  Array.from({ length: jumlah }, (_, i) => ({ id: `akar-${dari + i}` }));

describe("#689 susunUrutanAkar", () => {
  it("paging server: yang tampil sudah satu halaman, jadi indeks dipakai apa adanya", () => {
    const hasil = susunUrutanAkar({
      daftar: akar(25, 25),
      memakaiServerPaging: true,
      halaman: 2,
      perHalaman: 25,
      sumber: 0,
      tujuan: 3,
    });

    expect(hasil).toHaveLength(25);
    expect(hasil).toContain("akar-25");
    expect(hasil).toContain("akar-49");
    expect(hasil?.slice(0, 4)).toEqual(["akar-26", "akar-27", "akar-28", "akar-25"]);
  });

  it("ini yang terjadi di kode lama: halaman dua menyeret keluar batas dan menghasilkan daftar bolong", () => {
    // Aritmetika lama: absoluteSourceIndex = (2-1)*25 + 0 = 25, dipakai memotong
    // array 25 item. Fungsi baru memperlakukan indeks yang sama sebagai indeks
    // halaman (karena server yang memotong), jadi TIDAK ada id asing yang masuk.
    const hasil = susunUrutanAkar({
      daftar: akar(25, 25),
      memakaiServerPaging: true,
      halaman: 2,
      perHalaman: 25,
      sumber: 24,
      tujuan: 0,
    });
    expect(hasil?.[0]).toBe("akar-49");
    expect(hasil).toHaveLength(25);
    expect(hasil?.some((id) => !id.startsWith("akar-"))).toBe(false);
  });

  it("pemotongan lokal: indeks digeser ke posisi halaman di dalam daftar penuh", () => {
    const hasil = susunUrutanAkar({
      daftar: akar(0, 60),
      memakaiServerPaging: false,
      halaman: 3,
      perHalaman: 25,
      sumber: 0,
      tujuan: 1,
    });

    expect(hasil).toHaveLength(60);
    expect(hasil?.slice(50, 52)).toEqual(["akar-51", "akar-50"]);
    // Sisanya tidak boleh bergeser.
    expect(hasil?.slice(0, 50)).toEqual(akar(0, 50).map((a) => a.id));
  });

  it("indeks di luar array yang dipakai memotongnya => null, bukan daftar bolong", () => {
    expect(
      susunUrutanAkar({
        daftar: akar(25, 25),
        memakaiServerPaging: false,
        halaman: 2,
        perHalaman: 25,
        sumber: 25,
        tujuan: 0,
      })
    ).toBeNull();
  });

  it("sumber atau tujuan bukan bilangan bulat => null", () => {
    const dasar = {
      daftar: akar(0, 5),
      memakaiServerPaging: true,
      halaman: 1,
      perHalaman: 25,
    };
    expect(susunUrutanAkar({ ...dasar, sumber: 0, tujuan: 1.5 })).toBeNull();
    expect(susunUrutanAkar({ ...dasar, sumber: -1, tujuan: 2 })).toBeNull();
  });

  it("daftar kosong atau bukan array => null", () => {
    expect(
      susunUrutanAkar({
        daftar: [],
        memakaiServerPaging: true,
        halaman: 1,
        perHalaman: 25,
        sumber: 0,
        tujuan: 1,
      })
    ).toBeNull();
    expect(
      susunUrutanAkar({
        daftar: null as any,
        memakaiServerPaging: true,
        halaman: 1,
        perHalaman: 25,
        sumber: 0,
        tujuan: 1,
      })
    ).toBeNull();
  });

  it("anggota tanpa id string tidak pernah boleh menembus server", () => {
    const daftar = [{ id: "a" }, { id: null }, { id: "c" }];
    expect(
      susunUrutanAkar({
        daftar,
        memakaiServerPaging: true,
        halaman: 1,
        perHalaman: 25,
        sumber: 0,
        tujuan: 2,
      })
    ).toBeNull();
  });
});
