import { metrikSprintHybrid, bobotTugasBurndown } from "./metrikSprint";

describe("metrikSprint #464", () => {
  it("memakai poin bila totalPoints > 0", () => {
    const m = metrikSprintHybrid([
      { storyPoints: 3, done: true },
      { storyPoints: 2, done: false },
      { storyPoints: 0, done: false },
    ]);
    expect(m.satuan).toBe("points");
    expect(m.total).toBe(5);
    expect(m.done).toBe(3);
    expect(m.remaining).toBe(2);
    expect(m.progressPct).toBe(60);
  });

  it("jatuh ke hitungan tugas bila semua tanpa poin", () => {
    const m = metrikSprintHybrid([
      { storyPoints: null, done: true },
      { storyPoints: 0, done: false },
    ]);
    expect(m.satuan).toBe("tasks");
    expect(m.total).toBe(2);
    expect(m.done).toBe(1);
    expect(m.remaining).toBe(1);
    expect(m.progressPct).toBe(50);
  });

  it("bobot burndown mengikuti satuan", () => {
    expect(bobotTugasBurndown({ storyPoints: 5 }, "points")).toBe(5);
    expect(bobotTugasBurndown({ storyPoints: 5 }, "tasks")).toBe(1);
  });
});
