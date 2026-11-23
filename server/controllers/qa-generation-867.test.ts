import { errorHandler } from "../middleware/errorHandler";
import express from "express";
import request from "supertest";
import { generateContentWithFallback } from "../services/ai.service";
import {
  storeQAQuestions,
  loadQAGenerationSuite,
  loadQASources,
  saveQAGeneratedCases,
} from "../repositories/qa-source.repository";
import { validasiBody } from "../middleware/validate";
import {
  generateQASuiteDrafts,
  qaGenerationRequest,
  qaSaveDraftRequest,
  saveQASuiteDrafts,
} from "./qa-generation.controller";

jest.mock("../services/ai.service");
jest.mock("../repositories/qa-source.repository", () => ({
  qaSourceKinds: ["document", "flowchart", "meeting", "issue"],
  loadQAGenerationSuite: jest.fn(),
  loadQASources: jest.fn(),
  saveQAGeneratedCases: jest.fn(),
  normalizedQATitle: (title: string) => title.trim().toLowerCase(),
  setQASourceRefs: jest.fn(),
  storeQAQuestions: jest.fn(),
}));

const app = express();
app.use(express.json());
app.post("/:projectId/:suiteId/generate", validasiBody(qaGenerationRequest), generateQASuiteDrafts);
app.post("/:projectId/:suiteId/save", validasiBody(qaSaveDraftRequest), saveQASuiteDrafts);

app.use(errorHandler);

const source = { id: "doc-1", kind: "document" as const };
const draft = {
  title: "Email kosong",
  kind: "negative",
  preconditions: "",
  testData: "",
  steps: ["Kirim tanpa email"],
  expected: "Validasi tampil",
  rule: "Email wajib",
  quotes: ["Email wajib"],
  refs: [0],
};
const geminiKey = process.env.GEMINI_API_KEY;
beforeEach(() => {
  process.env.GEMINI_API_KEY = "unit-test";
  jest.mocked(loadQAGenerationSuite).mockResolvedValue({
    name: "Onboarding",
    phase: "UAT",
    cases: [],
  });
  jest
    .mocked(loadQASources)
    .mockResolvedValue([{ ...source, title: "BRD", description: "Email wajib" }]);
});
afterEach(() => {
  if (geminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = geminiKey;
});

it("rejects unavailable project references before invoking Gemini", async () => {
  jest.mocked(loadQASources).mockResolvedValue([]);
  const res = await request(app)
    .post("/p1/s1/generate")
    .send({ sources: [source] });
  expect(res.status).toBe(422);
  expect(loadQASources).toHaveBeenCalledWith("p1", [source]);
  expect(generateContentWithFallback).not.toHaveBeenCalled();
});

it("keeps only grounded, unique drafts and resolves source labels on the server", async () => {
  jest.mocked(generateContentWithFallback).mockResolvedValue({
    text: JSON.stringify([
      draft,
      draft,
      { title: "incomplete" },
      { ...draft, title: "Invalid", refs: [10] },
    ]),
  });
  const res = await request(app)
    .post("/p1/s1/generate")
    .send({ sources: [source] });
  expect(res.status).toBe(200);
  expect(loadQAGenerationSuite).toHaveBeenCalledWith("p1", "s1");
  expect(res.body.skipped).toBe(2);
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0]).toMatchObject({
    title: draft.title,
    sources: [{ ...source, label: "BRD" }],
  });
});

it("keeps a conflicting threshold open with both verified excerpts", async () => {
  const meeting = { id: "m1", kind: "meeting" as const };
  const quotes = ["Di atas Rp10 juta perlu supervisor", "Mulai Rp10 juta perlu supervisor"];
  jest.mocked(loadQASources).mockResolvedValue([
    { ...source, title: "BRD", description: quotes[0] },
    { ...meeting, title: "UAT", summary: quotes[1] },
  ]);
  const conflict = {
    ...draft,
    kind: "clarify",
    title: "Tepat Rp10 juta",
    steps: [],
    expected: "Apakah perlu supervisor?",
    refs: [0, 1],
    quotes,
  };
  jest.mocked(generateContentWithFallback).mockResolvedValue({
    text: JSON.stringify([
      conflict,
      {
        ...conflict,
        kind: "positive",
        steps: ["Kirim Rp10.000.001"],
        title: "Rp10.000.001",
        expected: "Perlu supervisor",
      },
      { ...draft, title: "Kutipan palsu", quotes: ["always approved"] },
    ]),
  });
  const res = await request(app)
    .post("/p1/s1/generate")
    .send({ sources: [source, meeting] })
    .expect(200);
  expect(res.body.data).toHaveLength(2);
  expect(res.body.data[1].kind).toBe("positive");
  expect(res.body.data[0].sources.map((s: { quote: string }) => s.quote)).toEqual(quotes);
  expect(storeQAQuestions).toHaveBeenCalledWith("p1", "s1", [res.body.data[0]]);
});

it.each<[string, string, number, string]>([
  ["invalid JSON", "{}", 502, "qaDraft.format"],
  ["unusable draft", "[{}]", 422, "qaDraft.invalid"],
])("reports %s separately", async (_label, text, status, code) => {
  jest.mocked(generateContentWithFallback).mockResolvedValue({ text });
  const res = await request(app)
    .post("/p1/s1/generate")
    .send({ sources: [source] });
  expect(res.status).toBe(status);
  expect(res.body.code).toBe(code);
});

it("distinguishes provider failures from clarification storage failures", async () => {
  jest.mocked(generateContentWithFallback).mockRejectedValueOnce(new Error("provider unavailable"));
  const generate = () =>
    request(app)
      .post("/p1/s1/generate")
      .send({ sources: [source] });
  const provider = await generate().expect(502);
  expect(provider.body.code).toBe("qaDraft.provider");
  jest.mocked(generateContentWithFallback).mockResolvedValueOnce({
    text: JSON.stringify([{ ...draft, kind: "clarify", steps: [] }]),
  });
  jest.mocked(storeQAQuestions).mockRejectedValueOnce(new Error("database unavailable"));
  const storage = await generate().expect(500);
  expect(storage.body.code).toBe("qaDraft.questions");
});

it("rejects clarification drafts and saves selected executable drafts to the URL suite", async () => {
  const id = "aae405d0-bd51-4bf6-bc3a-085da6808fdb";
  const requestDraft = { ...draft, id, sources: [source] };
  await request(app)
    .post("/p1/s1/save")
    .send({ drafts: [{ ...requestDraft, kind: "clarify" }] })
    .expect(400);
  expect(saveQAGeneratedCases).not.toHaveBeenCalled();
  jest.mocked(saveQAGeneratedCases).mockResolvedValue([{ id, status: "saved" }]);
  await request(app)
    .post("/p1/s1/save")
    .send({ drafts: [requestDraft] })
    .expect(200);
  expect(saveQAGeneratedCases).toHaveBeenCalledWith("p1", "s1", [
    expect.objectContaining({
      id,
      title: draft.title,
      details: expect.objectContaining({ sources: [{ ...source, label: "BRD" }] }),
    }),
  ]);
});
