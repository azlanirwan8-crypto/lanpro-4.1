/**
 * #604 — urutan tipe.
 *
 * Pemilik proyek 03 Okt: "kita harus pastikan urutannya agar tidak bingung ...
 * kalau task nya epic, dan tambah sub, harusnya epic nya tidak ada lagi ...
 * mana ada epic sub nya task terus sub nya lagi epic". Sebelum berkas ini tidak
 * ada SATU pun aturan: kedua pemilih tipe menampilkan semua label Master Data,
 * jadi Epic bisa lahir di bawah Task dan Sub-task bisa berdiri tanpa induk.
 *
 * Label di bawah memakai label Master Data asli proyek ini (Epic, Story, Task,
 * Bug, Sub-task) supaya yang diuji adalah data pemilik, bukan terkaan.
 */
import { kunciTipe, tipeBoleDitawarkan, tipeBawaan, tipeLegal } from "./hierarkiTipe";

const SEMUA = ["Epic", "Story", "Task", "Bug", "Sub-task"];

describe("tipeBoleDitawarkan (#604)", () => {
  it("di puncak: Epic/Story/Task/Bug, tanpa Sub-task", () => {
    expect(tipeBoleDitawarkan(null, SEMUA)).toEqual(["Epic", "Story", "Task", "Bug"]);
    expect(tipeBoleDitawarkan("", SEMUA)).toEqual(["Epic", "Story", "Task", "Bug"]);
  });

  it("anak Epic: boleh Story/Task/Bug/Sub-task, TIDAK boleh Epic lagi", () => {
    expect(tipeBoleDitawarkan("Epic", SEMUA)).toEqual(["Story", "Task", "Bug", "Sub-task"]);
  });

  it("anak Task atau Bug: hanya Sub-task", () => {
    expect(tipeBoleDitawarkan("Task", SEMUA)).toEqual(["Sub-task"]);
    expect(tipeBoleDitawarkan("Bug", SEMUA)).toEqual(["Sub-task"]);
  });

  it("anak Sub-task: tetap Sub-task (rantai panjang diperbolehkan)", () => {
    expect(tipeBoleDitawarkan("Sub-task", SEMUA)).toEqual(["Sub-task"]);
  });

  it("induk yang tidak dikenal tidak mengunci pengguna, tapi Epic tetap tidak disodorkan", () =>
    expect(tipeBoleDitawarkan("Pentung", SEMUA)).toEqual(["Story", "Task", "Bug", "Sub-task"]));

  it("urutan mengikuti Master Data, bukan urutan aturan internal", () => {
    expect(tipeBoleDitawarkan("Epic", ["Sub-task", "Bug", "Task", "Story", "Epic"])).toEqual([
      "Sub-task",
      "Bug",
      "Task",
      "Story",
    ]);
  });

  it("label casing/strip berbeda tetap satu kunci", () => {
    expect(kunciTipe("Sub-task")).toBe(kunciTipe("Sub Task"));
    expect(kunciTipe("EPIC")).toBe("epic");
    expect(tipeBoleDitawarkan("epic", ["Subtask", "Epic", "Task"])).toEqual(["Subtask", "Task"]);
  });
});

describe("tipeBawaan (#604)", () => {
  it("puncak = Epic, anak Epic = Story, anak Task = Sub-task", () => {
    expect(tipeBawaan(null, SEMUA)).toBe("Epic");
    expect(tipeBawaan("Epic", SEMUA)).toBe("Story");
    expect(tipeBawaan("Story", SEMUA)).toBe("Task");
    expect(tipeBawaan("Task", SEMUA)).toBe("Sub-task");
  });

  it("Master Data kosong tidak mengarang tipe", () => {
    expect(tipeBawaan(null, [])).toBeNull();
    expect(tipeBawaan("Epic", [])).toBeNull();
  });

  it("tipeLegal menjawab pertanyaan yang sama dengan daftar", () => {
    expect(tipeLegal("Epic", "Task", SEMUA)).toBe(false);
    expect(tipeLegal("Sub-task", "Task", SEMUA)).toBe(true);
    expect(tipeLegal(null, "Task", SEMUA)).toBe(false);
  });
});
