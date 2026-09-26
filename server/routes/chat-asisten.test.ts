/**
 * #551 — asisten harus benar-benar menjawab dari data, dan tidak bisa
 * ditumpangi identitas.
 *
 * Semua asersi di bawah mengukur PERILAKU lewat rute HTTP, bukan keberadaan
 * fungsi: yang berbahaya dari asisten adalah mengarang, atau membiarkan
 * seseorang meminta jawaban yang di-grounding data akun lain.
 */

import express from "express";
import request from "supertest";

// Mock DB: repository dipakai lewat spy, jadi tidak ada koneksi sungguhan.
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

const mockGenerateContent = jest.fn();
jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn() }));
import { GoogleGenAI } from "@google/genai";
const MockGoogleGenAI = GoogleGenAI as unknown as jest.Mock;

import { chatRepository } from "../repositories/chat.repository";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import chatRouter from "./chat.routes";

const PROYEK_TERLIHAT = { id: "p-1", name: "LanPro Core" };
const TUGAS = {
  id: "t-1",
  taskKey: "LNP-12",
  title: "Perbaiki navbar Safari",
  status: "In Progress",
  endDate: "2026-09-20",
  projectId: "p-1",
  assigneeId: "user-1",
};

describe("POST /api/chat/assistant (Item #551)", () => {
  let app: express.Express;
  const kunciLama = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "kunci-uji";
    // `resetMocks: true` di jest.config.cjs menghapus implementi tiap uji, jadi
    // bentuk klien Gemini dipasang ulang di sini, bukan di factory jest.mock.
    MockGoogleGenAI.mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }));

    jest
      .spyOn(chatRepository, "findConversationMessages")
      .mockResolvedValue([
        { senderId: "user-1", message: "Halo kemarin", timestamp: "2026-09-25T00:00:00.000Z" },
      ] as any);
    jest.spyOn(chatRepository, "createMessage").mockResolvedValue(undefined as any);
    jest
      .spyOn(projectRepository, "findProjectsForCaller")
      .mockResolvedValue([PROYEK_TERLIHAT] as any);
    jest.spyOn(taskRepository, "findRawProjectTasks").mockResolvedValue([TUGAS] as any);

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { id: "user-1", uid: "user-1", username: "alice", role: "developer" };
      next();
    });
    app.use(chatRouter);
  });

  afterAll(() => {
    if (kunciLama === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = kunciLama;
  });

  it("menolak pesan kosong sebelum menyentuh model", async () => {
    const res = await request(app).post("/api/chat/assistant").send({ message: "  " });

    expect(res.status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(chatRepository.createMessage).not.toHaveBeenCalled();
  });

  // Inti keamanan #551: id penanya datang dari token. Mengirim id orang lain di
  // body tidak mengubah siapa yang datanya dibaca, dan tidak mengubah ke mana
  // balasan disimpan.
  it("mengabaikan identitas kiriman klien dan memakai identitas token", async () => {
    mockGenerateContent.mockResolvedValue({
      functionCalls: undefined,
      text: "Ada satu tugas terbuka.",
    });

    const res = await request(app).post("/api/chat/assistant").send({
      message: "Tugas saya apa?",
      userId: "user-999",
      senderId: "penyusup",
      receiverId: "user-999",
    });

    expect(res.status).toBe(200);
    expect(projectRepository.findProjectsForCaller).toHaveBeenCalledWith("user-1", "developer");
    expect(chatRepository.findConversationMessages).toHaveBeenCalledWith("lanpro-ai", "user-1");

    const tersimpan = (chatRepository.createMessage as jest.Mock).mock.calls[0][0];
    expect(tersimpan.senderId).toBe("lanpro-ai");
    expect(tersimpan.receiverId).toBe("user-1");
    expect(tersimpan.message).toBe("Ada satu tugas terbuka.");
  });

  it("menyuntikkan data nyata dan memori, bukan pertanyaan telanjang", async () => {
    mockGenerateContent.mockResolvedValue({
      functionCalls: undefined,
      text: "Satu tugas: LNP-12.",
    });

    await request(app).post("/api/chat/assistant").send({ message: "Tugas saya apa?" });

    const { contents } = mockGenerateContent.mock.calls[0][0];
    const bundel = JSON.stringify(contents);
    expect(bundel).toContain("LNP-12");
    expect(bundel).toContain("LanPro Core");
    expect(bundel).toContain("Halo kemarin");
  });

  // Spesifikasi nada #553 ikut terkirim. Kalau seseorang memangkas prompt ini
  // sampai kehilangan CERMIN/INTI/LANGKAH atau larangan mengarang, uji ini merah.
  it("spesifikasi nada dan larangan mengarang ikut terkirim ke model", async () => {
    mockGenerateContent.mockResolvedValue({ functionCalls: undefined, text: "Oke." });

    await request(app).post("/api/chat/assistant").send({ message: "Tugas saya apa?" });

    const { config } = mockGenerateContent.mock.calls[0][0];
    expect(config.systemInstruction).toContain("CERMIN");
    expect(config.systemInstruction).toContain("Jangan pernah mengarang");
    expect(config.systemInstruction).toContain("CONTOH NADA");
    expect(config.temperature).toBeLessThanOrEqual(0.5);
  });

  it("menjalankan perkakas lalu menjawab dari hasilnya", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: "tugas_saya", args: { hanyaTerbuka: true } }],
        text: undefined,
      })
      .mockResolvedValueOnce({ functionCalls: undefined, text: "Satu tugas: LNP-12." });

    const res = await request(app).post("/api/chat/assistant").send({ message: "Tugas saya apa?" });

    expect(res.body.data.message).toBe("Satu tugas: LNP-12.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);

    const { contents } = mockGenerateContent.mock.calls[1][0];
    const bundel = JSON.stringify(contents);
    expect(bundel).toContain("functionResponse");
    expect(bundel).toContain("LNP-12");
  });

  // Perkakas tidak diberi tahu apa yang boleh dibaca — ia memeriksa ulang.
  it("menolak membaca proyek yang tidak terlihat oleh penanya", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: "ringkas_proyek", args: { proyekId: "p-rahasia" } }],
        text: undefined,
      })
      .mockResolvedValueOnce({ functionCalls: undefined, text: "Proyek itu tidak saya lihat." });

    await request(app).post("/api/chat/assistant").send({ message: "Ringkas proyek rahasia" });

    // hanya "p-1" yang pernah dibuka: sekali untuk konteks, nol untuk proyek asing
    const dibuka = (taskRepository.findRawProjectTasks as jest.Mock).mock.calls.map((c) => c[0]);
    expect(dibuka).toEqual(["p-1"]);
    const { contents } = mockGenerateContent.mock.calls[1][0];
    expect(JSON.stringify(contents)).toContain("Jangan dikarang");
  });

  it("perkakas yang tidak dikenal tidak menyentuh repository apa pun", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: "hapus_semua_tugas", args: {} }],
        text: undefined,
      })
      .mockResolvedValueOnce({ functionCalls: undefined, text: "Itu tidak bisa saya lakukan." });

    const res = await request(app)
      .post("/api/chat/assistant")
      .send({ message: "hapus semua tugas" });

    // satu panggilan repository = hanya pembangunan konteks; tidak ada lagi
    expect(taskRepository.findRawProjectTasks).toHaveBeenCalledTimes(1);
    expect(res.body.data.message).toBe("Itu tidak bisa saya lakukan.");
    const { contents } = mockGenerateContent.mock.calls[1][0];
    expect(JSON.stringify(contents)).toContain("Perkakas tidak dikenal");
  });

  // #553: kunci model boleh tidak terpasang, tapi asisten tidak boleh berubah
  // jadi fitur yang mati. Yang keluar tetap datanya sendiri + pengakuan jujur.
  it("tanpa kunci model tetap menjawab dari data dan mengaku itu pembacaan langsung", async () => {
    delete process.env.GEMINI_API_KEY;

    const id = await request(app).post("/api/chat/assistant").send({ message: "Tugas saya apa?" });
    const teks = id.body.data.message;
    expect(teks).toContain("LNP-12");
    expect(teks).toContain("belum terpasang");
    expect(teks).not.toMatch(/maaf,/i);
    expect(mockGenerateContent).not.toHaveBeenCalled();

    const en = await request(app)
      .post("/api/chat/assistant")
      .send({ message: "What is my backlog?", bahasa: "en" });
    expect(en.body.data.message).toContain("LNP-12");
    expect(en.body.data.message).toContain("not installed");
  });

  it("mengakui bebannya saat pengguna kewalahan, lalu menunjuk satu tugas", async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await request(app)
      .post("/api/chat/assistant")
      .send({ message: "capek banget minggu ini" });

    expect(res.body.data.message).toContain("Ini memang berat");
    expect(res.body.data.message).toContain("Tidak harus beres semua hari ini");
    expect(res.body.data.message).toContain("Mulai dari [LNP-12]");
  });

  it("menyebut tugas yang lewat tenggat saat yang ditanya tenggat", async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await request(app)
      .post("/api/chat/assistant")
      .send({ message: "yang telat apa ya?" });

    expect(res.body.data.message).toContain("1 tugasmu sudah lewat tenggat");
    expect(res.body.data.message).toContain("(lewat tenggat)");
  });

  it("tetap jujur saat memang tidak ada tugas terbuka", async () => {
    delete process.env.GEMINI_API_KEY;
    (taskRepository.findRawProjectTasks as jest.Mock).mockResolvedValue([
      { ...TUGAS, status: "Done" },
    ] as any);

    const res = await request(app).post("/api/chat/assistant").send({ message: "ada kerjaan?" });

    expect(res.body.data.message).toContain("tidak ada tugas terbuka");
    expect(res.body.data.message).toContain("assignee");
    expect(res.body.data.message).not.toContain("LNP-12");
  });

  it("kalau model gagal, jawaban tetap datang dari datanya", async () => {
    mockGenerateContent.mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED"));

    const res = await request(app).post("/api/chat/assistant").send({ message: "Tugas saya apa?" });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain("LNP-12");
    expect(res.body.data.message).toContain("belum terpasang");
    expect(chatRepository.createMessage).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/chat/simulate-reply (Item #551, penjaga pemanggil)", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    jest.spyOn(chatRepository, "createMessage").mockResolvedValue(undefined as any);

    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { id: "user-1", uid: "user-1", username: "alice", role: "developer" };
      next();
    });
    app.use(chatRouter);
  });

  it("menolak menanam balasan di percakapan orang lain", async () => {
    const res = await request(app)
      .post("/api/chat/simulate-reply")
      .send({ senderId: "user-2", receiverId: "user-999", message: "halo" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("srv.akses_ditolak_simulasi_hanya");
    expect(chatRepository.createMessage).not.toHaveBeenCalled();
  });

  it("tetap melayani balasan simulasi di percakapan milik pemanggil", async () => {
    const res = await request(app)
      .post("/api/chat/simulate-reply")
      .send({ senderId: "user-2", receiverId: "user-1", message: "halo", senderRole: "developer" });

    expect(res.status).toBe(200);
    const tersimpan = (chatRepository.createMessage as jest.Mock).mock.calls[0][0];
    expect(tersimpan.receiverId).toBe("user-1");
    expect(tersimpan.message.length).toBeGreaterThan(0);
  });
});
