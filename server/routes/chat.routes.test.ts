/**
 * Unit test untuk validasi pesan obrolan dan penegakan timestamp server (Item #246).
 */

import express from "express";
import request from "supertest";

// Mock DB
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

import { chatRepository } from "../repositories/chat.repository";
import chatRouter from "./chat.routes";

describe("POST /api/chat/messages Validation & Timestamp (Item #246)", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    // Simulate authenticated caller
    app.use((req: any, _res, next) => {
      req.user = { id: "user-1", uid: "user-1", username: "alice" };
      next();
    });
    app.use(chatRouter);
  });

  it("menolak pesan kosong atau hanya whitespace dengan 400", async () => {
    const res = await request(app)
      .post("/api/chat/messages")
      .send({ senderId: "user-1", receiverId: "user-2", message: "   " });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("srv.senderid_receiverid_dan_message");
  });

  it("menolak pesan non-string dengan 400", async () => {
    const res = await request(app)
      .post("/api/chat/messages")
      .send({ senderId: "user-1", receiverId: "user-2", message: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("srv.senderid_receiverid_dan_message");
  });

  it("menolak pesan yang melebihi 5000 karakter dengan 400 srv.pesan_terlalu_panjang", async () => {
    const pesanRaksasa = "a".repeat(5001);
    const res = await request(app)
      .post("/api/chat/messages")
      .send({ senderId: "user-1", receiverId: "user-2", message: pesanRaksasa });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("srv.pesan_terlalu_panjang");
    expect(res.body.message).toContain("5000 karakter");
  });

  it("mengabaikan timestamp kiriman klien dan menetapkan timestamp resmi server", async () => {
    const spyCreate = jest.spyOn(chatRepository, "createMessage").mockResolvedValueOnce({} as any);

    const fakeClientTs = "2099-01-01T00:00:00.000Z";
    const res = await request(app).post("/api/chat/messages").send({
      senderId: "user-1",
      receiverId: "user-2",
      message: "Halo dari pengujian!",
      timestamp: fakeClientTs,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.timestamp).not.toBe(fakeClientTs);
    expect(res.body.data.timestamp).toMatch(/^20\d\d-\d\d-\d\dT/);
    expect(spyCreate).toHaveBeenCalledTimes(1);
    const savedArg = spyCreate.mock.calls[0][0];
    expect(savedArg.timestamp).toBe(res.body.data.timestamp);
    expect(savedArg.message).toBe("Halo dari pengujian!");
  });
});
