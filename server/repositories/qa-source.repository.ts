import db from "../../src/lib/db";

const queries = {
  document: {
    table: "Documents",
    title: "title",
    filter: "AND coalesce(type, '') <> 'flowchart'",
    content: "left(description, 6000) AS description",
  },
  flowchart: {
    table: "Documents",
    title: "title",
    filter: "AND type = 'flowchart'",
    content:
      "left(description, 6000) AS description, CASE WHEN length(canvasData) <= 2000000 THEN canvasData END AS canvas",
  },
  meeting: {
    table: "Meetings",
    title: "title",
    filter: "",
    content: "left(description, 2000) AS description, left(aiSummary::text, 6000) AS summary",
  },
  issue: {
    table: "Tasks",
    title: "title",
    filter: "",
    content:
      "left(description, 3000) AS description, left(acceptanceCriteria::text, 4000) AS criteria, taskKey AS issue_key",
  },
} as const;

type QASourceKind = keyof typeof queries;
export const qaSourceKinds = ["document", "flowchart", "meeting", "issue"] as const;
type QASourceRef = { kind: QASourceKind; id: string };

export async function getQASourceRefs(projectId: string, suiteId: string) {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT "generationSources" FROM QATestSuites WHERE projectId = ? AND id = ?',
      [projectId, suiteId]
    );
    return (rows as Array<{ generationSources: QASourceRef[] }>)[0]?.generationSources ?? null;
  } finally {
    connection.release();
  }
}

export async function setQASourceRefs(projectId: string, suiteId: string, refs: QASourceRef[]) {
  const connection = await db.getConnection();
  try {
    await connection.query(
      'UPDATE QATestSuites SET "generationSources" = ? WHERE projectId = ? AND id = ?',
      [JSON.stringify(refs), projectId, suiteId]
    );
  } finally {
    connection.release();
  }
}

export async function readQAQuestions(projectId: string, suiteId: string) {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT "generationQuestions" FROM QATestSuites WHERE projectId = ? AND id = ?',
      [projectId, suiteId]
    );
    return Object.values(
      (rows as Array<{ generationQuestions: Record<string, unknown> }>)[0]?.generationQuestions ||
        {}
    );
  } finally {
    connection.release();
  }
}

export async function storeQAQuestions(
  projectId: string,
  suiteId: string,
  questions: Array<{ id: string }>
) {
  const connection = await db.getConnection();
  try {
    const entries = Object.fromEntries(questions.map((question) => [question.id, question]));
    await connection.query(
      'UPDATE QATestSuites SET "generationQuestions" = "generationQuestions" || CAST(? AS jsonb) WHERE projectId = ? AND id = ?',
      [JSON.stringify(entries), projectId, suiteId]
    );
  } finally {
    connection.release();
  }
}

type SourceRow = {
  id: string;
  title: string;
  description?: string | null;
  canvas?: string | null;
  summary?: string | null;
  criteria?: string | null;
  issue_key?: string | null;
};

export async function listQASources(projectId: string, search: string) {
  const connection = await db.getConnection();
  try {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const groups = await Promise.all(
      qaSourceKinds.map(async (kind) => {
        const { table, title, filter } = queries[kind];
        const [rows] = await connection.query(
          `SELECT id, ${title} AS title FROM ${table}
         WHERE projectId = ? ${filter} AND ${title} ILIKE ?
         ORDER BY ${title}, id LIMIT 30`,
          [projectId, pattern]
        );
        return (rows as SourceRow[]).map(({ id, title: label }) => ({ id, kind, label }));
      })
    );
    return groups.flat();
  } finally {
    connection.release();
  }
}

