/**
 * #458 — axe CI sempit: auth (LoginScreen) + alur isu (IssueQuickCreateBar).
 *
 * color-contrast DINONAKTIFKAN di jsdom: computed style Tailwind/token tidak
 * andal di lingkungan test, dan brand auth dilindungi (§22 / #402) — jangan
 * ubah nilai token demi lulus axe. Aturan lain (label, name, dll.) tetap hidup.
 */
import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { LoginScreen } from "./auth/LoginScreen";
import { IssueQuickCreateBar } from "./issues/components/list/IssueQuickCreateBar";

expect.extend(toHaveNoViolations);

jest.mock("./auth/components/SsoButtons", () => ({
  SsoButtons: () => <div data-testid="sso-stub" />,
}));

jest.mock("./auth/components/ForgotPasswordModal", () => ({
  ForgotPasswordModal: () => null,
}));

jest.mock("./auth/components/ResetPasswordModal", () => ({
  ResetPasswordModal: () => null,
}));

const axeOptions = {
  rules: {
    "color-contrast": { enabled: false },
  },
};

describe("a11y #458", () => {
  it("LoginScreen: tanpa pelanggaran axe (kecuali color-contrast)", async () => {
    const { container } = render(
      <LoginScreen onLogin={jest.fn()} onRegisterClick={jest.fn()} loading={false} />
    );
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it("IssueQuickCreateBar: tanpa pelanggaran axe (kecuali color-contrast)", async () => {
    const { container } = render(
      <IssueQuickCreateBar
        quickCreateTitle=""
        setQuickCreateTitle={jest.fn()}
        createGlobalIssue={jest.fn(async () => {})}
        isCreating={false}
        inlineAddType="Task"
        setInlineAddType={jest.fn()}
        isInlineTypeOpen={null}
        setIsInlineTypeOpen={jest.fn()}
        inlineAddPriority="Medium"
        setInlineAddPriority={jest.fn()}
        inlineAddAssigneeId=""
        setInlineAddAssigneeId={jest.fn()}
        inlineAddSprintId=""
        setInlineAddSprintId={jest.fn()}
        masterData={[
          {
            id: "1",
            type: "issue_type",
            label: "Task",
            code: "task",
            color: "#405189",
            icon: "Zap",
          } as any,
        ]}
        projectMembers={[]}
        sprints={[]}
      />
    );
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });
});
