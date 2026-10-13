/**
 * Test #674 — penulis rapat hanya dari token.
 *
 * `Meetings.authorId` menentukan siapa yang boleh mengubah dan menghapus rapat
 * itu, jadi sebelum ini body `authorId` bukan sekadar atribut tampilan: ia
 * adalah pemberian hak. Header `x-user-id` ikut dibaca pada PUT/DELETE sebagai
 * cadangan identitas, yang berarti seorang penyusup bisa mengklaim diri sebagai
 * penulis cukup dengan menulis header.
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

import { meetingRepository } from "../repositories/meeting.repository";
import { discussionPointsRepository } from "../repositories/discussion-points.repository";
import meetingsRouter from "./meetings.routes";

const PENULIS = "user-asli-1";

const buatApp = (user: any) => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = user;
    next();
  });
  app.use(meetingsRouter);
  return app;
};

describe("identitas rapat hanya dari token (#674)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(meetingRepository, "findById").mockResolvedValue(null);
    jest.spyOn(meetingRepository, "update").mockResolvedValue(undefined);
    jest.spyOn(meetingRepository, "delete").mockResolvedValue(undefined);
    jest.spyOn(discussionPointsRepository, "findByMeetingId").mockResolvedValue([] as any);
  });

  it("mengabaikan authorId palsu di body dan x-user-id palsu di header saat membuat rapat", async () => {
    let tersimpan: any = null;
    jest
      .spyOn(meetingRepository, "create")
      .mockImplementation(async (data: any) => (tersimpan = data));

    const res = await request(buatApp({ id: PENULIS, uid: PENULIS, username: "asli" }))
      .post("/api/projects/proj-1/meetings")
      .set("x-user-id", "palsu-header")
      .send({ title: "Rapat mingguan", authorId: "palsu-body" });

    expect(res.status).toBe(200);
    expect(tersimpan).not.toBeNull();
    expect(tersimpan.authorId).toBe(PENULIS);
    expect(res.body.data.authorId).toBe(PENULIS);
  });

  it("menolak PUT dari bukan penulis walau header mengklaim diri penulis", async () => {
    jest
      .spyOn(meetingRepository, "findById")
      .mockResolvedValue({ id: "m-1", authorId: PENULIS } as any);

    const res = await request(buatApp({ id: "penyusup", uid: "penyusup", role: "user" }))
      .put("/api/projects/proj-1/meetings/m-1")
      .set("x-user-id", PENULIS)
      .send({ title: "Diambil alih" });

    expect(res.status).toBe(403);
    expect(meetingRepository.update).not.toHaveBeenCalled();
  });

  it("menolak DELETE dari bukan penulis walau header mengklaim diri penulis", async () => {
    jest
      .spyOn(meetingRepository, "findById")
      .mockResolvedValue({ id: "m-1", authorId: PENULIS } as any);

    const res = await request(buatApp({ id: "penyusup", uid: "penyusup", role: "user" }))
      .delete("/api/projects/proj-1/meetings/m-1")
      .set("x-user-id", PENULIS);

    expect(res.status).toBe(403);
    expect(meetingRepository.delete).not.toHaveBeenCalled();
  });

  it("tetap mengenali penulisnya sendiri (regresi: matchesCaller menerima id dan uid)", async () => {
    jest
      .spyOn(meetingRepository, "findById")
      .mockResolvedValue({ id: "m-1", authorId: PENULIS } as any);
    jest.spyOn(meetingRepository, "update").mockResolvedValue(undefined);

    const res = await request(buatApp({ id: "lain", uid: PENULIS, role: "user" }))
      .put("/api/projects/proj-1/meetings/m-1")
      .send({ title: "Judul baru" });

    expect(res.status).toBe(200);
    expect(meetingRepository.update).toHaveBeenCalled();
  });

  it("tetap mengizinkan penulis menghapus rapatnya", async () => {
    jest
      .spyOn(meetingRepository, "findById")
      .mockResolvedValue({ id: "m-1", authorId: PENULIS } as any);
    jest.spyOn(discussionPointsRepository, "findByMeetingId").mockResolvedValue([] as any);
    jest.spyOn(meetingRepository, "delete").mockResolvedValue(undefined);

    const res = await request(buatApp({ id: PENULIS, uid: PENULIS, role: "user" })).delete(
      "/api/projects/proj-1/meetings/m-1"
    );

    expect(res.status).toBe(200);
    expect(meetingRepository.delete).toHaveBeenCalled();
  });
});
