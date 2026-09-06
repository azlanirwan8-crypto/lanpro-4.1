import {
  statusColumnKey,
  statusKeysForLookup,
  tasksForStatusLane,
  taskMatchesStatus,
  resolveStatusWriteValue,
} from "./statusKolom";

describe("statusKolom #382 / #459", () => {
  it("lebih suka code untuk kunci kolom", () => {
    expect(statusColumnKey({ code: "todo", label: "TO DO" })).toBe("todo");
    expect(statusColumnKey({ label: "TO DO" })).toBe("TO DO");
  });

  it("lookup mencakup code dan label warisan", () => {
    expect(statusKeysForLookup({ code: "todo", label: "TO DO" })).toEqual(["todo", "TO DO"]);
    expect(taskMatchesStatus("TO DO", { code: "todo", label: "TO DO" })).toBe(true);
    expect(taskMatchesStatus("todo", { code: "todo", label: "TO DO" })).toBe(true);
  });

  it("menggabungkan task dari kunci lane code+label", () => {
    const grouped = {
      "epic-1:todo": [{ id: "a" }],
      "epic-1:TO DO": [{ id: "b" }, { id: "a" }],
    };
    const tasks = tasksForStatusLane(grouped, "epic-1", { code: "todo", label: "TO DO" });
    expect(tasks.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("#459 lane lookup case-insensitive terhadap kunci grouped", () => {
    const grouped = {
      "standalone:TO DO": [{ id: "x" }],
      "standalone:In Progress": [{ id: "y" }],
    };
    expect(
      tasksForStatusLane(grouped, "standalone", { code: "todo", label: "To Do" }).map((t) => t.id)
    ).toEqual(["x"]);
    expect(
      tasksForStatusLane(grouped, "standalone", {
        code: "in_progress",
        label: "IN PROGRESS",
      }).map((t) => t.id)
    ).toEqual(["y"]);
  });

  it("resolve tulis code bila ada di master (case-insensitive)", () => {
    const master = [{ code: "todo", label: "To Do" }];
    expect(resolveStatusWriteValue("TO DO", master)).toBe("todo");
    expect(resolveStatusWriteValue("to do", master)).toBe("todo");
    expect(resolveStatusWriteValue("todo", master)).toBe("todo");
    expect(resolveStatusWriteValue("UNKNOWN", master)).toBe("UNKNOWN");
  });
});
