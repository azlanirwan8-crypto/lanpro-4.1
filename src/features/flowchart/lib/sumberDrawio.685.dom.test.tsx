/** @jest-environment jsdom */
/**
 * #685 — kesetiaan SUMBER, diuji pada bentuk berkas nyata.
 *
 * Yang paling mudah salah di sini bukan membaca XML-nya, melainkan godaan
 * "merapikan" sumber: membuka kompresi lalu menyimpan hasilnya sebagai sumber
 * baru. Itu membuat hash berubah dan membuat berkas tidak lagi identik dengan
 * yang diunggah pengguna — persis kegagalan yang dilaporkan di spesifikasi
 * penerimaan A. Karena itu `xmlSumber` DIASSERT sama byte-per-byte bahkan ketika
 * `teksSiapJeraf` sudah berisi XML terbuka.
 *
 * Fixture ditulis sebagai konstanta string, mengikuti konvensi repo
 * (`FlowchartContainer.klipboardPeramban.test.tsx:83-89`), bukan berkas biner:
 * repo ini tidak punya direktori fixtures dan tidak ada preseden byte di `src`.
 * Berkas `.drawio` ASLI pemilik tetap diminta terpisah — test ini membuktikan
 * bentuknya, bukan menggantikan fixture berizin itu.
 */
import { deflateRawSync, inflateRawSync } from "node:zlib";
import {
  BATAS_BYTE_SUMBER,
  TolakSumber,
  bacaSumberDrawio,
  hashSumber,
  type PenguraiDeflate,
} from "./sumberDrawio";

const pengurai: PenguraiDeflate = async (bytes) =>
  decodeURIComponent(inflateRawSync(Buffer.from(bytes)).toString("utf8"));

const kompres = (xml: string): string =>
  Buffer.from(deflateRawSync(Buffer.from(encodeURIComponent(xml), "utf8"))).toString("base64");

const MODEL_SATU =
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="2" value="Mulai" vertex="1" parent="1">' +
  '<mxGeometry x="40" y="20" width="100" height="50" as="geometry"/></mxCell>' +
  '<mxCell id="3" edge="1" parent="1" source="2"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  "</root></mxGraphModel>";

const berkasSatuHalaman = `<mxfile host="app.diagrams.net" modified="2026-10-10T00:00:00.000Z" agent="draw.io" version="24.0.0" type="device"><diagram id="page-1" name="Alur Utama">${MODEL_SATU}</diagram></mxfile>`;

