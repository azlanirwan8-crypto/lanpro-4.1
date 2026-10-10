import { isTaskParticipant } from "./task.service";

describe("isTaskParticipant (#675)", () => {
  const task = { reporterId: "creator-id", assigneeId: "assignee@example.com" };

  it("matches either the reporter or assignee against authenticated identifiers", () => {
    expect(isTaskParticipant(task, ["creator-id", "creator@example.com"])).toBe(true);
    expect(isTaskParticipant(task, ["assignee-id", "assignee@example.com"])).toBe(true);
  });

  it("rejects unrelated identities and empty identifiers", () => {
    expect(isTaskParticipant(task, ["other-user"])).toBe(false);
    expect(isTaskParticipant(task, [undefined, null, ""])).toBe(false);
  });

  it("rejects missing task ownership data", () => {
    expect(isTaskParticipant(null, ["creator-id"])).toBe(false);
    expect(isTaskParticipant({}, ["creator-id"])).toBe(false);
  });
});
