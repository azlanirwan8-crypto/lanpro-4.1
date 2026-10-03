import { useEffect, useCallback, useRef } from "react";
import { useAppStore, AppView } from "../store/useAppStore";

const VALID_VIEWS = new Set<string>([
  "dashboard",
  "board",
  "list",
  "timeline",
  "master",
  "access",
  "team",
  "activity",
  "sprints",
  "planning",
  "users",
  "userSessions",
  "meetingNotes",
  "backup",
  "issueList",
  "connect",
  "dbExplorer",
  "wiki",
  "flowchart",
  "auditLog",
  "enterprise-audit",
  "qa",
  "settingsIntegration",
  "issueDetail",
  "userDetail",
]);

/**
 * Normalisasi query view ke AppView canonical
 */
export const normalizeView = (viewStr: string | null | undefined): AppView | null => {
  if (!viewStr) return null;
  const lower = viewStr.trim();
  if (lower === "kanban") return "board";
  if (lower === "planning") return "sprints";
  if (lower === "issueList") return "list";
  if (lower === "team") return "access";
  if (lower === "enterprise-audit") return "auditLog";
  if (VALID_VIEWS.has(lower)) {
    return lower as AppView;
  }
  return null;
};

/**
 * Tampilan yang TIDAK BOLEH ditulis ke address bar: keduanya butuh state di
 * dalam memori (`selectedTaskForDetail`, `selectedUserForDetail`). Ditulis lalu
 * dimuat ulang, tautannya membuka layar kosong — `switch` di AppRoutes berakhir
 * dengan `default: return null` dan cabang AppContainer tidak punya apa pun
 * untuk dirender.
 */
const TAMPILAN_SEMENTARA = new Set<string>(["issueDetail", "userDetail"]);

/**
 * Menuliskan satu tampilan ke address bar lewat pushState. Mengembalikan false
 * bila URL memang sudah begitu, supaya panggilan yang tidak mengubah apa pun
 * tidak menambah entri riwayat kosong.
 *
 * `projectId` punya tiga arti: string = proyek ini, `null` = hapus parameternya,
 * `undefined` = pemanggilnya tidak tahu, jadi jangan diutak-atik. Tanpa tiga
 * arti itu, cermin di bawah akan menghapus `projectId` yang baru saja ditulis
 * `navigate` — store masih kosong sementara URL-nya sudah terisi.
 */
const tulisUrl = (view: string, projectId?: string | null): boolean => {
  const params = new URLSearchParams(window.location.search);
  params.set("view", view);
  if (projectId === undefined) {
    // biarkan apa adanya
  } else if (projectId) {
    params.set("projectId", projectId);
  } else {
    params.delete("projectId");
    params.delete("project");
  }
  const urlBaru = `${window.location.pathname}?${params.toString()}`;
  if (urlBaru === `${window.location.pathname}${window.location.search}`) return false;
  window.history.pushState(
    { view, projectId: params.get("projectId") || params.get("project") || null },
    "",
    urlBaru
  );
  return true;
};

/**
 * useAppNavigation
 * Menyediakan sinkronisasi URL peramban (pushState / popstate) dengan currentView di store.
 * Mendukung tombol Back/Forward peramban, deep-linking via query `?view=...&projectId=...`,
 * dan refresh halaman tanpa kehilangan tampilan aktif.
 */
