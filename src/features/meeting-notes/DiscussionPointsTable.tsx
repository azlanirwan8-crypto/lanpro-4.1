import { useTranslation } from "react-i18next";
import { confirmDeleteAlert, showSuccessAlert } from "../../lib/sweetalert";
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  getDiscussionPoints,
  createDiscussionPoint,
  updateDiscussionPoint,
  deleteDiscussionPoint,
  getDiscussionPointComments,
  createDiscussionPointComment,
  getUsers,
  deleteDiscussionPointFile,
} from "../../services/meetingService";
import { fetchTasks } from "../../services/taskService";
import {
  type DiscussionPoint,
  type DiscussionPointComment,
  type UserProfile,
  type AppRole,
  type PeranEfektif,
  type UserPermissions,
  type MasterData,
  type TautanDiskusi,
} from "../../types";
import { AiMeetingCompanion } from "./AiMeetingCompanion";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { hasPermission } from "../../lib/permissions";
import {
  suppressDiscussionPointsRefresh,
  shouldSuppressDiscussionPointsRefresh,
} from "../../lib/taskRefreshControl";
import { KepalaPapan, KakiPapan, KepalaTabel } from "./components/BagianPapan";
import { DiscussionPointMobileCardView } from "./components/DiscussionPointMobileCardView";
import { FormDiskusi } from "./components/FormDiskusi";
import { BarisDiskusi } from "./components/BarisDiskusi";
import { BarisCepat, BlokCepatMobile, type NilaiCepat } from "./components/BarisCepat";
import { LaciUtas } from "./components/LaciUtas";
import { useLampiranDiskusi } from "./lib/lampiran";
import type { OpsiJamak } from "./components/PemilihJamak";
import { useMobileAction } from "../../contexts/MobileActionContext";

interface DiscussionPointsTableProps {
  projectId: string;
  meetingId: string;
  userRole: PeranEfektif;
  currentUser: UserProfile | null;
  permissions?: Partial<UserPermissions>;
  projectMembers?: UserProfile[];
  masterData?: MasterData[];
}

