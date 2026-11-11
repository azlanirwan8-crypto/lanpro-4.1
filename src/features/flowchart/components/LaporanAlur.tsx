/**
 * #841 Fase 1 — panel laporan struktur alur.
 *
 * Panel ini adalah jawaban atas pertanyaan yang tidak pernah bisa dijawab
 * simulasi lama: "alur saya sudah benar apa belum". Isi keputusannya TIDAK di
 * sini — semuanya datang dari `lib/analisaAlur.ts` yang murni dan terbukti
 * lewat test angka; komponen ini hanya menerjemahkan kode temuan menjadi baris
 * yang bisa diklik.
 *
 * Tidak ada `z-` di berkas ini dengan sengaja: tangga z dikunci gerbang
 * `audit:z` per berkas, dan panel ini memang tidak membutuhkannya — ia dipasang
 * sesudah lapisan dunia pada urutan DOM, jadi ia sudah pasti di atas papan.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { AlertOctagon, AlertTriangle, GitBranch, Route, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  ringkasJejak,
  type HasilAnalisa,
  type KodeTemuan,
  type SimpulAlur,
  type SkenarioAlur,
  type TepiAlur,
} from "../lib/analisaAlur";

interface LaporanAlurProps {
  hasil: HasilAnalisa;
  skenario: SkenarioAlur | null;
  nodes: SimpulAlur[];
  edges: TepiAlur[];
  onPilih: (nodeId: string) => void;
  onTutup: () => void;
}

/** Kunci judul per kode. Ditulis literal satu-satu supaya gerbang kunci #135
 *  bisa memindainya: lewat tabel, kunci tidak terlihat oleh pemindai `t()`. */
const judulKode = (kode: KodeTemuan): string => {
  switch (kode) {
    case "tanpa_awal":
      return "alur.tanpa_awal";
    case "banyak_awal":
      return "alur.banyak_awal";
    case "tak_terjangkau":
      return "alur.tak_terjangkau";
    case "jalan_buntu":
      return "alur.jalan_buntu";
    case "cabang_bukan_dua":
      return "alur.cabang_bukan_dua";
    case "cabang_tanpa_label":
      return "alur.cabang_tanpa_label";
    case "siklus_terjebak":
      return "alur.siklus_terjebak";
  }
};

const Keping = ({
  teks,
  title,
  onPilih,
}: {
  teks: string;
  title?: string;
  onPilih?: () => void;
}) =>
  onPilih ? (
    <button
      type="button"
      onClick={onPilih}
      title={title}
      className="max-w-[10rem] truncate rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] text-content-body hover:bg-primary/15 hover:text-primary"
    >
      {teks}
    </button>
  ) : (
    <span className="max-w-[10rem] truncate rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] text-content-muted">
      {teks}
    </span>
  );

export const LaporanAlur: React.FC<LaporanAlurProps> = ({
  hasil,
  skenario,
  nodes,
  edges,
  onPilih,
  onTutup,
}) => {
  const { t } = useTranslation();
  const nama = new Map(nodes.map((n) => [n.id, n.label?.trim() || n.id]));
  const tepi = new Map(edges.map((e) => [e.id, e]));

  return (
    <aside
      data-testid="laporan-alur"
      className="absolute top-3 right-3 flex max-h-[min(70vh,32rem)] w-[min(21rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-border-subtle/40 bg-surface/90 text-content-body shadow-lg backdrop-blur"
      aria-label={t("alur.judul")}
    >
      <header className="flex items-center gap-2 border-b border-border-subtle/40 px-3 py-2">
        <Route className="w-4 h-4 text-primary" />
        <h3 className="flex-1 text-[13px] font-medium">{t("alur.judul")}</h3>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px]",
            hasil.jumlahGalat
              ? "bg-danger/15 text-danger-text"
              : hasil.jumlahPeringatan
                ? "bg-warning/15 text-warning-text"
                : "bg-success/15 text-success-text"
          )}
        >
          {hasil.jumlahGalat
            ? t("alur.jumlahGalat", { count: hasil.jumlahGalat })
            : hasil.jumlahPeringatan
              ? t("alur.jumlahPeringatan", { count: hasil.jumlahPeringatan })
              : t("alur.bersih")}
        </span>
        <button
          type="button"
          onClick={onTutup}
          className="rounded-md p-1 text-content-subtle hover:bg-surface-muted hover:text-content-strong"
          title={t("alur.tutup")}
          data-testid="laporan-alur-tutup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {hasil.temuan.length === 0 ? (
          <p className="text-[12px] text-content-muted">{t("alur.bersih")}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {hasil.temuan.map((temuan) => {
              const galat = temuan.tingkat === "galat";
              const GalatIkon = galat ? AlertOctagon : AlertTriangle;
              return (
                <li key={temuan.kode} data-testid={`temuan-${temuan.kode}`}>
                  <div className="flex items-start gap-1.5">
                    <GalatIkon
                      className={cn(
                        "mt-0.5 w-3.5 h-3.5 shrink-0",
                        galat ? "text-danger" : "text-warning"
                      )}
                    />
                    <span className="text-[12px] leading-snug">{t(judulKode(temuan.kode))}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 pl-5">
                    {temuan.simpulIds.map((id) => (
                      <Keping
                        key={id}
                        teks={nama.get(id) || id}
                        title={t("alur.tunjuk")}
                        onPilih={() => onPilih(id)}
                      />
                    ))}
                    {temuan.tepiIds.map((id) => {
                      const tujuan = nama.get(tepi.get(id)?.toNodeId || "") || id;
                      return (
                        <Keping
                          key={id}
                          teks={`→ ${tujuan}`}
                          title={t("alur.tunjuk")}
                          onPilih={() => onPilih(tepi.get(id)!.fromNodeId)}
                        />
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {skenario && (
          <section className="mt-3 border-t border-border-subtle/40 pt-2">
            <h4 className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-content-subtle">
              <Route className="w-3 h-3" />
              {t("alur.jejak")}
            </h4>
            <p data-testid="jejak-alur-teks" className="mt-1 text-[12px] leading-snug">
              {ringkasJejak(skenario, nodes, edges)}
            </p>
            <p className="mt-1 text-[11px] text-content-muted">
              {skenario.mungkinLebih
                ? t("alur.skenarioLebih", { count: skenario.jumlahSkenario })
                : t("alur.skenarioLain", { count: skenario.jumlahSkenario })}
            </p>
            {skenario.tepiTakDilewati.length > 0 && (
              <div className="mt-2">
                <h4 className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-content-subtle">
                  <GitBranch className="w-3 h-3" />
                  {t("alur.takDilewati")}
                </h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {skenario.tepiTakDilewati.map((id) => {
                    const t2 = tepi.get(id);
                    return (
                      <Keping
                        key={id}
                        teks={t("alur.dariKe", {
                          dari: nama.get(t2?.fromNodeId || "") || id,
                          ke: nama.get(t2?.toNodeId || "") || id,
                        })}
                        title={t("alur.tunjuk")}
                        onPilih={() => onPilih(t2!.fromNodeId)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
};
