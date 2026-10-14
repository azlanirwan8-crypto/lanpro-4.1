/**
 * #676 — langit-langit izin. Keputusan pemilik proyek 14 Okt: matriks adalah
 * satu-satunya sumber kebenaran, dan `Users.permissions` hanya boleh
 * MENURUNKAN izin dari bawaan perannya.
 *
 * Yang dikunci di sini dua hal. Pertama, perilakunya: custom yang serakah
 * tidak lagi melahirkan izin baru, sementara custom yang mencabut tetap jalan.
 * Kedua, plafonnya sendiri: untuk setiap peran proyek, baik bawaan maupun
 * hasil gabungan dengan custom tidak pernah melampaui `MATRIKS_PROYEK` — jadi
 * `DEFAULT_PERMISSIONS` tidak bisa menyimpang diam-diam dari §19.5.
 *
 * Satu pengecualian yang DISENGAJA: peran sistem `user` tidak punya baris di
 * `MATRIKS_PROYEK`, dan plafon `user.list.delete` dinaikkan jadi `true`
 * (keputusan pemilik 14 Okt, opsi A) supaya #483 tidak mati di bawah aturan
 * "custom hanya menurunkan". Checklist berubah fungsi jadi pencabut.
 */

import { DEFAULT_PERMISSIONS, getUserPermissions, hasPermission } from "./permissions";
import { MATRIKS_PROYEK, bolehDiProyek, type ModulProyek } from "./matriksAkses";
import { PROJECT_ROLES } from "../types/roles";

const AKSI = ["create", "read", "update", "delete"] as const;
const HURUF: Record<(typeof AKSI)[number], "C" | "R" | "U" | "D"> = {
  create: "C",
  read: "R",
  update: "U",
  delete: "D",
};
const SEMUA_MODUL = Object.keys(MATRIKS_PROYEK) as ModulProyek[];

/** Custom paling serakah yang bisa disimpan seseorang di kolom JSON itu. */
const customSerakah = () => {
  const hasil: Record<string, any> = {};
  for (const modul of SEMUA_MODUL) {
    hasil[modul] = { create: true, read: true, update: true, delete: true };
  }
  return hasil;
};

describe("#676 custom tidak bisa menaikkan izin", () => {
  it("viewer dengan custom serakah tetap di bawaannya", () => {
    const izin: any = getUserPermissions("viewer" as any, customSerakah() as any);
    expect(izin.list.read).toBe(true);
    expect(izin.list.create).toBe(false);
    expect(izin.list.update).toBe(false);
    expect(izin.list.delete).toBe(false);
    expect(izin.sprints.delete).toBe(false);
    expect(izin.wiki.update).toBe(false);
  });

  it("peran sistem `user`: bawaan memberi delete di list, checklist bisa mencabutnya", () => {
    // #676 opsi A (keputusan pemilik 14 Okt). Plafon `user.list.delete`
    // dinaikkan supaya #483 tetap hidup di bawah aturan "custom hanya boleh
    // MENURUNKAN": dengan plafon `false`, checklist tidak akan pernah bisa
    // memberi izin dan anggota kehilangan tombol Hapus pada issue miliknya
    // sendiri. Kepemilikan TIDAK diputuskan di sini — itu tugas `canDeleteIssue`.
    const izin: any = getUserPermissions("user" as any, undefined as any);
    expect(izin.list.delete).toBe(true);

    const dicabut: any = getUserPermissions("user" as any, { list: { delete: false } } as any);
    expect(dicabut.list.delete).toBe(false);
    expect(dicabut.list.update).toBe(true);
    expect(dicabut.list.create).toBe(true);
  });

  it('nilai warisan berbentuk string "full" tidak bisa menaikkan', () => {
    const izin: any = getUserPermissions("viewer" as any, { list: "full" } as any);
    expect(izin.list.delete).toBe(false);
    expect(izin.list.update).toBe(false);
    expect(izin.list.read).toBe(true);
  });

  it("modul yang tidak dikenal tidak melahirkan izin baru", () => {
    const izin: any = getUserPermissions(
      "viewer" as any,
      {
        laporanRahasia: { read: true, delete: true },
      } as any
    );
    expect(Boolean(izin.laporanRahasia?.read)).toBe(false);
    expect(Boolean(izin.laporanRahasia?.delete)).toBe(false);
  });

  it("hasPermission menolak kenaikan yang diminta custom", () => {
    expect(
      hasPermission("viewer" as any, "list", "delete", false, { list: { delete: true } } as any)
    ).toBe(false);
    expect(
      hasPermission("viewer" as any, "settings", "delete", false, {
        settings: { delete: true },
      } as any)
    ).toBe(false);
  });

  it("hasPermission peran `user`: plafon delete ada, yang menahan adalah kepemilikan", () => {
    // Cabang "general users can only delete data they own" di permissions.ts
    // membaca custom MENTAH, tapi hanya bisa dicapai setelah bit hasil plafon
    // true — jadi custom tetap tidak pernah menaikkan di atas langit-langit.
    expect(hasPermission("user" as any, "list", "delete", false)).toBe(false);
    expect(hasPermission("user" as any, "list", "delete", true)).toBe(true);
    expect(
      hasPermission("user" as any, "list", "delete", true, { list: { delete: false } } as any)
    ).toBe(false);
  });

  it("admin (God Mode) tidak berubah: custom-nya memang tidak dibaca", () => {
    const izin: any = getUserPermissions("admin" as any, { list: { delete: false } } as any);
    expect(izin.list.delete).toBe(true);
    expect(hasPermission("admin" as any, "list", "delete")).toBe(true);
  });
});

describe("#676 custom TETAP bisa menurunkan izin", () => {
  it("manager kehilangan delete tanpa kehilangan aksi lain", () => {
    const izin: any = getUserPermissions("manager" as any, { list: { delete: false } } as any);
    expect(izin.list).toEqual({ create: true, read: true, update: true, delete: false });
  });

  it("hasPermission menghormati pencabutan itu", () => {
    expect(
      hasPermission("manager" as any, "list", "delete", false, { list: { delete: false } } as any)
    ).toBe(false);
    expect(hasPermission("manager" as any, "list", "update", false)).toBe(true);
  });
});

describe("#676 plafonnya adalah MATRIKS_PROYEK (§19.5)", () => {
  // `admin` punya God Mode (§19.6 langkah 3b) dan `user` bukan peran proyek
  // sehingga tidak punya baris di matriks; keduanya sengaja di luar sifat ini.
  const peranProyek = PROJECT_ROLES.filter((peran) => peran !== "admin");

  it.each(peranProyek)("%s: setiap bit bawaan ada di matriks", (peran) => {
    const plafon: any = DEFAULT_PERMISSIONS[peran];
    for (const modul of SEMUA_MODUL) {
      for (const aksi of AKSI) {
        if (plafon?.[modul]?.[aksi]) {
          expect(bolehDiProyek(peran, modul, HURUF[aksi])).toBe(true);
        }
      }
    }
  });

  it.each(peranProyek)("%s: custom serakah pun tidak menembus matriks", (peran) => {
    const izin: any = getUserPermissions(peran as any, customSerakah() as any);
    for (const modul of SEMUA_MODUL) {
      for (const aksi of AKSI) {
        if (izin?.[modul]?.[aksi]) {
          expect(bolehDiProyek(peran, modul, HURUF[aksi])).toBe(true);
        }
      }
    }
  });
});
