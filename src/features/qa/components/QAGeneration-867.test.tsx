import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { apiRequest } from "../../../lib/api";
import type { QATestSuite } from "../types";
import { QAGeneration } from "./QAGeneration";

jest.mock("../../../lib/api", () => ({ apiRequest: jest.fn() }));

const suite: QATestSuite = {
  id: "s1",
  projectId: "p1",
  name: "Self Onboarding",
  phase: "UAT",
  uploadedAt: "2026-11-19",
  uploadedBy: "QA",
  cases: [],
};
const source = { id: "d1", kind: "document", label: "BRD Onboarding" };
const draft = {
  title: "Kirim tanpa email",
  kind: "negative",
  preconditions: "",
  testData: "",
  steps: ["Kosongkan email", "Kirim"],
  expected: "Validasi tampil",
  sources: [source],
};

it("shows generated drafts before saving only actionable choices to the active suite", async () => {
  const register = createRef<(() => void) | null>();
  const onSaved = jest.fn().mockResolvedValue(undefined);
  jest.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (url.endsWith("/selected-sources")) return { data: [source], missing: 0 };
    if (url.endsWith("/generate-drafts")) {
      return { data: [draft, { ...draft, kind: "clarify", title: "Periksa aturan duplikasi" }] };
    }
    if (url.endsWith("/save-drafts")) {
      const body = options?.body as { drafts: Array<{ id: string }> };
      expect(body.drafts).toEqual([expect.objectContaining({ title: draft.title })]);
      return { data: [{ id: body.drafts[0].id, status: "saved" }] };
    }
    throw new Error("Unexpected request");
  });
  render(<QAGeneration suite={suite} register={register} onSaved={onSaved} />);
  act(() => register.current?.());
  expect(await screen.findByText("Negatif · Kirim tanpa email")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /Perlu konfirmasi/ })).toBeDisabled();
  expect(onSaved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Simpan 1 test case ke UAT" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(screen.getByText(/Perlu konfirmasi · Periksa aturan/)).toBeInTheDocument();
  expect(apiRequest).toHaveBeenLastCalledWith(
    "/api/projects/p1/qa-test-suites/s1/save-drafts",
    expect.any(Object)
  );
});
