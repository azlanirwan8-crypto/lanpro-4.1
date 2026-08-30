import db from "../../src/lib/db";
import crypto from "crypto";

/**
 * Batas atas test case yang dimuat sekaligus (#284).
 *
 * Angkanya mengikuti preseden `task.repository.ts` yang sudah memakai
 * `LIMIT 2000` untuk daftar tugas: cukup longgar sehingga tidak ada proyek
 * nyata yang terpotong hari ini, tetapi tetap menutup kemungkinan satu kueri
 * menahan koneksi sampai permintaan lain mengantre (pool diklem 20).
 */
const BATAS_TEST_CASE = 2000;

export interface QATestSuiteEntity {
  id: string;
  projectId: string;
  name: string;
  phase: string;
  uploadedBy: string;
  uploadedAt?: string;
  fileName?: string | null;
  assignedTo?: string | null;
}

export interface QATestCaseEntity {
  id: string;
  projectId: string;
  judul: string;
  title?: string;
  deskripsi?: string | null;
  comment?: string | null;
  tipeTesting: string;
  phase?: string;
  prioritas: string;
  priority?: string;
  caseId?: string | null;
  expected?: string | null;
  expectedResult?: string | null;
  status: string;
  steps?: any;
  history?: any;
  createdAt?: string;
  activeTesterId?: string | null;
  activeTesterName?: string | null;
  lockedAt?: string | null;
  modulId?: string | null;
  suiteId?: string | null;
  rowNum?: number | null;
  evidenceUrl?: string | null;
  evidenceType?: string | null;
  evidenceName?: string | null;
  linkedBugKey?: string | null;
  commentsList?: any;
  evidences?: any;
  assignedTo?: string | null;
}

