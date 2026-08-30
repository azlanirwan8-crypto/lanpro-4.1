/**
 * Pengaturan broadcast ringkasan task lewat email (Item #297).
 *
 * Menyimpan ke `BroadcastConfig` baris `channel = "email"` — penyimpanan yang
 * SAMA dengan broadcast WhatsApp (#193), hanya barisnya berbeda. Tidak ada
 * tabel baru, dan itu disengaja: dua tabel jadwal untuk hal yang sama akan
 * melahirkan dua sumber kebenaran, dan papan ini sudah punya riwayat panjang
 * soal itu.
 *
 * Isi emailnya TIDAK diatur di sini. Ia disusun templat HTML
 * `kirimEmailTaskDigest()` di server, berbeda dari WhatsApp yang memakai
 * string bebas — jadi tidak ada kolom template di form ini.
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Loader2, Send, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { LanproTimePicker } from "../../../components/ui/LanproTimePicker";
import {
  fetchUsers,
  fetchEmailBroadcastConfig,
  saveEmailBroadcastConfig,
  kirimBroadcastEmailSekarang,
  fetchEmailConfig,
  saveEmailConfig,
} from "../services/settings.service";

const DAY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "1", labelKey: "whatsapp.dayMon" },
  { value: "2", labelKey: "whatsapp.dayTue" },
  { value: "3", labelKey: "whatsapp.dayWed" },
  { value: "4", labelKey: "whatsapp.dayThu" },
  { value: "5", labelKey: "whatsapp.dayFri" },
  { value: "6", labelKey: "whatsapp.daySat" },
  { value: "7", labelKey: "whatsapp.daySun" },
];

interface Pengguna {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
}

export const TaskBroadcastForm: React.FC = () => {
  const { t } = useTranslation();
  const [hari, setHari] = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [jam, setJam] = useState("07:00");
  const [penerima, setPenerima] = useState<string[]>([]);
  const [semuaPengguna, setSemuaPengguna] = useState<Pengguna[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  /**
   * Subjek dan isi templat (#299).
   *
   * Disimpan di `IntegrationSettings`, BUKAN di `BroadcastConfig` -- kolomnya
   * memang sudah di sana, dan `BroadcastConfig.messageTemplate` adalah kolom
   * berbeda milik WhatsApp yang hanya menampung satu string, sedangkan email
   * butuh dua. Yang berpindah di #299 adalah tempat mengubahnya, bukan tempat
   * menyimpannya.
   */
  const [subjek, setSubjek] = useState("");
  const [isiTemplat, setIsiTemplat] = useState("");

  useEffect(() => {
    let dibatalkan = false;
    (async () => {
      try {
        const [cfgRes, userRes, emailRes] = await Promise.all([
          fetchEmailBroadcastConfig().catch(() => null),
          fetchUsers().catch(() => null),
          fetchEmailConfig().catch(() => null),
        ]);
        if (dibatalkan) return;

        if (emailRes?.status === "success" && emailRes.data) {
          setSubjek((emailRes.data as any).subjectTemplate || "");
          setIsiTemplat((emailRes.data as any).bodyTemplate || "");
        }

        if (cfgRes?.status === "success" && cfgRes.data) {
          const cfg = cfgRes.data;
          if (cfg.scheduleDays?.length) setHari(cfg.scheduleDays);
          if (cfg.scheduleTime) setJam(cfg.scheduleTime);
          setPenerima(cfg.recipientIds || []);
        }
        if (userRes?.status === "success" && Array.isArray(userRes.data)) {
          setSemuaPengguna(userRes.data.filter((u: Pengguna) => !!u.email));
        }
      } finally {
        if (!dibatalkan) setMemuat(false);
      }
    })();
    return () => {
      dibatalkan = true;
    };
  }, []);

  const alihkanHari = (nilai: string) =>
    setHari((prev) => (prev.includes(nilai) ? prev.filter((d) => d !== nilai) : [...prev, nilai]));

  const alihkanPenerima = (id: string) =>
    setPenerima((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const semuaDipilih = penerima.length === semuaPengguna.length && semuaPengguna.length > 0;

  const simpan = async () => {
    if (hari.length === 0) {
      toast.error(t("taskBroadcast.pilihHariDulu"));
      return;
    }
    if (penerima.length === 0) {
      toast.error(t("taskBroadcast.pilihPenerimaDulu"));
      return;
    }
    setMenyimpan(true);
    try {
      // Jadwal dan templat disimpan berbarengan supaya admin tidak perlu
      // menekan dua tombol Simpan untuk satu layar yang terasa satu kesatuan.
      const [res, resTemplat] = await Promise.all([
        saveEmailBroadcastConfig({
          scheduleDays: hari,
          scheduleTime: jam,
          recipientIds: penerima,
        }),
        saveEmailConfig({ subjectTemplate: subjek, bodyTemplate: isiTemplat } as any),
      ]);
      if (res?.status === "success" && resTemplat?.status === "success") {
        toast.success(t("taskBroadcast.tersimpan"));
      } else {
        toast.error(res?.message || resTemplat?.message || t("taskBroadcast.gagalSimpan"));
      }
    } catch (e: any) {
      toast.error(e?.message || t("taskBroadcast.gagalSimpan"));
    } finally {
      setMenyimpan(false);
    }
  };

  const kirimSekarang = async () => {
    setMengirim(true);
    try {
      const res = await kirimBroadcastEmailSekarang();
      if (res?.status === "success") {
        toast.success(
          t("taskBroadcast.terkirim", {
            dikirim: res.data?.emailDikirim ?? 0,
            diperiksa: res.data?.penerimaDiperiksa ?? 0,
          })
        );
      } else {
        toast.error(res?.message || t("taskBroadcast.gagalKirim"));
      }
    } catch (e: any) {
      toast.error(e?.message || t("taskBroadcast.gagalKirim"));
    } finally {
      setMengirim(false);
    }
  };

  if (memuat) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-content-subtle" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-primary-surface/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-content-strong">{t("taskBroadcast.judul")}</h3>
          <p className="text-xs text-content-muted leading-relaxed mt-0.5">
            {t("taskBroadcast.penjelasan")}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-border-faint">
        <label className="text-xs text-content-muted">{t("taskBroadcast.subjek")}</label>
        <input
          value={subjek}
          onChange={(e) => setSubjek(e.target.value)}
          placeholder={t("taskBroadcast.subjekPlaceholder")}
          className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none shadow-2xs"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-content-muted">{t("taskBroadcast.templat")}</label>
        <textarea
          rows={4}
          value={isiTemplat}
          onChange={(e) => setIsiTemplat(e.target.value)}
          placeholder={t("taskBroadcast.templatPlaceholder")}
          className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-md text-[11px] font-mono text-content-strong outline-none shadow-2xs resize-none"
        />
        <p className="text-[11px] text-content-subtle leading-relaxed">
          {t("taskBroadcast.templatBantuan")}
        </p>
      </div>

      <div className="space-y-2 pt-3 border-t border-border-faint">
        <label className="text-xs text-content-muted">{t("taskBroadcast.hari")}</label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map((d) => {
            const aktif = hari.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => alihkanHari(d.value)}
                aria-pressed={aktif}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                  aktif
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-surface border-border-subtle text-content-body hover:bg-surface-sunken"
                }`}
              >
                {t(d.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-content-muted">{t("taskBroadcast.jam")}</label>
        <LanproTimePicker
          value={jam}
          onChange={setJam}
          buttonClassName="w-40 px-3 py-1.5 border border-border-subtle rounded-md text-xs text-left font-medium bg-surface text-content-strong shadow-2xs"
        />
        <p className="text-[11px] text-content-subtle">{t("taskBroadcast.jamWib")}</p>
      </div>

      <div className="space-y-2 pt-3 border-t border-border-faint">
        <div className="flex items-center justify-between">
          <label className="text-xs text-content-muted flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {t("taskBroadcast.penerima", { jumlah: penerima.length })}
          </label>
          <button
            type="button"
            onClick={() => setPenerima(semuaDipilih ? [] : semuaPengguna.map((u) => String(u.id)))}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {semuaDipilih ? t("taskBroadcast.kosongkan") : t("taskBroadcast.pilihSemua")}
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-md border border-border-subtle divide-y divide-border-faint">
          {semuaPengguna.length === 0 && (
            <p className="px-3 py-4 text-xs text-content-subtle">
              {t("taskBroadcast.tidakAdaPengguna")}
            </p>
          )}
          {semuaPengguna.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-sunken"
            >
              <input
                type="checkbox"
                checked={penerima.includes(String(u.id))}
                onChange={() => alihkanPenerima(String(u.id))}
                className="accent-primary"
              />
              <span className="text-xs text-content-body truncate">
                {u.displayName || u.username}
              </span>
              <span className="text-[11px] text-content-subtle truncate ml-auto">{u.email}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-faint">
        {/*
          Tombol kirim-sekarang ada supaya jadwalnya bisa dibuktikan tanpa
          menunggu hari dan jamnya tiba. Tanpa ini, satu-satunya cara memastikan
          fitur bekerja adalah menyetel jam ke satu menit ke depan lalu menunggu
          -- dan kalau gagal, tidak ada yang tahu apakah kirimannya atau
          penjadwalnya yang salah.
        */}
        <button
          type="button"
          onClick={kirimSekarang}
          disabled={mengirim || penerima.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-border-subtle text-content-body hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {mengirim ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {t("taskBroadcast.kirimSekarang")}
        </button>

        <button
          type="button"
          onClick={simpan}
          disabled={menyimpan}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {menyimpan ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {t("taskBroadcast.simpan")}
        </button>
      </div>
    </div>
  );
};
