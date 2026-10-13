/**
 * Test #674 — pembuat dokumen hanya dari token.
 *
 * `Documents.createdBy` menentukan siapa yang boleh mengubah dan menghapus
 * dokumen (dan papan flowchart di dalamnya). Sebelum ini body `createdBy` masih
 * dibaca sebagai cadangan nama, dan PUT/DELETE menerima `x-user-id` dari header
 * sebagai identitas — keduanya tulisan klien.
 */
import express from "express";
import request from "supertest";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(async () => [[]]),
    getConnection: jest.fn(async () => ({
      query: jest.fn(async () => [[]]),
      release: jest.fn(),
    })),
  },
  query: jest.fn(async () => [[]]),
}));

jest.mock("../middleware/jagaProyek", () => ({
  jagaProyek: () => (_req: any, _res: any, next: any) => next(),
}));

import { documentRepository } from "../repositories/document.repository";
import documentsRouter from "./documents.routes";

const PEMBUAT = "user-asli-1";

const buatApp = (user: any) => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = user;
    next();
  });
  app.use(documentsRouter);
  return app;
};

describe("identitas dokumen hanya dari token (#674)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(documentRepository, "findById").mockResolvedValue(null);
    jest.spyOn(documentRepository, "update").mockResolvedValue("v2");
    jest.spyOn(documentRepository, "delete").mockResolvedValue(undefined);
  });

  it("mengabaikan createdBy palsu di body saat membuat dokumen", async () => {
    let tersimpan: any = null;
    jest
      .spyOn(documentRepository, "create")
      .mockImplementation(async (data: any) => (tersimpan = data));

    const res = await request(
      buatApp({ id: PEMBUAT, uid: PEMBUAT, username: "asli", displayName: "Asli" })
    )
      .post("/api/projects/proj-1/documents")
      .send({ title: "Dokumen", createdBy: "Nama Palsu" });

    expect(res.status).toBe(200);
    expect(tersimpan).not.toBeNull();
    expect(tersimpan.createdBy).toBe(PEMBUAT);
    expect(tersimpan.createdByName).not.toBe("Nama Palsu");
  });

  it("menolak PUT dari bukan pembuat walau header mengklaim diri pembuat", async () => {
    jest
      .spyOn(documentRepository, "findById")
      .mockResolvedValue({ id: "d-1", createdBy: PEMBUAT } as any);

    const res = await request(buatApp({ id: "penyusup", uid: "penyusup", role: "user" }))
      .put("/api/projects/proj-1/documents/d-1")
      .set("x-user-id", PEMBUAT)
      .send({ title: "Diambil alih" });

    expect(res.status).toBe(403);
    expect(documentRepository.update).not.toHaveBeenCalled();
  });

  it("menolak DELETE dari bukan pembuat walau header mengklaim diri pembuat", async () => {
    jest
      .spyOn(documentRepository, "findById")
      .mockResolvedValue({ id: "d-1", createdBy: PEMBUAT } as any);

    const res = await request(buatApp({ id: "penyusup", uid: "penyusup", role: "user" }))
      .delete("/api/projects/proj-1/documents/d-1")
      .set("x-user-id", PEMBUAT);

    expect(res.status).toBe(403);
    expect(documentRepository.delete).not.toHaveBeenCalled();
  });

  it("tetap mengenali pembuatnya sendiri lewat uid", async () => {
    jest
      .spyOn(documentRepository, "findById")
      .mockResolvedValue({ id: "d-1", createdBy: PEMBUAT } as any);
    jest.spyOn(documentRepository, "update").mockResolvedValue("v2");

    const res = await request(buatApp({ id: "lain", uid: PEMBUAT, role: "user" }))
      .put("/api/projects/proj-1/documents/d-1")
      .send({ title: "Judul baru" });

    expect(res.status).toBe(200);
    expect(documentRepository.update).toHaveBeenCalled();
  });
});
