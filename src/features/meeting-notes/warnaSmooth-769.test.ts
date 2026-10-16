/**
 * #769 — warna chip PIC harus LEMBUT, dan Catatan Rapat tidak boleh lagi
 * memakai palet mentah.
 *
 * KENAPA TEST INI ADA. Pemilik proyek menolak hasil #765 pada 17 Okt: "warna pic
 * nya kasar, saya mau warnanya clean dan smooth ... jangan ada warna kasar dan
 * keras". Yang terjadi sebenarnya: #765 menyalin palet PEKAT avatar
 * (`bg-*-700` + teks putih) ke chip 10 px yang berjajar di dalam sel. Palet itu
 * sah untuk lingkaran avatar — keputusan pemilik sendiri di #125, karena rona 15 %
 * nyaris lenyap di kartu gelap (inisial terbaca kontras 1,85) — tapi salah untuk
 * chip. Bentuk yang benar sudah ada di rumah ini: `.label-chip` menurunkan latar
 * 13 % dan garis 34 % dari satu heksa sementara TEKS-nya netral (`--color-content`),
 * jadi ia lembut di KEDUA mode tanpa satu pun varian gelap (§22.4).
 *
 * MENGAPA GERBANG LAMA TIDAK MENANGKAPNYA. `audit:warna` hanya menghitung
 * white|black|slate|gray|zinc|neutral|stone, jadi `bg-*-700` dan `text-emerald-700`
 * lolos senyap — blind spot yang sudah didokumentasikan di kepala
 * `gayaWiki-726.test.ts` dan di #719 catatan (ii). `audit:label` menjaga RONA
 * label dari MasterData, bukan nada chip. Jadi penjaga ini yang menyebut
 * "nol palet mentah di jalur papan", per berkas, supaya tidak kembali diam-diam.
 *
 * TEST INI MEMBACA SUMBER (kecuali kesejajaran palet, yang dijalankan). jsdom
 * tidak menghitung layout: yang bisa dibuktikan di sini adalah bentuk kelas dan
 * heksa yang sampai ke elemen, bukan bahwa matanya melihat warna susu.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  getUserAvatarColors,
  getUserAvatarHex,
  HEKSA_AVATAR,
} from "../../components/ui/UserAvatar";

const AKAR = join(__dirname, "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const AVATAR = "components/ui/UserAvatar.tsx";
const BARIS = "features/meeting-notes/components/BarisDiskusi.tsx";
const KARTU = "features/meeting-notes/components/DiscussionPointMobileCardView.tsx";
const DAFTAR = "features/meeting-notes/MeetingNotes.tsx";
const KARTU_RAPAT = "features/meeting-notes/components/MeetingMobileCardView.tsx";

/** Kelas palet kromatik berdigit — pola yang sama dipakai `audit:warna`, tapi
 *  versi ini melihat SEMUA rona, bukan hanya abu-abu. */
const PALET_MENTAH = /\b(?:bg|text|border|ring|divide|from|via|to)-[a-z]+-\d{2,3}\b/g;

describe("chip PIC memakai pola chip lembut rumah (#769)", () => {
  it("papan dan kartu HP memakai label-chip + heksa identitas, bukan blok pekat", () => {
    for (const nama of [BARIS, KARTU]) {
      const isi = baca(nama);
      expect(isi).toContain("getUserAvatarHex");
      expect(isi).toContain("gayaLabel(getUserAvatarHex(id))");
      expect(isi).toContain("label-chip px-");
      // Sumber kelas pekat tidak boleh ikut diimpor lagi: begitu ia kembali,
      // chip kembali jadi blok warna dan pemilik proyek melihatnya sebagai kasar.
      // Yang diperiksa HANYA baris impor, bukan seluruh berkas — komentar di
      // kedua berkas ini menyebut nama fungsi lamanya untuk menjelaskan sejarah,
      // dan `indexOf` buta menemukan kutipan itu lebih dulu daripada kodenya.
      const imporAvatar = isi.match(/import \{[^}]*\} from "[^"]*UserAvatar";/);
      expect(imporAvatar).not.toBeNull();
      expect(imporAvatar?.[0]).toContain("getUserAvatarHex");
      expect(imporAvatar?.[0]).not.toContain("getUserAvatarColors");
    }
  });

  it("rona orang tetap sama dengan avatarnya — indeks kedua palet sejajar", () => {
    const isi = baca(AVATAR);
    const ronaKelas = [...isi.matchAll(/bg-([a-z]+)-700/g)].map((m) => m[1]);
    const ronaHeks = [...isi.matchAll(/"#[0-9A-Fa-f]{6}", \/\/ ([a-z]+)/g)].map((m) => m[1]);
    expect(ronaKelas.length).toBeGreaterThan(1);
    expect(ronaHeks).toEqual(ronaKelas);
    expect(HEKSA_AVATAR.length).toBe(ronaKelas.length);

    // Konsekuensi yang harus benar-benar berlaku: ID yang sama memberi indeks
    // yang sama di kedua keluaran, jadi satu orang satu rona di seluruh aplikasi.
    for (const id of ["u1", "u2", "gloria-handoyo", "7", ""]) {
      const kelas = getUserAvatarColors(id).bg;
      const urutan = ronaKelas.findIndex((r) => kelas === `bg-${r}-700`);
      expect(urutan).toBeGreaterThanOrEqual(0);
      expect(getUserAvatarHex(id)).toBe(HEKSA_AVATAR[urutan]);
    }
  });

  it("heksa identitas lolos gerbang grammar warna (`warnaSah`)", async () => {
    const { warnaSah } = await import("../../lib/warnaLabel");
    for (const heksa of HEKSA_AVATAR) expect(warnaSah(heksa)).toBe(true);
  });
});

describe("nol palet mentah di jalur papan (#769)", () => {
  it("Catatan Rapat dan kartu HP-nya hanya memakai token rumah", () => {
    for (const nama of [DAFTAR, KARTU_RAPAT, BARIS, KARTU]) {
      const temuan = [...baca(nama).matchAll(PALET_MENTAH)].map((m) => m[0]);
      expect(temuan.sort()).toEqual([]);
    }
  });

  it("token yang dipakai punya padanan dua mode, bukan varian gelap", () => {
    for (const nama of [DAFTAR, KARTU_RAPAT]) {
      const isi = baca(nama);
      expect(isi).not.toMatch(/\bdark:/);
      expect(isi).toContain("text-success-text");
      expect(isi).toContain("text-danger-text");
    }
  });
});
