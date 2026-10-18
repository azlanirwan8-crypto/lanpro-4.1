/**
 * #491 / #564 - Test verifikasi Planning Cards:
 * 1. Gambar 1: Subtask list di TaskSubtasksSection tidak menampilkan ID issue/key
 * 2. Gambar 1 (Linked): TaskLinksSection tidak menampilkan target.key di badge
 * 3. Kartu & baris Planning memakai border-l-4 dengan hex dari MasterData
 *    (`warnaDariMaster`), bukan kamus warna Tailwind lokal.
 * 4. Chip priority/status memakai `LabelChip` - satu komponen chip milik
 *    MasterData, bukan span dengan kelas warna keras.
 * 5. Kepala epik/standalone memakai `TypeIcon` + hex MasterData; kamus ikon &
 *    warna lokal `iconMasterData.ts` dihapus, dan backlog bebas purple keras.
 */
import fs from "node:fs";
import path from "node:path";

const subtasksSectionPath = path.join(
  __dirname,
  "..",
  "issues",
  "components",
  "modal",
  "TaskSubtasksSection.tsx"
);
const linksSectionPath = path.join(
  __dirname,
  "..",
  "issues",
  "components",
  "modal",
  "TaskLinksSection.tsx"
);
const planningIndexPath = path.join(__dirname, "index.tsx");
const backlogPath = path.join(__dirname, "BacklogSection", "index.tsx");
const sprintPath = path.join(__dirname, "SprintSection", "index.tsx");

const baca = (p: string) => fs.readFileSync(p, "utf8");

describe("#491: Planning Card Colors & Issue Key Removal", () => {
  it("TaskSubtasksSection tidak menampilkan {st.key}", () => {
    expect(baca(subtasksSectionPath)).not.toContain("{st.key}");
  });

  it("TaskLinksSection tidak menampilkan {target.key}", () => {
    expect(baca(linksSectionPath)).not.toContain("{target.key}");
  });
});

describe("#564: warna & ikon Planning datang dari MasterData", () => {
  const planning = baca(planningIndexPath);

  it("kartu/baris memakai border-l-4 dengan hex MasterData", () => {
    expect(planning).toContain("border-l-4");
    expect(planning).toContain("label-edge");
    expect(planning).toMatch(/warnaDariMaster\(\s*masterData,\s*"priority",\s*task\.priority\s*\)/);
    expect(planning).toMatch(/warnaDariMaster\(\s*masterData,\s*"status",\s*task\.status\s*\)/);
    // #785 — hex masuk ke garis kiri lewat SATU properti `--lbr` yang diisi
    // `gayaLabel()`, bukan `borderLeftColor` inline plus alpha rakitan `${hex}0F`.
    expect(planning).toMatch(/gayaLabel\(\s*variant === "card" \? hexPrioritas : hexStatus\s*\)/);
    expect(planning).not.toMatch(/\$\{hex(Prioritas|Status)\}/);
  });

  it("blocked tetap memakai token danger, bukan warna master", () => {
    expect(planning).toContain("border-l-danger");
  });

  it("chip priority/status memakai LabelChip", () => {
    expect(planning).toContain('kelompok="priority"');
    expect(planning).toContain('kelompok="status"');
    expect(planning).toContain("LabelChip");
  });

  it("planning/index.tsx tidak lagi memetakan warna sendiri", () => {
    expect(planning).not.toContain("border-l-warning");
    expect(planning).not.toContain("border-l-success");
    expect(planning).not.toContain("border-l-info");
    expect(planning).not.toContain("text-danger-text bg-danger/10");
    expect(planning).not.toContain("text-warning-text bg-warning/10");
    expect(planning).not.toContain('task.priority === "Highest"');
    expect(planning).not.toContain("text-red-600");
    expect(planning).not.toContain("border-red-500");
    expect(planning).not.toContain("bg-red-500");
  });

  it("kepala epik memakai TypeIcon + hex MasterData, bukan kamus ikon lokal", () => {
    for (const isi of [baca(backlogPath), baca(sprintPath)]) {
      expect(isi).toContain("TypeIcon");
      expect(isi).toMatch(/warnaDariMaster\(\s*masterData,\s*"issue_type"/);
      expect(isi).not.toContain("epicColorClass");
      expect(isi).not.toContain("getIconForTaskType");
      expect(isi).not.toContain("getColorForTaskType");
      expect(isi).not.toContain("iconMasterData");
    }
  });

  it("backlog tidak lagi memuat purple hardcoded untuk epik", () => {
    expect(baca(backlogPath)).not.toContain("purple");
  });

  it("kamus ikon/warna lokal planning sudah dihapus", () => {
    expect(fs.existsSync(path.join(__dirname, "iconMasterData.ts"))).toBe(false);
  });
});
