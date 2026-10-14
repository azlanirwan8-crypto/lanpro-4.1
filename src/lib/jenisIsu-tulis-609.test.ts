/**
 * #609 — `Tasks.type` wajib menyimpan `code` MasterData, bukan label yang
 * dilowerkan (§3 AGENTS.md).
 *
 * Dua lapis penjaga. Pertama PERILAKU penerjemahnya: `kunciJenisIsu` harus
 * memetakan setiap bentuk lama (label, label capital, label dengan pemisah
 * berbeda, code) ke satu nilai kanonik yang sama. Kedua BENTUK jalur tulis:
 * keempat penulis yang dulu mengirim label dikunci supaya tidak bisa kembali
 * ke `.toLowerCase()` mentah — idiom test-baca-sumber yang sama dengan
 * `rakitJenis-730.test.ts` dan `pemilihTipe-724.test.ts`, dipakai karena
 * penulisnya tersebar di tiga folder dan tidak punya satu pintu bersama.
 */
import fs from "node:fs";
import path from "node:path";

import { kunciJenisIsu } from "./jenisIsu";
import type { MasterData } from "../types";

const akar = path.join(__dirname, "..", "..");
const baca = (relatif: string) => fs.readFileSync(path.join(akar, relatif), "utf8");

/** Bentuk seed `issue_type` (konvensi Jira, `scripts/db/seed-master-data.cjs`). */
const baris = (code: string, label: string): MasterData =>
  ({ id: `md-${code}`, type: "issue_type", code, label }) as MasterData;

const master: MasterData[] = [
  baris("epic", "Epic"),
  baris("story", "Story"),
  baris("task", "Task"),
  baris("subtask", "Sub-task"),
  baris("bug", "Bug"),
];

describe("#609 kunciJenisIsu adalah nilai yang DISIMPAN", () => {
  it("label → code: hanya Sub-task yang berubah bentuk", () => {
    expect(kunciJenisIsu(master, "Sub-task")).toBe("subtask");
    expect(kunciJenisIsu(master, "Epic")).toBe("epic");
    expect(kunciJenisIsu(master, "Bug")).toBe("bug");
  });

  it("label yang sudah dilowerkan (bentuk production hari ini) → code", () => {
    expect(kunciJenisIsu(master, "sub-task")).toBe("subtask");
    expect(kunciJenisIsu(master, "epic")).toBe("epic");
  });

  it("code yang sudah benar tetap utuh (migrasi tidak menggeser apa pun)", () => {
    expect(kunciJenisIsu(master, "subtask")).toBe("subtask");
    expect(kunciJenisIsu(master, "task")).toBe("task");
  });

  it("pemisah dan huruf besar-kecil tidak melahirkan jenis kedua", () => {
    const semua = ["Sub-task", "sub-task", "SUB TASK", "Subtask", "sub_task", " subtask "];
    for (const nilai of semua) {
      expect(kunciJenisIsu(master, nilai)).toBe("subtask");
    }
  });

  it("label yang diganti admin tetap bertemu code yang sama", () => {
    const diganti = [baris("subtask", "Sub tugas")];
    expect(kunciJenisIsu(diganti, "Sub tugas")).toBe("subtask");
    // Nilai lama masih dikenali lewat code-nya, jadi tidak yatim.
    expect(kunciJenisIsu(diganti, "subtask")).toBe("subtask");
  });

  it("nilai yang tidak dikenal MasterData tidak dikarang jadi code", () => {
    expect(kunciJenisIsu(master, "meeting")).toBe("meeting");
    expect(kunciJenisIsu(master, "Approval")).toBe("approval");
    expect(kunciJenisIsu(master, "")).toBe("");
    expect(kunciJenisIsu(master, null)).toBe("");
  });

  it("tanpa MasterData sama sekali nilainya tetap aman (lowercase mentah)", () => {
    expect(kunciJenisIsu([], "Sub-task")).toBe("sub-task");
    expect(kunciJenisIsu(undefined, "Epic")).toBe("epic");
  });
});

describe("#609 jalur tulis tidak boleh kembali mengirim label", () => {
  it("features/issues/hooks.ts memakai kunciJenisIsu, bukan .toLowerCase()", () => {
    const sumber = baca("src/features/issues/hooks.ts");
    expect(sumber).toContain("kunciJenisIsu(mArr, tipeDipakai)");
    expect(sumber).not.toContain("tipeDipakai.toLowerCase()");
  });

  it("NewTaskModal membangun opsi dari code, bukan label yang dilowerkan", () => {
    const sumber = baca("src/components/modals/NewTaskModal.tsx");
    expect(sumber).toContain("id: kunciJenisIsu(masterData, t.label)");
    expect(sumber).not.toContain("id: t.label.toLowerCase()");
  });

  it("AppContainer.handleCreateTask dan handleQuickCreate menormalkan type", () => {
    const sumber = baca("src/AppContainer.tsx");
    expect(sumber).toContain("kunciJenisIsu(masterData, newTaskType)");
    expect(sumber).toContain("kunciJenisIsu(masterData, type)");
    expect(sumber).not.toContain("type: newTaskType,");
  });

  it("TaskDetailModal membandingkan kunci kanonik, bukan string mentah", () => {
    const sumber = baca("src/features/issues/TaskDetailModal.tsx");
    expect(sumber).toContain('kunciJenisIsu(masterData, task.type) === "epic"');
    expect(sumber).not.toContain('task.type === "epic"');
  });
});

describe("#609 migrasi satu arah di pg-migrate.ts", () => {
  const sumber = baca("src/lib/pg-migrate.ts");
  const mulai = sumber.indexOf("#609 — SATU ARAH");
  const blok = mulai >= 0 ? sumber.slice(mulai, sumber.indexOf("TaskExternalLinks", mulai)) : "";

  it("blok migrasinya ada dan dibungkus try/catch seperti migrasi data lain", () => {
    expect(mulai).toBeGreaterThan(-1);
    expect(blok).toContain("try {");
    expect(blok).toContain("[PG-MIGRATE] #609 tasks.type label→code warning:");
  });

  it("hanya menyentuh baris issue_type yang punya code", () => {
    expect(blok).toContain(`WHERE type = 'issue_type'`);
    expect(blok).toContain(`COALESCE(TRIM(code), '') <> ''`);
  });

  it("konvergen: baris yang sudah kanonik tidak cocok lagi (idempoten)", () => {
    expect(blok).toContain("AND t.type <> p.kanonik");
  });

  it("menolak menebak bila satu task cocok dengan lebih dari satu code", () => {
    expect(blok).toContain("HAVING COUNT(DISTINCT kanonik) = 1");
  });

  it("SATU ARAH: tidak ada jalan kembali dari code ke label", () => {
    expect(blok).toContain("SET type = u.kanonik");
    expect(blok).not.toContain("SET type = p.label");
    expect(blok).not.toMatch(/kanonik\s*=\s*LOWER\(TRIM\(label\)\)/);
  });

  it("pencocokannya meniru normal() di warnaLabel.ts", () => {
    expect(blok).toContain(
      `REGEXP_REPLACE(LOWER(TRIM(COALESCE(t.type, ''))), '[^a-z0-9]', '', 'g')`
    );
  });

  it("tidak ikut menulis updatedAt/version (bukan suntingan pengguna)", () => {
    expect(blok).not.toContain('"updatedAt"');
    expect(blok).not.toContain("version");
  });
});
