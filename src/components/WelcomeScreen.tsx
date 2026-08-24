import React from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Book,
  CircleDashed,
  Clock,
  ListTodo,
  Lock,
  Plus,
  Target,
  Trello,
  UserCog,
  Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";

interface WelcomeScreenProps {
  /** Nama yang disapa. Boleh kosong; sapaan jatuh ke bentuk umum. */
  namaPengguna?: string;
  /** Membuka modal profil — satu-satunya aksi nyata pengguna tanpa proyek. */
  onOpenProfile: () => void;
  /** Hanya admin: memunculkan jalan keluar berupa pembuatan proyek. */
  bolehBuatProyek: boolean;
  onCreateProject: () => void;
}

/**
 * Layar sambutan untuk pengguna yang BELUM tergabung di proyek mana pun —
 * item #160.
 *
 * Ditaruh di `components/`, bukan `features/`: `validate-permissions`
 * mengharuskan setiap folder di `features/` punya kunci di `UserPermissions`,
 * dan layar ini justru layar untuk pengguna yang BELUM punya izin apa pun —
 * membuatkan kunci RBAC untuknya akan mengarang modul yang tidak ada.
 *
 * Kartu kosong yang lama menyuruh "pilih salah satu proyek dari sidebar",
 * padahal daftar proyek di sidebar justru sedang kosong. Layar ini
 * menggantikannya khusus untuk kondisi `projects.length === 0`; kondisi
 * "punya proyek tapi belum memilih" tetap memakai kartu lama, sebab di sana
 * kalimat itu memang benar.
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  namaPengguna,
  onOpenProfile,
  bolehBuatProyek,
  onCreateProject,
}) => {
  const { t } = useTranslation();

  const modulTerkunci = [
    { ikon: <Trello className="w-4 h-4" />, judul: t("sidebar.kanbanBoard") },
    { ikon: <Target className="w-4 h-4" />, judul: t("sidebar.planningSprint") },
    { ikon: <ListTodo className="w-4 h-4" />, judul: t("sidebar.issueList") },
    { ikon: <Video className="w-4 h-4" />, judul: t("sidebar.meetingNotes") },
    { ikon: <Book className="w-4 h-4" />, judul: t("sidebar.documentation") },
    { ikon: <Clock className="w-4 h-4" />, judul: t("sidebar.roadmapTimeline") },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-surface-sunken">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <h1 className="text-2xl font-semibold text-content-strong mb-1.5">
            {namaPengguna
              ? t("welcome.greetingNamed", { nama: namaPengguna })
              : t("welcome.greeting")}
          </h1>
          <p className="text-sm text-content-muted max-w-xl">{t("welcome.noProjectYet")}</p>

          {/* Langkah — status jujur, bukan ajakan yang tidak bisa dijalankan */}
          <div className="mt-7 space-y-2.5">
            <div className="flex items-start gap-3 px-4 py-5 rounded-xl bg-surface border border-border-subtle">
              <BadgeCheck className="w-5 h-5 shrink-0 text-success mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-content-strong">
                  {t("welcome.stepAccountTitle")}
                </div>
                <div className="text-xs text-content-muted mt-0.5">
                  {t("welcome.stepAccountDesc")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 px-4 py-5 rounded-xl bg-surface border border-border-subtle">
              <UserCog className="w-5 h-5 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-content-strong">
                  {t("welcome.stepProfileTitle")}
                </div>
                <div className="text-xs text-content-muted mt-0.5">
                  {t("welcome.stepProfileDesc")}
                </div>
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="mt-3 px-6 py-2 min-h-9 rounded-lg bg-primary hover:bg-primary-hover text-content-inverse text-xs font-semibold transition-colors"
                >
                  {t("welcome.openProfile")}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 px-4 py-5 rounded-xl bg-surface border border-border-subtle">
              <CircleDashed className="w-5 h-5 shrink-0 text-content-subtle mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-content-strong">
                  {t("welcome.stepAccessTitle")}
                </div>
                <div className="text-xs text-content-muted mt-0.5">
                  {bolehBuatProyek ? t("welcome.stepAccessDescAdmin") : t("welcome.stepAccessDesc")}
                </div>
                {bolehBuatProyek && (
                  <button
                    type="button"
                    onClick={onCreateProject}
                    className="mt-3 px-6 py-2 min-h-9 rounded-lg bg-primary hover:bg-primary-hover text-content-inverse text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("appShell.createNewProject")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pratinjau modul — supaya layar terbaca "terkunci", bukan "rusak" */}
          <div className="mt-9">
            <div className="text-xs font-semibold uppercase tracking-wider text-content-subtle mb-3">
              {t("welcome.lockedTitle")}
            </div>
            {/*
              `opacity-50` dipasang di GRID, bukan di tiap kartu: satu lapis
              transparansi menurunkan ikon, teks, dan garis bersama-sama,
              sedangkan enam lapis terpisah akan saling menumpuk di titik
              temu grid dan membuat sebagian kartu tampak lebih pudar dari
              yang lain. Keterangan di bawahnya SENGAJA di luar pembungkus
              ini — kalimat itu yang menjelaskan kenapa modulnya redup, jadi
              ia harus tetap terbaca penuh.
            */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 opacity-50">
              {modulTerkunci.map((m) => (
                <div
                  key={m.judul}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-lg",
                    "bg-surface-muted border border-border-faint text-content-muted"
                  )}
                >
                  <div className="shrink-0 text-content-subtle">{m.ikon}</div>
                  <span className="text-xs font-medium truncate flex-1">{m.judul}</span>
                  <Lock className="w-3.5 h-3.5 shrink-0 text-content-subtle" />
                </div>
              ))}
            </div>
            <p className="text-xs text-content-subtle mt-3">{t("welcome.lockedHint")}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
