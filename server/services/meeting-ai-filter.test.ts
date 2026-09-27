import { filterKlaimTerverifikasi, saringHasilAnalisisTempel } from "./meeting-ai-filter";

describe("#440 filterVerified pada analisis transkrip tempel", () => {
  it("membuang klaim UNVERIFIED tanpa bukti_cuplikan", () => {
    const lolos = filterKlaimTerverifikasi(
      [
        {
          concern: "Deadline mundur",
          tindakanLanjut: "Percepat QA",
          bukti_cuplikan: "kita percepat QA minggu ini",
          status_bukti: "VERIFIED",
        },
        {
          concern: "Fitur yang tidak pernah disebut",
          tindakanLanjut: "Bangun modul X",
          bukti_cuplikan: "",
          status_bukti: "UNVERIFIED",
        },
      ],
      ["concern", "tindakanLanjut"]
    );

    expect(lolos).toHaveLength(1);
    expect(lolos[0].concern).toBe("Deadline mundur");
  });

  it("klaim tanpa kutipan tidak lolos di hasil tempel", () => {
    const disaring = saringHasilAnalisisTempel({
      ringkasan_eksekutif: "ada",
      poin_diskusi_tambahan: [
        {
          concern: "halu",
          tindakanLanjut: "buat sistem baru",
          status_bukti: "UNVERIFIED",
          bukti_cuplikan: "   ",
        },
      ],
      next_plan: [
        {
          tahapan: "Go-live tanpa bukti",
          deskripsi: "rilis minggu depan",
          status_bukti: "UNVERIFIED",
          bukti_cuplikan: "",
        },
      ],
      notulen_rapat: [
        {
          topik: "Topik dikarang",
          pembahasan: "tidak ada di transkrip",
          status_bukti: "UNVERIFIED",
          bukti_cuplikan: "",
        },
      ],
    });

    expect(disaring.poin_diskusi_tambahan).toEqual([]);
    expect(disaring.next_plan).toEqual([]);
    expect(disaring.notulen_rapat).toEqual([]);
  });
});
