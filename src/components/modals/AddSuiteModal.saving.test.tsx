import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AddSuiteModal } from "./AddSuiteModal";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("../../hooks/useMasterOptions", () => ({ useMasterOptionItems: () => [] }));
jest.mock("../ui/CommonComponents", () => ({ StyledDropdown: () => null }));

it("keeps the draft open and rejects duplicate form submissions while saving", async () => {
  let finish!: () => void;
  const onSubmit = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const onClose = jest.fn();
  render(
    <AddSuiteModal
      isOpen
      onClose={onClose}
      suiteName="Example"
      onNameChange={jest.fn()}
      phase="SIT"
      onPhaseChange={jest.fn()}
      assignedTo=""
      onAssignedToChange={jest.fn()}
      onSubmit={onSubmit}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "addSuite.createDocument" }));
  const pending = screen.getByRole("button", { name: "common.saving" });
  expect(pending).toBeDisabled();
  fireEvent.submit((pending as HTMLButtonElement).form!);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(screen.getByRole("button", { name: "addSuite.createDocument" })).toBeEnabled();
});
