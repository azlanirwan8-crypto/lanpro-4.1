/**
 * #563 — modal tenggat saat login pertama.
 *
 * Aturan mainnya (permintaan pemilik proyek 28 Sep): begitu masuk, siapa pun
 * harus langsung tahu tugas mana yang SUDAH lewat tenggat atau tinggal <= 2
 * hari, atas namanya sendiri (assignee atau reporter). Yang menentukan
 * "lewat" adalah `endDate`, dan hanya kalau itu kosong `startDate` — sama seperti
 * kartu jumlah di dasbor, bukan `dueDate` yang dipakai job lama.
 *
 * Dua keputusan yang sengaja diambil di sini:
 *  - Sekali per SESI login (`sessionStorage`), bukan sekali selamanya. Muat
 *    ulang halaman tidak boleh menagih dua kali, tapi hari berikutnya user
 *    tetap disambut dengan angka yang baru.
 *  - Kegagalannya diam. Modal ini tambahan; kalau endpoint-nya mati, layar
 *    login tidak boleh ikut terasa rusak.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { fetchTenggatSaya } from "../services/taskService";
import { cn } from "../lib/utils";

const KUNCI_SESI = "lanpro_tenggat_login";
const MAKS_BARIS = 8;

type TenggatItem = {
  id: string;
  judul: string;
  status: string;
  proyek: string;
  tanggal: string;
  selisihHari: number;
  terlambat: boolean;
};

interface Props {
  sudahLogin: boolean;
  /** Hanya untuk uji: memaksa penjaga sesi dianggap belum terisi. */
  abaikanPenjagaSesi?: boolean;
}

export const ModalTenggatLogin: React.FC<Props> = ({ sudahLogin, abaikanPenjagaSesi }) => {
  const { t } = useTranslation();
  const [daftar, setDaftar] = useState<TenggatItem[] | null>(null);
  const tombolTutup = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sudahLogin) return;
    try {
      if (!abaikanPenjagaSesi && sessionStorage.getItem(KUNCI_SESI)) return;
    } catch {
      /* peramban tanpa sessionStorage: biarkan modalnya muncul */
    }

    let batal = false;
    (async () => {
      try {
        const res = await fetchTenggatSaya();
        const isi = Array.isArray(res?.data) ? (res.data as TenggatItem[]) : [];
        if (batal || !isi.length) return;
        setDaftar(isi);
        try {
          sessionStorage.setItem(KUNCI_SESI, "1");
        } catch {
          /* tidak persisten, tidak apa-apa */
        }
      } catch {
        /* tenggat bukan alasan layar login jadi error */
      }
    })();

    return () => {
      batal = true;
    };
  }, [sudahLogin, abaikanPenjagaSesi]);

  useEffect(() => {
    if (daftar?.length) tombolTutup.current?.focus();
  }, [daftar]);

  if (!daftar?.length) return null;

  const terlambat = daftar.filter((d) => d.terlambat).length;
  const terlihat = daftar.slice(0, MAKS_BARIS);
  const sisa = daftar.length - terlihat.length;

  const tutup = () => setDaftar(null);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-overlay/60"
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === "Escape") tutup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenggat-login-judul"
        className="w-full max-w-md bg-surface rounded-lg shadow-soft-lg border border-border-subtle overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-faint">
          <CalendarClock className="w-4 h-4 shrink-0 text-content-subtle" />
          <h2 id="tenggat-login-judul" className="text-sm font-medium text-content-strong truncate">
            {t("tenggat.judul", { jumlah: daftar.length, terlambat })}
          </h2>
        </div>

        <ul className="max-h-[45vh] overflow-y-auto">
          {terlihat.map((item) => (
            <li
              key={item.id}
              title={item.proyek ? `${item.judul} — ${item.proyek}` : item.judul}
              className="flex items-center gap-2 px-4 py-2 border-b border-border-faint last:border-b-0"
            >
              <span className="flex-1 min-w-0 text-xs text-content truncate">{item.judul}</span>
              <span
                className={cn(
                  "shrink-0 text-[10px] uppercase tracking-tight px-1.5 py-0.5 rounded",
                  item.terlambat
                    ? "bg-danger-surface text-content-inverse"
                    : "bg-warning-surface text-content-inverse"
                )}
              >
                {item.terlambat
                  ? t("tenggat.lewat", { hari: Math.abs(item.selisihHari) })
                  : item.selisihHari === 0
                    ? t("tenggat.hariIni")
                    : t("tenggat.sisa", { hari: item.selisihHari })}
              </span>
            </li>
          ))}
          {sisa > 0 && (
            <li className="px-4 py-2 text-xs text-content-muted">
              {t("tenggat.danLainnya", { jumlah: sisa })}
            </li>
          )}
        </ul>

        <div className="flex justify-end px-4 py-3 bg-surface-sunken">
          <button
            ref={tombolTutup}
            type="button"
            onClick={tutup}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-content-inverse hover:bg-primary-hover transition-colors cursor-pointer"
          >
            {t("tenggat.mengerti")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalTenggatLogin;
