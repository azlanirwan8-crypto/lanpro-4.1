/** @jest-environment jsdom */
/**
 * #688 — `useLingkupTugas` harus memakai identitas yang DIOPER pemanggil.
 *
 * Test ini ditulis lebih dulu, dan ia MERAH untuk alasan yang nyata: versi
 * pertama hook ini memanggil `useAuth()` sendiri. Ternyata `useAuth` bukan
 * context — tidak ada Provider, dan seluruh state-nya `useState` lokal
 * (`src/hooks/useAuth.ts:101-111`). Dipanggil dari komponen fitur, hook itu
 * menghasilkan instansinya sendiri dengan `currentUser = null`, sehingga
 * "My Tasks" selalu kosong di semua modul. Bug seperti ini tidak kelihatan di
 * test unit `tugasSaya.ts` (di sana identitasnya argumen murni) dan tidak
 * kelihatan di `npm run build`; hanya test yang merender hook-nya yang bisa
 * memergokinya.
 *
 * Mock di bawah mengembalikan pengguna kosong — persis seperti instansiasi
 * kedua yang dialami modul fitur dulu. Bila seseorang mengembalikan hook ini
 * ke `useAuth()`, test pertama dan test kontras langsung merah.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { act, renderHook } from "@testing-library/react";

jest.mock("./useAuth", () => ({
  useAuth: () => ({
    currentUser: null,
    currentUserProfile: null,
    userRole: null,
    effectiveRole: null,
  }),
}));

import { useLingkupTugas } from "./useLingkupTugas";
import { useProjectStore } from "../store/stores";
import type { Task } from "../types";

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Task ${id}`,
    type: "task",
    status: "To Do",
    priority: "Medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

const DAFTAR = [
  tugas("a", { assigneeId: "uid-1" }),
  tugas("b", { assigneeEmail: "rina@contoh.test" }),
  tugas("c", { assignees: ["uid-1"] }),
  tugas("d"),
];

const ORANG = { uid: "uid-1", id: "id-1", email: "Rina@Contoh.test" };

/** Set lingkup lewat store di dalam `act`, supaya langganan zustand ikut */
const setLingkup = (nilai: "all" | "mine") =>
  act(() => {
    useProjectStore.getState().setLingkupTugas(nilai);
  });

describe("#688 useLingkupTugas memakai identitas dari pemanggil", () => {
  beforeEach(() => {
    setLingkup("all");
  });

  it("mode mine menyaring dengan identitas yang dioper, bukan dari useAuth", () => {
    setLingkup("mine");
    const { result } = renderHook(() => useLingkupTugas(ORANG));
    expect(result.current.saring(DAFTAR).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("punyaIdentitas true saat pemanggil mengoper identitas, walau useAuth kosong", () => {
    const { result } = renderHook(() => useLingkupTugas(ORANG));
    expect(result.current.punyaIdentitas).toBe(true);
  });

  /**
   * BUKTINYA SESAT: jalur lama (`useAuth()` di dalam hook) ditiru di sini dan
   * diberi mock yang sama persis. Hasilnya kosong — dan kosong inilah yang akan
   * dilihat pengguna di Kelola Proyek, Papan, Perencanaan, dan Roadmap.
   */
  it("kontras: identitas yang diambil dari useAuth() lokal memberi hasil kosong", () => {
    setLingkup("mine");
    const { useAuth } = jest.requireMock("./useAuth");
    const dariAuth = renderHook(() => useLingkupTugas(useAuth().currentUser));
    expect(dariAuth.result.current.saring(DAFTAR)).toEqual([]);
    const dariProp = renderHook(() => useLingkupTugas(ORANG));
    expect(dariProp.result.current.saring(DAFTAR)).toHaveLength(3);
  });

  it("mode all mengembalikan array yang SAMA, bukan salinan", () => {
    const { result } = renderHook(() => useLingkupTugas(ORANG));
    expect(result.current.saring(DAFTAR)).toBe(DAFTAR);
  });

  it("mode mine tanpa identitas menghasilkan kosong, bukan seluruh isi", () => {
    setLingkup("mine");
    const { result } = renderHook(() => useLingkupTugas(null));
    expect(result.current.saring(DAFTAR)).toEqual([]);
    expect(result.current.punyaIdentitas).toBe(false);
  });

  /**
   * Komponen induk merender ulang dengan objek props BARU setiap render. Kalau
   * `saring` ikut berubah tiap render, `useMemo(() => saring(tasks))` di modul
   * mana pun dihitung ulang dan daftar task dapat referensi baru padahal isinya
   * sama — memancing render berantai di layar besar (Timeline, Papan).
   * Yang diuji di sini referensi hasil MEMO konsumen, bukan hasil panggilan
   * langsung: `filter()` memang selalu membuat array baru.
   */
  it("objek identitas baru tiap render tidak mengubah hasil yang di-memo", () => {
    setLingkup("mine");
    const { result, rerender } = renderHook(
      ({ orang }: { orang: any }) => {
        const { saring } = useLingkupTugas(orang);
        return React.useMemo(() => saring(DAFTAR), [saring]);
      },
      { initialProps: { orang: { ...ORANG } } }
    );

    const pertama = result.current;
    rerender({ orang: { ...ORANG } });
    expect(result.current).toBe(pertama);

    // ...tapi kalau identitasnya benar-benar berganti, memo harus ikut.
    rerender({ orang: { uid: "uid-9", id: "id-9", email: "lain@contoh.test" } });
    expect(result.current).not.toBe(pertama);
    // uid-9 tidak ditugaskan di mana pun — task TANPA assignee ("d") tidak ikut,
    // karena "My Tasks" adalah daftar milik saya, bukan daftar kosong.
    expect(result.current).toEqual([]);
  });

  it("status lingkup dibagi antar pemanggil — satu store, satu kebenaran", () => {
    const a = renderHook(() => useLingkupTugas(ORANG));
    const b = renderHook(() => useLingkupTugas(ORANG));
    act(() => a.result.current.setLingkup("mine"));
    expect(b.result.current.lingkup).toBe("mine");
    expect(useProjectStore.getState().lingkupTugas).toBe("mine");
    act(() => a.result.current.setLingkup("all"));
  });

  // Penjaga PENYEBAB, bukan hanya gejala. Test di atas masih bisa dibuat lolos
  // dengan tambalan di tempat lain; yang ini hanya merah kalau seseorang
  // mengembalikan `useAuth()` ke dalam hook ini — dan di situlah bug-nya lahir.
  // (Pola pemindaian berkas sumber sudah dipakai repo ini, lihat
  // server/middleware/pengguna-ringkas.test.ts.)
  it("hook ini tidak mengimpor useAuth: instansiasi kedua = sesi kosong", () => {
    const src = fs.readFileSync(path.join(__dirname, "useLingkupTugas.ts"), "utf8");
    expect(src).not.toMatch(/from\s+["']\.\/useAuth["']/);
  });
});
