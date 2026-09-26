/**
 * Health Routes Test - H1 Pattern Example
 * Demonstrates working integration test pattern for server routes
 */

import request from "supertest";
import express, { Express } from "express";
import healthRoutes from "./health.routes";

describe("Health Routes (H1 Pattern Example)", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Routes already include '/api/health-check' path, mount at root
    app.use("/", healthRoutes);
  });

  it("should return health status on GET /api/health-check-check", async () => {
    const response = await request(app).get("/api/health-check");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status");
    expect(response.body.status).toBe("ok");
  });

  it("should return timestamp in ISO format", async () => {
    const response = await request(app).get("/api/health-check");

    expect(response.body).toHaveProperty("timestamp");
    expect(typeof response.body.timestamp).toBe("string");
    expect(() => new Date(response.body.timestamp)).not.toThrow();
  });

  it("should include service name", async () => {
    const response = await request(app).get("/api/health-check");

    expect(response.body).toHaveProperty("service");
    expect(response.body.service).toBe("LanPro Backend");
  });

  it("memaparkan keadaan mesin AI tanpa memaparkan kuncinya (#556)", async () => {
    const kunciLama = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "kunci-rahasia-jangan-sampai-keluar";

    const response = await request(app).get("/api/health-check");

    expect(response.body.mesinAi.keadaan).toBe("siap");
    expect(Array.isArray(response.body.mesinAi.urutanModel)).toBe(true);
    expect(response.body.mesinAi.urutanModel.length).toBeGreaterThan(0);
    expect(response.text).not.toContain("kunci-rahasia-jangan-sampai-keluar");

    if (kunciLama === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = kunciLama;
  });

  it("kunci template `.env` kiriman tidak dihitung terpasang (#556)", async () => {
    const kunciLama = process.env.GEMINI_API_KEY;
    // Inilah nilai yang dikirim bersama berkas contoh. Sebelum #556 ia terbaca
    // sebagai "kunci terisi", asisten membangun klien yang pasti ditolak
    // Google, dan yang terlihat di layar cuma asisten yang menolak menjawab.
    process.env.GEMINI_API_KEY = "MY_GEMINI_API_KEY";

    const lewatHttp = await request(app).get("/api/health-check");
    expect(lewatHttp.body.mesinAi.keadaan).toBe("kunci_template");

    delete process.env.GEMINI_API_KEY;
    const kosong = await request(app).get("/api/health-check");
    expect(kosong.body.mesinAi.keadaan).toBe("tanpa_kunci");

    if (kunciLama === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = kunciLama;
  });

  it("menolak /metrics tanpa token — perilaku berubah karena item #58", async () => {
    // Asersi lama di sini adalah `expect([200, 500]).toContain(status)`, yang
    // mengunci keadaan SEBELUM #58: endpoint terbuka untuk umum. Ketetapan
    // pemilik proyek 16 Agu 2026 menutupnya di balik METRIK_TOKEN, jadi
    // asersinya ikut berubah — bukan dilemahkan.
    //
    // 401 bila METRIK_TOKEN terisi tapi permintaan tidak membawanya;
    // 503 bila variabelnya sendiri kosong, yang berarti endpoint dinonaktifkan.
    // Cakupan lengkapnya ada di `metrics-guard.test.ts`.
    const response = await request(app).get("/metrics");

    expect([401, 503]).toContain(response.status);
    expect(response.text).not.toContain("process_cpu_user_seconds_total");
  });
});
