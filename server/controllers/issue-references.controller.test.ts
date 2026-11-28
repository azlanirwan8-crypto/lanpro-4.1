import { flowchartIssueReferencesFromRows } from "./issue-references.controller";

jest.mock("../../src/lib/db", () => ({ __esModule: true, default: { query: jest.fn() } }));

it("uses exact issue IDs on boards and nodes and skips invalid legacy payloads", () => {
  const title = "Login";
  const date = null;
  const payload = JSON.stringify({
    epicTaskId: "issue-1",
    nodes: [
      { id: "correct", taskId: "issue-1", label: "Verify" },
      { id: "other", taskId: "issue-12", label: "Other" },
      { id: "plain-text", label: "issue-1" },
    ],
  });
  expect(
    flowchartIssueReferencesFromRows(
      [
        { id: "board", title, date, payload },
        { id: "invalid", title, date, payload: "legacy text" },
      ],
      "issue-1"
    )
  ).toEqual([
    { kind: "flowchart", id: "board", title, date },
    { kind: "flowchart", id: "board", nodeId: "correct", title: "Login · Verify", date },
  ]);
});