export async function loadQASources(projectId: string, refs: QASourceRef[], includeContent = true) {
  const connection = await db.getConnection();
  try {
    const groups = await Promise.all(
      qaSourceKinds.map(async (kind) => {
        const ids = refs.filter((ref) => ref.kind === kind).map(({ id }) => id);
        if (!ids.length) return [];
        const { table, title, filter, content } = queries[kind];
        const [rows] = await connection.query(
          `SELECT id, ${title} AS title${includeContent ? `, ${content}` : ""} FROM ${table}
         WHERE projectId = ? ${filter} AND id IN (${ids.map(() => "?").join(", ")})`,
          [projectId, ...ids]
        );
        return (rows as SourceRow[]).map((row) => ({ ...row, kind }));
      })
    );
    return groups.flat();
  } finally {
    connection.release();
  }
}

export async function loadQAGenerationSuite(projectId: string, suiteId: string) {
  const connection = await db.getConnection();
  try {
    const [suites] = await connection.query(
      "SELECT name, phase FROM QATestSuites WHERE projectId = ? AND id = ?",
      [projectId, suiteId]
    );
    const suite = (suites as Array<{ name: string; phase: string }>)[0];
    if (!suite) return null;
    const [cases] = await connection.query(
      `SELECT judul, left(steps::text, 400) AS steps, left(expected, 300) AS expected
       FROM QATestCases WHERE projectId = ? AND suiteId = ? ORDER BY id LIMIT 2000`,
      [projectId, suiteId]
    );
    return { ...suite, cases: cases as Array<{ judul: string; steps: string; expected: string }> };
  } finally {
    connection.release();
  }
}

export const normalizedQATitle = (title: string) =>
  title.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

export async function saveQAGeneratedCases(
  projectId: string,
  suiteId: string,
  drafts: Array<{ id: string; title: string; steps: string; expected: string; details: object }>
) {
  const connection = await db.getConnection();
  try {
    await connection.query("BEGIN");
    const [suites] = await connection.query(
      'SELECT phase, "generationQuestions" FROM QATestSuites WHERE projectId = ? AND id = ? FOR UPDATE',
      [projectId, suiteId]
    );
    const suite = (
      suites as Array<{ phase: string; generationQuestions?: Record<string, unknown> }>
    )[0];
    if (!suite) {
      await connection.query("ROLLBACK");
      return null;
    }
    const [cases] = await connection.query(
      "SELECT id, judul, rowNum FROM QATestCases WHERE projectId = ? AND suiteId = ?",
      [projectId, suiteId]
    );
    const existing = cases as Array<{ id: string; judul: string; rowNum: number | null }>;
    const ids = new Set(existing.map(({ id }) => id));
    const titles = new Set(existing.map(({ judul }) => normalizedQATitle(judul)));
    let rowNum = existing.reduce((max, row) => Math.max(max, row.rowNum || 0), 0);
    const results: Array<{ id: string; status: "saved" | "duplicate" }> = [];
    for (const draft of drafts) {
      const title = normalizedQATitle(draft.title);
      if (ids.has(draft.id) || titles.has(title)) {
        results.push({ id: draft.id, status: ids.has(draft.id) ? "saved" : "duplicate" });
        continue;
      }
      rowNum++;
      await connection.query(
        `INSERT INTO QATestCases
          (id, projectId, judul, tipeTesting, prioritas, expected, status, steps, createdAt, modulId, suiteId, rowNum, "generationDetails")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          draft.id,
          projectId,
          draft.title,
          suite.phase,
          "Medium",
          draft.expected,
          "untested",
          JSON.stringify(draft.steps),
          new Date().toISOString(),
          suiteId,
          suiteId,
          rowNum,
          JSON.stringify({
            ...draft.details,
            clarification: suite.generationQuestions?.[draft.id],
          }),
        ]
      );
      titles.add(title);
      ids.add(draft.id);
      results.push({ id: draft.id, status: "saved" });
    }
    const remaining = { ...suite.generationQuestions };
    const resolved = results.filter((row) => row.status === "saved" && remaining[row.id]);
    if (resolved.length) {
      for (const row of resolved) delete remaining[row.id];
      await connection.query(
        'UPDATE QATestSuites SET "generationQuestions" = ? WHERE projectId = ? AND id = ?',
        [JSON.stringify(remaining), projectId, suiteId]
      );
    }
    await connection.query("COMMIT");
    return results;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
