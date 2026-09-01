import { Express } from "express";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import multer from "multer";
import { validateFileBuffer, sanitizeFilename } from "../../src/lib/fileSecurity";
import { jagaProyek } from "../middleware/jagaProyek";
import { generateContentWithFallback } from "../services/ai.service";
import { simpanBerkas } from "../services/storage.service";
import {
  QA_SCENARIO_REFINEMENT_SCHEMA,
  QA_TEST_CASE_SUGGESTION_SCHEMA,
} from "../services/qa-ai.schema";
import { validasiBody, validasiQuery } from "../middleware/validate";
import { listSearchQuerySchema, qaCaseListQuerySchema } from "../schemas/pagination.schema";
import { respondWithProjectList } from "../lib/listResponse";
import {
  createQATestCaseSchema,
  updateQATestCaseSchema,
  updateQASuiteSchema,
} from "../schemas/qa.schema";
import { qaRepository } from "../repositories/qa.repository";

export function setupQARoutes(
  app: Express,
  upload: multer.Multer,
  GLOBAL_UPLOADS_DIR: string,
  createAuditLog: (
    userId: string,
    projectId: string | null,
    actionType: "CREATE" | "UPDATE" | "DELETE",
    entityName: string,
    entityId: string,
    oldValues: any,
    newValues: any
  ) => Promise<any>
) {
  // GET: List QA Test Suites
  app.get(
    "/api/projects/:projectId/qa-test-suites",
    jagaProyek("qa", "R"),
    async (req: any, res) => {
      try {
        const { projectId } = req.params;
        const rows = await qaRepository.findSuitesByProjectId(projectId);
        res.json({ status: "success", data: rows });
      } catch (error: any) {
        console.error("GET /api/projects/:projectId/qa-test-suites error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: Save QA/user feedback to ai_learning_logs for AI continuous learning
  app.post("/api/v1/qa/ai-feedback", jagaProyek("qa", "C"), async (req, res) => {
    try {
      const { project_id, evaluation_notes } = req.body;
      if (!project_id || !evaluation_notes || !evaluation_notes.trim()) {
        return res.status(400).json({
          status: "error",
          code: "srv.parameter_projectid_dan_evaluationnotes",
          message: "Parameter project_id dan evaluation_notes wajib diisi.",
        });
      }

      const id = await qaRepository.createAiFeedback(project_id, evaluation_notes);
      console.log(`[QA AI FEEDBACK] Saved learning log ${id} for project ${project_id}`);
      return res.json({
        status: "success",
        code: "srv.feedback_berhasil_disimpan_ke",
        message: "Feedback berhasil disimpan ke dalam log pembelajaran AI.",
      });
    } catch (error: any) {
      console.error("[QA AI FEEDBACK ERROR]", error);
      return res.status(500).json({
        status: "error",
        code: "srv.gagal_menyimpan_feedback",
        message: "Gagal menyimpan feedback: " + error.message,
      });
    }
  });

  // POST: Bulk Upload QA Test Cases from Excel
  app.post(
    "/api/v1/qa/test-case/bulk-upload",
    upload.single("file"),
    jagaProyek("qa", "C"),
    async (req, res) => {
      try {
        const { projectId, phase, uploaderName } = req.body;
        const file = req.file;

        if (!projectId || !phase || !file) {
          return res.status(400).json({
            status: "error",
            code: "srv.missing_required_fields_projectid",
            message: "Missing required fields (projectId, phase, file)",
          });
        }

        const fileBuf = fs.readFileSync(file.path);
        const fileVal = validateFileBuffer(fileBuf, file.originalname);
        if (!fileVal.valid) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({
            status: "error",
            message:
              fileVal.error ||
              "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).",
          });
        }

        const ExcelJS = require("exceljs");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(file.path);
        const worksheet = workbook.worksheets[0];
        const data: any[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row: any) => {
          data.push((row.values as any[]).slice(1));
        });

        const headers = data[0] as string[];
        if (!headers || headers.length < 4) {
          return res.status(400).json({
            status: "error",
            code: "srv.format_kolom_tidak_sesuai",
            message:
              "Format kolom tidak sesuai standar (Nama Judul, Deskripsi, Hasil Diharapkan, Level)",
          });
        }

        const expectedHeaders = ["Nama Judul", "Deskripsi", "Hasil Diharapkan", "Level"];
        let headerValid = true;
        for (let i = 0; i < expectedHeaders.length; i++) {
          if (!headers[i] || headers[i].trim().toLowerCase() !== expectedHeaders[i].toLowerCase()) {
            headerValid = false;
            break;
          }
        }

        if (!headerValid) {
          return res.status(400).json({
            status: "error",
            code: "srv.format_kolom_tidak_sesuai",
            message:
              "Format kolom tidak sesuai standar (Nama Judul, Deskripsi, Hasil Diharapkan, Level)",
          });
        }

        const newSuiteId = `suite-${Date.now()}`;
        const newSuiteName = `${file.originalname.replace(/\.[^/.]+$/, "")} (${phase})`;

        let rowNum = 1;
        const casesToReturn = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (!row || row.length === 0 || !row[0]) continue;

          const newCaseId = `case-${Date.now()}-${rowNum}`;
          const newCase = {
            id: newCaseId,
            suiteId: newSuiteId,
            rowNum: rowNum,
            title: row[0],
            steps: row[1] || "",
            expectedResult: row[2] || "",
            status: "Pending",
            priority: row[3] || "Medium",
            commentsList: [],
            evidences: [],
          };
          casesToReturn.push(newCase);
          rowNum++;
        }

        await qaRepository.bulkUploadSuiteWithCases(
          projectId,
          newSuiteId,
          newSuiteName,
          phase,
          uploaderName || "Unknown",
          file.originalname,
          casesToReturn
        );

        res.status(201).json({
          status: "success",
          code: "srv.bulk_upload_berhasil",
          message: "Bulk upload berhasil",
          data: {
            suiteId: newSuiteId,
            casesCount: casesToReturn.length,
          },
        });
      } catch (error: any) {
        console.error("POST /api/v1/qa/test-case/bulk-upload error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: Create QA Test Suite
  app.post("/api/projects/:projectId/qa-test-suites", jagaProyek("qa", "C"), async (req, res) => {
    try {
      const { projectId } = req.params;
      const suite = req.body;
      await qaRepository.createSuite({
        id: suite.id,
        projectId,
        name: suite.name,
        phase: suite.phase,
        uploadedBy: suite.uploadedBy,
        uploadedAt: suite.uploadedAt || new Date().toISOString(),
        fileName: suite.fileName || null,
        assignedTo: suite.assignedTo || null,
      });

      res.json({
        status: "success",
        code: "srv.test_suite_created",
        message: "Test Suite created",
        data: suite,
      });
    } catch (error: any) {
      console.error("POST /api/projects/:projectId/qa-test-suites error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  });

  // PUT: Update QA Test Suite
  app.put(
    "/api/projects/:projectId/qa-test-suites/:id",
    jagaProyek("qa", "U"),
    validasiBody(updateQASuiteSchema),
    async (req, res) => {
      try {
        const { projectId, id } = req.params;
        const suite = req.body;
        await qaRepository.updateSuite(id, projectId, suite);
        res.json({
          status: "success",
          code: "srv.test_suite_updated",
          message: "Test Suite updated",
        });
      } catch (error: any) {
        console.error("PUT /api/projects/:projectId/qa-test-suites/:id error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // DELETE: Remove QA Test Suite and related Test Cases
  app.delete(
    "/api/projects/:projectId/qa-test-suites/:id",
    jagaProyek("qa", "D"),
    async (req, res) => {
      try {
        const { projectId, id } = req.params;
        await qaRepository.deleteSuiteWithCases(id, projectId);
        res.json({
          status: "success",
          code: "srv.test_suite_and_its",
          message: "Test Suite and its Test Cases deleted",
        });
      } catch (error: any) {
        console.error("DELETE /api/projects/:projectId/qa-test-suites/:id error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // GET: List QA Test Cases
  app.get(
    "/api/projects/:projectId/qa-test-cases",
    jagaProyek("qa", "R"),
    validasiQuery(qaCaseListQuerySchema),
    async (req, res) => {
      try {
        const { projectId } = req.params;
        const search = req.query.search as string | undefined;
        const suiteId = req.query.suiteId as string | undefined;
        await respondWithProjectList(
          res,
          req.query as Record<string, unknown>,
          () => qaRepository.findTestCasesByProjectId(projectId, search, suiteId),
          (pagination) =>
            qaRepository.findTestCasesByProjectIdPaged(projectId, pagination, search, suiteId)
        );
      } catch (error: any) {
        console.error("GET /api/projects/:projectId/qa-test-cases error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: Create QA Test Case
  app.post(
    "/api/projects/:projectId/qa-test-cases",
    jagaProyek("qa", "C"),
    validasiBody(createQATestCaseSchema),
    async (req, res) => {
      try {
        const { projectId } = req.params;
        const tc = req.body;
        await qaRepository.createTestCase({
          id: tc.id,
          projectId,
          judul: tc.judul || tc.title,
          deskripsi: tc.deskripsi || tc.comment || null,
          tipeTesting: tc.tipeTesting || tc.phase || "SIT",
          prioritas: tc.prioritas || tc.priority || "Medium",
          caseId: tc.caseId || null,
          expected: tc.expected || tc.expectedResult || null,
          status: tc.status || "untested",
          steps: tc.steps || [],
          history: tc.history || [],
          createdAt: tc.createdAt || new Date().toISOString(),
          activeTesterId: tc.activeTesterId || null,
          activeTesterName: tc.activeTesterName || null,
          lockedAt: tc.lockedAt || null,
          modulId: tc.modulId || tc.suiteId || null,
          suiteId: tc.suiteId || null,
          rowNum: tc.rowNum || null,
          comment: tc.comment || null,
          evidenceUrl: tc.evidenceUrl || null,
          evidenceType: tc.evidenceType || null,
          evidenceName: tc.evidenceName || null,
          linkedBugKey: tc.linkedBugKey || null,
          commentsList: tc.commentsList || [],
          evidences: tc.evidences || [],
          assignedTo: tc.assignedTo || null,
        });

        res.json({
          status: "success",
          code: "srv.test_case_created",
          message: "Test Case created",
        });
      } catch (error: any) {
        console.error("POST /api/projects/:projectId/qa-test-cases error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // PUT: Update QA Test Case
  app.put(
    "/api/projects/:projectId/qa-test-cases/:id",
    jagaProyek("qa", "U"),
    validasiBody(updateQATestCaseSchema),
    async (req, res) => {
      try {
        const { projectId, id } = req.params;
        const tc = req.body;
        await qaRepository.updateTestCase(id, projectId, tc);
        res.json({
          status: "success",
          code: "srv.test_case_updated",
          message: "Test Case updated",
        });
      } catch (error: any) {
        console.error("PUT /api/projects/:projectId/qa-test-cases/:id error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: Save QA Test Case with evidence upload
  app.post(
    "/api/projects/:projectId/qa-test-cases/:id/save",
    upload.single("evidence"),
    jagaProyek("qa", "U"),
    async (req, res) => {
      try {
        const { projectId, id } = req.params;
        const { comment, commentsList, evidences, status, linkedBugKey, currentUserName } =
          req.body;
        const file = req.file;

        const tc = await qaRepository.findTestCaseById(id, projectId);
        if (!tc) {
          return res.status(404).json({
            status: "error",
            code: "srv.test_case_tidak_ditemukan",
            message: "Test case tidak ditemukan.",
          });
        }

        let finalEvidenceUrl =
          req.body.evidenceUrl !== undefined ? req.body.evidenceUrl : tc.evidenceUrl;
        let finalEvidenceName =
          req.body.evidenceName !== undefined ? req.body.evidenceName : tc.evidenceName;
        let finalEvidenceType =
          req.body.evidenceType !== undefined ? req.body.evidenceType : tc.evidenceType;

        let finalEvidences = [];
        try {
          finalEvidences =
            typeof tc.evidences === "string" ? JSON.parse(tc.evidences) : tc.evidences || [];
        } catch (e) {
          finalEvidences = [];
        }

        if (file) {
          const fileBuf = fs.readFileSync(file.path);
          const fileVal = validateFileBuffer(fileBuf, file.originalname);
          if (!fileVal.valid) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({
              status: "error",
              message:
                fileVal.error ||
                "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).",
            });
          }

          const safeName = fileVal.sanitizedName || sanitizeFilename(file.originalname);
          const relativePath = await simpanBerkas(safeName, fileBuf, file.mimetype);
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch {}

          finalEvidenceUrl = relativePath;
          finalEvidenceName = file.originalname;
          finalEvidenceType = file.mimetype.startsWith("video/") ? "video" : "image";

          finalEvidences.push({
            id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            name: file.originalname,
            url: relativePath,
            type: finalEvidenceType,
          });
        }

        let parsedEvidences = finalEvidences;
        if (evidences) {
          try {
            parsedEvidences = typeof evidences === "string" ? JSON.parse(evidences) : evidences;
          } catch (e) {}
        }

        let parsedCommentsList = [];
        try {
          parsedCommentsList =
            typeof tc.commentsList === "string"
              ? JSON.parse(tc.commentsList)
              : tc.commentsList || [];
        } catch (e) {
          parsedCommentsList = [];
        }

        if (commentsList) {
          try {
            parsedCommentsList =
              typeof commentsList === "string" ? JSON.parse(commentsList) : commentsList;
          } catch (e) {}
        }

        if (comment && comment.trim() && comment !== tc.comment) {
          parsedCommentsList.push({
            id: `comment-${Date.now()}`,
            userName: currentUserName || "Tester LanPro",
            text: comment.trim(),
            timestamp: new Date().toISOString(),
          });
        }

        await qaRepository.saveTestCaseEvidence(id, projectId, {
          comment: comment || tc.comment || null,
          commentsList: parsedCommentsList,
          evidenceUrl: finalEvidenceUrl,
          evidenceName: finalEvidenceName,
          evidenceType: finalEvidenceType,
          evidences: parsedEvidences,
          status: status || tc.status,
          linkedBugKey: linkedBugKey || tc.linkedBugKey || null,
        });

        res.json({
          status: "success",
          code: "srv.test_case_saved_successfully",
          message: "Test case saved successfully",
          data: {
            id,
            comment: comment || tc.comment,
            commentsList: parsedCommentsList,
            evidenceUrl: finalEvidenceUrl,
            evidenceName: finalEvidenceName,
            evidenceType: finalEvidenceType,
            evidences: parsedEvidences,
            status: status || tc.status,
            linkedBugKey: linkedBugKey || tc.linkedBugKey,
          },
        });
      } catch (error: any) {
        console.error("POST /api/projects/:projectId/qa-test-cases/:id/save error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // GET: Execution History Timeline
  app.get(
    "/api/projects/:projectId/qa-test-cases/:id/execution-history",
    jagaProyek("qa", "R"),
    async (req, res) => {
      try {
        const { projectId, id } = req.params;
        const logs = await qaRepository.findExecutionHistory(id, projectId);
        res.json({ status: "success", data: logs || [] });
      } catch (error: any) {
        console.error("GET execution-history error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // PATCH: Update Test Case status with auto bug creation
  app.patch(
    "/api/projects/:projectId/qa-test-cases/:id/status",
    jagaProyek("qa", "U"),
    async (req: any, res) => {
      try {
        const { projectId, id } = req.params;
        const { status, notes } = req.body;
        if (!status) {
          return res
            .status(400)
            .json({ status: "error", code: "srv.status_required", message: "Status required" });
        }

        const userIdStr = req.user?.uid || req.user?.id || req.headers["x-user-id"] || "guest";
        const result = await qaRepository.updateTestCaseStatusWithBug(
          projectId,
          id,
          status,
          notes,
          userIdStr,
          createAuditLog
        );

        res.json({
          status: "success",
          code: "srv.status_updated_successfully",
          message: "Status updated successfully",
          statusValue: result.statusValue,
          bugKey: result.bugKey,
        });
      } catch (error: any) {
        console.error("PATCH /api/projects/:projectId/qa-test-cases/:id/status error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // DELETE: Remove QA Test Case
  app.delete(
    "/api/projects/:projectId/qa-test-cases/:id",
    jagaProyek("qa", "D"),
    async (req, res) => {
      try {
        const { projectId, id } = req.params;
        await qaRepository.deleteTestCase(id, projectId);
        res.json({
          status: "success",
          code: "srv.test_case_deleted",
          message: "Test Case deleted",
        });
      } catch (error: any) {
        console.error("DELETE /api/projects/:projectId/qa-test-cases/:id error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: Sync QA Test Cases
  app.post(
    "/api/projects/:projectId/qa-test-cases/sync",
    jagaProyek("qa", "U"),
    async (req, res) => {
      try {
        const { projectId } = req.params;
        const testCases = req.body;
        if (!Array.isArray(testCases)) {
          return res.status(400).json({
            status: "error",
            code: "srv.body_must_be_an",
            message: "Body must be an array",
          });
        }

        await qaRepository.syncTestCases(projectId, testCases);

        res.json({
          status: "success",
          message: `Successfully synced ${testCases.length} test cases`,
        });
      } catch (error: any) {
        console.error("POST /api/projects/:projectId/qa-test-cases/sync error:", error);
        res.status(500).json({
          status: "error",
          code: "srv.terjadi_kesalahan_internal_server",
          message: "Terjadi kesalahan internal server",
        });
      }
    }
  );

  // POST: AI-Powered QA Test Case Generator (Single)
  app.post(
    "/api/projects/:projectId/qa-test-cases/generate-ai",
    jagaProyek("qa", "R"),
    async (req, res) => {
      try {
        const { judul, deskripsi, tipeTesting, prioritas } = req.body;
        if (!judul) {
          return res.status(400).json({
            status: "error",
            code: "srv.judul_skenario_uji_diperlukan",
            message: "Judul skenario uji diperlukan.",
          });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({
            status: "error",
            code: "srv.kunci_api_gemini_tidak_2",
            message: "Kunci API Gemini tidak dikonfigurasi pada server.",
          });
        }

        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const response = await generateContentWithFallback(ai, {
          model: "gemini-flash-latest",
          contents: `Anda adalah pakar QA (Quality Assurance) profesional.
Buat skenario uji (test case) QA yang sangat detail dan sistematis berdasarkan informasi tugas berikut:

Nama Fitur/Skenario: ${judul}
Deskripsi/Konteks: ${deskripsi || "Tidak ada deskripsi rinci."}
Tipe Pengujian: ${tipeTesting || "Manual"}
Prioritas: ${prioritas || "Medium"}

Berikan langkah-langkah pengujian (langkah-langkah nyata yang harus dilakukan tester di browser/aplikasi) beserta hasil yang diharapkan (expected result) untuk masing-masing langkah tersebut.`,
          config: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: QA_SCENARIO_REFINEMENT_SCHEMA,
          },
        });

        const jsonStr = response.text ? response.text.trim() : "{}";
        let parsedData;
        try {
          parsedData = JSON.parse(jsonStr);
        } catch (parseErr) {
          console.error("JSON parse error in QA test generation:", parseErr);
          parsedData = {};
        }

        res.json({
          status: "success",
          data: parsedData,
        });
      } catch (error: any) {
        console.error("POST /api/projects/:projectId/qa-test-cases/generate-ai error:", error);
        res.status(500).json({
          status: "error",
          message: error.message || "Gagal membuat skenario uji otomatis dengan AI.",
        });
      }
    }
  );

  // POST: AI-Powered QA Test Cases Generator (Bulk based on project context)
  app.post(
    "/api/v1/projects/:projectId/qa/generate-test-cases-ai",
    jagaProyek("qa", "C"),
    async (req, res) => {
      try {
        const { projectId } = req.params;
        const { suiteName, suitePhase, existingCases } = req.body || {};
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({
            status: "error",
            code: "srv.kunci_api_gemini_tidak_2",
            message: "Kunci API Gemini tidak dikonfigurasi pada server.",
          });
        }

        const { meetingsList, documentsList, tasksList } =
          await qaRepository.getAggregatedProjectContext(projectId);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const itemsToAggregate: { date: Date; text: string }[] = [];

        meetingsList.forEach((m) => {
          const date = m.createdAt ? new Date(m.createdAt) : new Date();
          if (date >= fourteenDaysAgo) {
            const aiSummaryText = m.aiSummary
              ? typeof m.aiSummary === "string"
                ? m.aiSummary
                : JSON.stringify(m.aiSummary)
              : "";
            itemsToAggregate.push({
              date,
              text: `[MEETING NOTES]\nTitle: ${m.title || ""}\nDescription: ${
                m.description || ""
              }\nTranscript: ${m.transcript || ""}\nSummary: ${aiSummaryText}\nCreated At: ${
                m.createdAt || ""
              }\n`,
            });
          }
        });

        documentsList.forEach((doc) => {
          const date = doc.createdAt ? new Date(doc.createdAt) : new Date();
          itemsToAggregate.push({
            date,
            text: `[DOCUMENTATION]\nTitle: ${doc.title || ""}\nDescription: ${
              doc.description || ""
            }\nType: ${doc.type || ""}\nCreated At: ${doc.createdAt || ""}\n`,
          });
        });

        tasksList.forEach((t) => {
          const date = t.createdAt ? new Date(t.createdAt) : new Date();
          itemsToAggregate.push({
            date,
            text: `[ACTIVE TASK]\nKey: ${t.taskKey || ""}\nTitle: ${
              t.title || ""
            }\nDescription: ${t.description || ""}\nAcceptance Criteria: ${
              t.acceptanceCriteria || ""
            }\nPriority: ${t.priority || ""}\nStatus: ${t.status || ""}\nCreated At: ${
              t.createdAt || ""
            }\n`,
          });
        });

        itemsToAggregate.sort((a, b) => b.date.getTime() - a.date.getTime());

        let aggregatedPrompt = "";
        const charLimit = 80000;
        for (const item of itemsToAggregate) {
          if (aggregatedPrompt.length + item.text.length > charLimit) {
            break;
          }
          aggregatedPrompt += item.text + "\n";
        }

        if (aggregatedPrompt.trim().length === 0) {
          aggregatedPrompt =
            "Tidak ada meeting notes 14 hari terakhir, dokumen, atau task aktif untuk project ini.";
        }

        let suiteContextPrompt = "";
        if (suiteName) {
          suiteContextPrompt = `\n\nKonteks Tambahan (Fokus Utama):\nAnda sedang menambahkan skenario pengujian baru untuk test suite aktif bernama "${suiteName}" (Fase: ${
            suitePhase || "SIT"
          }).\n`;
          if (existingCases && existingCases.length > 0) {
            suiteContextPrompt += `Skenario pengujian yang SUDAH ada dalam test suite ini adalah:\n${JSON.stringify(
              existingCases
            )}\nHarap fokuskan untuk membuat skenario uji pelengkap yang menguji kasus ekstrem (edge cases) atau alur fungsionalitas lain yang belum tercover di atas, tanpa menduplikasi skenario pengujian yang sudah ada.\n`;
          }
        }

        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const response = await generateContentWithFallback(ai, {
          model: "gemini-flash-latest",
          contents: `Anda adalah Principal QA Engineer dan AI Integration Specialist untuk LanPro.
Berdasarkan data project teragregasi di bawah ini (yang terdiri dari dokumen fungsional, meeting notes terbaru, dan backlog/acceptance criteria aktif), buatlah daftar skenario uji (test cases) yang komprehensif, terstruktur, sistematis, dan siap pakai untuk tim pengujian.
${suiteContextPrompt}
Format keluaran HARUS berupa array JSON yang mematuhi skema berikut secara ketat.

DATA AGREGASI PROJECT:
---
${aggregatedPrompt}
---`,
          config: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: QA_TEST_CASE_SUGGESTION_SCHEMA,
          },
        });

        const responseText = response.text ? response.text.trim() : "[]";
        let testCases;
        try {
          testCases = JSON.parse(responseText);
        } catch (parseErr) {
          console.error("JSON parse error in test cases generation:", parseErr);
          testCases = [];
        }

        res.json({
          status: "success",
          data: testCases,
        });
      } catch (error: any) {
        console.error("POST /api/v1/projects/:projectId/qa/generate-test-cases-ai error:", error);
        res.status(500).json({
          status: "error",
          message: error.message || "Gagal membuat test case dengan AI.",
        });
      }
    }
  );
}

export default setupQARoutes;
