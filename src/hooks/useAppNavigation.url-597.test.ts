/**
 * @jest-environment jsdom
 *
 * #597 — "Lihat semua tugas" di Dashboard membuka Daftar Isu, bukan Papan Kanban.
 *
 * KEDUA SISI AKARNYA DIUJI DI SINI:
 *  1. `useAppNavigation` membaca `?view=` SETIAP KALI daftar proyek berganti
 *     identitas — dan daftar itu ditarik ulang oleh tombol sinkron, oleh
 *     pembuatan/perubahan/proyek dihapus, dan oleh event realtime `/projects`.
 *     Karena alamat tidak pernah diperbarui saat berpindah menu, nilai lama di
 *     alamat itulah yang menang dan menarik pengguna kembali ke `list` tepat
 *     setelah ia menekan tombol.
 *  2. `navigate` — satu-satunya penulis `?view=` — tidak pernah dipanggil dari
 *     aplikasi, jadi alamat dan store boleh berbeda selamanya.
 */
import { renderHook, act } from "@testing-library/react";
import { useAppNavigation } from "./useAppNavigation";
import { useAppStore } from "../store/useAppStore";

const proyek = [
  { id: "proj-1", projectKey: "PROJ", name: "Proyek 1" },
  { id: "proj-2", projectKey: "LAIN", name: "Proyek 2" },
] as any[];

const view = () => useAppStore.getState().currentView;
const alamat = () => new URLSearchParams(window.location.search);

describe("useAppNavigation — address bar tidak boleh mengalahkan navigasi pengguna (#597)", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: "dashboard",
      projects: proyek,
      selectedProject: null,
    });
    window.history.pushState({}, "", "/");
  });

  it("penarikan ulang daftar proyek benar-benar mengganti identitas array", () => {
    // Penjaga asumsi untuk test di bawah: `fetchProjects` mengisi ulang store
    // dengan array baru dari server, dan itulah yang dulu menjalankan efek
    // `[projects]` lagi. Kalau store hanya mutasi di tempat, test ini tidak
    // membuktikan apa-apa.
    const sebelum = useAppStore.getState().projects;
    act(() => useAppStore.setState({ projects: [...proyek] }));
    expect(useAppStore.getState().projects).not.toBe(sebelum);
  });

  it("tetap di Papan Kanban setelah penarikan ulang daftar proyek (#597)", () => {
    window.history.pushState({}, "", "/?view=list");
    renderHook(() => useAppNavigation());
    expect(view()).toBe("list");

    act(() => useAppStore.getState().setCurrentView("board"));
    expect(view()).toBe("board");

    // Inilah peristiwa yang dulu mencabut pengguna dari papan: `/projects`
    // lewat websocket, tombol sinkron, atau proyek dibuat/diubah/dihapus.
    act(() => useAppStore.setState({ projects: [...proyek] }));
    expect(view()).toBe("board");
  });

  it("tampilan yang dipilih pengguna tertulis ke address bar", () => {
    renderHook(() => useAppNavigation());
    expect(alamat().get("view")).toBeNull();

    act(() => useAppStore.getState().setCurrentView("board"));
    expect(alamat().get("view")).toBe("board");

    act(() => useAppStore.getState().setCurrentView("list"));
    expect(alamat().get("view")).toBe("list");
  });

  it("hanya nama tampilan yang ditulis, id proyek tidak ikut ke address bar", () => {
    renderHook(() => useAppNavigation());
    act(() => useAppStore.setState({ selectedProject: proyek[0] }));
    act(() => useAppStore.getState().setCurrentView("board"));

    expect(alamat().get("view")).toBe("board");
    // Proyek aktif sudah dipulihkan dari cache saat muat ulang, jadi id
    // internal tidak perlu tampil; `navigate` tetap boleh menulisnya bila
    // memang diminta (dijaga useAppNavigation.test.ts).
    expect(alamat().get("projectId")).toBeNull();
  });

  it("mendorong riwayat peramban dengan state view sehingga Back bisa memulihkannya", () => {
    const dorong = jest.spyOn(window.history, "pushState");
    renderHook(() => useAppNavigation());

    act(() => useAppStore.getState().setCurrentView("board"));

    const entri = dorong.mock.calls
      .map((panggilan: any[]) => String(panggilan[2] ?? ""))
      .filter((u) => /view=board/.test(u));
    expect(entri).toEqual(["/?view=board"]);
    expect(dorong.mock.calls[dorong.mock.calls.length - 1][0]).toEqual({
      view: "board",
      projectId: null,
    });
    dorong.mockRestore();
  });

  it("tampilan detail tidak pernah ditulis ke address bar", () => {
    renderHook(() => useAppNavigation());
    act(() => useAppStore.getState().setCurrentView("board"));
    act(() => useAppStore.getState().setCurrentView("issueDetail" as any));

    // `?view=issueDetail` akan membuka layar kosong setelah muat ulang:
    // tugas yang dibuka hidup di dalam memori, bukan di URL.
    expect(alamat().get("view")).toBe("board");
  });

  it("tetap membaca projectId dari tautan yang tiba sebelum daftar proyek", () => {
    useAppStore.setState({ projects: [], selectedProject: null });
    window.history.pushState({}, "", "/?view=wiki&projectId=proj-2");
    renderHook(() => useAppNavigation());

    expect(view()).toBe("wiki");
    expect(useAppStore.getState().selectedProject).toBeNull();

    act(() => useAppStore.setState({ projects: proyek }));
    expect(useAppStore.getState().selectedProject?.id).toBe("proj-2");
    expect(view()).toBe("wiki");
  });

  it("proyek hasil cache tidak menimpa proyek yang diminta tautan", () => {
    // Store sudah memegang proj-1 (dipulihkan dari cache) sementara tautan
    // meminta proj-2 dan daftar proyek belum tiba. Cermin yang menulis terlalu
    // dini akan menghapus permintaan tautan itu.
    useAppStore.setState({ projects: [], selectedProject: proyek[0] });
    window.history.pushState({}, "", "/?view=wiki&projectId=proj-2");
    renderHook(() => useAppNavigation());

    act(() => useAppStore.setState({ projects: proyek }));
    expect(useAppStore.getState().selectedProject?.id).toBe("proj-2");
    expect(alamat().get("projectId")).toBe("proj-2");
  });

  it("hanya membaca URL sekali: perubahan proyek tidak menghidupkan kembali tautan lama", () => {
    window.history.pushState({}, "", "/?view=list");
    renderHook(() => useAppNavigation());
    expect(view()).toBe("list");

    act(() => useAppStore.getState().setCurrentView("timeline"));
    act(() => {
      useAppStore.setState({ projects: [...proyek] });
      useAppStore.setState({ projects: [...proyek] });
    });
    expect(view()).toBe("timeline");
  });
});