export const DiscussionPointsTable: React.FC<DiscussionPointsTableProps> = ({
  projectId,
  meetingId,
  userRole,
  currentUser,
  permissions,
  projectMembers = [],
  masterData = [],
}) => {
  const { t } = useTranslation();
  const [points, setPoints] = useState<DiscussionPoint[]>([]);
  const [users, setUsers] = useState<UserProfile[]>(projectMembers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DiscussionPoint>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  // Inline Quick Add State — #703: satu objek, bukan lima `useState` yang harus
  // diingat satu per satu di dua tempat berbeda (baris desktop dan blok HP).
  const [nilaiCepat, setNilaiCepat] = useState<NilaiCepat>({
    concern: "",
    keterangan: "",
    tindakanLanjut: "",
    assigneeIds: [],
    tags: [],
    targetDate: "",
    links: [],
    berkas: [],
  });
  const ubahCepat = (bagian: Partial<NilaiCepat>) =>
    setNilaiCepat((lama) => ({ ...lama, ...bagian }));

  /* #703 (keputusan B1 = a) — sumber dropdown "Context / Tags" adalah DAFTAR ISU
   * proyek, bukan lagi label MasterData. Diambil sekali per proyek: isinya bisa
   * ratusan, jadi ia tidak boleh di-refetch tiap ketikan di kotak cari. */
  const [opsiIsu, setOpsiIsu] = useState<OpsiJamak[]>([]);
  /* #704/#709 — unggah satu berkas lalu daftarkan ke titik diskusi. Logikanya
   * pindah ke `lib/lampiran.ts`: induknya 780 baris dari batas 800 §4 sebelum
   * antrean berkas ini ada (§4: berkas di atas 800 harus dipecah). */
  const { sedangMengunggah, lampirkanKePoin } = useLampiranDiskusi(
    projectId,
    meetingId,
    currentUser?.uid
  );

  const [searchQuery, setSearchQuery] = useState("");
  /** #711 — versi yang sudah berhenti diketik dan boleh dikirim ke server. */
  const [kueriTertunda, setKueriTertunda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPoints, setTotalPoints] = useState(0);
  /** #639 — 5 tidak bisa diubah; kini 10 + pemilih seperti daftar lain. */
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedPoints = points;
  const totalPages = Math.max(1, Math.ceil(totalPoints / itemsPerPage) || 1);

  const handleToggleStatus = async (point: DiscussionPoint) => {
    if (!point.id) return;
    const nextStatus = point.status === "completed" ? "pending" : "completed";
    try {
      setPoints((prev) => prev.map((p) => (p.id === point.id ? { ...p, status: nextStatus } : p)));
      await updateDiscussionPoint(
        projectId,
        meetingId,
        point.id,
        { status: nextStatus },
        currentUser?.uid
      );
      showSuccessAlert(
        t("alerts.successTitle"),
        t("alerts.statusChanged", {
          status:
            nextStatus === "completed" ? t("discussion.statusDone") : t("discussion.statusPending"),
        })
      );
    } catch (e: any) {
      toast.error(t("toast.statusChangeFailed") + e.message);
      fetchPoints();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, meetingId, projectId]);

  /* #711 — jeda 350 ms antara ketikan dan permintaan. Sebelumnya `searchQuery`
   * ikut menentukan kapan papan dimuat, jadi "payment gateway" mengirim belasan
   * permintaan dan yang terakhir menang — dengan Neon yang putus-putus (§0.8)
   * layar berkedip ke hasil sementara. Yang diketik dan yang dikirim kini dua
   * state; kotak cari tetap instan karena ia membaca `searchQuery`. */
  useEffect(() => {
    const jeda = setTimeout(() => setKueriTertunda(searchQuery.trim()), 350);
    return () => clearTimeout(jeda);
  }, [searchQuery]);

  useEffect(() => {
    fetchPoints();
  }, [meetingId, projectId, currentPage, kueriTertunda, itemsPerPage]);

  /* #711 — `projectMembers` tidak lagi ikut menentukan kapan papan dimuat. Ia
   * array dari induk, dan setiap render induk yang menyodorkan array baru
   * membuat seluruh papan di-refetch padahal tidak ada isinya yang berubah. */
  useEffect(() => {
    if (projectMembers.length > 0) {
      setUsers(projectMembers);
    } else {
      fetchUsers();
    }
  }, [projectId, projectMembers]);

  useEffect(() => {
    let socket: any;
    try {
      socket = io();
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR]", err);
      });
    } catch (err) {
      console.error("[SOCKET FATAL]", err);
    }

    if (socket) {
      socket.on("data_changed", (event: any) => {
        if (shouldSuppressDiscussionPointsRefresh()) return;
        // #322 — abaikan event proyek lain
        if (event?.projectId && projectId && event.projectId !== projectId) return;
        if (event.path?.includes("/discussionPoints") || event.path?.includes("/meetings")) {
          fetchPoints();
        }
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [meetingId, projectId]);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers(currentUser?.uid);
      setUsers(fetchedUsers);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
    }
  };

  /**
   * #703 (B1 = a) — daftar isu untuk dropdown Context/Tags.
   *
   * `rootsOnly: false`: yang dicari pemilih ini justru SEMUA isu, termasuk anak,
   * karena titik diskusi paling sering menunjuk pekerjaan yang detail. Isu yang
   * tidak punya tanggal pun tetap masuk — ini bukan papan, ini daftar rujukan.
   */
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const data = await fetchTasks(projectId, { rootsOnly: false });
        if (batal || data?.status !== "success") return;
        const daftar = Array.isArray(data.data) ? data.data : [];
        setOpsiIsu(
          daftar
            .filter((t: any) => t && t.id)
            .map((t: any) => ({
              id: String(t.id),
              label: String(t.title || t.summary || t.name || t.id),
            }))
        );
      } catch (error) {
        // Dropdown yang kosong lebih jujur daripada layar yang melempar: yang
        // sedang dibaca pengguna adalah catatan rapat, bukan daftarnya.
        console.error("Gagal memuat daftar isu untuk tag:", error);
      }
    })();
    return () => {
      batal = true;
    };
  }, [projectId]);

  const canAdd = hasPermission(userRole, "meetingNotes", "create", false, permissions);

  const { registerAction, unregisterAction } = useMobileAction();

  useEffect(() => {
    if (canAdd) {
      registerAction({
        id: "meeting-detail-add-point",
        label: t("discussion.addPoint") || "Tambah Titik Diskusi",
        onClick: () => {
          const candidates = [
            "quick-add-concern",
            "quick-add-concern-desktop",
            "quick-add-section",
          ];
          const el = candidates
            .map((id) => document.getElementById(id))
            .find((node) => node && (node as HTMLElement).offsetParent !== null);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            if ("focus" in el && typeof (el as HTMLElement).focus === "function") {
              (el as HTMLElement).focus();
            }
          }
        },
        canCreate: canAdd,
      });
    } else {
      unregisterAction("meeting-detail-add-point");
    }
    return () => unregisterAction("meeting-detail-add-point");
  }, [canAdd, registerAction, unregisterAction, t]);

  // Handle Live Inline Quick Add
  const handleLiveQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      toast.error(t("toast.pleaseLoginFirst"));
      return;
    }
    if (!canAdd) {
      toast.error(t("toast.noPermAddPoint"));
      return;
    }
    if (!nilaiCepat.concern.trim()) {
      toast.error(t("toast.concernRequired"));
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    const tempId = `temp-dp-${crypto.randomUUID()}`;
    /* #709 — berkas diantre lebih dulu dan baru naik SETELAH id sungguhan pulang;
     * daftarnya dibaca dari state yang sama, jadi ia direkam sebelum isian ini
     * dikosongkan di bawah. */
    const berkasTunda = nilaiCepat.berkas;
    const tautan: TautanDiskusi[] = nilaiCepat.links
      .map((l) => ({ ...l, url: l.url.trim(), label: (l.label || "").trim() || null }))
      .filter((l) => /^https?:\/\//i.test(l.url));
    const payload: any = {
      concern: nilaiCepat.concern.trim(),
      keterangan: nilaiCepat.keterangan.trim(),
      // #703 — baris cepat kini mengirim PENERIMA JAMAK dan TAG ISU.
      assigneeIds: nilaiCepat.assigneeIds,
      assignTo: nilaiCepat.assigneeIds[0] || "",
      tags: nilaiCepat.tags,
      // #704 butir 5 + #709: tautan ikut dibuat bersama titiknya. Yang lolos
      // hanya http/https — `tautanMasuk` di server menolak sisanya, dan
      // menolak di sini berarti tidak membuang titiknya karena satu alamat salah.
      links: tautan,
      tindakanLanjut: nilaiCepat.tindakanLanjut.trim(),
      targetDate: nilaiCepat.targetDate || "",
      status: "pending",
      authorId: currentUser.uid,
    };

    const placeholder: DiscussionPoint = {
      id: tempId,
      meetingId,
      ...payload,
      createdAt: new Date().toISOString(),
    };

    suppressDiscussionPointsRefresh(8000);
    setPoints((prev) => [placeholder, ...prev]);
    setNilaiCepat({
      concern: "",
      keterangan: "",
      tindakanLanjut: "",
      assigneeIds: [],
      tags: [],
      targetDate: "",
      links: [],
      berkas: [],
    });
    toast.success(t("alerts.pointAdded"));

    try {
      const realId = await createDiscussionPoint(projectId, meetingId, payload, currentUser.uid);
      setPoints((prev) => prev.map((p) => (p.id === tempId ? { ...p, id: realId } : p)));
      /* #709 — berkas menempel SETELAH titiknya ada. Baris
       * `discussion_point_files` menunjuk `point_id`, jadi tidak ada jalur lain
       * yang jujur: mengunggah sebelum titiknya ada akan meninggalkan berkas
       * yatim di penyimpanan. Satu per satu, bukan serentak — setiap berkas
       * butuh satu permintaan unggah lalu satu permintaan daftar. */
      if (berkasTunda.length > 0) {
        for (const berkas of berkasTunda) await lampirkanKePoin(realId, berkas);
        await fetchPoints();
      }
    } catch (error: any) {
      setPoints((prev) => prev.filter((p) => p.id !== tempId));
      console.error("Error saving point:", error);
      toast.error(t("toast.pointAddFailed") + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (point: DiscussionPoint) => {
    const isOwner = point.authorId === (currentUser?.uid || "");
    if (!hasPermission(userRole, "meetingNotes", "update", isOwner, permissions)) {
      toast.error(t("toast.noPermEditPoint"));
      return;
    }
    setEditingId(point.id!);
    setEditForm(point);
  };

  // Thread Comments Drawer State — #703: teks kotak balas tidak lagi ikut di
  // sini; ia milik `LaciUtas`, dan setiap ketikan tidak meredupkan seluruh tabel.
  const [activeThreadPoint, setActiveThreadPoint] = useState<DiscussionPoint | null>(null);
  const [threadComments, setThreadComments] = useState<DiscussionPointComment[]>([]);
  const [isSendingComment, setIsSendingComment] = useState(false);

  /**
   * #711 — komentar hanya dimuat untuk satu titik diskusi: yang sedang dibuka
   * di laci. Angka di kolom Utas tidak lagi membacanya, ia datang dari
   * `commentsCount` yang ditempel repository untuk seluruh halaman dalam satu
   * kueri. Sebelum ini setiap baris memanggil endpoint-nya sendiri.
   */
  const ambilKomentar = async (pointId: string): Promise<DiscussionPointComment[]> => {
    try {
      return await getDiscussionPointComments(pointId, currentUser?.uid);
    } catch (e) {
      console.error("Failed to fetch comments:", e);
      return [];
    }
  };

  const handleOpenThreadDrawer = async (point: DiscussionPoint) => {
    setActiveThreadPoint(point);
    if (point.id) setThreadComments(await ambilKomentar(point.id));
  };

  const handleSendThreadComment = async (teks: string) => {
    if (!activeThreadPoint?.id) return;
    if (!teks.trim()) {
      toast.error(t("toast.writeReplyFirst"));
      return;
    }

    setIsSendingComment(true);
    try {
      const userName =
        currentUser?.displayName ||
        currentUser?.username ||
        (currentUser as any)?.nama_lengkap ||
        (currentUser as any)?.name ||
        "Member";
      await createDiscussionPointComment(
        activeThreadPoint.id,
        {
          userId: currentUser?.uid || (currentUser as any)?.id,
          userName,
          commentText: teks.trim(),
        },
        currentUser?.uid || (currentUser as any)?.id
      );

      // Popup "Balasan berhasil dikirim!" DIHAPUS atas keputusan pemilik proyek
      // 16 Agu 2026. Balasannya langsung muncul di daftar tepat di bawah kotak
      // ketik, jadi dialog modal yang harus ditutup manual hanya menambah satu
      // klik untuk memberi tahu hal yang sudah terlihat sendiri.
      //
      // Konfirmasi tetap ada untuk aksi yang HASILNYA TIDAK LANGSUNG TERLIHAT —
      // menghapus poin, menyimpan perubahan, impor AI. Bedanya di situ, bukan
      // pada berhasil atau tidaknya.
      const updated = await ambilKomentar(activeThreadPoint.id);
      setThreadComments(updated);
      /* #711 — angka di kolom Utas ikut naik tanpa menunggu muat ulang papan.
       * Polanya sama seperti `AppContainer.tsx:3868` untuk komentar tugas. */
      setPoints((prev) =>
        prev.map((x) =>
          x.id === activeThreadPoint.id ? { ...x, commentsCount: (x.commentsCount ?? 0) + 1 } : x
        )
      );
    } catch (e: any) {
      toast.error(t("toast.replySendFailed") + e.message);
    } finally {
      setIsSendingComment(false);
    }
  };

  const fetchPoints = async () => {
    try {
      const result = await getDiscussionPoints(projectId, meetingId, currentUser?.uid, {
        page: currentPage,
        limit: itemsPerPage,
        search: kueriTertunda,
      });
      const fetchedPoints = result.data as DiscussionPoint[];
      setPoints(fetchedPoints);
      setTotalPoints(result.meta?.total ?? fetchedPoints.length);
      // #711 — tidak ada lagi `fetchCommentsForPoint()` per baris: angkanya
      // sudah ikut menempel pada setiap titik diskusi (`commentsCount`).
    } catch (error: any) {
      console.error("Failed to fetch discussion points:", error);
    }
  };

  const handleDelete = async (pointId: string) => {
    const isConfirmed = await confirmDeleteAlert(
      t("alerts.confirmTitle"),
      "Data poin diskusi ini akan dihapus secara permanen!"
    );
    if (!isConfirmed) return;

    setIsSaving(true);
    suppressDiscussionPointsRefresh(8000);
    setPoints((prev) => prev.filter((p) => p.id !== pointId));
    toast.success(t("alerts.pointDeleted"));

    try {
      await deleteDiscussionPoint(projectId, meetingId, pointId, currentUser?.uid);
    } catch (error: any) {
      fetchPoints();
      toast.error(error.message || "Failed to delete point.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const point = points.find((p) => p.id === editingId);
    if (!point) return;

    const isOwner = point.authorId === (currentUser?.uid || "");
    if (!hasPermission(userRole, "meetingNotes", "update", isOwner, permissions)) {
      toast.error(t("toast.noPermEditPoint"));
      return;
    }

    if (!editForm.concern?.trim()) {
      toast.error(t("toast.concernEmpty"));
      return;
    }

    setIsSaving(true);
    const snapshot = { ...editForm };
    suppressDiscussionPointsRefresh(8000);
    setPoints((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...snapshot } : p)));
    setEditingId(null);
    setEditForm({});
    toast.success(t("alerts.pointSaved"));

    try {
      await updateDiscussionPoint(projectId, meetingId, editingId, snapshot, currentUser?.uid);
    } catch (error: any) {
      fetchPoints();
      toast.error(error.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  /** Pemakaian laci sunting: hasil unggah langsung ditempel ke formulir.
   *  Jalur unggahnya sendiri ada di `lib/lampiran.ts` (#704/#709, §4). */
  const unggahBerkas = async (file: File) => {
    if (!editingId) return;
    const baru = await lampirkanKePoin(editingId, file);
    if (baru) setEditForm((lama) => ({ ...lama, files: [...(lama.files || []), baru] }));
  };

  const hapusBerkas = async (fileId: string) => {
    if (!editingId || !currentUser) return;
    const sebelumnya = editForm.files || [];
    setEditForm((lama) => ({ ...lama, files: (lama.files || []).filter((b) => b.id !== fileId) }));
    try {
      await deleteDiscussionPointFile(projectId, meetingId, editingId, fileId, currentUser.uid);
    } catch (error: any) {
      setEditForm((lama) => ({ ...lama, files: sebelumnya }));
      toast.error(error?.message || t("toast.gagalUnggahBerkas"));
    }
  };

  const userOptions = projectMembers.map((m) => ({
    id: m?.uid || "",
    label: m?.displayName || m?.username || "Unknown User",
  }));

  /* #703 — opsi pemilih jamak: anggota proyek (PIC) dan isu (Context/Tags). */
  const opsiPenerima: OpsiJamak[] = projectMembers
    .map((m) => ({
      id: String(m?.uid || m?.id || ""),
      label: m?.displayName || m?.username || m?.name || m?.email || "",
    }))
    .filter((o) => !!o.id && !!o.label);

  return (
    <div className="bg-surface border border-border-subtle/80 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0 font-sans text-left">
      {/* #703 — kepala dan kaki papan ikut keluar ke components/BagianPapan.tsx:
          induknya masih melewati batas 800 baris §4 sesudah empat blok lain pergi,
          dan keduanya tidak punya state sendiri — hanya props. */}
      <KepalaPapan
        tampilAI={showAiAssistant}
        onToggleAI={() => setShowAiAssistant(!showAiAssistant)}
        cari={searchQuery}
        onCari={(teks) => {
          setSearchQuery(teks);
          setCurrentPage(1);
        }}
      />

      {/* #703/#704 — isinya pindah ke components/FormDiskusi.tsx: notes dan
          follow-up jadi textarea, PIC jamak, Context/Tags dari Daftar Isu,
          tautan jamak, dan unggah gambar. Induknya 1.255 baris (§4). */}
      {editingId !== null && (
        <FormDiskusi
          form={editForm}
          onUbah={(bagian) => setEditForm((lama) => ({ ...lama, ...bagian }))}
          onSave={saveEdit}
          onBatal={() => {
            setEditingId(null);
            setEditForm({});
          }}
          isSaving={isSaving}
          opsiPenerima={opsiPenerima}
          opsiIsu={opsiIsu}
          masterData={masterData}
          onUnggah={unggahBerkas}
          onHapusBerkas={hapusBerkas}
          sedangMengunggah={sedangMengunggah}
        />
      )}

      {/* AREA KONTEN UTAMA (AI ASSISTANT VS DISCUSSION TABLE) */}
      {showAiAssistant ? (
        <div className="pt-4 pb-2 w-full">
          <AiMeetingCompanion
            projectId={projectId}
            meeting={{ id: meetingId, title: "Meeting Discussion" } as any}
            currentUser={currentUser}
            projectMembers={projectMembers}
            onPointsImported={() => {
              setShowAiAssistant(false);
              fetchPoints();
              showSuccessAlert(t("alerts.successTitle"), t("alerts.pointImported"));
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile Card List View (< 640px) */}
          <div className="sm:hidden flex-1 overflow-y-auto p-4 space-y-3">
            {canAdd && (
              <BlokCepatMobile
                nilai={nilaiCepat}
                onUbah={ubahCepat}
                onTambah={() => handleLiveQuickAdd()}
                sedangMenyimpan={isSaving}
                opsiPenerima={opsiPenerima}
                opsiIsu={opsiIsu}
              />
            )}
            {paginatedPoints.length === 0 ? (
              <div className="text-center py-12 text-content-subtle">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary shadow-2xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="font-normal text-content-strong text-xs">
                  {t("meetings.emptyTitle")}
                </p>
                <p className="text-[11px] text-content-subtle mt-0.5">{t("meetings.emptyHint")}</p>
              </div>
            ) : (
              <DiscussionPointMobileCardView
                points={paginatedPoints}
                projectMembers={projectMembers}
                masterData={masterData}
                onOpenThread={(point) => handleOpenThreadDrawer(point)}
                onEditPoint={(point) => startEdit(point)}
                onDeletePoint={(id) => handleDelete(id)}
                onToggleStatus={(point) => handleToggleStatus(point)}
                canEdit={(point) =>
                  hasPermission(
                    userRole,
                    "meetingNotes",
                    "update",
                    point.authorId === (currentUser?.uid || ""),
                    permissions
                  )
                }
                canDelete={(point) =>
                  hasPermission(
                    userRole,
                    "meetingNotes",
                    "delete",
                    point.authorId === (currentUser?.uid || ""),
                    permissions
                  )
                }
                canToggleStatus={canAdd}
                currentUserId={currentUser?.uid}
              />
            )}
          </div>

          {/* Desktop Table Container (>= 640px)
              #707 — satu wadah scroll, dua sumbu, dan ia harus yang TERDEKAT
              dengan sel kepala yang melekat. Sebelumnya ada DUA: `overflow-x-auto`
              di div ini (CSS melipat `overflow-y: visible` menjadi `auto` begitu
              sumbu satunya auto) ditambah `overflow-x-auto` punyanya
              `ResponsiveTable` di dalamnya. Sticky mengunci ke scrollport
              terdekat, yaitu yang dalam — yang tingginya mengikuti isi sehingga
              tidak pernah bergulir — jadi kepala tabel tetap ikut naik.
              #708 — `table-fixed`: lebar kolom dibaca dari kepala saja
              (`KepalaTabel`), bukan dari isi terpanjang, supaya satu catatan
              sepanjang paragraf tidak lagi menggeser seluruh papan. */}
          {/* #714 — `min-w` harus PERSIS sama dengan jumlah lebar di
              `KepalaTabel`; #715 menaikkan itu dari 1.468 ke 1.588 px ketika PIC
              dan Target Date dipisah kembali ke kolomnya sendiri. Dengan
              `table-fixed` dua angka yang berbeda berarti kolom melebar sendiri
              atau tabel mulai terpotong lagi — dan `kepalaSelSejajar-715.test.ts`
              kini menghitungnya, bukan mempercayainya. */}
          <div className="hidden sm:block flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-[1588px] table-fixed border-separate border-spacing-0 text-left text-xs">
              <KepalaTabel />
              <tbody className="text-content-body">
                {paginatedPoints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-content-subtle">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary shadow-2xs">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="font-normal text-content-strong text-xs">
                        {t("meetings.emptyTitle")}
                      </p>
                      <p className="text-[11px] text-content-subtle mt-0.5">
                        {t("meetings.emptyHint")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedPoints.map((p, index) => {
                    const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                    // #703 (B2 = b) — penerimanya kini DAFTAR, bukan satu orang.
                    // Baris lama tetap dipakai bila daftar jamak kosong, jadi data
                    // yang sudah ada sebelum #703 tidak tiba-tiba yatim.
                    const idPenerima =
                      Array.isArray(p.assigneeIds) && p.assigneeIds.length > 0
                        ? p.assigneeIds
                        : p.assignTo || p.assignee_id
                          ? [String(p.assignTo || p.assignee_id)]
                          : [];
                    const namaPenerima = idPenerima
                      .map((id) => {
                        const orang = projectMembers.find((m) => (m.uid || m.id) === id);
                        return orang ? orang.displayName || orang.username || orang.name || id : id;
                      })
                      .filter(Boolean);
                    const assigneeUser = projectMembers.find(
                      (m) => (m.uid || m.id) === (p.assignTo || p.assignee_id)
                    );
                    const assigneeName = assigneeUser
                      ? assigneeUser.displayName || assigneeUser.username
                      : p.assignTo || t("newTask.unassigned");
                    const isOwner = p.authorId === (currentUser?.uid || "");

                    return (
                      <BarisDiskusi
                        key={p.id || index}
                        p={p}
                        nomor={String(srNo).padStart(2, "0")}
                        assigneeName={assigneeName}
                        namaPenerima={namaPenerima}
                        masterData={masterData}
                        jumlahKomentar={p.commentsCount ?? 0}
                        bolehSunting={hasPermission(
                          userRole,
                          "meetingNotes",
                          "update",
                          isOwner,
                          permissions
                        )}
                        bolehHapus={hasPermission(
                          userRole,
                          "meetingNotes",
                          "delete",
                          isOwner,
                          permissions
                        )}
                        onOpenThread={() => handleOpenThreadDrawer(p)}
                        onEdit={() => startEdit(p)}
                        onDelete={() => handleDelete(p.id!)}
                        onToggleStatus={() => handleToggleStatus(p)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* #703/#704 — baris cepat pindah ke components/BarisCepat.tsx:
              catatan kini textarea, PIC dan tag kini pemilih jamak.
              #712 — ia keluar dari `<tbody>`: selama masih menjadi `<tr>`, ia
              ikut wadah gulir `min-w-[1818px]` dan tombol Add-nya tidak pernah
              terlihat bersamaan dengan yang sedang diketik. */}
          {canAdd && (
            <BarisCepat
              nilai={nilaiCepat}
              onUbah={ubahCepat}
              onTambah={() => handleLiveQuickAdd()}
              sedangMenyimpan={isSaving}
              opsiPenerima={opsiPenerima}
              opsiIsu={opsiIsu}
            />
          )}

          <KakiPapan
            tampil={paginatedPoints.length}
            total={totalPoints}
            halaman={currentPage}
            totalPages={totalPages}
            perHalaman={itemsPerPage}
            onPerHalaman={(jumlah) => {
              setItemsPerPage(jumlah);
              setCurrentPage(1);
            }}
            onHalaman={setCurrentPage}
          />
        </div>
      )}

      {/* #703 — laci utas pindah ke components/LaciUtas.tsx: induknya masih
          melewati batas 800 baris §4 setelah tiga blok lain keluar, dan kotak
          balas tidak perlu menjadi state seluruh tabel. */}
      {activeThreadPoint && (
        <LaciUtas
          titik={activeThreadPoint}
          komentar={threadComments}
          anggota={users}
          pengguna={currentUser}
          mengirim={isSendingComment}
          onKirim={(teks) => handleSendThreadComment(teks)}
          onTutup={() => setActiveThreadPoint(null)}
        />
      )}
    </div>
  );
};

export default DiscussionPointsTable;
