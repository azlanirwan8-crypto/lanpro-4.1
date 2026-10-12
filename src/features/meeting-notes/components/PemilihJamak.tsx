import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../../lib/utils";

/**
 * #703 — pemilih JAMAK.
 *
 * MENGAPA MASIH HIDUP. Repo ini hanya punya `StyledDropdown`
 * (`src/components/ui/CommonComponents.tsx:209`) dan bentuknya `value: string` —
 * satu pilihan. Untuk "PIC bisa pilih multiple user" (keputusan B2) dan
 * "Context/Tags diambil dari Daftar Isu" (keputusan B1 = a) tidak ada komponen
 * yang bisa dipakai ulang: satu-satunya pemilihan jamak yang sudah ada adalah
 * checkbox mentah di `AdminUserPanel.tsx:80` dan `UserDetailView.tsx:546`, yang
 * bukan komponen. Jadi primitif baru lebih jujur daripada memaksakan
 * `StyledDropdown` menerima array lewat properti yang tidak ada di kontraknya.
 *
 * Daftar kandidat SELALU datang dari pemanggil, dan pemanggil mengambilnya dari
 * data (MasterData / Daftar Isu / anggota proyek) — tidak ada satu pun nilai
 * yang ditulis di berkas ini. §3 melarang keras daftar opsi keras.
 *
 * Tata letak: satu tombol, satu panel, satu kotak cari. Tidak ada warna keras
 * dan tidak ada override mode gelap (§22) — keduanya ditangani token, jadi
 * latar memakai `surface-*`, teks `content-*`, garis `border-*`, dan aksen
 * `primary`.
 */
export interface OpsiJamak {
  id: string;
  label: string;
  /** Warna snapshot dari master data/daftar isu; boleh kosong. */
  warna?: string | null;
  /** Baris kecil kedua di panel, misalnya kode tugas `WMIR-168`. */
  keterangan?: string | null;
}

interface PemilihJamakProps {
  nilai: string[];
  opsi: OpsiJamak[];
  onChange: (idTerpilih: string[]) => void;
  /** Teks saat belum ada yang dipilih — wajib lewat kamus, bukan string keras. */
  kosong: string;
  /** Placeholder kotak cari — wajib lewat kamus. */
  cari?: string;
  buttonClassName?: string;
  /** Untuk target fokus aksi mobile (`registerAction` di DiscussionPointsTable). */
  idAkses?: string;
  disabled?: boolean;
}

export const PemilihJamak: React.FC<PemilihJamakProps> = ({
  nilai,
  opsi,
  onChange,
  kosong,
  cari,
  buttonClassName,
  idAkses,
  disabled,
}) => {
  const { t } = useTranslation();
  const [terbuka, setTerbuka] = useState(false);
  const [kueri, setKueri] = useState("");
  const pembungkus = useRef<HTMLDivElement | null>(null);

  // Tutup di luar klik dan lewat Escape. Panel ini mengambang di atas baris
  // tabel yang bisa digulir, jadi "klik di mana pun di luar" adalah satu-satunya
  // cara yang tidak membuat pengguna terjebak di dalamnya.
  useEffect(() => {
    if (!terbuka) return;
    const tutup = (e: MouseEvent) => {
      if (pembungkus.current && !pembungkus.current.contains(e.target as Node)) setTerbuka(false);
    };
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTerbuka(false);
    };
    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", tombol);
    };
  }, [terbuka]);

  const petaOpsi = useMemo(() => new Map(opsi.map((o) => [o.id, o])), [opsi]);
  const terpilih = nilai.map((id) => petaOpsi.get(id)).filter((o): o is OpsiJamak => !!o);

  // Yang dipilih didahulukan di atas daftar, jadi nama yang sudah masuk chip
  // tidak perlu dicari ulang di antara ratusan isu.
  const tersaring = useMemo(() => {
    const k = kueri.trim().toLowerCase();
    const cocok = (o: OpsiJamak) =>
      !k || o.label.toLowerCase().includes(k) || (o.keterangan || "").toLowerCase().includes(k);
    const sisa = opsi.filter((o) => !nilai.includes(o.id) && cocok(o));
    const sudah = opsi.filter((o) => nilai.includes(o.id) && cocok(o));
    return [...sudah, ...sisa];
  }, [opsi, nilai, kueri]);

  const ganti = (id: string) => {
    onChange(nilai.includes(id) ? nilai.filter((n) => n !== id) : [...nilai, id]);
  };

  return (
    <div ref={pembungkus} className="relative min-w-0">
      <button
        type="button"
        id={idAkses}
        disabled={disabled}
        onClick={() => setTerbuka((b) => !b)}
        aria-expanded={terbuka}
        className={cn(
          "w-full min-w-0 flex items-center justify-between gap-1.5 text-left border border-border-subtle bg-surface text-content-body rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-50",
          buttonClassName
        )}
      >
        <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
          {terpilih.length === 0 ? (
            <span className="text-content-subtle italic">{kosong}</span>
          ) : (
            terpilih.map((o) => (
              <span
                key={o.id}
                className="inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded-md text-[10px] leading-tight font-normal bg-primary/10 text-primary border border-primary/20"
              >
                <span className="break-words">{o.label}</span>
                <X
                  className="w-3 h-3 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    ganti(o.id);
                  }}
                />
              </span>
            ))
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-content-subtle" />
      </button>

      {terbuka && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[12rem] bg-surface border border-border-subtle rounded-md shadow-xl overflow-hidden">
          {cari && (
            <div className="relative shrink-0 border-b border-border-faint">
              <Search className="w-3.5 h-3.5 text-content-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={kueri}
                onChange={(e) => setKueri(e.target.value)}
                placeholder={cari}
                className="w-full min-w-0 pl-8 pr-2.5 py-2 bg-surface text-content-strong outline-none text-xs font-normal placeholder:text-content-subtle"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {tersaring.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-content-subtle italic">
                {t("discussion.tidakAdaOpsi")}
              </p>
            ) : (
              tersaring.map((o) => {
                const aktif = nilai.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => ganti(o.id)}
                    className={cn(
                      "w-full min-w-0 flex items-center gap-2 px-3 py-2 text-left text-xs font-normal transition-colors cursor-pointer",
                      aktif
                        ? "bg-primary/10 text-primary"
                        : "text-content-body hover:bg-surface-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 shrink-0 rounded-md border flex items-center justify-center",
                        aktif
                          ? "border-primary bg-primary text-content-inverse"
                          : "border-border-subtle"
                      )}
                    >
                      {aktif && <Check className="w-3 h-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="break-words leading-snug">{o.label}</span>
                      {o.keterangan && (
                        <span className="block text-[10px] text-content-subtle break-words">
                          {o.keterangan}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
