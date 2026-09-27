/**
 * Test perilaku untuk item #58 (§13.6): `GET /metrics` wajib membawa token.
 *
 * `/metrics` tidak diawali `/api/`, sehingga gerbang autentikasi global di
 * `server.ts` — yang hanya menjaga `/api/*` — tidak pernah menyentuhnya.
 * Dibuktikan dengan `curl` biasa terhadap server berjalan: 200, tanpa
 * kredensial apa pun, memuat `httpRequestsTotal` berlabel method, route, dan
 * status.
 *
 * Ketetapan pemilik proyek 16 Agu 2026: dijaga token khusus lewat
 * `METRIK_TOKEN`, bukan JWT, supaya scraper Prometheus tetap bisa bekerja tanpa
 * punya akun pengguna.
 */

import express from "express";
import request from "supertest";
import healthRoutes from "./health.routes";

const TOKEN = "token-metrik-untuk-test-0123456789";

const buatApp = () => {
  const app = express();
  app.use(healthRoutes);
  return app;
};

describe("#58 GET /metrics wajib membawa token", () => {
  const envAsli = process.env.METRIK_TOKEN;

  afterEach(() => {
    process.env.METRIK_TOKEN = envAsli;
  });

  it("MENOLAK permintaan tanpa token — inilah kondisi yang dulu menjawab 200", async () => {
    process.env.METRIK_TOKEN = TOKEN;

    const res = await request(buatApp()).get("/metrics");

    expect(res.status).toBe(401);
  });

  it("MENOLAK token yang salah", async () => {
    process.env.METRIK_TOKEN = TOKEN;

    const res = await request(buatApp())
      .get("/metrics")
      .set("Authorization", "Bearer token-yang-salah-0123456789012");

    expect(res.status).toBe(401);
  });

  it("MENOLAK token yang benar tapi terpotong", async () => {
    process.env.METRIK_TOKEN = TOKEN;

    const res = await request(buatApp())
      .get("/metrics")
      .set("Authorization", `Bearer ${TOKEN.slice(0, -1)}`);

    expect(res.status).toBe(401);
  });

  it("menerima token yang benar lewat Authorization: Bearer", async () => {
    process.env.METRIK_TOKEN = TOKEN;

    const res = await request(buatApp()).get("/metrics").set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("process_cpu_user_seconds_total");
  });

  it("menerima token yang benar lewat header X-Metrik-Token", async () => {
    process.env.METRIK_TOKEN = TOKEN;

    const res = await request(buatApp()).get("/metrics").set("X-Metrik-Token", TOKEN);

    expect(res.status).toBe(200);
  });

  it("MENUTUP endpoint bila METRIK_TOKEN kosong — aman secara bawaan", async () => {
    // Yang paling penting di berkas ini. Bila variabelnya lupa diisi, endpoint
    // harus MATI, bukan kembali terbuka untuk umum seperti sebelum #58.
    delete process.env.METRIK_TOKEN;

    const res = await request(buatApp()).get("/metrics");

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/METRIK_TOKEN/);
  });

  it("tidak membocorkan isi metrik pada jawaban penolakan", async () => {
    process.env.METRIK_TOKEN = TOKEN;

    const res = await request(buatApp()).get("/metrics");

    expect(res.text).not.toContain("httpRequestsTotal");
    expect(res.text).not.toContain("process_cpu_user_seconds_total");
  });
});
