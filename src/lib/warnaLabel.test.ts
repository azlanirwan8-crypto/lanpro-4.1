/**
 * #564 — gerbang standar warna label.
 *
 * Bagian 1 mengikat `BAKU` ke seed server: kalau seseorang mengubah warna
 * status/jenis di `scripts/db/seed-master-data.cjs` tanpa mengubah tabel baku,
 * test ini MERAH. Itulah yang membuat 16 pemetaan lama bisa bertengkar tanpa
 * ada yang sadar — tidak ada satu pun angka yang dipegang bersama.
 *
 * Bagian 2 menguji kosakata: label Indonesia, `code` snake_case (bentuk yang
 * benar-benar disimpan ke `Tasks.status`), dan nilai asing.
 */
import * as fs from "fs";
import * as path from "path";
import {
  BAKU,
  WARNA_NETRAL,
  cariMaster,
  gayaLabel,
  nadaLabel,
  warnaLabel,
  warnaSah,
} from "./warnaLabel";

const SEED = path.join(__dirname, "..", "..", "scripts", "db", "seed-master-data.cjs");

/** Ambil pasangan label→color dari satu array di berkas seed. */
const bacaSeed = (namaArray: string) => {
  const isi = fs.readFileSync(SEED, "utf8").replace(/\r\n/g, "\n");
  const mulai = isi.indexOf(`const ${namaArray} = [`);
  expect(mulai).toBeGreaterThanOrEqual(0);
  const blok = isi.slice(mulai, isi.indexOf("\n];", mulai));
  const pasangan: { label: string; color: string }[] = [];
  const re = /label:\s*"([^"]+)"[^}]*?color:\s*"(#[0-9a-fA-F]{6})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blok))) pasangan.push({ label: m[1], color: m[2] });
  return pasangan;
};

/** Hex tidak peka besar huruf; yang dibandingkan nilainya, bukan penulisannya. */
const sama = (a: string, b: string) => expect(a.toLowerCase()).toBe(b.toLowerCase());

describe("BAKU — terikat ke seed MasterData", () => {
  it("warna setiap label status sama dengan yang di-seed server", () => {
    const baris = bacaSeed("STATUS");
    expect(baris.length).toBeGreaterThanOrEqual(8);
    for (const { label, color } of baris) {
      sama(warnaLabel({ kelompok: "status", label }), color);
    }
  });

  it("warna setiap label jenis isu sama dengan yang di-seed server", () => {
    const baris = bacaSeed("ISSUE_TYPE");
    expect(baris.length).toBeGreaterThanOrEqual(5);
    for (const { label, color } of baris) {
      sama(warnaLabel({ kelompok: "issue_type", label }), color);
    }
  });
});

describe("warnaLabel — kosakata", () => {
  it("mengenali label Indonesia yang dulu dilewati pemetaan Timeline", () => {
    expect(warnaLabel({ kelompok: "status", label: "Selesai" })).toBe(BAKU.status.done);
    expect(warnaLabel({ kelompok: "status", label: "Dikerjakan" })).toBe(BAKU.status.inprogress);
    expect(warnaLabel({ kelompok: "status", label: "Dibatalkan" })).toBe(BAKU.status.cancelled);
  });

  it("mengenali code yang benar-benar tersimpan di Tasks.status", () => {
    // `resolveStatusWriteValue` menulis code, jadi inilah nilai yang dibaca chip.
    expect(warnaLabel({ kelompok: "status", label: "in_progress" })).toBe(BAKU.status.inprogress);
    expect(warnaLabel({ kelompok: "status", label: "to_do" })).toBe(BAKU.status.todo);
    expect(warnaLabel({ kelompok: "status", label: "in_review" })).toBe(BAKU.status.inreview);
  });

  it("warna master data menang atas tabel baku", () => {
    expect(warnaLabel({ kelompok: "status", label: "Done", warnaMaster: "#123456" })).toBe(
      "#123456"
    );
  });

  it("label yang tidak dikenal tidak menyamar jadi warna merek", () => {
    expect(warnaLabel({ kelompok: "status", label: "Baru Dibuat Orang" })).toBe(WARNA_NETRAL);
    expect(warnaLabel({ kelompok: "kelompok_asing", label: "Apa pun" })).toBe(WARNA_NETRAL);
    expect(warnaLabel({ kelompok: "status", label: "" })).toBe(WARNA_NETRAL);
  });
});

describe("warnaSah — pagar nilai yang masuk ke CSS", () => {
  it("hanya menerima grammar warna", () => {
    expect(warnaSah("#8B5CF6")).toBe(true);
    expect(warnaSah("rgb(14, 165, 233)")).toBe(true);
    expect(warnaSah("  #abc ")).toBe(true);
    expect(warnaSah("red")).toBe(false);
    expect(warnaSah("red;background:url(javascript:1)")).toBe(false);
    expect(warnaSah("var(--x)")).toBe(false);
    expect(warnaSah(null)).toBe(false);
  });

  it("gayaLabel mengganti nilai cacat dengan netral", () => {
    expect(gayaLabel("url(evil)")).toEqual({ "--lbr": WARNA_NETRAL });
    expect(gayaLabel("#06B6D4")).toEqual({ "--lbr": "#06B6D4" });
  });
});

describe("cariMaster — toleran code, id, dan label", () => {
  const daftar = [
    { id: "m-1", type: "status", label: "In Progress", code: "in_progress", color: "#8B5CF6" },
    { id: "m-2", type: "status", label: "Done", code: "done", color: "#10B981" },
    { id: "m-3", type: "issue_type", label: "Sub-task", code: "subtask", color: "#06B6D4" },
    { id: "m-4", type: "issueType", label: "Bukan kosakata", color: "#111111" },
  ] as any[];

  it("menemukan lewat code maupun label, tanpa peduli besar huruf", () => {
    expect(cariMaster(daftar, "status", "in_progress")?.label).toBe("In Progress");
    expect(cariMaster(daftar, "status", "DONE")?.code).toBe("done");
    expect(cariMaster(daftar, "issue_type", "Sub-task")?.code).toBe("subtask");
    expect(cariMaster(daftar, "issue_type", "subtask")?.label).toBe("Sub-task");
  });

  it("tidak melintasi kelompok master data", () => {
    expect(cariMaster(daftar, "status", "subtask")).toBeUndefined();
    expect(cariMaster([], "status", "done")).toBeUndefined();
    expect(cariMaster(daftar, "status", "")).toBeUndefined();
  });

  it("warnaDariMaster memakai warna barisnya, bukan tebakan", () => {
    expect(warnaLabel({ kelompok: "status", label: "Done", warnaMaster: "#10B981" })).toBe(
      "#10B981"
    );
  });
});

describe("nadaLabel — jembatan ke kelas Gantt", () => {
  it("memilih set kelas dari hex yang sama dengan chipnya", () => {
    expect(nadaLabel(BAKU.status.done)).toBe("selesai");
    expect(nadaLabel(BAKU.status.inprogress)).toBe("berjalan");
    expect(nadaLabel(BAKU.status.blocked)).toBe("terhenti");
    expect(nadaLabel(BAKU.status.todo)).toBe("awal");
    expect(nadaLabel(BAKU.status.backlog)).toBe("awal");
    expect(nadaLabel("#F01E2C")).toBe("netral");
  });

  it("membandingkan hex tanpa peduli besar huruf", () => {
    expect(nadaLabel("#10b981")).toBe("selesai");
  });
});
