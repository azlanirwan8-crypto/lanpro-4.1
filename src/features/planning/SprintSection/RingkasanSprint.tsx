import { useTranslation } from "react-i18next";
import React from "react";
import { Calendar, CheckCircle2, CirclePause, PieChart, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { cariMaster } from "../../../lib/warnaLabel";
import { MasterData, Task, UserProfile } from "../../../types";

/**
 * Ringkasan satu sprint: dua baris metrik (Isu · Hold, lalu Kemajuan · Selesai)
 * disandingkan panel beban per penanggung jawab.
 *
 * Permintaan pemilik 15 Okt — empat kartu besar sebelumnya memakan tinggi kepala
 * sprint dan menampilkan poin dua kali (kartu sendiri + sublabel Kemajuan). Poin
 * tetap dipakai sebagai pembagi kemajuan, hanya kartunya yang diganti Hold.
 */
export interface RingkasanSprintProps {
  sprintTasks: Task[];
  masterData: MasterData[];
  projectMembers: UserProfile[];
  totalTasks: number;
  doneTasks: number;
  totalPoints: number;
  donePoints: number;
  completionPercentage: number;
}

export const RingkasanSprint: React.FC<RingkasanSprintProps> = ({
  sprintTasks,
  masterData,
  projectMembers,
  totalTasks,
  doneTasks,
  totalPoints,
  donePoints,
  completionPercentage,
}) => {
  const { t } = useTranslation();

  /* "Hold" adalah salah satu prioritas di MasterData, dan tiap instalasi boleh
   * memberi kode/label sendiri — jadi dicocokkan lewat baris masternya, bukan
   * lewat string keras. Hanya bila barisnya belum ada (data belum termuat)
   * pencocokan jatuh ke label, supaya angkanya tidak mendadak 0. */
  const barisHold = cariMaster(masterData, "priority", "hold");
  const hitungHold = () =>
    sprintTasks.filter((x) => {
      const prioritas = x.priority;
      if (!prioritas) return false;
      return barisHold
        ? cariMaster(masterData, "priority", prioritas) === barisHold
        : prioritas.toLowerCase().includes("hold");
    }).length;

  const namaAnggota = (uid: string) => {
    const anggota = projectMembers.find(
      (m) => m && (String((m as any).uid) === uid || String((m as any).id) === uid)
    ) as any;
    return (
      anggota?.displayName ||
      anggota?.nama_lengkap ||
      anggota?.name ||
      anggota?.username ||
      anggota?.email ||
      uid
    );
  };

  /** Beban per penanggung jawab; lebar bar = porsi terhadap beban terbesar. */
  const beban = (() => {
    const hitung = new Map<string, number>();
    for (const x of sprintTasks) {
      const kunci = x.assigneeId ? String(x.assigneeId) : "";
      hitung.set(kunci, (hitung.get(kunci) || 0) + 1);
    }
    const tertinggi = Math.max(1, ...Array.from(hitung.values()));
    return Array.from(hitung.entries())
      .map(([uid, jumlah]) => ({
        uid,
        jumlah,
        persen: Math.round((jumlah / tertinggi) * 100),
        nama: uid ? namaAnggota(uid) : t("planning.unassigned", "Belum Ditugaskan"),
      }))
      .sort(
        (a, b) =>
          (a.uid ? 0 : 1) - (b.uid ? 0 : 1) || b.jumlah - a.jumlah || a.nama.localeCompare(b.nama)
      );
  })();

  const kartu = [
    {
      kunci: "isu",
      nilai: String(totalTasks),
      label: t("planning.issues", "Issues"),
      ikon: <Calendar className="w-3.5 h-3.5" />,
      gaya: "bg-primary/10 text-primary",
    },
    {
      kunci: "hold",
      nilai: String(hitungHold()),
      label: t("planning.hold", "Hold"),
      ikon: <CirclePause className="w-3.5 h-3.5" />,
      gaya: "bg-warning/10 text-warning-text",
    },
    {
      kunci: "kemajuan",
      nilai: `${completionPercentage}%`,
      label:
        totalPoints > 0
          ? `${t("planning.progress", "Progress")} · ${donePoints}/${totalPoints} pts`
          : `${t("planning.progress", "Progress")} · ${doneTasks}/${totalTasks}`,
      ikon: <PieChart className="w-3.5 h-3.5" />,
      gaya: "bg-info/10 text-info-text",
    },
    {
      kunci: "selesai",
      nilai: `${doneTasks}/${totalTasks}`,
      label: t("planning.completed", "Completed"),
      ikon: <CheckCircle2 className="w-3.5 h-3.5" />,
      gaya: "bg-success/10 text-success-text",
    },
  ];

  return (
    /* Grid menyamakan tinggi kedua sisi (items-stretch default), jadi panel
     * anggota selalu sepasang tinggi dengan baris 1–2 di kiri. */
    <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-2 p-2 bg-surface-sunken/50 rounded-xl border border-border-subtle/70 mt-1">
      <div className="grid grid-cols-2 gap-2">
        {kartu.map((k) => (
          <div
            key={k.kunci}
            className="group bg-surface border border-border-subtle/80 rounded-lg px-2.5 py-2 flex items-center gap-2.5 min-w-0 transition-all duration-200 hover:-translate-y-px hover:shadow-xs hover:border-border-default"
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
                k.gaya
              )}
            >
              {k.ikon}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-content-strong leading-none tabular-nums">
                {k.nilai}
              </div>
              <div className="text-[11px] font-normal text-content-subtle mt-0.5 truncate">
                {k.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border-subtle/80 rounded-lg px-2.5 py-2 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Users className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-medium text-content-subtle truncate">
            {t("planning.perMember", "Beban per anggota")}
          </span>
          <span className="ml-auto text-[10px] font-normal text-content-muted tabular-nums shrink-0">
            {beban.length}
          </span>
        </div>
        {beban.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[11px] font-normal text-content-muted text-center px-2">
            {t("planning.perMemberEmpty", "Belum ada tugas yang ditugaskan")}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-1.5 content-start pr-0.5">
            {beban.map((b) => (
              <div
                key={b.uid || "tanpa-penanggung"}
                className="group flex items-center gap-2 min-w-0"
              >
                {b.uid ? (
                  <UserAvatar
                    uid={b.uid}
                    members={projectMembers}
                    size="xs"
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-surface-sunken border border-border-subtle flex items-center justify-center shrink-0">
                    <Users className="w-3 h-3 text-content-muted" />
                  </span>
                )}
                <span
                  className="flex-1 min-w-0 truncate text-[11px] font-normal text-content-strong"
                  title={b.nama}
                >
                  {b.nama}
                </span>
                <span className="text-[11px] font-semibold text-content-subtle tabular-nums shrink-0">
                  {b.jumlah}
                </span>
                <span className="block w-14 h-1.5 rounded-full bg-surface-sunken overflow-hidden shrink-0">
                  <span
                    className={cn(
                      "block h-full rounded-full transition-all duration-700 ease-out",
                      b.uid ? "bg-primary" : "bg-primary/40"
                    )}
                    style={{ width: `${b.persen}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
