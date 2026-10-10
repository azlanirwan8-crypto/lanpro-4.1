/**
 * #688 — kunci "task ini milik saya".
 *
 * Test ini mengunci keputusan pemilik proyek 10 Okt: assignee SAJA, termasuk
 * multi-assignee; reporter TIDAK ikut (itu milik #563); dan label tampilan tidak
 * pernah jadi kunci.
 */

import { adalahTugasMilikSaya, saringMenurutLingkup, kunciAssigneeOrang } from "./tugasSaya";

const ORANG = { uid: "uid-1", id: "id-1", email: "Rina@Contoh.test" };

describe("kunciAssigneeOrang (#688)", () => {
  it("memakai uid lalu id, dan email dalam huruf kecil", () => {
    expect(kunciAssigneeOrang(ORANG)).toEqual({
      id: ["uid-1", "id-1"],
      email: "rina@contoh.test",
    });
  });

  it("mengembalikan kunci kosong saat tidak ada user login", () => {
    expect(kunciAssigneeOrang(null)).toEqual({ id: [], email: null });
    expect(kunciAssigneeOrang({ uid: "  ", id: "", email: undefined })).toEqual({
      id: [],
      email: null,
    });
  });
});

describe("adalahTugasMilikSaya (#688)", () => {
  it("mengenali assignee lewat uid maupun id", () => {
    expect(adalahTugasMilikSaya({ assigneeId: "uid-1" } as any, ORANG)).toBe(true);
    expect(adalahTugasMilikSaya({ assigneeId: "id-1" } as any, ORANG)).toBe(true);
  });

  it("mengenali penulisan lama yang menyimpan email di assigneeId", () => {
    // `taskService.ts:11-21` memilih assigneeId ATAU assigneeEmail berdasar "@".
    expect(adalahTugasMilikSaya({ assigneeId: "rina@contoh.test" } as any, ORANG)).toBe(true);
  });

  it("mengenali assigneeEmail, dan tidak peduli besar-kecilnya", () => {
    expect(adalahTugasMilikSaya({ assigneeEmail: "rina@contoh.test" } as any, ORANG)).toBe(true);
    expect(adalahTugasMilikSaya({ assigneeEmail: "RINA@CONTOH.TEST" } as any, ORANG)).toBe(true);
  });

  it("mengenali multi-assignee lewat kolom assignees", () => {
    expect(
      adalahTugasMilikSaya(
        { assigneeId: "orang-lain", assignees: ["orang-lain", "uid-1"] } as any,
        ORANG
      )
    ).toBe(true);
    expect(adalahTugasMilikSaya({ assignees: ["rina@contoh.test"] } as any, ORANG)).toBe(true);
  });

  it("TIDAK menganggap task milik saya hanya karena saya reporternya", () => {
    // Ini pembeda dari #563 (`tenggat-saya`), dan keputusan pemilik proyek.
    expect(
      adalahTugasMilikSaya({ reporterId: "uid-1", assigneeId: "orang-lain" } as any, ORANG)
    ).toBe(false);
  });

  it("TIDAK memakai label tampilan sebagai kunci", () => {
    // Nama boleh sama, tapi itu bukan identitas.
    const task = { assignee: "Rina Contoh", assigneeName: "Rina Contoh" } as any;
    expect(adalahTugasMilikSaya(task, ORANG)).toBe(false);
  });

  it("tidak crash dan menolak saat assignee kosong atau task tidak ada", () => {
    expect(adalahTugasMilikSaya({} as any, ORANG)).toBe(false);
    expect(adalahTugasMilikSaya(null, ORANG)).toBe(false);
    expect(adalahTugasMilikSaya(undefined, ORANG)).toBe(false);
    expect(adalahTugasMilikSaya({ assigneeId: null, assignees: null } as any, ORANG)).toBe(false);
  });

  it("menolak semua task ketika user login belum jelas, tanpa melempar", () => {
    // Mode "mine" tidak boleh diam-diam menjadi "semua task".
    expect(adalahTugasMilikSaya({ assigneeId: "uid-1" } as any, null)).toBe(false);
    expect(adalahTugasMilikSaya({ assigneeId: "uid-1" } as any, {})).toBe(false);
  });
});

describe("saringMenurutLingkup (#688)", () => {
  const tugas = [
    { id: "a", assigneeId: "uid-1" },
    { id: "b", assigneeEmail: "rina@contoh.test" },
    { id: "c", assignees: ["uid-1"] },
    { id: "d", reporterId: "uid-1", assigneeId: "orang-lain" },
    { id: "e" },
  ] as any[];

  it("default all mengembalikan semuanya apa adanya", () => {
    expect(saringMenurutLingkup(tugas, ORANG, "all").map((t: any) => t.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("mine hanya mengembalikan assignee: a, b, c", () => {
    expect(saringMenurutLingkup(tugas, ORANG, "mine").map((t: any) => t.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("mine tanpa user login menghasilkan daftar kosong, bukan seluruh isi", () => {
    expect(saringMenurutLingkup(tugas, null, "mine")).toEqual([]);
  });

  it("tahan terhadap tasks null dan anggota array yang null", () => {
    expect(saringMenurutLingkup(null, ORANG, "mine")).toEqual([]);
    expect(
      saringMenurutLingkup([null, { id: "a", assigneeId: "uid-1" }] as any, ORANG, "all").length
    ).toBe(2);
  });
});
