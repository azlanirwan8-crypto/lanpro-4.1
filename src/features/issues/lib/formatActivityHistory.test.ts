import {
  buatDetailAssignee,
  buatDetailFieldDiff,
  buatDetailStatusDiperbarui,
  formatActivityDetailsUntukTampilan,
  parseActivityUntukTampilan,
  parseFieldDiff,
  resolveLabelAssignee,
} from "./formatActivityHistory";

const anggota = [
  {
    uid: "4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3",
    displayName: "Rido Oktobriananta",
    email: "rido@example.com",
  },
  { uid: "u-rifky", username: "rifky", displayName: "Rifky" },
];

describe("formatActivityHistory #452 + #456", () => {
  it("resolveLabelAssignee: kosong → Unassigned; UUID → nama", () => {
    expect(resolveLabelAssignee(null, anggota)).toBe("Unassigned");
    expect(resolveLabelAssignee("", anggota)).toBe("Unassigned");
    expect(resolveLabelAssignee("4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3", anggota)).toBe(
      "Rido Oktobriananta"
    );
  });

  it("#456 buatDetailFieldDiff before/after", () => {
    expect(buatDetailFieldDiff("status", "To Do", "Done")).toBe("Status: To Do → Done");
    expect(
      buatDetailFieldDiff("assignee", null, "4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3", anggota)
    ).toBe("Assignee: Unassigned → Rido Oktobriananta");
    expect(buatDetailFieldDiff("priority", "Medium", "High")).toBe("Priority: Medium → High");
    expect(buatDetailFieldDiff("storyPoints", 3, 5)).toBe("Story points: 3 → 5");
    expect(buatDetailFieldDiff("status", "Done", "Done")).toBeNull();
  });

  it("buatDetail* kompatibilitas #452 + diff bila ada lama", () => {
    expect(buatDetailStatusDiperbarui("To Do")).toBe("Status updated to To Do");
    expect(buatDetailStatusDiperbarui("Done", "To Do")).toBe("Status: To Do → Done");
    expect(buatDetailAssignee("4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3", anggota)).toBe(
      "Assigned to Rido Oktobriananta"
    );
    expect(buatDetailAssignee("4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3", anggota, null)).toBe(
      "Assignee: Unassigned → Rido Oktobriananta"
    );
  });

  it("parseFieldDiff + parseActivityUntukTampilan", () => {
    expect(parseFieldDiff("Status: To Do → Done")).toEqual({
      kind: "diff",
      field: "status",
      label: "Status",
      from: "To Do",
      to: "Done",
    });
    const tampilan = parseActivityUntukTampilan(
      "Assignee: Unassigned → 4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3",
      anggota
    );
    expect(tampilan.kind).toBe("diff");
    if (tampilan.kind === "diff") {
      expect(tampilan.to).toBe("Rido Oktobriananta");
    }
  });

  it("formatActivityDetailsUntukTampilan membersihkan log lama", () => {
    expect(
      formatActivityDetailsUntukTampilan(
        "Task nH32BkZ5c9CpFovuSOzl status updated to To Do",
        anggota
      )
    ).toBe("Status updated to To Do");

    expect(
      formatActivityDetailsUntukTampilan(
        "Task nH32BkZ5c9CpFovuSOzl assigned to 4fdea5a6-fa07-4687-9b9d-1ec386e3c4d3",
        anggota
      )
    ).toBe("Assigned to Rido Oktobriananta");

    expect(
      formatActivityDetailsUntukTampilan("Task nH32BkZ5c9CpFovuSOzl assigned to ", anggota)
    ).toBe("Unassigned");

    expect(formatActivityDetailsUntukTampilan("Status: Open → Closed", anggota)).toBe(
      "Status: Open → Closed"
    );
  });
});
