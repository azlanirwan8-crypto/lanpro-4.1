import type { RequestHandler } from "express";
import db from "../../src/lib/db";
import type { IssueReference } from "../../src/types/issueReference";

export const meetingIssueReferences: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const [data] = await db.query(
      `SELECT 'meeting' AS kind, p.id, LEFT(COALESCE(NULLIF(p.concern, ''), p.content), 500) AS title,
              m.id AS "meetingId", m.title AS "meetingTitle", p."createdAt" AS date
         FROM "DiscussionPoints" p JOIN "Meetings" m ON m.id = p."meetingId"
        WHERE m."projectId" = ? AND p.tags @> CAST(? AS jsonb)
          AND EXISTS (SELECT 1 FROM "Tasks" t WHERE t.id = ? AND t."projectId" = m."projectId")
        ORDER BY p."createdAt" DESC NULLS LAST, p.id`,
      [projectId, JSON.stringify([{ id: taskId }]), taskId]
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export function flowchartIssueReferencesFromRows(
  rows: Array<{ id: string; title: string; date: string | null; payload: string }>,
  taskId: string
): IssueReference[] {
  return rows.flatMap(({ id, title, date, payload }) => {
    let canvas;
    try {
      canvas = JSON.parse(payload);
    } catch {
      return [];
    }
    if (!Array.isArray(canvas?.nodes)) return [];
    const base = { kind: "flowchart" as const, id, title, date };
    const matches: IssueReference[] = canvas.epicTaskId === taskId ? [base] : [];
    for (const node of canvas.nodes) {
      if (node?.taskId === taskId && typeof node.id === "string") {
        matches.push({
          ...base,
          nodeId: node.id,
          title: typeof node.label === "string" && node.label ? `${title} · ${node.label}` : title,
        });
      }
    }
    return matches;
  });
}

export const flowchartIssueReferences: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const [rows] = await db.query(
      `SELECT d.id, d.title, d."updatedAt" AS date,
              COALESCE(NULLIF(d."canvasData", ''), d.description) AS payload
         FROM "Documents" d
        WHERE d."projectId" = ? AND d.type = 'flowchart'
          AND strpos(COALESCE(NULLIF(d."canvasData", ''), d.description), ?) > 0
          AND EXISTS (SELECT 1 FROM "Tasks" t WHERE t.id = ? AND t."projectId" = d."projectId")
        ORDER BY d."updatedAt" DESC NULLS LAST, d.id`,
      [projectId, taskId, taskId]
    );
    res.json({ data: flowchartIssueReferencesFromRows(rows, taskId) });
  } catch (error) {
    next(error);
  }
};

export const readReferencePoint: RequestHandler = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p."meetingId", p.concern, p.keterangan, p."tindakanLanjut", p."targetDate"
         FROM "DiscussionPoints" p WHERE p.id = ?`,
      [req.params.pointId]
    );
    if (!rows[0]) {
      res.sendStatus(404);
      return;
    }
    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const readReferenceFlowchart: RequestHandler = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, type, link, "canvasData", category, "createdBy",
              "createdByName", "createdAt", "updatedAt"
         FROM "Documents" WHERE id = ? AND "projectId" = ? AND type = 'flowchart'`,
      [req.params.id, req.params.projectId]
    );
    if (!rows[0]) {
      res.sendStatus(404);
      return;
    }
    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
};
