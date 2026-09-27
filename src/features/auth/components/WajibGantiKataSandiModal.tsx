/**
 * Form wajib ganti kata sandi (#296).
 *
 * Muncul ketika pengguna masuk memakai kata sandi SEMENTARA dari email lupa
 * kata sandi. Tanpa layar ini, kata sandi acak yang dikirim lewat email akan
 * menjadi kredensial permanen yang tersimpan di kotak masuk — persis hal yang
 * membuat alur "kirim kata sandi lewat email" berbahaya.
 *
 * SENGAJA TIDAK BISA DITUTUP. Tidak ada tombol silang, tidak ada tombol batal,
 * dan klik di latar belakang tidak menutupnya. Kalau bisa dilewati, ia bukan
 * penjaga melainkan saran — dan sebagian besar orang akan melewatinya.
 * Satu-satunya jalan keluar selain mengganti kata sandi adalah keluar akun,
 * dan itu disediakan supaya pengguna tidak terjebak.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2 } from "lucide-react";
import { PasswordInput } from "../../settings/components/PasswordInput";

interface Props {
  onGanti: (kataSandiLama: string, kataSandiBaru: string) => Promise<void>;
  onKeluar: () => void;
}

/** Syarat yang sama dengan SKEMA_KATA_SANDI di server (auth.routes.ts). */
const SYARAT: Array<{ uji: (v: string) => boolean; kunci: string }> = [
  { uji: (v) => v.length >= 8, kunci: "gantiSandi.syaratPanjang" },
  { uji: (v) => /[A-Z]/.test(v), kunci: "gantiSandi.syaratHurufBesar" },
  { uji: (v) => /[a-z]/.test(v), kunci: "gantiSandi.syaratHurufKecil" },
  { uji: (v) => /[0-9]/.test(v), kunci: "gantiSandi.syaratAngka" },
  { uji: (v) => /[@$!%*?&]/.test(v), kunci: "gantiSandi.syaratSimbol" },
];

export const WajibGantiKataSandiModal: React.FC<Props> = ({ onGanti, onKeluar }) => {
  const { t } = useTranslation();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulangi, setUlangi] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const syaratLolos = SYARAT.filter((s) => s.uji(baru));
  const semuaSyaratLolos = syaratLolos.length === SYARAT.length;
  const cocok = baru.length > 0 && baru === ulangi;
  const bolehKirim = lama.length > 0 && semuaSyaratLolos && cocok && !sedangKirim;

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bolehKirim) return;
    setGalat(null);
    setSedangKirim(true);
    try {
      await onGanti(lama, baru);
    } catch (err: any) {
      setGalat(err?.message || t("gantiSandi.gagal"));
    } finally {
      setSedangKirim(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-wajib-ganti"
    >
      <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-md border border-border-subtle text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-md bg-warning/10 border border-warning/30 flex items-center justify-center text-warning-text shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <h3 id="judul-wajib-ganti" className="text-base font-medium text-content tracking-tight">
            {t("gantiSandi.judul")}
          </h3>
        </div>

        <p className="text-xs text-content-muted leading-relaxed mb-5">
          {t("gantiSandi.penjelasan")}
        </p>

        <form onSubmit={kirim} className="space-y-3.5">
          <PasswordInput
            label={t("gantiSandi.sandiSementara")}
            value={lama}
            onChange={setLama}
            placeholder={t("gantiSandi.sandiSementaraPlaceholder")}
          />

          <div className="space-y-1.5">
            <PasswordInput
              label={t("gantiSandi.sandiBaru")}
              value={baru}
              onChange={setBaru}
              placeholder={t("gantiSandi.sandiBaruPlaceholder")}
            />
            <ul className="mt-2 space-y-1">
              {SYARAT.map((s) => {
                const lolos = s.uji(baru);
                return (
                  <li
                    key={s.kunci}
                    className={`text-[11px] flex items-center gap-1.5 ${
                      lolos ? "text-success-text" : "text-content-subtle"
                    }`}
                  >
                    <span aria-hidden="true">{lolos ? "✓" : "•"}</span>
                    {t(s.kunci)}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-1.5">
            <PasswordInput
              label={t("gantiSandi.ulangiSandiBaru")}
              value={ulangi}
              onChange={setUlangi}
              placeholder={t("gantiSandi.ulangiPlaceholder")}
            />
            {ulangi.length > 0 && !cocok && (
              <p className="text-[11px] text-danger-text">{t("gantiSandi.tidakCocok")}</p>
            )}
          </div>

          {galat && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2">
              <p className="text-xs text-danger-text">{galat}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onKeluar}
              className="text-xs font-medium text-content-subtle hover:text-content-body transition-colors"
            >
              {t("gantiSandi.keluarAkun")}
            </button>
            <button
              type="submit"
              disabled={!bolehKirim}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sedangKirim && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("gantiSandi.simpan")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
