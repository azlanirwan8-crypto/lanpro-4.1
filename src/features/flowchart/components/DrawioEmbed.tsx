/**
 * #685 — editor draw.io yang DIPATOK, disematkan same-origin.
 *
 * KENAPA IFRAME, BUKAN KANVAS SENDIRI.
 *
 * Penerimaan "tampilan sama dengan draw.io" tidak bisa dibuktikan oleh kanvas
 * tiruan: setiap selisih kecil (gagang, rute, snap, label) adalah selisih yang
 * harus dikejar selamanya. Build draw.io yang diambil `scripts/ambil-drawio.cjs`
 * adalah aplikasi yang sama dengan yang dipakai orang di draw.io; yang kita
 * tulis di sini hanya jembatan protokolnya.
 *
 * BATAS KEPERCAYAAN.
 *
 * Pesan `postMessage` diterima HANYA bila asalnya origin yang sama DAN sumbernya
 * iframe ini. Tanpa dua pemeriksaan itu, skrip mana pun di halaman (atau iframe
 * lain) bisa mengirim XML palsu dan menimpanya ke papan pengguna. Target balasan
 * juga origin eksplisit, bukan "*".
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Loader2, RefreshCw, Save } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { cn } from "../../../lib/utils";

type StatusEditor = "memuat" | "siap" | "menyimpan" | "tersimpan" | "gagal" | "gagal-muat";

interface DrawioEmbedProps {
  isOpen: boolean;
  /** XML sumber saat editor dibuka. Perubahan sesudahnya tidak memuat ulang editor. */
  xml: string;
  judul: string;
  /** Menyimpan XML hasil editor. Melempar galat bila penyimpanan gagal. */
  onSimpan: (xml: string) => Promise<void>;
  onTutup: () => void;
}

const JEDA_AUTOSAVE_MS = 600;
const BATAS_MUAT_MS = 20_000;
const GAGAL_MUAT: StatusEditor = "gagal-muat";

