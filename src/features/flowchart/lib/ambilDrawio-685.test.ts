/**
 * #685 — penjagaan ekstraksi build draw.io.
 *
 * Skrip vendor menulis ratusan berkas dari ZIP pihak ketiga ke `public/`.
 * Kesalahan di sini bukan bug tampilan: ini jalur tulis sembarang berkas.
 * Test memakai ZIP buatan sendiri supaya berjalan tanpa jaringan dan tanpa
 * artefak 50 MB.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";

const { namaAman, ekstrak } = require("../../../../scripts/ambil-drawio.cjs");

interface Entri {
  nama: string;
  isi: string;
}

/** ZIP kecil yang cukup untuk pengurai direktori pusat di skrip. */
function buatZip(entri: Entri[]): Buffer {
  const lokal: Buffer[] = [];
  const pusat: Buffer[] = [];
  let offset = 0;

  for (const e of entri) {
    const isi = Buffer.from(e.isi, "utf8");
    const data = deflateRawSync(isi);
    const nama = Buffer.from(e.nama, "utf8");

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(isi.length, 22);
    lh.writeUInt16LE(nama.length, 26);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(isi.length, 24);
    ch.writeUInt16LE(nama.length, 28);
    ch.writeUInt32LE(offset, 42);

    lokal.push(lh, nama, data);
    pusat.push(ch, nama);
    offset += lh.length + nama.length + data.length;
  }

  const direktori = Buffer.concat(pusat);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entri.length, 8);
  eocd.writeUInt16LE(entri.length, 10);
  eocd.writeUInt32LE(direktori.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...lokal, direktori, eocd]);
}

describe("#685 namaAman", () => {
  it("menolak path keluar direktori dan berkas server", () => {
    for (const nama of [
      "../jahat.txt",
      "js/../../jahat.txt",
      "/etc/passwd",
      "C:\\Windows\\win.ini",
      "js\\jahat.js",
      "WEB-INF/web.xml",
      "META-INF/MANIFEST.MF",
    ]) {
      expect(namaAman(nama)).toBeNull();
    }
  });

  it("melewati bundel yang bukan bagian editor dan berkas dokumentasi", () => {
    expect(namaAman("js/viewer.min.js")).toBeNull();
    expect(namaAman("js/viewer-static.min.js")).toBeNull();
    expect(namaAman("js/integrate.min.js")).toBeNull();
    expect(namaAman("js/app.min.js.map")).toBeNull();
    expect(namaAman("README.md")).toBeNull();
  });

  it("menerima aset editor yang memang dipakai", () => {
    expect(namaAman("index.html")).toBe("index.html");
    expect(namaAman("js/app.min.js")).toBe("js/app.min.js");
    expect(namaAman("resources/dia_id.txt")).toBe("resources/dia_id.txt");
  });
});

describe("#685 ekstrak ZIP", () => {
  let tujuan: string;

  beforeEach(() => {
    tujuan = mkdtempSync(join(tmpdir(), "lanpro-drawio-"));
  });

  afterEach(() => {
    rmSync(tujuan, { recursive: true, force: true });
  });

  it("menulis berkas sah dan tidak pernah menulis WEB-INF atau path jahat", () => {
    const zip = buatZip([
      { nama: "index.html", isi: "<html>drawio</html>" },
      { nama: "js/app.min.js", isi: "console.log(1)" },
      { nama: "WEB-INF/web.xml", isi: "<secret />" },
      { nama: "META-INF/MANIFEST.MF", isi: "Manifest-Version: 1.0" },
      { nama: "../jahat.txt", isi: "keluar" },
      { nama: "js/viewer.min.js", isi: "bundel viewer" },
    ]);

    const hasil = ekstrak(zip, tujuan);

    expect(hasil.ditulis).toBe(2);
    expect(readFileSync(join(tujuan, "index.html"), "utf8")).toBe("<html>drawio</html>");
    expect(readFileSync(join(tujuan, "js", "app.min.js"), "utf8")).toBe("console.log(1)");
    expect(() => readFileSync(join(tujuan, "..", "jahat.txt"))).toThrow();
    expect(() => readFileSync(join(tujuan, "WEB-INF", "web.xml"))).toThrow();
    expect(() => readFileSync(join(tujuan, "META-INF", "MANIFEST.MF"))).toThrow();
    expect(() => readFileSync(join(tujuan, "js", "viewer.min.js"))).toThrow();
  });
});
