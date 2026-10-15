import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, CirclePause, PieChart, Users } from "lucide-react";
import { cn } from "../../../lib/utils";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { cariMaster } from "../../../lib/warnaLabel";
import { statusSelesai } from "../../../lib/statusSelesai";
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

  /* Bar beban lahir selebar 0 lalu melebar ke porsinya sesudah mount, supaya
   * transisinya terlihat sebagai animasi, bukan angka yang tiba-tiba ada. */
  const [barSiap, setBarSiap] = useState(false);
  useEffect(() => setBarSiap(true), []);

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

  /** Beban per penanggung jawab: porsi tugas selesai masing-masing anggota. */
  const beban = (() => {
    const hitung = new Map<string, { jumlah: number; selesai: number }>();
    for (const x of sprintTasks) {
      const kunci = x.assigneeId ? String(x.assigneeId) : "";
      const isi = hitung.get(kunci) || { jumlah: 0, selesai: 0 };
      isi.jumlah += 1;
      if (statusSelesai(x.status, masterData)) isi.selesai += 1;
      hitung.set(kunci, isi);
    }
    return Array.from(hitung.entries())
      .map(([uid, { jumlah, selesai }]) => ({
        uid,
        jumlah,
        selesai,
        persen: jumlah > 0 ? Math.round((selesai / jumlah) * 100) : 0,
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

      <div className="bg-surface border border-border-subtle/80 rounded-lg px-2.5 py-2 flex flex-col min-w-0">
        {beban.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[11px] font-normal text-content-muted text-center px-2">
            {t("planning.perMemberEmpty", "Belum ada tugas yang ditugaskan")}
          </div>
        ) : (
          /* Kartu lebar berjala dua kolom, mengikuti rujukan pemilik: nama utuh
             terbaca satu baris, persentase tercetak permanen sebagai pil di
             kanan atas dan angka kecil di bawah bar — bukan gelembung hover.
             Kartu sempit satu baris tidak mungkin memuat ketiganya sekaligus. */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[21rem] overflow-y-auto custom-scrollbar pr-1">
            {beban.map((b) => (
              <div
                key={b.uid || "tanpa-penanggung"}
                data-testid="kartu-beban"
                className="bg-surface-sunken/60 border border-border-subtle/70 rounded-lg px-3 py-2.5 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-px hover:shadow-xs hover:border-border-default hover:bg-surface-sunken"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {b.uid ? (
                    <UserAvatar uid={b.uid} members={projectMembers} size="md" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-content-muted" />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 text-xs font-medium text-content-strong">
                    {b.nama}
                  </span>
                  <span className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-content-subtle tabular-nums">
                      {b.persen}%
                    </span>
                    <span className="text-[11px] font-semibold text-content-subtle tabular-nums">
                      {b.selesai}/{b.jumlah}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {/* Track wajib terlihat walau isinya 0%: `bg-surface` di atas
                      kartu `bg-surface-sunken/60` nyaris sewarna, dan bar 0%
                      karenanya terbaca sebagai "bar hilang". */}
                  <div className="h-1.5 rounded-full bg-surface-sunken border border-border-subtle overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-out",
                        b.uid ? "bg-primary" : "bg-primary/40"
                      )}
                      style={{ width: `${barSiap ? b.persen : 0}%` }}
                    />
                  </div>
                  <span className="self-end text-[10px] font-normal text-content-muted tabular-nums">
                    {b.persen}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