export const DrawioEmbed: React.FC<DrawioEmbedProps> = ({
  isOpen,
  xml,
  judul,
  onSimpan,
  onTutup,
}) => {
  const { t, i18n } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<StatusEditor>("memuat");
  const [galat, setGalat] = useState<string | null>(null);
  const [kunciMuat, setKunciMuat] = useState(0);

  const xmlTerkirimRef = useRef<string | null>(null);
  const xmlTertundaRef = useRef<string | null>(null);
  const prosesRef = useRef<Promise<boolean> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSimpanRef = useRef(onSimpan);

  useEffect(() => {
    onSimpanRef.current = onSimpan;
  });

  const bahasa = i18n.language?.startsWith("en") ? "en" : "id";
  const src = useMemo(
    () =>
      `/drawio/index.html?embed=1&proto=json&spin=1&libraries=1&noSaveBtn=1&noExitBtn=1&noHelp=1&autosave=1&lang=${bahasa}&r=${kunciMuat}`,
    [bahasa, kunciMuat]
  );

  const kirimPesan = useCallback((pesan: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(pesan), window.location.origin);
  }, []);

  /**
   * Menyimpan satu XML; bila ada kiriman baru saat masih berjalan, XML terbaru
   * menggantikan yang tertunda. Editor draw.io mengirim autosave beruntun saat
   * pengguna mengetik, dan menyimpan setiap kiriman berarti menembak server
   * berkali-kali untuk isi yang sudah basi.
   */
  const simpan = useCallback(
    (xmlBaru: string): Promise<boolean> => {
      if (prosesRef.current) {
        xmlTertundaRef.current = xmlBaru;
        return prosesRef.current;
      }
      if (xmlBaru === xmlTerkirimRef.current) return Promise.resolve(true);

      xmlTertundaRef.current = xmlBaru;
      const proses = (async () => {
        setStatus("menyimpan");
        setGalat(null);
        try {
          while (xmlTertundaRef.current !== null) {
            const kirim = xmlTertundaRef.current;
            xmlTertundaRef.current = null;
            if (kirim === xmlTerkirimRef.current) continue;
            await onSimpanRef.current(kirim);
            xmlTerkirimRef.current = kirim;
          }
          setStatus("tersimpan");
          kirimPesan({
            action: "status",
            message: t("flowchart.drawioTersimpan"),
            modified: false,
          });
          return true;
        } catch (e) {
          // Simpan XML yang gagal supaya tombol "Simpan ulang" punya isi.
          if (xmlTertundaRef.current === null) xmlTertundaRef.current = xmlBaru;
          setStatus("gagal");
          setGalat(e instanceof Error ? e.message : String(e));
          return false;
        } finally {
          prosesRef.current = null;
        }
      })();
      prosesRef.current = proses;
      return proses;
    },
    [kirimPesan, t]
  );

  /**
   * Saat modal ditutup, XML yang belum terkirim disimpan lebih dulu. Menutup
   * editor adalah momen pengguna mengira pekerjaannya aman; menutup sambil
   * membuang autosave terakhir adalah cara kehilangan suntingan tanpa jejak.
   */
  const tutup = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const tertunda = xmlTertundaRef.current;
    const sedangBerjalan = prosesRef.current;
    if (tertunda !== null && tertunda !== xmlTerkirimRef.current) {
      const berhasil = await simpan(tertunda);
      if (!berhasil) return;
    } else if (sedangBerjalan) {
      const berhasil = await sedangBerjalan;
      if (!berhasil) return;
    }
    kirimPesan({ action: "exit" });
    onTutup();
  }, [kirimPesan, onTutup, simpan]);

  useEffect(() => {
    if (!isOpen) return;
    setStatus("memuat");
    setGalat(null);
    setKunciMuat(0);
    xmlTerkirimRef.current = null;
    xmlTertundaRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const batas = setTimeout(() => {
      setStatus((sebelumnya) => (sebelumnya === "memuat" ? GAGAL_MUAT : sebelumnya));
    }, BATAS_MUAT_MS);
    return () => clearTimeout(batas);
  }, [isOpen, kunciMuat]);

  useEffect(() => {
    if (!isOpen) return;

    const terima = (event: MessageEvent) => {
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (typeof event.data !== "string") return;

      let mentah: unknown;
      try {
        mentah = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!mentah || typeof mentah !== "object") return;
      const pesan = mentah as { event?: unknown; xml?: unknown };

      if (pesan.event === "init") {
        setStatus("siap");
        kirimPesan({ action: "load", xml, autosave: 1, title: judul });
        return;
      }
      if (pesan.event === "autosave" || pesan.event === "save") {
        if (typeof pesan.xml !== "string" || pesan.xml.length === 0) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        const xmlBaru = pesan.xml;
        // Simpan sebagai tertunda SEKARANG, bukan saat timer berbunyi: menutup
        // editor sebelum jeda habis harus tetap menyimpan suntingan terakhir.
        xmlTertundaRef.current = xmlBaru;
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void simpan(xmlBaru);
        }, JEDA_AUTOSAVE_MS);
      }
    };

    window.addEventListener("message", terima);
    return () => window.removeEventListener("message", terima);
  }, [isOpen, xml, judul, kirimPesan, simpan]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const labelStatus: Record<StatusEditor, string> = {
    memuat: t("flowchart.drawioMemuat"),
    siap: t("flowchart.drawioSiap"),
    menyimpan: t("flowchart.drawioMenyimpan"),
    tersimpan: t("flowchart.drawioTersimpan"),
    gagal: t("flowchart.drawioGagalMenyimpan"),
    "gagal-muat": t("flowchart.drawioGagalMuat"),
  };

  const gagal = status === "gagal" || status === "gagal-muat";
  const nadaStatus = gagal
    ? "text-danger-text"
    : status === "tersimpan"
      ? "text-success-text"
      : "text-content-subtle";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => void tutup()}
      closeOnBackdropClick={false}
      maxWidth="max-w-[96vw]"
      className="h-[92vh] max-h-[92vh]"
      bodyClassName="p-0 flex-1 min-h-0 overflow-hidden"
      title={
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{judul}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium shrink-0",
              nadaStatus
            )}
            data-testid="drawio-embed-status"
          >
            {status === "memuat" || status === "menyimpan" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : status === "tersimpan" ? (
              <Check className="w-3.5 h-3.5" />
            ) : status === "gagal" || status === "gagal-muat" ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : null}
            {labelStatus[status]}
          </span>
        </span>
      }
    >
      <div className="relative w-full h-full bg-surface">
        <iframe
          ref={iframeRef}
          key={kunciMuat}
          src={src}
          title={t("flowchart.drawioJudulEditor")}
          className="w-full h-full border-0"
          data-testid="drawio-embed-iframe"
          referrerPolicy="no-referrer"
        />

        {status === "gagal-muat" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-surface/95">
            <div className="max-w-md text-center space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-danger-text" />
              <h4 className="text-sm font-medium text-content-strong">
                {t("flowchart.drawioGagalMuat")}
              </h4>
              <p className="text-xs text-content-muted leading-relaxed">
                {t("flowchart.drawioGagalMuatHint")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setGalat(null);
                  setStatus("memuat");
                  setKunciMuat((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                {t("flowchart.drawioCobaLagi")}
              </button>
            </div>
          </div>
        )}

        {status === "gagal" && (
          <div className="absolute left-3 right-3 bottom-3 rounded-lg border border-danger/30 bg-danger-surface px-3 py-2 flex items-start gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-danger-text" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-danger-text">
                {t("flowchart.drawioGagalMenyimpan")}
              </p>
              {galat && (
                <p className="text-[11px] text-content-muted break-words mt-0.5">{galat}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const isi = xmlTertundaRef.current ?? xmlTerkirimRef.current;
                if (isi) void simpan(isi);
              }}
              className="inline-flex items-center gap-1 min-h-11 px-2 rounded-md text-xs font-medium text-danger-text hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {t("flowchart.drawioSimpanUlang")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
