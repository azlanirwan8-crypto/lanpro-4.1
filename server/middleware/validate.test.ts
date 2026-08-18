import express from "express";
import request from "supertest";
import { z } from "zod";
import {
  validasiRequest,
  validasiBody,
  validasiQuery,
  validasiParams,
  formatZodErrors,
} from "./validate";

describe("Middleware validasiRequest (F7 / Item #4)", () => {
  it("formatZodErrors memetakan issues ke objek error path yang sesuai", () => {
    const schema = z.object({
      email: z.string().email("Format email salah"),
      umur: z.number().min(18, "Minimal 18 tahun"),
    });

    const result = schema.safeParse({ email: "bukan-email", umur: 12 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted.email).toContain("Format email salah");
      expect(formatted.umur).toContain("Minimal 18 tahun");
    }
  });

  it("meloloskan request dengan body yang valid", async () => {
    const app = express();
    app.use(express.json());

    const bodySchema = z.object({
      title: z.string().min(3),
      status: z.enum(["To Do", "In Progress", "Done"]),
    });

    app.post("/test-body", validasiBody(bodySchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    const res = await request(app)
      .post("/test-body")
      .send({ title: "Fitur Baru", status: "To Do" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Fitur Baru");
  });

  it("menolak request dengan body yang tidak valid (HTTP 400)", async () => {
    const app = express();
    app.use(express.json());

    const bodySchema = z.object({
      title: z.string().min(3, "Judul minimal 3 karakter"),
      status: z.enum(["To Do", "In Progress", "Done"]),
    });

    app.post("/test-body", validasiBody(bodySchema), (req, res) => {
      res.json({ success: true });
    });

    const res = await request(app)
      .post("/test-body")
      .send({ title: "ab", status: "UnknownStatus" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toContain("Data permintaan tidak valid");
    expect(res.body.errors.title).toBeDefined();
    expect(res.body.errors.status).toBeDefined();
  });

  it("memvalidasi query parameter", async () => {
    const app = express();

    const querySchema = z.object({
      page: z.string().regex(/^\d+$/).transform(Number),
    });

    app.get("/test-query", validasiQuery(querySchema), (req, res) => {
      res.json({ success: true, page: req.query.page });
    });

    const resValid = await request(app).get("/test-query?page=2");
    expect(resValid.status).toBe(200);
    expect(resValid.body.page).toBe(2);

    const resInvalid = await request(app).get("/test-query?page=abc");
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.message).toContain("Query parameter tidak valid");
  });

  it("memvalidasi params URL", async () => {
    const app = express();

    const paramsSchema = z.object({
      id: z.string().min(5, "ID minimal 5 karakter"),
    });

    app.get("/test-params/:id", validasiParams(paramsSchema), (req, res) => {
      res.json({ success: true, id: req.params.id });
    });

    const resValid = await request(app).get("/test-params/proj-123");
    expect(resValid.status).toBe(200);

    const resInvalid = await request(app).get("/test-params/p1");
    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.message).toContain("Parameter URL tidak valid");
  });
});
