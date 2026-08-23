import fs from "node:fs";
import path from "node:path";

import i18n from "../index";

/**
 * #150 — setiap `code:` yang dikirim server harus bisa diterjemahkan klien.
 *
 * Penjaga ini membaca kode sumber server, bukan daftar yang ditulis tangan:
 * pesan baru yang ditambahkan tanpa terjemahan akan langsung memerahkan uji ini.
 *
 * Sekaligus mengunci satu jebakan halus: kodenya memuat titik, sedangkan
 * i18next memperlakukan titik sebagai pemisah tingkat. Kunci datar bertitik
 * memang tetap terambil, tapi hanya lewat penggabungan ulang jalur — perilaku
 * yang harus diuji, bukan diandalkan diam-diam.
 */
const akarServer = path.resolve(__dirname, "../../../server");

function berkasServer(dir: string): string[] {
  const hasil: string[] = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) hasil.push(...berkasServer(p));
    } else if (/\.ts$/.test(p) && !/\.test\./.test(p)) {
      hasil.push(p);
    }
  }
  return hasil;
}

function kodePesanServer(): Map<string, string> {
  const kamus = new Map<string, string>();
  for (const p of berkasServer(akarServer)) {
    const isi = fs.readFileSync(p, "utf8");
    const re = /code:\s*"([^"]+)"\s*,\s*message:\s*(["'])((?:(?!\2)[^\n])*)\2/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(isi))) kamus.set(m[1], m[3]);
  }
  return kamus;
}

describe("#150 kode pesan server", () => {
  const kode = kodePesanServer();

  it("menemukan kode di kode sumber server", () => {
    expect(kode.size).toBeGreaterThan(150);
  });

  // Diperiksa LANGSUNG ke bundel, bukan lewat t(): `fallbackLng` bernilai "id",
  // sehingga kunci Inggris yang hilang akan diam-diam mengembalikan kalimat
  // Indonesia — persis kebocoran yang hendak dicegah. Lewat t(), uji ini hijau
  // padahal terjemahannya tidak ada.
  const bundel = (bahasa: "id" | "en") =>
    (i18n.getResourceBundle(bahasa, "translation") as Record<string, Record<string, string>>)
      .serverErr;

  it("setiap kode punya terjemahan Indonesia dan Inggris", () => {
    const kurang: string[] = [];
    for (const k of kode.keys()) {
      for (const bahasa of ["id", "en"] as const) {
        const nilai = bundel(bahasa)[k];
        if (typeof nilai !== "string" || nilai.trim() === "") kurang.push(`${bahasa}:${k}`);
      }
    }
    expect(kurang).toEqual([]);
  });

  it("kunci bertitik tetap terambil lewat t() meski titik adalah pemisah tingkat", () => {
    const contoh = [...kode.keys()].filter((k) => k.includes("."));
    expect(contoh.length).toBeGreaterThan(0);
    for (const k of contoh.slice(0, 20)) {
      expect(i18n.getFixedT("id")(`serverErr.${k}`)).toBe(bundel("id")[k]);
    }
  });

  it("bahasa Indonesia dan Inggris benar-benar berbeda teksnya", () => {
    // Menjaga dari kamus yang disalin mentah: kalau semua sama, tidak ada
    // terjemahan yang sungguh terjadi.
    let beda = 0;
    for (const k of kode.keys()) {
      if (bundel("id")[k] !== bundel("en")[k]) beda++;
    }
    expect(beda).toBeGreaterThan(kode.size * 0.8);
  });

  it("tidak ada kode dipakai untuk dua pesan berbeda", () => {
    const perKode = new Map<string, Set<string>>();
    for (const p of berkasServer(akarServer)) {
      const isi = fs.readFileSync(p, "utf8");
      const re = /code:\s*"([^"]+)"\s*,\s*message:\s*(["'])((?:(?!\2)[^\n])*)\2/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(isi))) {
        if (!perKode.has(m[1])) perKode.set(m[1], new Set());
        perKode.get(m[1])!.add(m[3]);
      }
    }
    const bentrok = [...perKode.entries()].filter(([, t]) => t.size > 1).map(([k]) => k);
    expect(bentrok).toEqual([]);
  });
});
