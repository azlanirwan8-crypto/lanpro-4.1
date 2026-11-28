import type { Request, Response } from "express";
import { analyzePrototype, prototypeAnalysisBody } from "./prototype-analysis.controller";
import { generateContentWithFallback } from "../services/ai.service";

jest.mock("@google/genai");
jest.mock("../services/ai.service");

const generate = jest.mocked(generateContentWithFallback);
const step = {
  number: 2,
  screen: "Form",
  action: "Submit",
  actual: "Done",
  expected: "Confirm",
  status: "Berbeda",
};

it("rejects duplicate step numbers before contacting AI", () => {
  expect(prototypeAnalysisBody.safeParse({ language: "en", steps: [step, step] }).success).toBe(
    false
  );
});

it("rejects AI advice that cites a step outside the submitted trace", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  try {
    generate.mockResolvedValue({
      text: JSON.stringify([
        { step: 999, explanation: "Explanation", correction: "Correction", retest: "Retest" },
      ]),
    });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await analyzePrototype(
      { body: { language: "en", steps: [step] } } as Request,
      res as unknown as Response,
      next
    );
    expect(res.status).toHaveBeenCalledWith(502);
    expect(next).not.toHaveBeenCalled();
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
