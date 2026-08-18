import {
  loginSchema,
  registerSchema,
  forceLogoutSchema,
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  reorderTaskIdsSchema,
  updateUserSchema,
  updateProfileSchema,
  createQATestCaseSchema,
  updateQATestCaseSchema,
  updateQASuiteSchema,
} from "./index";

describe("Domain Zod Schemas (F7 / Item #4)", () => {
  describe("Auth Schemas", () => {
    it("loginSchema memvalidasi username dan password", () => {
      expect(loginSchema.safeParse({ username: "user", password: "pwd" }).success).toBe(true);
      expect(loginSchema.safeParse({ username: "", password: "pwd" }).success).toBe(false);
      expect(loginSchema.safeParse({ username: "user", password: "" }).success).toBe(false);
    });

    it("registerSchema memvalidasi format email, username dan kompleksitas password", () => {
      const validData = {
        name: "Budi Santoso",
        email: "budi@rajonet.com",
        username: "budisantos",
        password: "Password123!",
      };
      expect(registerSchema.safeParse(validData).success).toBe(true);

      // Password tanpa simbol
      expect(registerSchema.safeParse({ ...validData, password: "Password123" }).success).toBe(false);
      // Username dengan karakter khusus
      expect(registerSchema.safeParse({ ...validData, username: "budi-santoso" }).success).toBe(false);
    });
  });

  describe("Project Schemas", () => {
    it("createProjectSchema memvalidasi nama dan ownerId", () => {
      expect(createProjectSchema.safeParse({ name: "LanPro 4.1", ownerId: "user-123" }).success).toBe(true);
      expect(createProjectSchema.safeParse({ name: "", ownerId: "user-123" }).success).toBe(false);
    });

    it("updateProjectSchema menerima update parsial", () => {
      expect(updateProjectSchema.safeParse({ name: "LanPro New" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ description: "Deskripsi baru" }).success).toBe(true);
    });
  });

  describe("Task Schemas", () => {
    it("createTaskSchema memvalidasi judul task", () => {
      expect(createTaskSchema.safeParse({ title: "Implementasi Zod" }).success).toBe(true);
      expect(createTaskSchema.safeParse({ title: "" }).success).toBe(false);
    });

    it("reorderTaskIdsSchema memvalidasi array orderedIds", () => {
      expect(reorderTaskIdsSchema.safeParse({ orderedIds: ["task-1", "task-2"] }).success).toBe(true);
      expect(reorderTaskIdsSchema.safeParse({ orderedIds: "bukan-array" }).success).toBe(false);
    });
  });

  describe("User Schemas", () => {
    it("updateUserSchema memvalidasi format email jika diberikan", () => {
      expect(updateUserSchema.safeParse({ displayName: "Budi", email: "budi@rajonet.com" }).success).toBe(true);
      expect(updateUserSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });

    it("updateProfileSchema memvalidasi password baru minimal 6 karakter", () => {
      expect(updateProfileSchema.safeParse({ newPassword: "short" }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ newPassword: "password123" }).success).toBe(true);
    });
  });

  describe("QA Schemas", () => {
    it("createQATestCaseSchema memvalidasi payload test case", () => {
      expect(createQATestCaseSchema.safeParse({ judul: "Test Login Valid", prioritas: "High" }).success).toBe(true);
    });

    it("updateQASuiteSchema memvalidasi nama test suite", () => {
      expect(updateQASuiteSchema.safeParse({ name: "Suite Sprint 1" }).success).toBe(true);
      expect(updateQASuiteSchema.safeParse({ name: "" }).success).toBe(false);
    });
  });
});
