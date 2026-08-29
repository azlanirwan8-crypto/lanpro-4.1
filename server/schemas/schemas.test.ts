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
  createMeetingSchema,
  updateMeetingSchema,
  analyzeTranscriptSchema,
  analyzeVideoSchema,
  createDiscussionPointSchema,
  updateDiscussionPointSchema,
  createCommentSchema,
  updateCommentSchema,
  createSprintSchema,
  updateSprintSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createDocumentSchema,
  updateDocumentSchema,
  sendChatMessageSchema,
  markChatReadSchema,
  simulateReplySchema,
  createMasterDataSchema,
  updateMasterDataSchema,
  createProjectModuleSchema,
  updateProjectModuleSchema,
  testEmailSchema,
  whatsappBroadcastConfigSchema,
  completeSsoRegistrationSchema,
} from "./index";

describe("Domain Zod Schemas (F7 / Item #4 & Item #247)", () => {
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
      expect(registerSchema.safeParse({ ...validData, password: "Password123" }).success).toBe(
        false
      );
      // Username dengan karakter khusus
      expect(registerSchema.safeParse({ ...validData, username: "budi-santoso" }).success).toBe(
        false
      );
    });
  });

  describe("Project Schemas", () => {
    it("createProjectSchema memvalidasi nama dan ownerId", () => {
      expect(
        createProjectSchema.safeParse({ name: "LanPro 4.1", ownerId: "user-123" }).success
      ).toBe(true);
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
      expect(reorderTaskIdsSchema.safeParse({ orderedIds: ["task-1", "task-2"] }).success).toBe(
        true
      );
      expect(reorderTaskIdsSchema.safeParse({ orderedIds: "bukan-array" }).success).toBe(false);
    });
  });

  describe("User Schemas", () => {
    it("updateUserSchema memvalidasi format email jika diberikan", () => {
      expect(
        updateUserSchema.safeParse({ displayName: "Budi", email: "budi@rajonet.com" }).success
      ).toBe(true);
      expect(updateUserSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });

    it("updateProfileSchema memvalidasi password baru minimal 6 karakter", () => {
      expect(updateProfileSchema.safeParse({ newPassword: "short" }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ newPassword: "password123" }).success).toBe(true);
    });
  });

  describe("QA Schemas", () => {
    it("createQATestCaseSchema memvalidasi payload test case", () => {
      expect(
        createQATestCaseSchema.safeParse({ judul: "Test Login Valid", prioritas: "High" }).success
      ).toBe(true);
    });

    it("updateQASuiteSchema memvalidasi nama test suite", () => {
      expect(updateQASuiteSchema.safeParse({ name: "Suite Sprint 1" }).success).toBe(true);
      expect(updateQASuiteSchema.safeParse({ name: "" }).success).toBe(false);
    });
  });

  describe("Meeting Schemas (Item #247)", () => {
    it("createMeetingSchema memvalidasi judul rapat wajib", () => {
      expect(createMeetingSchema.safeParse({ title: "Sprint Planning" }).success).toBe(true);
      expect(createMeetingSchema.safeParse({ title: "" }).success).toBe(false);
      expect(createMeetingSchema.safeParse({}).success).toBe(false);
    });

    it("updateMeetingSchema menerima update parsial", () => {
      expect(updateMeetingSchema.safeParse({ title: "Judul Baru" }).success).toBe(true);
      expect(
        updateMeetingSchema.safeParse({
          description: "Deskripsi",
          meetingLink: "https://meet.google.com/abc",
        }).success
      ).toBe(true);
      expect(updateMeetingSchema.safeParse({ title: "" }).success).toBe(false);
    });

    it("analyzeTranscriptSchema memvalidasi keberadaan transkrip", () => {
      expect(analyzeTranscriptSchema.safeParse({ transcript: "Transkrip rapat..." }).success).toBe(
        true
      );
      expect(analyzeTranscriptSchema.safeParse({ transcript: "" }).success).toBe(false);
    });

    it("analyzeVideoSchema memvalidasi videoPath wajib", () => {
      expect(analyzeVideoSchema.safeParse({ videoPath: "/uploads/video.mp4" }).success).toBe(true);
      expect(analyzeVideoSchema.safeParse({ videoPath: "" }).success).toBe(false);
      expect(analyzeVideoSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("Discussion Point Schemas (Item #247)", () => {
    it("createDiscussionPointSchema memvalidasi payload titik diskusi", () => {
      expect(
        createDiscussionPointSchema.safeParse({ concern: "Kendala API timeout", status: "pending" })
          .success
      ).toBe(true);
      expect(createDiscussionPointSchema.safeParse({}).success).toBe(true);
    });

    it("updateDiscussionPointSchema menerima update parsial", () => {
      expect(
        updateDiscussionPointSchema.safeParse({
          status: "completed",
          tindakanLanjut: "Fix pool limit",
        }).success
      ).toBe(true);
    });

    it("createCommentSchema & updateCommentSchema memvalidasi teks komentar wajib dan tidak kosong", () => {
      expect(createCommentSchema.safeParse({ commentText: "Komentar valid" }).success).toBe(true);
      expect(createCommentSchema.safeParse({ commentText: "" }).success).toBe(false);
      expect(createCommentSchema.safeParse({}).success).toBe(false);

      expect(updateCommentSchema.safeParse({ commentText: "Komentar revisi" }).success).toBe(true);
      expect(updateCommentSchema.safeParse({ commentText: "" }).success).toBe(false);
    });
  });

  describe("Sprint Schemas (Item #247)", () => {
    it("createSprintSchema memvalidasi nama sprint wajib", () => {
      expect(createSprintSchema.safeParse({ name: "Sprint 1", goal: "Launch MVP" }).success).toBe(
        true
      );
      expect(createSprintSchema.safeParse({ name: "" }).success).toBe(false);
      expect(createSprintSchema.safeParse({}).success).toBe(false);
    });

    it("updateSprintSchema menerima update parsial", () => {
      expect(updateSprintSchema.safeParse({ goal: "Updated Goal" }).success).toBe(true);
      expect(updateSprintSchema.safeParse({ name: "" }).success).toBe(false);
    });
  });

  describe("Milestone Schemas (Item #247)", () => {
    it("createMilestoneSchema memvalidasi nama milestone wajib", () => {
      expect(
        createMilestoneSchema.safeParse({ name: "UAT Ready", dueDate: "2026-09-01" }).success
      ).toBe(true);
      expect(createMilestoneSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("updateMilestoneSchema menerima update parsial", () => {
      expect(updateMilestoneSchema.safeParse({ status: "completed" }).success).toBe(true);
      expect(updateMilestoneSchema.safeParse({ name: "" }).success).toBe(false);
    });
  });

  describe("Document Schemas (Item #247)", () => {
    it("createDocumentSchema memvalidasi judul dokumen wajib", () => {
      expect(
        createDocumentSchema.safeParse({ title: "Architecture Spec", type: "pdf" }).success
      ).toBe(true);
      expect(createDocumentSchema.safeParse({ title: "" }).success).toBe(false);
    });

    it("updateDocumentSchema menerima update parsial", () => {
      expect(updateDocumentSchema.safeParse({ description: "Updated Spec" }).success).toBe(true);
      expect(updateDocumentSchema.safeParse({ title: "" }).success).toBe(false);
    });
  });

  describe("Chat Schemas (Item #247)", () => {
    it("sendChatMessageSchema memvalidasi pengirim, penerima, dan isi pesan", () => {
      expect(
        sendChatMessageSchema.safeParse({ senderId: "u1", receiverId: "u2", message: "Halo" })
          .success
      ).toBe(true);
      expect(
        sendChatMessageSchema.safeParse({ senderId: "", receiverId: "u2", message: "Halo" }).success
      ).toBe(false);
      expect(
        sendChatMessageSchema.safeParse({ senderId: "u1", receiverId: "u2", message: "" }).success
      ).toBe(false);
    });

    it("markChatReadSchema memvalidasi senderId dan receiverId", () => {
      expect(markChatReadSchema.safeParse({ senderId: "u1", receiverId: "u2" }).success).toBe(true);
      expect(markChatReadSchema.safeParse({ senderId: "u1" }).success).toBe(false);
    });
  });

  describe("Master Data Schemas (Item #247)", () => {
    it("createMasterDataSchema memvalidasi type wajib", () => {
      expect(
        createMasterDataSchema.safeParse({ type: "department", label: "Engineering" }).success
      ).toBe(true);
      expect(createMasterDataSchema.safeParse({ type: "" }).success).toBe(false);
    });

    it("updateMasterDataSchema menerima update parsial", () => {
      expect(updateMasterDataSchema.safeParse({ label: "Design System" }).success).toBe(true);
    });
  });

  describe("Project Module Schemas (Item #247)", () => {
    it("createProjectModuleSchema memvalidasi projectId dan namaModul wajib", () => {
      expect(
        createProjectModuleSchema.safeParse({ projectId: "p1", namaModul: "Auth" }).success
      ).toBe(true);
      expect(createProjectModuleSchema.safeParse({ projectId: "p1", namaModul: "" }).success).toBe(
        false
      );
      expect(createProjectModuleSchema.safeParse({ projectId: "" }).success).toBe(false);
    });

    it("updateProjectModuleSchema menerima update parsial", () => {
      expect(updateProjectModuleSchema.safeParse({ keterangan: "Updated module" }).success).toBe(
        true
      );
      expect(updateProjectModuleSchema.safeParse({ namaModul: "" }).success).toBe(false);
    });
  });

  describe("System & Auth OIDC Schemas (Item #247)", () => {
    it("testEmailSchema memvalidasi format email", () => {
      expect(testEmailSchema.safeParse({ targetEmail: "admin@rajonet.com" }).success).toBe(true);
      expect(testEmailSchema.safeParse({ targetEmail: "not-an-email" }).success).toBe(false);
    });

    it("whatsappBroadcastConfigSchema memvalidasi jadwal hari dan jam", () => {
      expect(
        whatsappBroadcastConfigSchema.safeParse({ scheduleDays: ["1", "2"], scheduleTime: "09:00" })
          .success
      ).toBe(true);
      expect(
        whatsappBroadcastConfigSchema.safeParse({ scheduleDays: [], scheduleTime: "09:00" }).success
      ).toBe(false);
      expect(
        whatsappBroadcastConfigSchema.safeParse({ scheduleDays: ["1"], scheduleTime: "25:00" })
          .success
      ).toBe(false);
    });

    it("completeSsoRegistrationSchema memvalidasi username wajib", () => {
      expect(completeSsoRegistrationSchema.safeParse({ username: "john_doe" }).success).toBe(true);
      expect(completeSsoRegistrationSchema.safeParse({ username: "" }).success).toBe(false);
    });
  });
});
