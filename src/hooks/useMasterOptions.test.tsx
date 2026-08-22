/**
 * Item #140 — dropdown mengambil pilihannya dari MasterData.
 *
 * Yang dijaga bukan sekadar "membaca MasterData", tapi juga CADANGAN-nya.
 * Tanpa cadangan, MasterData yang belum tersemai membuat dropdown kosong —
 * pengguna kehilangan kemampuan mengisi field itu sama sekali, tanpa satu pun
 * pesan yang menjelaskan kenapa. Itu lebih buruk daripada daftar keras yang
 * digantikan.
 */
import { renderHook } from "@testing-library/react";
import { useMasterOptions, useMasterOptionItems } from "./useMasterOptions";
import { useAppStore } from "../store/useAppStore";

const pasangMaster = (rows: unknown[]) => useAppStore.setState({ masterData: rows as never });

const CADANGAN = ["A", "B"];
const CADANGAN_ITEM = [{ id: "A", label: "A" }];

afterEach(() => pasangMaster([]));

describe("useMasterOptions (#140)", () => {
  it("memulangkan label dari MasterData untuk tipe yang diminta", () => {
    pasangMaster([
      { id: "1", type: "qa_phase", label: "SIT" },
      { id: "2", type: "qa_phase", label: "UAT" },
    ]);
    const { result } = renderHook(() => useMasterOptions("qa_phase", CADANGAN));
    expect(result.current).toEqual(["SIT", "UAT"]);
  });

  it("tidak membocorkan tipe lain", () => {
    pasangMaster([
      { id: "1", type: "qa_phase", label: "SIT" },
      { id: "2", type: "priority", label: "High" },
    ]);
    const { result } = renderHook(() => useMasterOptions("qa_phase", CADANGAN));
    expect(result.current).not.toContain("High");
  });

  it("jatuh ke cadangan bila tipe belum ada di MasterData", () => {
    pasangMaster([{ id: "1", type: "priority", label: "High" }]);
    const { result } = renderHook(() => useMasterOptions("qa_phase", CADANGAN));
    expect(result.current).toEqual(CADANGAN);
  });

  it("jatuh ke cadangan bila MasterData kosong", () => {
    pasangMaster([]);
    const { result } = renderHook(() => useMasterOptions("sprint_status", CADANGAN));
    expect(result.current).toEqual(CADANGAN);
  });

  it("mempertahankan huruf kecil apa adanya (Sprints.status menyimpan 'planned')", () => {
    pasangMaster([{ id: "1", type: "sprint_status", label: "planned" }]);
    const { result } = renderHook(() => useMasterOptions("sprint_status", CADANGAN));
    expect(result.current).toEqual(["planned"]);
  });
});

describe("useMasterOptionItems (#140)", () => {
  it("membawa ikon dan warna dari MasterData", () => {
    pasangMaster([
      { id: "1", type: "qa_status", label: "Passed", icon: "Check", color: "#10B981" },
    ]);
    const { result } = renderHook(() => useMasterOptionItems("qa_status", CADANGAN_ITEM));
    expect(result.current).toEqual([
      { id: "Passed", label: "Passed", icon: "Check", color: "#10B981" },
    ]);
  });

  it("memakai label sebagai id, bukan code, agar data lama tidak putus", () => {
    pasangMaster([{ id: "1", type: "qa_phase", label: "SIT", code: "sit" }]);
    const { result } = renderHook(() => useMasterOptionItems("qa_phase", CADANGAN_ITEM));
    expect(result.current[0].id).toBe("SIT");
  });

  it("jatuh ke cadangan bila kosong", () => {
    pasangMaster([]);
    const { result } = renderHook(() => useMasterOptionItems("qa_phase", CADANGAN_ITEM));
    expect(result.current).toEqual(CADANGAN_ITEM);
  });
});
