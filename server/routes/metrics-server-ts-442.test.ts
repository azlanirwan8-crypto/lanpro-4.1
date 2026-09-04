/**
 * #442 — kaki regresi #58: GET /metrics di server.ts tanpa token.
 *
 * health.routes di-mount lebih dulu di startServer, jadi yang menang hari ini
 * adalah penjaga METRIK_TOKEN. Tes ini mengunci dua hal: (1) server.ts tidak
 * lagi mendaftarkan handler telanjang; (2) urutan mount yang sama dengan
 * server.ts menolak permintaan tanpa token, dan handler kedua tidak pernah
 * terjangkau.
 */

import fs from "fs";
import path from "path";
import express from "express";
import request from "supertest";
import healthRoutes from "./health.routes";

const TOKEN = "token-metrik-untuk-test-442-abcdefgh";
const AKAR = path.resolve(__dirname, "..", "..");

describe("#442 GET /metrics tidak punya kaki tanpa token di server.ts", () => {
  const envAsli = process.env.METRIK_TOKEN;

  afterEach(() => {
    process.env.METRIK_TOKEN = envAsli;
  });

  it("server.ts tidak mendaftarkan app.get /metrics", () => {
    const sumber = fs.readFileSync(path.join(AKAR, "server.ts"), "utf8");
    expect(sumber).not.toMatch(/app\.get\(\s*["']\/metrics["']/);
  });

  it("urutan mount server.ts (healthRoutes dulu) menolak tanpa token", async () => {
    process.env.METRIK_TOKEN = TOKEN;
    const app = express();
    app.use(healthRoutes);
    app.get("/metrics", (_req, res) => {
      res.status(200).send("BOCOR_TANPA_TOKEN");
    });

    const res = await request(app).get("/metrics");

    expect(res.status).toBe(401);
    expect(res.text).not.toContain("BOCOR_TANPA_TOKEN");
    expect(res.text).not.toContain("process_cpu_user_seconds_total");
  });
});
