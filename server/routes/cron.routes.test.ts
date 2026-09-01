/**
 * Test rute cron Vercel (#304, #316).
 */

import fs from "fs";
import path from "path";
import { verifyCronSecret } from "../middleware/verifyCronSecret";

const SUMBER = fs.readFileSync(path.join(__dirname, "cron.routes.ts"), "utf8");
const SERVER = fs.readFileSync(path.join(__dirname, "../../server.ts"), "utf8");

describe("Cron routes (Item #304)", () => {
  const envAsli = process.env.CRON_SECRET;

  afterEach(() => {
    if (envAsli === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = envAsli;
  });

  it("mendaftarkan GET dan POST untuk tick serta task-digest dengan verifyCronSecret", () => {
    expect(SUMBER).toMatch(/router\.get\(\s*["']\/api\/cron\/tick["']/);
    expect(SUMBER).toMatch(/router\.post\(\s*["']\/api\/cron\/tick["']/);
    expect(SUMBER).toMatch(/router\.get\(\s*["']\/api\/cron\/task-digest["']/);
    expect(SUMBER).toMatch(/router\.post\(\s*["']\/api\/cron\/task-digest["']/);
    expect(SUMBER).toMatch(/verifyCronSecret/);
  });

  it("rute cron ada di RUTE_PUBLIK agar JWT tidak menahan Vercel Cron", () => {
    expect(SERVER).toMatch(/"\/api\/cron\/tick"/);
    expect(SERVER).toMatch(/"\/api\/cron\/task-digest"/);
  });

  it("vercel.json memuat cron task-digest (GET harian)", () => {
    const v = JSON.parse(fs.readFileSync(path.join(__dirname, "../../vercel.json"), "utf8"));
    const paths = (v.crons || []).map((c: { path: string }) => c.path);
    expect(paths).toContain("/api/cron/task-digest");
  });

  it("verifyCronSecret menolak tanpa CRON_SECRET di env", () => {
    delete process.env.CRON_SECRET;
    let status = 0;
    const req: any = { headers: {} };
    const res: any = {
      status: (c: number) => {
        status = c;
        return { json: () => {} };
      },
    };
    let nextCalled = false;
    verifyCronSecret(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(status).toBe(503);
  });

  it("verifyCronSecret menerima Bearer token yang benar", () => {
    process.env.CRON_SECRET = "rahasia-uji";
    const req: any = { headers: { authorization: "Bearer rahasia-uji" } };
    const res: any = {};
    let nextCalled = false;
    verifyCronSecret(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it("verifyCronSecret menolak Bearer yang salah", () => {
    process.env.CRON_SECRET = "rahasia-uji";
    let status = 0;
    const req: any = { headers: { authorization: "Bearer salah" } };
    const res: any = {
      status: (c: number) => {
        status = c;
        return { json: () => {} };
      },
    };
    let nextCalled = false;
    verifyCronSecret(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(status).toBe(401);
  });
});