describe("#685 sumber kanonik bertahan apa adanya", () => {
  it("halaman polos: byte sumber sama persis dan halaman terinventaris", async () => {
    const hasil = await bacaSumberDrawio(berkasSatuHalaman, "alur.drawio", pengurai);

    expect(hasil.xmlSumber).toBe(berkasSatuHalaman.trim());
    expect(hasil.halaman).toEqual([
      { id: "page-1", nama: "Alur Utama", terkompresi: false, sel: 4 },
    ]);
    expect(hasil.byteSumber).toBe(berkasSatuHalaman.trim().length);
    // Metadata berkas (host/modified/version/agent) masih ada di dalam byte yang
    // disimpan — itulah yang hilang saat model native ditulis ulang sebagai mxfile.
    expect(hasil.xmlSumber).toContain('version="24.0.0"');
  });

  it("halaman TERKOMPRESI: sumber tetap byte asli, hanya salinan jeraf yang terbuka", async () => {
    const terkompresi = `<mxfile host="app.diagrams.net" version="24.0.0"><diagram id="p" name="Halaman">${kompres(
      MODEL_SATU
    )}</diagram></mxfile>`;

    const hasil = await bacaSumberDrawio(terkompresi, "lama.drawio", pengurai);

    // Inti penerimaan A: tidak ada normalisasi senyap.
    expect(hasil.xmlSumber).toBe(terkompresi.trim());
    expect(hasil.xmlSumber).toContain(kompres(MODEL_SATU));
    expect(hasil.xmlSumber).not.toContain("Mulai");
    // ...tetapi jalur konversi native tetap bisa bekerja atas hasilnya.
    expect(hasil.teksSiapJeraf).toContain("Mulai");
    expect(hasil.halaman[0]).toMatchObject({ terkompresi: true, sel: 4 });
  });

  it("multi-page dilaporkan per halaman, bukan digabung diam-diam", async () => {
    const dua =
      '<mxfile host="app.diagrams.net">' +
      `<diagram id="a" name="Satu">${MODEL_SATU}</diagram>` +
      `<diagram id="b" name="Dua">${MODEL_SATU}</diagram>` +
      "</mxfile>";

    const hasil = await bacaSumberDrawio(dua, "dua-halaman.drawio", pengurai);
    expect(hasil.halaman.map((h) => [h.id, h.nama])).toEqual([
      ["a", "Satu"],
      ["b", "Dua"],
    ]);
    // Yang dikirim ke penjeraf native adalah DUA model dalam satu dokumen, jadi
    // daftar halaman di atas itulah yang membuat UI bisa jujur: papan native hanya
    // punya satu bidang, dan id sel antar halaman boleh sama — jadi "2 halaman
    // digabung, bentuk kedua bisa bertabrakan" wajib dinyatakan sebelum konversi,
    // bukan dibuang diam-diam.
    const jumlahModel = (hasil.teksSiapJeraf.match(/<mxGraphModel/g) || []).length;
    expect(jumlahModel).toBe(2);
    expect(hasil.xmlSumber).toContain('id="a"');
    expect(hasil.xmlSumber).toContain('id="b"');
    expect(hasil.halaman.every((h) => h.sel === 4)).toBe(true);
  });

  it("hash sumber sama sesudah siklus simpan/muat (byte yang sama => hash yang sama)", async () => {
    const hasil = await bacaSumberDrawio(berkasSatuHalaman, "alur.drawio", pengurai);
    const sebelum = await hashSumber(berkasSatuHalaman.trim());
    // Simpan lalu muat: payload JSON harus mengembalikan string yang identik.
    const sesudahMuat = JSON.parse(JSON.stringify({ sumberDrawio: hasil.xmlSumber })).sumberDrawio;
    expect(await hashSumber(sesudahMuat)).toBe(sebelum);
    expect(sesudahMuat).toBe(hasil.xmlSumber);
  });

  /**
   * draw.io menulis sebagian teks pengguna apa adanya di dalam CDATA, jadi isi
   * label/user-data bisa mengandung bentuk yang MENYERUPAI tag — `</diagram>`,
   * bahkan `<mxfile>`. Penjeraf yang menghitung halaman dengan regex akan
   * melihat halaman hantu di sana. Letaknya di dalam ELEMEN (bukan atribut) agar
   * fixture ini adalah XML yang benar-benar bisa dihasilkan draw.io.
   */
  it("label ber-CDATA yang menyerupai tag tidak menambah halaman hantu", async () => {
    const jebakan =
      '<mxfile host="app.diagrams.net"><diagram id="x" name="Satu"><mxGraphModel><root>' +
      '<mxCell id="0"/><mxCell id="1" parent="0"/>' +
      '<mxCell id="2" vertex="1" parent="1">' +
      '<mxGeometry x="1" y="1" width="2" height="2" as="geometry"/>' +
      '<Array as="points"><![CDATA[</diagram><mxfile><diagram id="y" name="Hantu">]]></Array>' +
      "</mxCell>" +
      "</root></mxGraphModel></diagram></mxfile>";

    const hasil = await bacaSumberDrawio(jebakan, "jebakan.drawio", pengurai);
    expect(hasil.halaman).toHaveLength(1);
    expect(hasil.halaman[0].id).toBe("x");
    expect(hasil.halaman[0].sel).toBe(3);
    // Sumber tetap byte asli, jebakan CDATA-nya tidak ikut "dibersihkan".
    expect(hasil.xmlSumber).toContain("<![CDATA[");
  });

  it("mxGraphModel lepas (hasil tempel) tetap diterima tanpa halaman", async () => {
    const hasil = await bacaSumberDrawio(MODEL_SATU, "tempel.xml", pengurai);
    expect(hasil.teksSiapJeraf).toContain("Mulai");
    expect(hasil.halaman).toEqual([]);
  });
});

describe("#685 penolakan yang bisa dibaca pengguna", () => {
  const sebab = async (teks: string, nama = "uji.drawio") => {
    try {
      await bacaSumberDrawio(teks, nama, pengurai);
      return null;
    } catch (e) {
      return e as TolakSumber;
    }
  };

  it("menolak bukan drawio dengan alasan yang disebut", async () => {
    const e = await sebab('{"nodes":[],"edges":[]}', "papan.json");
    expect(e).toBeInstanceOf(TolakSumber);
    expect(e!.sebab).toBe("bukan-drawio");
  });

  it("menolak berkas lewat batas SEBELUM parsing, tidak memotong diam-diam", async () => {
    const besar = `<mxfile>${"<mxGraphModel/>".padEnd(BATAS_BYTE_SUMBER + 10, "x")}</mxfile>`;
    const e = await sebab(besar, "raksasa.drawio");
    expect(e!.sebab).toBe("terlalu-besar");
    expect(e!.message).toContain("tidak akan dipotong");
  });

  it("menolak XML rusak", async () => {
    const e = await sebab('<mxfile><diagram id="a">oops</mxfile>', "rusak.drawio");
    expect(e!.sebab).toBe("xml-rusak");
  });

  it("menolak halaman kosong tanpa membuat papan kosong yang terlihat sukses", async () => {
    const e = await sebab(
      '<mxfile host="x"><diagram id="a" name="Kosong"></diagram></mxfile>',
      "kosong.drawio"
    );
    expect(e!.sebab).toBe("tanpa-halaman");
  });

  it("menolak isi terkompresi yang bukan base64/deflate valid", async () => {
    const e = await sebab(
      '<mxfile><diagram id="a">@@@@bukan-base64</diagram></mxfile>',
      "jahat.drawio"
    );
    expect(e!.sebab).toBe("kompresi-rusak");
  });
});
