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
import { tipeBoleDitawarkan, tipeBawaan, tipeLegal } from "./hierarkiTipe";
import { kunciTipe, petaTingkat, tingkatDariDeskripsi, tingkatTipe } from "../../lib/tingkatIsu";

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

/**
 * #724 — level yang dipilih di layar Master Data jadi sumber kebenaran.
 *
 * Pemilik proyek: "saya buat bug, terus ada sub bug, tapi di issue type kenapa
 * sub bug tidak ada ya". Sebelum blok ini, `tipeBoleDitawarkan` tanpa argumen
 * `tingkat` hanya mengenali lima kunci tetap — `kunciTipe("Sub Bug")` =
 * `subbug` tidak ada di daftar siapa pun, jadi jenis itu dibuang DIAM-DIAM
 * meskipun pemiliknya sudah memilih *Hierarchy level: Subtask*.
 *
 * "Sub Bug" dan catatan di bawahnya adalah data asli dari layar Master Data
 * proyek ini, bukan contoh karangan.
 */
describe("tipeBoleDitawarkan dengan level Master Data (#724)", () => {
  const SUB_BUG = "Hierarchy: Subtask";
  const baris = [
    { label: "Epic" },
    { label: "Story" },
    { label: "Task" },
    { label: "Bug", description: "Cacat pada fungsi yang sudah berjalan." },
    { label: "Sub-task" },
    { label: "Sub Bug", description: SUB_BUG },
  ];
  const SEMUA_LABEL = baris.map((b) => b.label);
  const peta = petaTingkat(baris);

  it("jenis buatan pengguna berlevel Subtask AKHIRNYA ditawarkan di bawah induk", () => {
    expect(tipeBoleDitawarkan("Bug", SEMUA_LABEL, peta)).toContain("Sub Bug");
    expect(tipeBoleDitawarkan("Task", SEMUA_LABEL, peta)).toContain("Sub Bug");
    expect(tipeBoleDitawarkan("Epic", SEMUA_LABEL, peta)).toContain("Sub Bug");
    expect(tipeLegal("Sub Bug", "Bug", SEMUA_LABEL, peta)).toBe(true);
  });

  it("tapi tetap tidak boleh berdiri tanpa induk di baris puncak", () => {
    expect(tipeBoleDitawarkan(null, SEMUA_LABEL, peta)).not.toContain("Sub Bug");
    expect(tipeBoleDitawarkan(null, SEMUA_LABEL, peta)).not.toContain("Sub-task");
  });

  it("lima jenis bawaan tidak berubah jawabannya hanya karena peta diberikan", () => {
    expect(tipeBoleDitawarkan(null, SEMUA_LABEL, peta)).toEqual(["Epic", "Story", "Task", "Bug"]);
    expect(tipeBoleDitawarkan("Epic", SEMUA_LABEL, peta)).toEqual([
      "Story",
      "Task",
      "Bug",
      "Sub-task",
      "Sub Bug",
    ]);
    expect(tipeBoleDitawarkan("Task", SEMUA_LABEL, peta)).toEqual(["Sub-task", "Sub Bug"]);
  });

  it("catatan manusia BUKAN konfigurasi: kalimat bebas tidak dibaca sebagai level", () => {
    expect(tingkatDariDeskripsi("Cacat pada fungsi yang sudah berjalan.")).toBeNull();
    // "Bug" jatuh ke cuplikan nama, bukan ke tebakan dari kalimatnya.
    expect(tingkatTipe("Bug", "Cacat pada fungsi yang sudah berjalan.")).toBe("Standard");
  });

  it("ejaan yang terbaca di layar pemilik ('Hierarhy') tetap satu arti", () => {
    expect(tingkatDariDeskripsi("Hierarhy: Subtask")).toBe("Subtask");
    const salahEja = petaTingkat([{ label: "Sub Bug", description: "Hierarhy: subtask" }]);
    expect(tipeBoleDitawarkan("Bug", ["Bug", "Sub Bug"], salahEja)).toEqual(["Sub Bug"]);
  });

  it("jenis buatan pengguna tanpa level tidak hilang: dianggap setingkat induk", () => {
    const tanpaLevel = petaTingkat([{ label: "Epic" }, { label: "Feature" }, { label: "Bug" }]);
    expect(tipeBoleDitawarkan("Epic", ["Epic", "Feature", "Bug"], tanpaLevel)).toEqual([
      "Feature",
      "Bug",
    ]);
    expect(tipeBoleDitawarkan(null, ["Epic", "Feature", "Bug"], tanpaLevel)).toEqual([
      "Epic",
      "Feature",
      "Bug",
    ]);
  });

  it("jenis berlevel Epic tidak pernah ditawarkan sebagai anak", () => {
    const besar = petaTingkat([{ label: "Program", description: "Hierarchy: Epic" }]);
    expect(tipeBoleDitawarkan("Epic", ["Epic", "Program"], besar)).toEqual([]);
    expect(tipeBoleDitawarkan(null, ["Epic", "Program"], besar)).toEqual(["Epic", "Program"]);
  });

  it("induk yang levelnya tidak terbaca tetap longgar, daftar tidak pernah kosong", () => {
    const petaKosong = petaTingkat([]);
    expect(tipeBoleDitawarkan("Sub Bug", ["Sub Bug", "Task"], petaKosong)).toContain("Sub Bug");
  });
});
