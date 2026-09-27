/**
 * Mengadu `matriksAkses.ts` dengan tabel §19.4 dan §19.5 di AUDIT.md — baris
 * per baris, bukan total.
 *
 * KENAPA MEMBACA DOKUMEN, BUKAN MENYALINNYA.
 *
 * §19 adalah spesifikasi resmi otorisasi LanPro, dan ia disetujui pemilik
 * proyek dalam bentuk TABEL. Menyalin tabel itu ke dalam test hanya akan
 * memindahkan tempat penyimpangan bisa terjadi: kode dan test bisa sama-sama
 * salah, sementara dokumennya benar, dan semua tetap hijau.
 *
 * Repo ini sudah dua kali membayar kegagalan sejenis:
 *   §13.14  gerbang F0 dinyatakan LULUS padahal tidak pernah dijalankan;
 *           13 tabel dan 54 kolom ternyata berbeda antara migrasi dan produksi.
 *   §19.10  penyemai menulis data yang benar, seluruh pemeriksaan lulus, dan
 *           barisnya tidak pernah muncul di layar karena kontraknya putus.
 *
 * Jadi test ini MEMBACA `AUDIT.md`, mengurai tabelnya, dan membandingkannya
 * dengan matriks. Mengubah salah satu tanpa yang lain akan memerahkannya.
 *
 * Kalau tabel di dokumen dirapikan strukturnya, test ini akan gagal dengan
 * pesan yang menyebut baris mana. Perbaiki pengurainya — JANGAN melonggarkannya
 * jadi "kalau tidak ketemu, lewati". Pengurai yang melewati diam-diam persis
 * cara gerbang F0 dulu dinyatakan lulus.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  MATRIKS_PROYEK,
  MATRIKS_SISTEM,
  bolehDiProyek,
  bolehDiSistem,
  bolehHapusProyek,
  bolehBuatProyek,
  type Aksi,
  type ModulProyek,
} from "./matriksAkses";
import { PROJECT_ROLES, SYSTEM_ROLES } from "../types/roles";

const AUDIT = readFileSync(join(__dirname, "..", "..", "AUDIT.md"), "utf8");

/** Label di dokumen -> `code` yang tersimpan. Lihat penyemai katalog. */
const KODE_DARI_LABEL: Record<string, string> = {
  "Project Owner": "owner",
  "Project Admin": "admin",
  "Project Manager": "manager",
  "System Analyst": "system_analyst",
  "Business Analyst": "business_analyst",
  Developer: "developer",
  QA: "qa",
  Viewer: "viewer",
  Administrator: "admin",
  "Department Head": "head",
  "Standard User": "user",
  Observer: "viewer",
};

/** `CRUD`, `R + U`, `CRU`, `R`, `—` -> daftar huruf. */
function aksiDari(sel: string): Aksi[] {
  const bersih = sel.replace(/\*/g, "").replace(/\s|\+/g, "").trim();
  if (bersih === "" || bersih === "—" || bersih === "-") return [];
  const huruf = bersih.split("") as Aksi[];
  for (const h of huruf) {
    if (["C", "R", "U", "D"].indexOf(h) === -1) {
      throw new Error(`Huruf akses tak dikenal '${h}' pada sel '${sel}'`);
    }
  }
  return huruf;
}

