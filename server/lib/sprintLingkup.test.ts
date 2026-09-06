import { adalahSprintAktif, adalahLingkupTerkunci, cekPindahLingkupSprint } from "./sprintLingkup";

describe("sprintLingkup #461 #462", () => {
  it("mengenali status aktif termasuk alias", () => {
    expect(adalahSprintAktif("active")).toBe(true);
    expect(adalahSprintAktif("IN_PROGRESS")).toBe(true);
    expect(adalahSprintAktif("planned")).toBe(false);
    expect(adalahSprintAktif("completed")).toBe(false);
  });

  it("mengunci lingkup untuk aktif dan selesai", () => {
    expect(adalahLingkupTerkunci("active")).toBe(true);
    expect(adalahLingkupTerkunci("completed")).toBe(true);
    expect(adalahLingkupTerkunci("planned")).toBe(false);
  });

  it("menolak pindah keluar dari sprint aktif tanpa unlock", () => {
    const cek = cekPindahLingkupSprint({
      statusLama: "active",
      statusBaru: null,
      sprintIdLama: "s1",
      sprintIdBaru: null,
    });
    expect(cek.ok).toBe(false);
    if (!cek.ok) expect(cek.code).toBe("srv.sprint_lingkup_terkunci");
  });

  it("menolak tambah ke sprint aktif", () => {
    const cek = cekPindahLingkupSprint({
      statusLama: null,
      statusBaru: "active",
      sprintIdLama: null,
      sprintIdBaru: "s1",
    });
    expect(cek.ok).toBe(false);
    if (!cek.ok) expect(cek.code).toBe("srv.sprint_lingkup_terkunci_tujuan");
  });

  it("mengizinkan unlockScope (tutup sprint)", () => {
    const cek = cekPindahLingkupSprint({
      statusLama: "active",
      statusBaru: null,
      sprintIdLama: "s1",
      sprintIdBaru: null,
      unlockScope: true,
    });
    expect(cek.ok).toBe(true);
  });

  it("mengizinkan pindah antar planned / backlog", () => {
    const cek = cekPindahLingkupSprint({
      statusLama: "planned",
      statusBaru: "planned",
      sprintIdLama: "s1",
      sprintIdBaru: "s2",
    });
    expect(cek.ok).toBe(true);
  });
});
