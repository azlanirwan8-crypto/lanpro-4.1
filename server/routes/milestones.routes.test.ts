/**
 * Item #312 — penjaga rute + skema Milestone (tanpa DB).
 */
import fs from "fs";
import path from "path";
import { createMilestoneSchema, updateMilestoneSchema } from "../schemas/milestone.schema";
import { updateTaskSchema } from "../schemas/task.schema";

const sumberRute = fs.readFileSync(path.join(__dirname, "milestones.routes.ts"), "utf8");
const sumberTask = fs.readFileSync(path.join(__dirname, "task.routes.ts"), "utf8");

describe("milestones.routes (#312)", () => {
  it("memakai jagaProyek timeline untuk CRUD", () => {
    expect(sumberRute).toContain('jagaProyek("timeline", "R")');
    expect(sumberRute).toContain('jagaProyek("timeline", "C")');
    expect(sumberRute).toContain('jagaProyek("timeline", "U")');
    expect(sumberRute).toContain('jagaProyek("timeline", "D")');
  });

  it("validasi body lewat skema milestone", () => {
    expect(sumberRute).toContain("validasiBody(createMilestoneSchema)");
    expect(sumberRute).toContain("validasiBody(updateMilestoneSchema)");
  });
});

describe("createMilestoneSchema (#312)", () => {
  it("menolak nama kosong", () => {
    expect(createMilestoneSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("menerima nama + dueDate opsional", () => {
    const r = createMilestoneSchema.safeParse({
      name: "MVP-1",
      dueDate: "2026-12-01",
    });
    expect(r.success).toBe(true);
  });
});

describe("updateMilestoneSchema (#312)", () => {
  it("menerima status done", () => {
    const r = updateMilestoneSchema.safeParse({ status: "done" });
    expect(r.success).toBe(true);
  });
});

describe("updateTaskSchema.milestoneId (#312)", () => {
  it("menerima milestoneId string atau null", () => {
    expect(updateTaskSchema.safeParse({ milestoneId: "ms-1" }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ milestoneId: null }).success).toBe(true);
  });

  it("rute update tugas meneruskan milestoneId", () => {
    expect(sumberTask).toContain("milestoneId,");
    expect(sumberTask).toContain('checkUpdate("milestoneId", milestoneId)');
  });
});
