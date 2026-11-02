/**
 * #808a — pemecah isi pesan menjadi teks dan tautan.
 *
 * Yang dikunci di sini adalah KONTRAK, bukan tampilan: `pecahPesan` hanya boleh
 * memindahkan batas, tidak boleh mengubah atau membuang satu karakter pun. Itu
 * satu-satunya alasan pemanggilnya boleh menaruh hasilnya di dalam `<p>`
 * `whitespace-pre-wrap` warisan #645 tanpa takut baris baru pengguna hilang.
 *
 * Dua kasus lahir dari alamat sungguhan yang dikirim pemilik proyek 02 Nov 2026
 * (SharePoint ±300 karakter, `?sourcedoc=%7B…&file=Design%20PPT%2020CI%2020BNI…`):
 * nama berkasnya ada di parameter query, BUKAN di ujung path — dan ujung path-nya
 * justru token acak. Label #648 saja tidak akan membuat komentar itu terbaca.
 */
import { adaTautan, labelPesan, pecahPesan } from "./pesanTautan";

const SHAREPOINT =
  "https://bankbniitbk-my.sharepoint.com/:p:/g/personal/rifky_bankbni_co_id/EYx3vXqTb1dLtYv2VDCYdUQB6YQdFpKtGmHqNzZqOZzKw?e=Ab1cD2&file=Design%20PPT%2020CI%2020BNI%20Migration";

const gabung = (teks: string) =>
  pecahPesan(teks)
    .map((s) => s.isi)
    .join("");

describe("#808a — pemecah tidak boleh mengubah teks", () => {
  it.each([
    "",
    "komentar biasa tanpa alamat",
    SHAREPOINT,
    `materi link draft ${SHAREPOINT} ya`,
    "satu https://a.co/x dan https://b.co/y dalam satu baris",
    "baris satu\nhttps://a.co/x\nbaris tiga",
    "https://a.co/x.",
    "tutup kurung (lihat https://a.co/x) selesai",
    "spasi di depan   dan di belakang   ",
  ])("join segmen identik dengan aslinya: %j", (teks) => {
    expect(gabung(teks)).toBe(teks);
  });

  it("tanpa tautan hasilnya SATU segmen teks, bukan daftar kosong", () => {
    const segmen = pecahPesan("cuma catatan rapat");
    expect(segmen).toHaveLength(1);
    expect(segmen[0].jenis).toBe("teks");
    expect(adaTautan("cuma catatan rapat")).toBe(false);
  });

  it("string kosong dan null memulang daftar kosong", () => {
    expect(pecahPesan("")).toEqual([]);
    expect(pecahPesan(null)).toEqual([]);
    expect(pecahPesan(undefined)).toEqual([]);
  });
});

describe("#808a — yang dianggap tautan", () => {
  it("http dan https ditautkan utuh sampai spasi berikutnya", () => {
    const segmen = pecahPesan(`cek ${SHAREPOINT} sekarang`);
    const tautan = segmen.filter((s) => s.jenis === "tautan");
    expect(tautan).toHaveLength(1);
    expect(tautan[0].isi).toBe(SHAREPOINT);
  });

  it("tanda baca penutup kalimat kembali menjadi teks, bukan alamat", () => {
    const segmen = pecahPesan("lihat https://a.co/x.");
    expect(segmen.map((s) => `${s.jenis}:${s.isi}`)).toEqual([
      "teks:lihat ",
      "tautan:https://a.co/x",
      "teks:.",
    ]);
  });

  it("dua alamat dalam satu pesan menghasilkan dua tautan", () => {
    const segmen = pecahPesan("https://a.co/1 lalu https://b.co/2");
    expect(segmen.filter((s) => s.jenis === "tautan").map((s) => s.isi)).toEqual([
      "https://a.co/1",
      "https://b.co/2",
    ]);
  });

  it("baris baru pengguna tidak membuat alamat terpotong", () => {
    const segmen = pecahPesan("ringkasan:\nhttps://a.co/x\nselesai");
    expect(segmen.filter((s) => s.jenis === "tautan")).toHaveLength(1);
    expect(gabung("ringkasan:\nhttps://a.co/x\nselesai")).toBe(
      "ringkasan:\nhttps://a.co/x\nselesai"
    );
  });

  it("skema yang hidup di luar daftar TIDAK ditautkan — #584 tetap satu penjaga", () => {
    // `javascript:` tidak pernah sampai ke `href` di layar mana pun. Yang
    // membuktikan itu bukan test ini (ia tidak ditautkan, bukan disaring),
    // jadi keduanya ditulis di sini: pemecah tidak mengenalinya, dan teksnya
    // tetap utuh sehingga penulisnya tidak kehilangan isi.
    const teks = "javascript:alert(1) //x dan data:text/html,<script>alert(1)</script>";
    expect(adaTautan(teks)).toBe(false);
    expect(gabung(teks)).toBe(teks);
  });

  it("host polos tanpa skema sengaja tidak ditautkan (batas yang tercatat)", () => {
    expect(adaTautan("sharepoint.com/abc")).toBe(false);
    expect(adaTautan("buka www.example.com sekarang")).toBe(false);
  });
});

describe("#808a — label yang dibaca manusia", () => {
  it("nama berkas dari parameter query menang atas token di ujung path", () => {
    const label = labelPesan(SHAREPOINT);
    expect(label).toContain("bankbniitbk-my.sharepoint.com");
    expect(label).toContain("Design PPT 20CI 20BNI Migration");
    // Yang dulu tampil: token 43 karakter dari ujung path.
    expect(label).not.toContain("EYx3vXqTb1dLtYv2VDCYdUQB");
    expect(label).not.toContain("%20");
  });

  it("tanpa parameter nama, ujung path yang dipakai seperti #648", () => {
    expect(labelPesan("https://contoh.id/Laporan%202026.pptx")).toBe(
      "contoh.id · Laporan 2026.pptx"
    );
  });

  it("hanya host yang tersisa bila path-nya kosong", () => {
    expect(labelPesan("https://contoh.id/")).toBe("contoh.id");
  });

  it("nama panjang dipotong, dan alamat penuh tetap ada di tempat lain", () => {
    const label = labelPesan("https://a.co/x?file=" + encodeURIComponent("K".repeat(140)));
    expect(label).toContain("…");
    expect(label.length).toBeLessThan(90);
  });

  it("input yang bukan URL dikembalikan apa adanya, tidak melempar", () => {
    expect(labelPesan("bukan alamat")).toBe("bukan alamat");
  });
});
