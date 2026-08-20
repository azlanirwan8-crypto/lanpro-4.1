import { kirimEmailTaskDigest, TaskDigestEmailData, TaskDigestItem } from "./email.service";
import { kumpulkanPendingTasksPerUser, kirimDailyTaskDigestEmail } from "./taskDigest.service";
import db from "../../src/lib/db";

jest.mock("../../src/lib/db", () => ({
  getConnection: jest.fn(),
}));

describe("taskDigest.service - F6.4 Rekapitulasi Tugas Pending (Item #28)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("kirimEmailTaskDigest", () => {
    const mockTasks: TaskDigestItem[] = [
      {
        id: "task-1",
        key: "PROJ-101",
        title: "Perbaiki Otentikasi OIDC",
        projectName: "Portal BNI",
        priority: "High",
        status: "In Progress",
        dueDate: "2026-08-19",
        isOverdue: true,
      },
      {
        id: "task-2",
        key: "PROJ-102",
        title: "Update Dokumentasi API",
        projectName: "Portal BNI",
        priority: "Medium",
        status: "To Do",
        dueDate: "2026-08-25",
        isOverdue: false,
      },
    ];

    it("mengirimkan email task digest dengan format HTML dan text yang benar di mode mock", async () => {
      delete process.env.RESEND_API_KEY;

      const payload: TaskDigestEmailData = {
        email: "developer@rajonet.com",
        nama: "Developer Satu",
        username: "dev1",
        tasks: mockTasks,
      };

      const result = await kirimEmailTaskDigest(payload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("mengirimkan email task digest via Resend API bila API key terisi", async () => {
      process.env.RESEND_API_KEY = "re_test_task_digest_key";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg_digest_12345" }),
      });

      const payload: TaskDigestEmailData = {
        email: "team@rajonet.com",
        nama: "Team Member",
        username: "member1",
        tasks: mockTasks,
      };

      const result = await kirimEmailTaskDigest(payload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_digest_12345");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.to).toEqual(["team@rajonet.com"]);
      expect(requestBody.subject).toContain("Ringkasan Tugas Tertunda: 2 Tugas");
      expect(requestBody.html).toContain("PROJ-101");
      expect(requestBody.html).toContain("Perbaiki Otentikasi OIDC");
      expect(requestBody.html).toContain("Lewat Deadline");
      expect(requestBody.text).toContain("PROJ-101");
    });

    it("menolak pengiriman bila alamat email tidak valid", async () => {
      const payload: TaskDigestEmailData = {
        email: "invalid-email-address",
        nama: "Bad Email User",
        username: "baduser",
        tasks: mockTasks,
      };

      const result = await kirimEmailTaskDigest(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Format alamat email tidak valid");
    });
  });

  describe("kumpulkanPendingTasksPerUser & kirimDailyTaskDigestEmail", () => {
    it("mengumpulkan tugas pending dan menandai isOverdue dengan benar dari database", async () => {
      const mockUsers = [
        {
          id: "usr-1",
          email: "budi@rajonet.com",
          displayName: "Budi Santoso",
          username: "budi",
        },
      ];

      const mockTasksDb = [
        {
          id: "t-1",
          taskKey: "LP-10",
          title: "Implementasi Task Digest",
          status: "In Progress",
          priority: "High",
          dueDate: "2026-08-01", // Past date (overdue)
          projectName: "LanPro Core",
        },
        {
          id: "t-2",
          taskKey: "LP-11",
          title: "Refactor Database Adapter",
          status: "To Do",
          priority: "Medium",
          dueDate: "2026-09-01", // Future date
          projectName: "LanPro Core",
        },
      ];

      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce([mockUsers]); // User query
      mockQuery.mockResolvedValueOnce([mockTasksDb]); // Tasks query for usr-1

      (db.getConnection as jest.Mock).mockResolvedValueOnce({
        query: mockQuery,
        release: jest.fn(),
      });

      const results = await kumpulkanPendingTasksPerUser("usr-1");

      expect(results).toHaveLength(1);
      expect(results[0].email).toBe("budi@rajonet.com");
      expect(results[0].tasks).toHaveLength(2);
      expect(results[0].tasks[0].isOverdue).toBe(true);
      expect(results[0].tasks[1].isOverdue).toBe(false);
    });

    it("menjalankan kirimDailyTaskDigestEmail dan mengembalikan ringkasan eksekusi yang sukses", async () => {
      delete process.env.RESEND_API_KEY; // Mock mode

      const mockUsers = [
        {
          id: "usr-2",
          email: "ani@rajonet.com",
          displayName: "Ani Wijaya",
          username: "ani",
        },
      ];

      const mockTasksDb = [
        {
          id: "t-3",
          taskKey: "LP-20",
          title: "Setup CI/CD Pipeline",
          status: "Testing",
          priority: "Urgent",
          dueDate: "2026-08-20",
          projectName: "Infrastructure",
        },
      ];

      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce([mockUsers]);
      mockQuery.mockResolvedValueOnce([mockTasksDb]);

      (db.getConnection as jest.Mock).mockResolvedValueOnce({
        query: mockQuery,
        release: jest.fn(),
      });

      const execution = await kirimDailyTaskDigestEmail("usr-2");

      expect(execution.totalUsersChecked).toBe(1);
      expect(execution.emailsSent).toBe(1);
      expect(execution.failedCount).toBe(0);
      expect(execution.details[0].email).toBe("ani@rajonet.com");
      expect(execution.details[0].success).toBe(true);
    });
  });
});
