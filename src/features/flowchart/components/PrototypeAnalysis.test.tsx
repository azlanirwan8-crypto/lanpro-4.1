import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "../../../i18n";
import type { PrototypeStep } from "../lib/imagePrototype";
import { requestPrototypeAnalysis } from "../services/flowchart.service";
import { PrototypeAnalysis } from "./PrototypeAnalysis";

jest.mock("../services/flowchart.service");
const request = jest.mocked(requestPrototypeAnalysis);
const matched: PrototypeStep = {
  screen: "Start",
  action: "Open",
  actual: "Form",
  expected: "Form",
  status: "Sesuai",
};
const wrong: PrototypeStep = {
  screen: "Form",
  action: "Submit",
  actual: "Done",
  expected: "Confirm",
  status: "Berbeda",
};

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage("en");
});

it("sends mismatched steps with their original numbers and displays the correction and retest", async () => {
  request.mockResolvedValue([
    {
      step: 2,
      explanation: "Skipped confirmation",
      correction: "Link to Confirm",
      retest: "Submit again",
    },
  ]);
  render(<PrototypeAnalysis projectId="p" steps={[matched, wrong]} />);
  fireEvent.click(screen.getByRole("button", { name: "Analyze with AI" }));
  expect(request).toHaveBeenCalledWith(
    "p",
    "en",
    [{ ...wrong, number: 2 }],
    expect.any(AbortSignal)
  );
  expect(await screen.findByText("Step 2")).toBeVisible();
  expect(screen.getByText("Link to Confirm")).toBeVisible();
  expect(screen.getByText("Submit again")).toBeVisible();
});

it("keeps the report usable and offers retry when analysis fails", async () => {
  request.mockRejectedValue(new Error("Unavailable"));
  render(<PrototypeAnalysis projectId="p" steps={[wrong]} />);
  const button = screen.getByRole("button", { name: "Analyze with AI" });
  fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent("Try again");
  expect(button).toBeEnabled();
});
