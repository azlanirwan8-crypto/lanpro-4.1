/**
 * #320 — pemetaan hasil AI: PIC/due + bukti_cuplikan harus sampai ke UI tabs.
 */
import { mapToActiveMeetingData } from "./mapping";

describe("mapToActiveMeetingData (#320)", () => {
  it("memetakan format korporat ke tab tindak lanjut dengan PIC, due, dan bukti", () => {
    const mapped = mapToActiveMeetingData({
      ringkasan_eksekutif: "Ringkas.",
      meeting_metadata: { topik_utama: "Sprint", tanggal_waktu: "2/9/2026", peserta_aktif: ["A"] },
      tindak_lanjut_dan_concern: [
        {
          pembicara: "Speaker 1",
          kekhawatiran_spesifik: "Deadline ketat",
          solusi_dan_arahan: "Percepat QA",
          bukti_cuplikan: "kita percepat QA minggu ini",
          status_bukti: "VERIFIED",
        },
      ],
      next_plan_roadmap: [
        {
          action_item: "Siapkan checklist",
          pic: "Speaker 2",
          estimasi_waktu: "Jumat",
          bukti_cuplikan: "checklist selesai Jumat",
          status_bukti: "VERIFIED",
        },
      ],
    });

    expect(mapped?.tab_tindak_lanjut[0]).toMatchObject({
      concern_masalah: "Deadline ketat",
      solusi_disepakati: "Percepat QA",
      pic: "Speaker 1",
      bukti_cuplikan: "kita percepat QA minggu ini",
      status_bukti: "VERIFIED",
    });
    expect(mapped?.tab_next_plan[0]).toMatchObject({
      action_item: "Siapkan checklist",
      pic: "Speaker 2",
      due_date: "Jumat",
      bukti_cuplikan: "checklist selesai Jumat",
    });
  });

  it("mempertahankan bukti pada format tab_* yang sudah jadi", () => {
    const mapped = mapToActiveMeetingData({
      tab_ringkasan: { topik_utama: "X", executive_summary_multimodal: "Y" },
      tab_tindak_lanjut: [
        {
          concern_masalah: "C",
          solusi_disepakati: "S",
          pic: "Budi",
          due_date: "Senin",
          bukti_cuplikan: "kutipan",
          status_bukti: "VERIFIED",
        },
      ],
      tab_next_plan: [],
    });

    expect(mapped?.tab_tindak_lanjut[0].pic).toBe("Budi");
    expect(mapped?.tab_tindak_lanjut[0].bukti_cuplikan).toBe("kutipan");
  });

  it("memakai UNVERIFIED bila PIC/due kosong di format lama", () => {
    const mapped = mapToActiveMeetingData({
      ringkasan_eksekutif: "",
      poin_diskusi_tambahan: [{ concern: "A", tindakanLanjut: "B" }],
      next_plan: [{ tahapan: "Langkah", deskripsi: "d" }],
    });

    expect(mapped?.tab_tindak_lanjut[0].pic).toBe("UNVERIFIED");
    expect(mapped?.tab_next_plan[0].pic).toBe("UNVERIFIED");
  });
});