export class QaRepository {
  async findSuitesByProjectId(projectId: string): Promise<QATestSuiteEntity[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM QATestSuites WHERE projectId = ? ORDER BY uploadedAt DESC",
        [projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async createAiFeedback(projectId: string, evaluationNotes: string): Promise<string> {
    const connection = await db.getConnection();
    try {
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      await connection.query(
        "INSERT INTO ai_learning_logs (id, project_id, evaluation_notes, timestamp) VALUES (?, ?, ?, ?)",
        [id, projectId, evaluationNotes.trim(), timestamp]
      );
      return id;
    } finally {
      connection.release();
    }
  }

  async createSuite(suite: QATestSuiteEntity): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO QATestSuites (id, projectId, name, phase, uploadedBy, uploadedAt, fileName, assignedTo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          suite.id,
          suite.projectId,
          suite.name,
          suite.phase,
          suite.uploadedBy,
          suite.uploadedAt || new Date().toISOString(),
          suite.fileName || null,
          suite.assignedTo || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async updateSuite(
    id: string,
    projectId: string,
    suite: Partial<QATestSuiteEntity>
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `UPDATE QATestSuites SET name = ?, phase = ?, uploadedBy = ?, uploadedAt = ?, fileName = ?, assignedTo = ?
         WHERE id = ? AND projectId = ?`,
        [
          suite.name,
          suite.phase,
          suite.uploadedBy,
          suite.uploadedAt,
          suite.fileName || null,
          suite.assignedTo || null,
          id,
          projectId,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async deleteSuiteWithCases(id: string, projectId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM QATestCases WHERE suiteId = ? AND projectId = ?", [
        id,
        projectId,
      ]);
      await connection.query("DELETE FROM QATestCases WHERE modulId = ? AND projectId = ?", [
        id,
        projectId,
      ]);
      await connection.query("DELETE FROM QATestSuites WHERE id = ? AND projectId = ?", [
        id,
        projectId,
      ]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async bulkUploadSuiteWithCases(
    projectId: string,
    suiteId: string,
    suiteName: string,
    phase: string,
    uploaderName: string,
    fileName: string,
    cases: any[]
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO QATestSuites (id, projectId, name, phase, uploadedBy, uploadedAt, fileName)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          suiteId,
          projectId,
          suiteName,
          phase,
          uploaderName || "Unknown",
          new Date().toISOString(),
          fileName,
        ]
      );

      for (const newCase of cases) {
        await connection.query(
          `INSERT INTO QATestCases (id, projectId, judul, deskripsi, tipeTesting, prioritas, status, steps, history, createdAt, suiteId, rowNum, modulId, commentsList, evidences, expected)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newCase.id,
            projectId,
            newCase.title,
            newCase.steps,
            phase,
            newCase.priority,
            newCase.status,
            JSON.stringify(newCase.steps),
            JSON.stringify([]),
            new Date().toISOString(),
            suiteId,
            newCase.rowNum,
            suiteId,
            JSON.stringify([]),
            JSON.stringify([]),
            newCase.expectedResult,
          ]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async findTestCasesByProjectId(projectId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT * FROM QATestCases WHERE projectId = ?
          ORDER BY rowNum ASC, id ASC LIMIT ${BATAS_TEST_CASE}`,
        [projectId]
      );

      const safeParse = (str: any, fallback = []) => {
        if (typeof str !== "string") return str || fallback;
        try {
          return JSON.parse(str);
        } catch {
          return fallback;
        }
      };

      return (rows || []).map((row: any) => ({
        id: row.id,
        projectId: row.projectId,
        title: row.judul,
        judul: row.judul,
        steps: safeParse(row.steps, []),
        expectedResult: row.expected,
        expected: row.expected,
        status: row.status,
        priority: row.prioritas,
        prioritas: row.prioritas,
        phase: row.tipeTesting,
        tipeTesting: row.tipeTesting,
        suiteId: row.suiteId,
        rowNum: row.rowNum,
        modulId: row.modulId,
        history: safeParse(row.history, []),
        comment: row.comment,
        evidenceUrl: row.evidenceUrl,
        evidenceType: row.evidenceType,
        evidenceName: row.evidenceName,
        linkedBugKey: row.linkedBugKey,
        commentsList: safeParse(row.commentsList, []),
        evidences: safeParse(row.evidences, []),
        assignedTo: row.assignedTo,
        activeTesterId: row.activeTesterId,
        activeTesterName: row.activeTesterName,
        lockedAt: row.lockedAt,
        createdAt: row.createdAt,
      }));
    } finally {
      connection.release();
    }
  }

  async createTestCase(tc: QATestCaseEntity): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `INSERT INTO QATestCases (
          id, projectId, judul, deskripsi, tipeTesting, prioritas, caseId, expected, status, steps, history, createdAt, activeTesterId, activeTesterName, lockedAt, modulId,
          suiteId, rowNum, comment, evidenceUrl, evidenceType, evidenceName, linkedBugKey, commentsList, evidences, assignedTo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tc.id,
          tc.projectId,
          tc.judul || tc.title,
          tc.deskripsi || tc.comment || null,
          tc.tipeTesting || tc.phase || "SIT",
          tc.prioritas || tc.priority || "Medium",
          tc.caseId || null,
          tc.expected || tc.expectedResult || null,
          tc.status || "untested",
          JSON.stringify(tc.steps || []),
          JSON.stringify(tc.history || []),
          tc.createdAt || new Date().toISOString(),
          tc.activeTesterId || null,
          tc.activeTesterName || null,
          tc.lockedAt || null,
          tc.modulId || tc.suiteId || null,
          tc.suiteId || null,
          tc.rowNum || null,
          tc.comment || null,
          tc.evidenceUrl || null,
          tc.evidenceType || null,
          tc.evidenceName || null,
          tc.linkedBugKey || null,
          JSON.stringify(tc.commentsList || []),
          JSON.stringify(tc.evidences || []),
          tc.assignedTo || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async updateTestCase(
    id: string,
    projectId: string,
    tc: Partial<QATestCaseEntity>
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `UPDATE QATestCases SET
          judul = ?,
          deskripsi = ?,
          tipeTesting = ?,
          prioritas = ?,
          caseId = ?,
          expected = ?,
          status = ?,
          steps = ?,
          history = ?,
          activeTesterId = ?,
          activeTesterName = ?,
          lockedAt = ?,
          modulId = ?,
          suiteId = ?,
          rowNum = ?,
          comment = ?,
          evidenceUrl = ?,
          evidenceType = ?,
          evidenceName = ?,
          linkedBugKey = ?,
          commentsList = ?,
          evidences = ?,
          assignedTo = ?
         WHERE id = ? AND projectId = ?`,
        [
          tc.judul || tc.title,
          tc.deskripsi || tc.comment || null,
          tc.tipeTesting || tc.phase || "SIT",
          tc.prioritas || tc.priority || "Medium",
          tc.caseId || null,
          tc.expected || tc.expectedResult || null,
          tc.status,
          JSON.stringify(tc.steps || []),
          JSON.stringify(tc.history || []),
          tc.activeTesterId || null,
          tc.activeTesterName || null,
          tc.lockedAt || null,
          tc.modulId || tc.suiteId || null,
          tc.suiteId || null,
          tc.rowNum || null,
          tc.comment || null,
          tc.evidenceUrl || null,
          tc.evidenceType || null,
          tc.evidenceName || null,
          tc.linkedBugKey || null,
          JSON.stringify(tc.commentsList || []),
          JSON.stringify(tc.evidences || []),
          tc.assignedTo || null,
          id,
          projectId,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async findTestCaseById(id: string, projectId: string): Promise<any | null> {
    const connection = await db.getConnection();
    try {
      const [existingRows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE id = ? AND projectId = ?",
        [id, projectId]
      );
      return existingRows && existingRows.length > 0 ? existingRows[0] : null;
    } finally {
      connection.release();
    }
  }

  async saveTestCaseEvidence(
    id: string,
    projectId: string,
    data: {
      comment: string | null;
      commentsList: any[];
      evidenceUrl: string | null;
      evidenceName: string | null;
      evidenceType: string | null;
      evidences: any[];
      status: string;
      linkedBugKey: string | null;
    }
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        `UPDATE QATestCases SET
          comment = ?,
          commentsList = ?,
          evidenceUrl = ?,
          evidenceName = ?,
          evidenceType = ?,
          evidences = ?,
          status = ?,
          linkedBugKey = ?
         WHERE id = ? AND projectId = ?`,
        [
          data.comment,
          JSON.stringify(data.commentsList),
          data.evidenceUrl,
          data.evidenceName,
          data.evidenceType,
          JSON.stringify(data.evidences),
          data.status,
          data.linkedBugKey,
          id,
          projectId,
        ]
      );
    } finally {
      connection.release();
    }
  }

  async findExecutionHistory(id: string, projectId: string): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      let logs: any[] = [];
      try {
        const [logRows]: any = await connection.query(
          "SELECT * FROM QATestCaseExecutionLogs WHERE testCaseId = ? AND projectId = ? ORDER BY runVersion ASC",
          [id, projectId]
        );
        if (logRows && logRows.length > 0) {
          logs = logRows.map((r: any) => ({
            ...r,
            evidences:
              typeof r.evidences === "string" ? JSON.parse(r.evidences || "[]") : r.evidences,
          }));
        }
      } catch (e) {}

      if (logs.length === 0) {
        const [tcRows]: any = await connection.query(
          "SELECT history FROM QATestCases WHERE id = ? AND projectId = ?",
          [id, projectId]
        );
        if (tcRows && tcRows.length > 0 && tcRows[0].history) {
          try {
            logs =
              typeof tcRows[0].history === "string"
                ? JSON.parse(tcRows[0].history)
                : tcRows[0].history;
          } catch (e) {}
        }
      }

      return logs || [];
    } finally {
      connection.release();
    }
  }

  async recordExecutionRunLog(
    connection: any,
    projectId: string,
    testCaseId: string,
    executionStatus: string,
    linkedIssueKey: string | null = null,
    userId: string = "system",
    userName: string = "Tester / System",
    notes: string = "",
    evidences: any[] = []
  ): Promise<any> {
    const [rows]: any = await connection.query(
      "SELECT history FROM QATestCases WHERE id = ? AND projectId = ?",
      [testCaseId, projectId]
    );

    let currentHistory: any[] = [];
    if (rows && rows.length > 0 && rows[0].history) {
      try {
        currentHistory =
          typeof rows[0].history === "string" ? JSON.parse(rows[0].history) : rows[0].history || [];
      } catch (e) {
        currentHistory = [];
      }
    }

    const nextRunVersion = currentHistory.length + 1;
    const runLabel = `Run #${nextRunVersion}`;
    const logId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const newLog = {
      id: logId,
      testCaseId,
      projectId,
      runVersion: nextRunVersion,
      runLabel,
      executionStatus: executionStatus.toUpperCase(),
      linkedIssueKey: linkedIssueKey || null,
      executedByUserId: userId,
      executedByName: userName,
      timestamp,
      notes: notes || `Status eksekusi diubah menjadi ${executionStatus.toUpperCase()}`,
      evidences: evidences || [],
    };

    currentHistory.push(newLog);

    await connection.query("UPDATE QATestCases SET history = ? WHERE id = ? AND projectId = ?", [
      JSON.stringify(currentHistory),
      testCaseId,
      projectId,
    ]);

    try {
      await connection.query(
        `INSERT INTO QATestCaseExecutionLogs
         (id, testCaseId, projectId, runVersion, runLabel, executionStatus, linkedIssueKey, executedByUserId, executedByName, timestamp, notes, evidences)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          testCaseId,
          projectId,
          nextRunVersion,
          runLabel,
          executionStatus.toUpperCase(),
          linkedIssueKey || null,
          userId,
          userName,
          timestamp,
          notes || `Status eksekusi: ${executionStatus.toUpperCase()}`,
          JSON.stringify(evidences || []),
        ]
      );
    } catch (dbErr) {}

    return newLog;
  }

  async updateTestCaseStatusWithBug(
    projectId: string,
    id: string,
    status: string,
    notes: string,
    userIdStr: string,
    createAuditLog: any
  ): Promise<{ statusValue: string; bugKey: string | null }> {
    const connection = await db.getConnection();
    try {
      const [tcRows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE id = ? AND projectId = ?",
        [id, projectId]
      );

      let createdBugKey = null;

      if (tcRows.length > 0) {
        const tc = tcRows[0];
        let userNameStr = "Tester";
        try {
          const [uRows]: any = await connection.query(
            "SELECT displayName, username FROM Users WHERE id = ? OR uid = ?",
            [userIdStr, userIdStr]
          );
          if (uRows && uRows.length > 0) {
            userNameStr = uRows[0].displayName || uRows[0].username || "Tester";
          }
        } catch (e) {}

        if (status.toLowerCase() === "failed" && !tc.linkedBugKey) {
          const [keyResult]: any = await connection.query(
            "SELECT taskKey FROM Tasks WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1",
            [projectId]
          );

          let nextKeyNum = 1;
          let projCode = "PRJ";
          if (keyResult.length > 0 && keyResult[0].taskKey) {
            const keyParts = keyResult[0].taskKey.split("-");
            if (keyParts.length > 1) {
              projCode = keyParts[0];
              nextKeyNum = parseInt(keyParts[1], 10) + 1;
            }
          } else {
            const [projRes]: any = await connection.query(
              "SELECT prefix FROM Projects WHERE id = ?",
              [projectId]
            );
            if (projRes.length > 0 && projRes[0].prefix) {
              projCode = projRes[0].prefix;
            }
          }
          const taskKey = `${projCode}-${nextKeyNum}`;
          const bugId = crypto.randomUUID();

          const tcTitle = tc.judul || tc.title || "Untitled Test Case";
          const tcDesc = tc.deskripsi || tc.description || "";
          const tcCaseId = tc.caseId || tc.id || "";

          await connection.query(
            `INSERT INTO Tasks (id, projectId, taskKey, title, description, status, priority, type, reporterId, projectRisk)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              bugId,
              projectId,
              taskKey,
              `Bug: ${tcTitle}`,
              `Bug otomatis dibuat dari QA Test Case [${tcCaseId}]: ${tcTitle}.\n\n**Deskripsi Test Case:**\n${tcDesc}`,
              "To Do",
              "High",
              "bug",
              userIdStr,
              "High",
            ]
          );

          createdBugKey = taskKey;

          await connection.query(
            "UPDATE QATestCases SET status = ?, linkedBugKey = ? WHERE id = ? AND projectId = ?",
            [status, createdBugKey, id, projectId]
          );

          try {
            await createAuditLog(userIdStr, projectId, "CREATE", "Tasks", bugId, null, {
              title: `Bug: ${tcTitle}`,
            });
          } catch (e) {}
        } else {
          await connection.query(
            "UPDATE QATestCases SET status = ? WHERE id = ? AND projectId = ?",
            [status, id, projectId]
          );
        }

        let evList = [];
        try {
          evList = typeof tc.evidences === "string" ? JSON.parse(tc.evidences) : tc.evidences || [];
        } catch (e) {}

        const activeLinkedKey = createdBugKey || tc.linkedBugKey || null;
        await this.recordExecutionRunLog(
          connection,
          projectId,
          id,
          status,
          activeLinkedKey,
          userIdStr,
          userNameStr,
          notes ||
            (createdBugKey
              ? `Status FAILED. Auto-generated Bug Issue #${createdBugKey}`
              : `Manual Status Update to ${status.toUpperCase()}`),
          evList
        );
      }

      return { statusValue: status, bugKey: createdBugKey };
    } finally {
      connection.release();
    }
  }

  async deleteTestCase(id: string, projectId: string): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query("DELETE FROM QATestCases WHERE id = ? AND projectId = ?", [
        id,
        projectId,
      ]);
    } finally {
      connection.release();
    }
  }

  async syncTestCases(projectId: string, testCases: any[]): Promise<void> {
    const connection = await db.getConnection();
    try {
      for (const tc of testCases) {
        const [existing]: any = await connection.query("SELECT id FROM QATestCases WHERE id = ?", [
          tc.id,
        ]);

        if (existing && existing.length > 0) {
          await connection.query(
            `UPDATE QATestCases SET
            judul = ?,
            deskripsi = ?,
            tipeTesting = ?,
            prioritas = ?,
            caseId = ?,
            expected = ?,
            status = ?,
            steps = ?,
            history = ?,
            activeTesterId = ?,
            activeTesterName = ?,
            lockedAt = ?,
            modulId = ?,
            suiteId = ?,
            rowNum = ?,
            comment = ?,
            evidenceUrl = ?,
            evidenceType = ?,
            evidenceName = ?,
            linkedBugKey = ?,
            commentsList = ?,
            evidences = ?
           WHERE id = ? AND projectId = ?`,
            [
              tc.judul || tc.title,
              tc.deskripsi || tc.comment || null,
              tc.tipeTesting || tc.phase || "SIT",
              tc.prioritas || tc.priority || "Medium",
              tc.caseId || null,
              tc.expected || tc.expectedResult || null,
              tc.status,
              JSON.stringify(tc.steps || []),
              JSON.stringify(tc.history || []),
              tc.activeTesterId || null,
              tc.activeTesterName || null,
              tc.lockedAt || null,
              tc.modulId || tc.suiteId || null,
              tc.suiteId || null,
              tc.rowNum || null,
              tc.comment || null,
              tc.evidenceUrl || null,
              tc.evidenceType || null,
              tc.evidenceName || null,
              tc.linkedBugKey || null,
              JSON.stringify(tc.commentsList || []),
              JSON.stringify(tc.evidences || []),
              tc.id,
              projectId,
            ]
          );
        } else {
          await connection.query(
            `INSERT INTO QATestCases (
            id, projectId, judul, deskripsi, tipeTesting, prioritas, caseId, expected, status, steps, history, createdAt, activeTesterId, activeTesterName, lockedAt, modulId,
            suiteId, rowNum, comment, evidenceUrl, evidenceType, evidenceName, linkedBugKey, commentsList, evidences
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tc.id,
              projectId,
              tc.judul || tc.title,
              tc.deskripsi || tc.comment || null,
              tc.tipeTesting || tc.phase || "SIT",
              tc.prioritas || tc.priority || "Medium",
              tc.caseId || null,
              tc.expected || tc.expectedResult || null,
              tc.status || "untested",
              JSON.stringify(tc.steps || []),
              JSON.stringify(tc.history || []),
              tc.createdAt || new Date().toISOString(),
              tc.activeTesterId || null,
              tc.activeTesterName || null,
              tc.lockedAt || null,
              tc.modulId || tc.suiteId || null,
              tc.suiteId || null,
              tc.rowNum || null,
              tc.comment || null,
              tc.evidenceUrl || null,
              tc.evidenceType || null,
              tc.evidenceName || null,
              tc.linkedBugKey || null,
              JSON.stringify(tc.commentsList || []),
              JSON.stringify(tc.evidences || []),
            ]
          );
        }
      }
    } finally {
      connection.release();
    }
  }

  async getAggregatedProjectContext(projectId: string): Promise<{
    meetingsList: any[];
    documentsList: any[];
    tasksList: any[];
  }> {
    const connection = await db.getConnection();
    try {
      const [meetingsPromise, documentsPromise, tasksPromise]: any = await Promise.all([
        connection.query("SELECT * FROM Meetings WHERE projectId = ? ORDER BY createdAt DESC", [
          projectId,
        ]),
        connection.query("SELECT * FROM Documents WHERE projectId = ? ORDER BY createdAt DESC", [
          projectId,
        ]),
        connection.query(
          "SELECT * FROM Tasks WHERE projectId = ? AND LOWER(status) NOT IN ('done', 'completed', 'closed') ORDER BY createdAt DESC",
          [projectId]
        ),
      ]);

      return {
        meetingsList: meetingsPromise[0] || [],
        documentsList: documentsPromise[0] || [],
        tasksList: tasksPromise[0] || [],
      };
    } finally {
      connection.release();
    }
  }

  async findLinkedTestCasesByBug(
    taskKey: string,
    taskId: string,
    projectId: string
  ): Promise<any[]> {
    const connection = await db.getConnection();
    try {
      const [rows]: any = await connection.query(
        "SELECT * FROM QATestCases WHERE (linkedBugKey = ? OR linkedBugKey = ?) AND projectId = ?",
        [taskKey, taskId, projectId]
      );
      return rows || [];
    } finally {
      connection.release();
    }
  }

  async transitionTestCaseToRetest(
    projectId: string,
    testCaseId: string,
    taskKey: string,
    userId: string,
    updaterName: string,
    statusText: string
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.query(
        "UPDATE QATestCases SET status = 'Retest' WHERE id = ? AND projectId = ?",
        [testCaseId, projectId]
      );
      const notes = `Automated Workflow: Linked Issue #${taskKey} was marked as [${statusText}] by ${updaterName}. Test case auto-transitioned to RETEST.`;
      await this.recordExecutionRunLog(
        connection,
        projectId,
        testCaseId,
        "RETEST",
        taskKey,
        userId,
        updaterName,
        notes,
        []
      );
    } finally {
      connection.release();
    }
  }
}

export const qaRepository = new QaRepository();
