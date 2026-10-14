/**
 * #706 — keadaan kosong papan Discussion Points harus berbicara tentang papan
 * itu, bukan tentang layar DAFTAR rapat.
 *
 * Sebelum ini induk papan membaca kunci `meetings.empty*` ("No meetings found"
 * / "Create a new meeting or adjust your search keyword") di EMPAT tempat:
 * daftar kartu HP dan sel `colSpan` desktop, masing-masing judul + petunjuk.
 * Tabel itu berada DI DALAM satu rapat yang sedang dibuka dan tombol
 * menambahnya "Add", jadi pesannya salah layar — dan satu-satunya kalimat yang
 * menyinggung pencarian muncul juga ketika pengguna tidak pernah mengetik apa
 * pun.
 *
 * Test ini membaca sumber, bukan merender: yang dijaga adalah alamat kamus dan
 * jumlah pembacaannya. Render papan butuh pertemuan, anggota, dan data master
 * yang tidak menambah jaminan apa pun atas pilihan kunci.
 */
import fs from "fs";
import path from "path";
import { id } from "../../i18n/locales/id";
import { en } from "../../i18n/locales/en";

const baca = (nama: string) => fs.readFileSync(path.join(__dirname, nama), "utf8");
const induk = baca("DiscussionPointsTable.tsx");
const kosong = baca("KeadaanKosongDiskusi.tsx");

describe("keadaan kosong papan Discussion Points (#706)", () => {
  it("induk tidak lagi memanggil kamus layar daftar rapat", () => {
    expect(induk).not.toContain('t("meetings.emptyTitle")');
    expect(induk).not.toContain('t("meetings.emptyHint")');
  });

  it("keadaan kosong dipakai di daftar kartu HP DAN di sel colSpan desktop", () => {
    expect((induk.match(/<KeadaanKosongDiskusi /g) || []).length).toBe(2);
    expect(induk).toContain('import { KeadaanKosongDiskusi } from "./KeadaanKosongDiskusi"');
  });

  it("memisah 'hasil cari kosong' dari 'papan masih kosong'", () => {
    expect(induk).toContain("kosongKarenaCari = kueriTertunda.length > 0");
    expect((induk.match(/cari=\{kosongKarenaCari\}/g) || []).length).toBe(2);
    for (const kunci of [
      "discussion.emptyTitle",
      "discussion.emptyHint",
      "discussion.emptySearchTitle",
      "discussion.emptySearchHint",
    ]) {
      expect(kosong).toContain(kunci);
    }
  });

  it("kedua kamus memuat keempat kunci, dan isinya bukan salinan kamus rapat", () => {
    for (const kamus of [id, en]) {
      const d = kamus.discussion;
      for (const kunci of [
        "emptyTitle",
        "emptyHint",
        "emptySearchTitle",
        "emptySearchHint",
      ] as const) {
        expect(typeof d[kunci]).toBe("string");
        expect(d[kunci].length).toBeGreaterThan(3);
      }
      expect(d.emptyTitle).not.toBe(kamus.meetings.emptyTitle);
      expect(d.emptyHint).not.toBe(kamus.meetings.emptyHint);
    }
  });

  it("tidak lagi menyuruh orang membuat rapat baru dari dalam sebuah rapat", () => {
    expect(en.discussion.emptyHint.toLowerCase()).not.toContain("create a new meeting");
    expect(id.discussion.emptyHint.toLowerCase()).not.toContain("buat rapat baru");
    expect(en.discussion.emptySearchHint.toLowerCase()).toContain("search");
    expect(id.discussion.emptySearchHint.toLowerCase()).toContain("kata kunci");
  });
});
