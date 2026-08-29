/**
 * Test penjaga dan otorisasi trigger-digest (Item #245).
 */

import fs from "fs";
import path from "path";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
  query: jest.fn(),
}));

import { verifyGlobalAdmin } from "../middleware/auth";

const SUMBER = fs.readFileSync(path.join(__dirname, "task.routes.ts"), "utf8");

describe("Task Trigger Digest Route - Otorisasi Admin (Item #245)", () => {
  it("memastikan endpoint POST /api/tasks/trigger-digest dijaga verifyGlobalAdmin", () => {
    const adaPenjaga =
      /router\.post\(\s*["']\/api\/tasks\/trigger-digest["']\s*,\s*verifyGlobalAdmin/g.test(SUMBER);
    expect(adaPenjaga).toBe(true);
  });

  it("menolak pengguna non-admin (developer / viewer / member) dengan 403", () => {
    const peranDitolak = ["developer", "viewer", "designer", "lead", "guest", "project_manager"];
    for (const role of peranDitolak) {
      let statusTerkirim = 0;
      let jsonTerkirim: any = null;
      const req: any = { user: { id: "user-123", role } };
      const res: any = {
        status: (code: number) => {
          statusTerkirim = code;
          return {
            json: (payload: any) => {
              jsonTerkirim = payload;
            },
          };
        },
      };
      let nextDipanggil = false;
      const next = () => {
        nextDipanggil = true;
      };

      verifyGlobalAdmin(req, res, next);
      expect(nextDipanggil).toBe(false);
      expect(statusTerkirim).toBe(403);
      expect(jsonTerkirim).toEqual({
        status: "error",
        code: "srv.akses_ditolak_hanya_global",
        message: "Akses ditolak: Hanya Global Admin yang memiliki izin.",
      });
    }
  });

  it("mengizinkan pengguna dengan peran admin memanggil next()", () => {
    const req: any = { user: { id: "admin-1", role: "admin" } };
    const res: any = {};
    let nextDipanggil = false;
    const next = () => {
      nextDipanggil = true;
    };

    verifyGlobalAdmin(req, res, next);
    expect(nextDipanggil).toBe(true);
  });
});
