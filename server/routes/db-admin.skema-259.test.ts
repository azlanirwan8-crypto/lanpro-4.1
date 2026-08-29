/**
 * Regresi Item #259 — sisa #247: dua skema Zod YATIM dipasang.
 *
 * `dbQuerySchema` dan `dbConfigSchema` sudah DIBUAT di `system.schema.ts`
 * saat #247 dikerjakan, tetapi tidak pernah diimpor atau dipasang di
 * `db-admin.routes.ts` — ditemukan lewat grep langsung ke berkasnya, bukan
 * membaca laporan penutupan #247. Test ini mengunci bahwa keduanya benar-
 * benar aktif di jalur permintaan, bukan cuma ada di berkas skema.
 *
 * Ketiga rute di sini `verifyGlobalAdmin`, jadi permukaan seranganya sudah
 * sempit sejak awal — yang ditutup #259 bukan "siapa boleh memanggil",
 * melainkan "apa yang boleh dikirim admin sendiri", supaya string tak
 * berbatas atau tipe salah tidak lolos sampai menyentuh koneksi database
 * yang sedang aktif (`/api/system/db-config/save` memakai `force: true` —
 * ia MENGGANTI koneksi produksi seketika, bukan sekadar mengujinya).
 */

import express from "express";
import request from "supertest";

const kueriPalsu = jest.fn();
const updatePoolConfigPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: any[]) => kueriPalsu(...a),
    getConnection: async () => ({
      query: (...a: any[]) => kueriPalsu(...a),
      release: jest.fn(),
    }),
  },
  query: (...a: any[]) => kueriPalsu(...a),
  updatePoolConfig: (...a: any[]) => updatePoolConfigPalsu(...a),
  getDbMode: () => "pg",
}));

jest.mock("../middleware/auth", () => ({
  verifyGlobalAdmin: (req: any, _res: any, next: any) => {
    req.user = { id: 1, username: "admin", role: "admin" };
    next();
  },
}));

import dbAdminRoutes from "./db-admin.routes";

function pasangApp() {
  const app = express();
  app.use(express.json());
  app.use(dbAdminRoutes);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Item #259 — POST /api/db-query kini menegakkan dbQuerySchema", () => {
  it("menolak body tanpa field query dengan 400 dari validasiBody", async () => {
    const res = await request(pasangApp()).post("/api/db-query").send({});

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(kueriPalsu).not.toHaveBeenCalled();
  });

  it("menolak query melebihi 5000 karakter, bahkan yang read-only", async () => {
    const app = pasangApp();
    const kueriRaksasa = "SELECT 1 -- " + "a".repeat(5000);

    const res = await request(app).post("/api/db-query").send({ query: kueriRaksasa });

    expect(res.status).toBe(400);
    expect(kueriPalsu).not.toHaveBeenCalled();
  });

  it("tetap mengizinkan query SELECT yang sah dan pendek", async () => {
    kueriPalsu.mockResolvedValueOnce([[{ id: 1 }]]);
    const res = await request(pasangApp())
      .post("/api/db-query")
      .send({ query: 'SELECT * FROM "Projects"' });

    expect(res.status).toBe(200);
  });
});

describe("Item #259 — POST /api/system/db-config kini menegakkan dbConfigSchema", () => {
  it("menolak connectionString bertipe bukan string dengan 400", async () => {
    const res = await request(pasangApp())
      .post("/api/system/db-config")
      .send({ connectionString: 12345 });

    expect(res.status).toBe(400);
  });

  it("menolak connectionString melebihi 500 karakter", async () => {
    const res = await request(pasangApp())
      .post("/api/system/db-config")
      .send({ connectionString: "postgresql://" + "x".repeat(600) });

    expect(res.status).toBe(400);
  });

  it("mengizinkan body kosong — connectionString opsional, jatuh ke env var", async () => {
    const res = await request(pasangApp()).post("/api/system/db-config").send({});

    // Boleh 200 (jika env var tersambung di lingkungan test) atau 500 dari
    // kegagalan koneksi sungguhan — keduanya BUKAN 400 dari validasi. Yang
    // dikunci di sini: body kosong tidak ditolak validasiBody.
    expect(res.status).not.toBe(400);
  });
});

describe("Item #259 — POST /api/system/db-config/save kini menegakkan dbConfigSchema", () => {
  it("menolak connectionString bertipe bukan string SEBELUM updatePoolConfig dipanggil", async () => {
    const res = await request(pasangApp())
      .post("/api/system/db-config/save")
      .send({ connectionString: { bukan: "string" } });

    expect(res.status).toBe(400);
    expect(updatePoolConfigPalsu).not.toHaveBeenCalled();
  });

  it("meneruskan connectionString yang valid ke updatePoolConfig", async () => {
    const res = await request(pasangApp())
      .post("/api/system/db-config/save")
      .send({ connectionString: "postgresql://user:pass@host:5432/db" });

    expect(res.status).toBe(200);
    expect(updatePoolConfigPalsu).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgresql://user:pass@host:5432/db",
        force: true,
      })
    );
  });
});