export const useAppNavigation = () => {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedProject = useAppStore((s) => s.selectedProject);
  const setSelectedProject = useAppStore((s) => s.setSelectedProject);
  const projects = useAppStore((s) => s.projects);

  // Baca URL saat inisialisasi / mount.
  //
  // SEKALI saja per muat halaman. Dependensinya `projects` karena `projectId`
  // dari URL baru bisa dicocokkan setelah daftar proyek tiba, tetapi daftar itu
  // juga diganti identitasnya setiap kali penarikan ulang — lewat tombol sinkron,
  // setelah proyek dibuat/diubah/dihapus, dan lewat event realtime `/projects`.
  // Selama efek ini dijalankan ulang, address bar yang sudah basi (halaman dulu
  // dibuka di `?view=list`, lalu pengguna berpindah menu tanpa URL ikut berubah)
  // menjadi pihak yang paling benar: ia menarik kembali tampilan ke nilai
  // lama TEPAT SETELAH navigasi pengguna. Itulah sebabnya "Lihat semua tugas"
  // di Dashboard bisa mendarat di Daftar Isu, bukan di Papan Kanban.
  const sudahDibaca = useRef(false);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (sudahDibaca.current) return;
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const projParam = params.get("projectId") || params.get("project");

      const parsedView = normalizeView(viewParam);
      if (parsedView && parsedView !== currentView) {
        setCurrentView(parsedView);
      }

      if (projParam && projects.length > 0) {
        const found = projects.find(
          (p) => p.id === projParam || p.key === projParam || (p as any).projectKey === projParam
        );
        if (found && (!selectedProject || selectedProject.id !== found.id)) {
          setSelectedProject(found);
        }
      }

      // `projectId` masih menunggu daftar proyek: jangan tutup bacanya sekarang,
      // kalau tidak tautan dalam yang membawa proyek jadi separuh berfungsi.
      if (!projParam || projects.length > 0) {
        sudahDibaca.current = true;
      }
    } catch (e) {
      // safe fallback
    }
  }, [projects]);

  // Cermin store → URL.
  //
  // `navigate` di bawah tersedia dan teruji, tetapi tidak pernah dipanggil dari
  // mana pun (AppContainer memakai hook ini apa adanya), jadi sejak 20 Agu
  // address bar tidak pernah tahu tampilan apa yang sedang dibuka. Efeknya
  // ganda: tombol Back/Forward keluar dari aplikasi alih-alih mundur antar menu,
  // dan muat ulang selalu kembali ke Dashboard. Menulis dari satu tempat di sini
  // menutup SEMUA jalur navigasi sekaligus — sidebar, kartu Dashboard, navigasi
  // bawah layar sentuh, pintasan papan ketik — tanpa meminta setiap pemanggil
  // mengganti `setCurrentView` dengan `navigate`.
  //
  // Yang ditulis HANYA nama tampilan. `projectId` sengaja tidak ikut: proyek
  // aktif sudah dipulihkan dari cache saat muat ulang, jadi id internal itu
  // tidak menambah apa pun selain panjang di address bar — sementara tautan
  // yang MEMANG membawa projectId tetap dibaca di atas dan tetap bisa dibuat
  // lewat `navigate`.
  //
  // Run pertama dilewati: pada commit pertama store masih memegang nilai awal
  // (dashboard) sementara URL bisa jadi sudah membawa `?view=list` dari tautan
  // yang dibuka. Menulis pada commit itu mendorong satu entri riwayat palsu
  // sebelum pembacaan URL di atas sempat berlaku.
  const cerminPertama = useRef(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (cerminPertama.current) {
      cerminPertama.current = false;
      return;
    }
    if (TAMPILAN_SEMENTARA.has(currentView)) return;
    try {
      tulisUrl(currentView);
    } catch (e) {
      // URL adalah kenyamanan, bukan kebenaran data — jangan pernah gagalkan render.
    }
  }, [currentView]);

  // Tangani tombol Back / Forward peramban
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      try {
        const params = new URLSearchParams(window.location.search);
        const viewFromUrl = normalizeView(params.get("view"));
        const stateView = event.state?.view ? normalizeView(event.state.view) : null;
        const targetView = stateView || viewFromUrl || "dashboard";

        setCurrentView(targetView);

        const projId = event.state?.projectId || params.get("projectId") || params.get("project");
        if (projId && projects.length > 0) {
          const found = projects.find(
            (p) => p.id === projId || p.key === projId || (p as any).projectKey === projId
          );
          if (found) {
            setSelectedProject(found);
          }
        }
      } catch (e) {
        // safe fallback
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [projects, setCurrentView, setSelectedProject]);

  // Fungsi navigasi yang menyinkronkan URL history
  const navigate = useCallback(
    (view: AppView, projectId?: string) => {
      setCurrentView(view);

      if (typeof window === "undefined") return;
      try {
        tulisUrl(view, projectId || selectedProject?.id || null);
      } catch (e) {
        // safe fallback
      }
    },
    [selectedProject, setCurrentView]
  );

  return {
    currentView,
    setCurrentView,
    navigate,
  };
};
