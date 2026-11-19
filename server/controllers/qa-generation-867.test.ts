import express from "express";
import request from "supertest";
import { generateContentWithFallback } from "../services/ai.service";
import {
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
}));

const app = express();
app.use(express.json());
app.post("/:projectId/:suiteId/generate", validasiBody(qaGenerationRequest), generateQASuiteDrafts);
app.post("/:projectId/:suiteId/save", validasiBody(qaSaveDraftRequest), saveQASuiteDrafts);

const source = { id: "doc-1", kind: "document" as const };
const draft = {
  title: "Email kosong",
  kind: "negative",
  preconditions: "",
  testData: "",
  steps: ["Kirim tanpa email"],
  expected: "Validasi tampil",
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
    text: JSON.stringify([draft, draft, { ...draft, title: "Invalid", refs: [10] }]),
  });
  const res = await request(app)
    .post("/p1/s1/generate")
    .send({ sources: [source] });
  expect(res.status).toBe(200);
  expect(loadQAGenerationSuite).toHaveBeenCalledWith("p1", "s1");
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0]).toMatchObject({
    title: draft.title,
    sources: [{ ...source, label: "BRD" }],
  });
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
