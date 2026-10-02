/**
 * #584 — batas body untuk dokumen proyek.
 *
 * `canvasData` papan flowchart ditulis ulang oleh autosave setiap beberapa
 * detik dan isinya disusun KLIEN. Tanpa batas panjang, satu tab yang rusak bisa
 * menaruh puluhan megabyte pada satu baris basis data dan terus menulis ulang
 * baris itu. Test ini mengunci bahwa penolakan terjadi SEBELUM repository
 * dipanggil, dengan pesan yang bisa dimengerti orang yang menyimpannya.
 */
import { createDocumentSchema, updateDocumentSchema } from "./document.schema";

const judul = { title: "Alur QRIS" };

describe("document.schema — payload papan dan berkas dibatasi (#584)", () => {
  it("menerima papan flowchart ukuran wajar", () => {
    const hasil = updateDocumentSchema.safeParse({
      ...judul,
      canvasData: JSON.stringify({ nodes: [{ id: "n1" }], edges: [] }),
    });
    expect(hasil.success).toBe(true);
  });

  it("menolak payload yang melewati batas, dan menyebut batasnya", () => {
    const persis = "x".repeat(8 * 1024 * 1024);
    const lewat = "x".repeat(8 * 1024 * 1024 + 1);

    for (const schema of [createDocumentSchema, updateDocumentSchema]) {
      // 8 MB masih diterima: papan yang sudah ada tidak boleh tiba-tiba ditolak.
      expect(schema.safeParse({ ...judul, canvasData: persis }).success).toBe(true);

      const hasil = schema.safeParse({ ...judul, canvasData: lewat });
      expect(hasil.success).toBe(false);
      expect(
        (hasil as { error: { issues: { message: string }[] } }).error.issues[0].message
      ).toMatch(/8 MB/);
    }
  });

  it("menolak isi berkas base64 yang melewati batas yang sama", () => {
    const hasil = createDocumentSchema.safeParse({
      ...judul,
      fileData: "x".repeat(8 * 1024 * 1024 + 1),
    });
    expect(hasil.success).toBe(false);
  });
});

describe("document.schema — tautan dokumen bukan skrip (#584)", () => {
  it("menolak javascript: dan variannya yang disembunyikan spasi", () => {
    for (const link of ["javascript:alert(1)", "  JaVaScRiPt:alert(1)", "vbscript:msgbox(1)"]) {
      const hasil = updateDocumentSchema.safeParse({ ...judul, link });
      expect(hasil.success).toBe(false);
    }
  });

  it("tetap menerima tautan tanpa awalan — banyak orang menempel seperti itu", () => {
    for (const link of [
      "https://docs.google.com/document/d/abc",
      "docs.google.com/document/d/abc",
      "",
    ]) {
      expect(updateDocumentSchema.safeParse({ ...judul, link }).success).toBe(true);
    }
  });
});
