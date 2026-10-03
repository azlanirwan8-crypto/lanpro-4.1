/**
 * #605 — dua pemilih tipe tidak boleh berebut satu state.
 *
 * Setelah #604, baris tambah anak dan bilah cepat sama-sama "mengoreksi"
 * `inlineAddType` milik bersama ke bawaan masing-masing: bilah cepat minta Epic
 * (puncak pohon), baris anak Task minta Sub-task. Keduanya mounted bersamaan,
 * jadi efek A menulis nilai yang langsung dibatalkan efek B, dan seterusnya —
 * chip tipe berkedik dan ikonnya jatuh ke bentuk cadangan. Laporan pemilik
 * proyek 03 Okt lewat tangkapan layar: "kok label[i]nya ini error gerak aja,
 * cek di icon jenis task".
 *
 * Harness di bawah MENIRU keadaan itu dengan state sungguhan (bukan jest.fn),
 * dan membatasi jumlah render: kalau osilasi kembali terjadi, komponen melempar
 * dan test ini merah — bukan menggantung selamanya.
 */
import React, { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import { IssueQuickCreateBar } from "./components/list/IssueQuickCreateBar";
import { IssueTableInlineAddRow } from "./components/list/IssueTableInlineAddRow";

jest.mock("motion/react", () => {
  const asli = jest.requireActual("motion/react");
  const R = require("react");
  const tr = R.forwardRef((props: any, ref: any) => {
    const { layout: _, initial: __, animate: ___, exit: ____, transition: _____, ...lan } = props;
    return R.createElement("tr", { ...lan, ref });
  });
  return {
    ...asli,
    motion: new Proxy(asli.motion, { get: (target, key) => (key === "tr" ? tr : target[key]) }),
  };
});

const BATAS_RENDER = 40;

const buatMaster = (labels: string[]) =>
  [
    ...labels.map((label, i) => ({
      id: `t${i}`,
      type: "issue_type",
      label,
      code: label.toLowerCase().replace(/[\s_-]+/g, ""),
      color: "#405189",
      icon: "Zap",
    })),
    { id: "p1", type: "priority", label: "Medium", code: "medium", color: "#71717A" },
  ] as any[];

const kolom = () =>
  [
    { id: "work", visible: true, width: 450 },
    { id: "priority", visible: true, width: 120 },
  ] as any[];

let jumlahRender = 0;

/** Satu `inlineAddType` bersama, dipakai bilah cepat DAN baris anak Task. */
function Papan({ labels }: { labels: string[] }) {
  const masterData = buatMaster(labels);
  const [tipe, setTipe] = useState("Epic");
  const hitung = useRef(0);
  jumlahRender = ++hitung.current;
  if (hitung.current > BATAS_RENDER) {
    throw new Error(`Osilasi: ${hitung.current} render tanpa keadaan stabil`);
  }

  return (
    <>
      <span data-testid="tipe-bersama">{tipe}</span>
      <IssueQuickCreateBar
        quickCreateTitle="Isu baru"
        setQuickCreateTitle={jest.fn()}
        createGlobalIssue={jest.fn(async () => {})}
        isCreating={false}
        inlineAddType={tipe}
        setInlineAddType={setTipe}
        isInlineTypeOpen={null}
        setIsInlineTypeOpen={jest.fn()}
        inlineAddPriority="Medium"
        setInlineAddPriority={jest.fn()}
        inlineAddAssigneeId=""
        setInlineAddAssigneeId={jest.fn()}
        inlineAddSprintId=""
        setInlineAddSprintId={jest.fn()}
        masterData={masterData}
        projectMembers={[]}
        sprints={[]}
      />
      <div data-testid="baris-anak">
        <table>
          <tbody>
            <IssueTableInlineAddRow
              taskId="induk-1"
              tipeInduk="Task"
              depth={1}
              canReorder={false}
              isCompact={false}
              issueTableColumns={kolom()}
              inlineTitleMap={{ "induk-1": "Anak tugas" }}
              setInlineTitleMap={jest.fn()}
              setInlineAddingTaskId={jest.fn()}
              isInlineTypeOpen={null}
              setIsInlineTypeOpen={jest.fn()}
              inlineAddPriority="Medium"
              setInlineAddPriority={jest.fn()}
              inlineAddAssigneeId=""
              setInlineAddAssigneeId={jest.fn()}
              isCreating={false}
              createSubtask={jest.fn(async () => {})}
              masterData={masterData}
              projectMembers={[]}
            />
          </tbody>
        </table>
      </div>
    </>
  );
}

const chipAnak = () =>
  screen.getByTestId("baris-anak").querySelector(".label-chip")?.textContent?.trim();

const barisAnak = (lebih: Record<string, any> = {}) => ({
  taskId: "induk-1",
  depth: 1,
  canReorder: false,
  isCompact: false,
  issueTableColumns: kolom(),
  inlineTitleMap: {},
  setInlineTitleMap: jest.fn(),
  setInlineAddingTaskId: jest.fn(),
  isInlineTypeOpen: null,
  setIsInlineTypeOpen: jest.fn(),
  inlineAddPriority: "Medium",
  setInlineAddPriority: jest.fn(),
  inlineAddAssigneeId: "",
  setInlineAddAssigneeId: jest.fn(),
  isCreating: false,
  createSubtask: jest.fn(async () => {}),
  masterData: buatMaster(["Epic", "Story", "Task", "Bug", "Sub-task"]),
  projectMembers: [],
  ...lebih,
});

describe("#605 dua pemilih tipe berbagi satu layar tanpa berebut", () => {
  it("keadaan stabil dalam satu putaran: bilah cepat Epic, baris anak Sub-task", () => {
    render(<Papan labels={["Epic", "Story", "Task", "Bug", "Sub-task"]} />);

    expect(screen.getByTestId("tipe-bersama").textContent).toBe("Epic");
    expect(chipAnak()).toBe("Sub-task");
    // Dua putaran pun sudah terlalu banyak; nilai yang benar dicapai sekali.
    expect(jumlahRender).toBeLessThanOrEqual(3);
  });

  it("Master Data tanpa Epic: bilah cepat jatuh ke tipe legal pertama, bukan kosong", () => {
    render(<Papan labels={["Task", "Bug", "Sub-task"]} />);

    // Inilah keadaan pemilik proyek: tidak ada "Epic" sama sekali.
    expect(screen.getByTestId("tipe-bersama").textContent).toBe("Task");
    expect(chipAnak()).toBe("Sub-task");
    expect(jumlahRender).toBeLessThanOrEqual(4);
  });

  it("dua baris anak yang terbuka bersamaan punya tipe masing-masing", () => {
    render(
      <>
        <div data-testid="baris-anak">
          <table>
            <tbody>
              <IssueTableInlineAddRow {...(barisAnak({ taskId: "a", tipeInduk: "Task" }) as any)} />
            </tbody>
          </table>
        </div>
        <div data-testid="baris-kedua">
          <table>
            <tbody>
              <IssueTableInlineAddRow {...(barisAnak({ taskId: "b", tipeInduk: "Epic" }) as any)} />
            </tbody>
          </table>
        </div>
      </>
    );

    // Anak Task = Sub-task, anak Epic = Story, keduanya hidup berdampingan.
    expect(screen.getByTestId("baris-anak").querySelector(".label-chip")?.textContent?.trim()).toBe(
      "Sub-task"
    );
    expect(
      screen.getByTestId("baris-kedua").querySelector(".label-chip")?.textContent?.trim()
    ).toBe("Story");
  });
});
