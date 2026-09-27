/**
 * LanPro — Optimistic Locking Concurrency (#316)
 *
 * Pola lama: `expect([404,404])` sebagai sukses di CI tanpa seed — hijau palsu.
 * Cakupan locking sungguhan: server/routes/task.routes.locking.test.ts.
 *
 * Tes HTTP hidup hanya jalan bila TEST_PROJECT_ID + TEST_TASK_ID disetel.
 */
import fs from "fs";

describe("Optimistic Locking — kebijakan #316", () => {
  it("sumber concurrency tidak lagi menerima [404,404] sebagai sukses", () => {
    const sumber = fs.readFileSync(__filename, "utf8");
    expect(sumber).not.toMatch(/toEqual\(\s*\[\s*404\s*,\s*404\s*\]\s*\)/);
  });
});

const hidup = Boolean(process.env.TEST_PROJECT_ID && process.env.TEST_TASK_ID);

(hidup ? describe : describe.skip)(
  "Stress Test: Optimistic Locking Concurrency (server hidup)",
  () => {
    // Impor berat hanya saat tes hidup — hindari bocor handle di CI.

    const request = require("supertest");

    const jwt = require("jsonwebtoken");

    const { app } = require("../../server");

    const secret = process.env.JWT_SECRET || "secret";
    const AUTH_TOKEN = `Bearer ${jwt.sign(
      { id: "test-user-id", uid: "test-user-uid", role: "admin" },
      secret
    )}`;
    const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID as string;
    const TEST_TASK_ID = process.env.TEST_TASK_ID as string;

    it("satu request 200 dan satu 409 saat dua PUT versi sama bersamaan", async () => {
      const currentVersion = Number(process.env.TEST_TASK_VERSION || 1);
      const payloadUserA = { title: "Update dari User A", version: currentVersion };
      const payloadUserB = { title: "Update dari User B", version: currentVersion };

      const targetApp = app || "http://localhost:3000";
      const [responseA, responseB] = await Promise.all([
        request(targetApp)
          .put(`/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`)
          .set("Authorization", AUTH_TOKEN)
          .send(payloadUserA),
        request(targetApp)
          .put(`/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`)
          .set("Authorization", AUTH_TOKEN)
          .send(payloadUserB),
      ]);

      const results = [responseA.status, responseB.status];
      expect(results.includes(404)).toBe(false);
      expect(results).toContain(200);
      expect(results).toContain(409);
    });

    afterAll(async () => {
      try {
        const db = (await import("../lib/db")).default;
        await db.end();
      } catch {
        /* abaikan */
      }
    });
  }
);