/** `Project Owner · Project Admin` -> `["owner","admin"]`. */
function peranDari(sel: string, semua: readonly string[]): string[] {
  const teks = sel.replace(/\*/g, "").trim();
  if (/seluruh peran/i.test(teks)) return [...semua];
  return teks.split("·").map((bagian) => {
    const label = bagian.replace(/`/g, "").trim();
    const kode = KODE_DARI_LABEL[label];
    if (!kode) throw new Error(`Label peran tak dikenal di AUDIT.md: '${label}'`);
    return kode;
  });
}

/**
 * Menyusun ulang matriks LANGSUNG dari sebuah tabel di AUDIT.md.
 *
 * Baris yang kolom modulnya diapit tanda kurung — `*(hapus proyek)*`,
 * `*(buat proyek)*` — sengaja dilewati: keduanya bukan modul, dan di
 * `matriksAkses.ts` memang tinggal di fungsinya sendiri. Diuji terpisah di
 * bawah.
 */
function matriksDariDokumen(
  judul: string,
  akhir: string,
  semuaPeran: readonly string[]
): Record<string, Record<string, Aksi[]>> {
  const mulai = AUDIT.indexOf(judul);
  if (mulai === -1) throw new Error(`Bagian '${judul}' tidak ada di AUDIT.md`);
  const selesai = AUDIT.indexOf(akhir, mulai);
  if (selesai === -1) throw new Error(`Penutup '${akhir}' tidak ada sesudah '${judul}'`);
  const potongan = AUDIT.slice(mulai, selesai);

  const hasil: Record<string, Record<string, Aksi[]>> = {};
  let baris = 0;

  for (const l of potongan.split("\n")) {
    if (!l.trim().startsWith("|")) continue;
    const sel = l.split("|").slice(1, -1);
    if (sel.length < 3) continue;
    const modulMentah = sel[0].trim();
    if (/^-+$/.test(modulMentah.replace(/:/g, "")) || /Nama Modul/i.test(modulMentah)) continue;
    // Prettier menormalkan penekanan Markdown `*(...)*` menjadi `_(...)_`, jadi
    // keduanya harus dikenali. Pernah menjatuhkan test ini sekali.
    if (/^[*_]\(/.test(modulMentah)) continue; // bukan modul, lihat catatan di atas

    const modul = modulMentah
      .replace(/`/g, "")
      .replace(/\s*\(.*\)\s*/, "")
      .trim();
    if (!modul) continue;

    hasil[modul] = hasil[modul] || {};
    for (const peran of peranDari(sel[1], semuaPeran)) {
      hasil[modul][peran] = aksiDari(sel[2]);
    }
    baris++;
  }

  if (baris === 0) throw new Error(`Nol baris terurai dari '${judul}' — pengurainya rusak`);
  return hasil;
}

/** Bentuk matriks kode jadi sebanding dengan hasil urai dokumen. */
function ratakan(
  m: Record<string, Partial<Record<string, readonly Aksi[]>>>
): Record<string, Record<string, Aksi[]>> {
  const keluar: Record<string, Record<string, Aksi[]>> = {};
  for (const modul of Object.keys(m)) {
    keluar[modul] = {};
    for (const peran of Object.keys(m[modul])) {
      keluar[modul][peran] = [...(m[modul][peran] as readonly Aksi[])].sort();
    }
  }
  return keluar;
}

function urutkanNilai(m: Record<string, Record<string, Aksi[]>>) {
  for (const modul of Object.keys(m)) {
    for (const peran of Object.keys(m[modul])) m[modul][peran] = m[modul][peran].sort();
  }
  return m;
}

describe("matriks PROYEK vs tabel §19.5 di AUDIT.md", () => {
  const dokumen = urutkanNilai(
    matriksDariDokumen("### 19.5 PROJECT ROLE", "#### Wilayah kuasa", PROJECT_ROLES)
  );
  const kode = ratakan(MATRIKS_PROYEK);

  it("modul yang didaftar sama persis", () => {
    expect(Object.keys(kode).sort()).toEqual(Object.keys(dokumen).sort());
  });

  it.each(Object.keys(MATRIKS_PROYEK))("modul '%s' sama persis dengan dokumen", (modul) => {
    expect(kode[modul]).toEqual(dokumen[modul]);
  });
});

describe("matriks SISTEM vs tabel §19.4 di AUDIT.md", () => {
  const dokumen = urutkanNilai(
    matriksDariDokumen("### 19.4 SYSTEM ROLE", "`Project Manager` **tidak ada**", SYSTEM_ROLES)
  );

  it.each(Object.keys(MATRIKS_SISTEM))("modul '%s' sama persis dengan dokumen", (modul) => {
    // Dokumen menulis peran tanpa akses sebagai `—`; matriks kode
    // menghilangkannya sama sekali. Keduanya berarti hal yang sama —
    // deny-by-default — jadi yang dibandingkan hanya peran yang PUNYA akses.
    const dariDokumen: Record<string, Aksi[]> = {};
    for (const peran of Object.keys(dokumen[modul])) {
      if (dokumen[modul][peran].length > 0) dariDokumen[peran] = dokumen[modul][peran];
    }
    expect(ratakan(MATRIKS_SISTEM)[modul]).toEqual(dariDokumen);
  });
});

describe("ketetapan §19.7 tentang huruf D", () => {
  /**
   * "Pelaksana tidak pernah menghapus, kecuali QA pada modul qa." Ini yang
   * menutup #66 dan #72 secara struktural. Diuji sebagai ATURAN, bukan sebagai
   * daftar — supaya modul yang ditambahkan besok ikut terjaring.
   */
  const pelaksana = ["system_analyst", "business_analyst", "developer", "qa"] as const;
  const wilayahKuasa: Record<string, string[]> = {
    wiki: ["system_analyst"],
    flowchart: ["system_analyst"],
    meetingNotes: ["business_analyst"],
    qa: ["qa"],
  };

  it("peran fungsional hanya boleh D di modul yang dikuasainya", () => {
    const melanggar: string[] = [];
    for (const modul of Object.keys(MATRIKS_PROYEK) as ModulProyek[]) {
      for (const peran of pelaksana) {
        if (!bolehDiProyek(peran, modul, "D")) continue;
        if ((wilayahKuasa[modul] || []).indexOf(peran) === -1) {
          melanggar.push(`${peran} boleh D di ${modul}`);
        }
      }
    }
    expect(melanggar).toEqual([]);
  });

  it("viewer tidak pernah C, U, atau D di modul mana pun — inti #66 dan #72", () => {
    const melanggar: string[] = [];
    for (const modul of Object.keys(MATRIKS_PROYEK) as ModulProyek[]) {
      for (const aksi of ["C", "U", "D"] as Aksi[]) {
        if (bolehDiProyek("viewer", modul, aksi))
          melanggar.push(`viewer boleh ${aksi} di ${modul}`);
      }
    }
    expect(melanggar).toEqual([]);
  });

  it("setiap peran katalog bisa membaca dashboard", () => {
    for (const peran of PROJECT_ROLES) {
      expect(bolehDiProyek(peran, "dashboard", "R")).toBe(true);
    }
  });
});

describe("deny-by-default — §19.6 aturan 3", () => {
  it("modul tak dikenal ditolak, bukan diloloskan", () => {
    expect(bolehDiProyek("owner", "modulKarangan", "R")).toBe(false);
    expect(bolehDiSistem("admin", "modulKarangan", "R")).toBe(false);
  });

  it("peran tak dikenal ditolak walau modulnya sah", () => {
    expect(bolehDiProyek("superadmin", "list", "R")).toBe(false);
    expect(bolehDiProyek("member", "list", "R")).toBe(false);
  });

  it("null, undefined, dan string kosong ditolak", () => {
    for (const nilai of [null, undefined, ""]) {
      expect(bolehDiProyek(nilai, "list", "R")).toBe(false);
      expect(bolehDiSistem(nilai, "settings", "R")).toBe(false);
    }
  });

  it("`head` (Department Head) memiliki akses R di proyek tetapi ditolak untuk aksi tulis (C, U, D)", () => {
    expect(bolehDiProyek("head", "list", "R")).toBe(true);
    expect(bolehDiProyek("head", "list", "C")).toBe(false);
    expect(bolehDiProyek("head", "list", "U")).toBe(false);
    expect(bolehDiProyek("head", "list", "D")).toBe(false);
  });
});

describe("operasi di luar modul", () => {
  it("hanya Project Owner yang boleh menghapus proyek", () => {
    expect(bolehHapusProyek("owner")).toBe(true);
    for (const peran of PROJECT_ROLES) {
      if (peran !== "owner") expect(bolehHapusProyek(peran)).toBe(false);
    }
  });

  it("hanya Administrator sistem yang boleh membuat proyek — menutup #80", () => {
    expect(bolehBuatProyek("admin")).toBe(true);
    for (const peran of SYSTEM_ROLES) {
      if (peran !== "admin") expect(bolehBuatProyek(peran)).toBe(false);
    }
  });
});
