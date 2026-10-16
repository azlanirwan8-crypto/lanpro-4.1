import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { gayaLabel } from "../../../lib/warnaLabel";

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
 *
 * PANELNYA DITEMPATKAN LEWAT PORTAL, dan itu bukan pilihan selera. Panel ini
 * dipakai di dalam baris tabel yang wadahnya `overflow-x-auto`
 * (`DiscussionPointsTable.tsx` dan `ResponsiveTable.tsx`), dan CSS melipat
 * `overflow-y: visible` menjadi `auto` begitu sumbu satunya `auto` — jadi panel
 * serapapun yang menempel di DOM baris AKAN terpotong tepi wadahnya. Pemilik
 * proyek menangkap ini 12 Okt: kotak cari di dalam panel terbelah di tepi bawah
 * wadahnya. Yang sudah lebih dulu memecahkan masalah yang sama adalah
 * `LanproDatePicker` (`src/components/ui/LanproDatePicker.tsx:260`) — pemicunya
 * diukur dengan `getBoundingClientRect()`, panelnya `position: fixed` di
 * `document.body`, dan ia berbalik ke atas bila ruang di bawah habis. Pola itu
 * ditiru di sini supaya dua kontrol yang duduk BERSEBELAHAN di baris yang sama
 * tidak punya dua perilaku yang berbeda.
 */
/** #708 — jumlah chip yang masih muat pada satu baris pemicu. */
const CHIP_TERPAKAI = 2;
/* #712 — pemicunya `overflow-hidden` (lihat kelas di bawah). `min-h` membolehkan
 * kotak MEMBESAR kalau dua chip panjang butuh dua baris; yang tidak boleh lagi
 * adalah chip menggambar di atas kolom tetangga saat kolomnya memang lebih
 * sempit dari isinya. */

export interface OpsiJamak {
  id: string;
  label: string;
  /** Warna snapshot dari master data/daftar isu; boleh kosong. */
  warna?: string | null;
  /**
   * #765 — `type` prioritas MasterData milik isu tertaut (KODE, bukan hex).
   * Yang disimpan dan yang dikirim ke pemanggil adalah kode: hex-nya selalu
   * dihitung ulang lewat `warnaDariMaster` supaya mengubah warna di Master Data
   * langsung terlihat di mana-mana, bukan membeku di catatan rapat (#564/#590).
   */
  prioritas?: string | null;
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
  const tombol = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const [posisi, setPosisi] = useState<{
    kiri: number;
    lebar: number;
    atas?: number;
    bawah?: number;
  }>({ kiri: 0, lebar: 280 });

  /* Tinggi panel diperkirakan dari isianya: satu baris cari plus daftar
   * `max-h-56`. Angka ini hanya dipakai untuk MEMILIH sisi buka, bukan untuk
   * mengatur tinggi — salah tebak hanya berarti panelnya bergeser sisi. */
  const TINGGI_PERKIRAAN = 268;

  /* `useLayoutEffect`, bukan `useEffect`: posisi dibaca dari `getBoundingClientRect()`
   * pemicunya, jadi dengan `useEffect` bingkai pertama tergambar di kiri-atas
   * lalu melompat — pelajaran yang sudah ditulis `LanproDatePicker.tsx:88`. */
  useLayoutEffect(() => {
    if (!terbuka || !tombol.current) return;
    const perbarui = () => {
      const kotak = tombol.current!.getBoundingClientRect();
      /* #708 — 280 px, bukan 240: judul isu panjang ("Status di wondr merchant
       * itu sedang diproses, tapi di portal merchant inactive") memaksa tiga
       * baris pada 240 px, dan tiga baris per opsi membuat satu layar penuh
       * hanya memuat empat pilihan. */
      const lebar = Math.max(kotak.width, 280);
      const ruangBawah = window.innerHeight - kotak.bottom;
      const keAtas = ruangBawah < TINGGI_PERKIRAAN && kotak.top > TINGGI_PERKIRAAN;
      setPosisi({
        kiri: Math.max(10, Math.min(kotak.left, window.innerWidth - lebar - 10)),
        lebar,
        atas: keAtas ? window.innerHeight - kotak.top + 4 : undefined,
        bawah: keAtas ? undefined : kotak.bottom + 4,
      });
    };
    perbarui();
    /* Panelnya `fixed`, jadi ia tidak ikut bergerak saat tabel digulir.
     * Tanpa dua pendengar ini, satu kibasan roda membuat panel melayang di
     * atas baris yang salah. */
    window.addEventListener("scroll", perbarui, true);
    window.addEventListener("resize", perbarui);
    return () => {
      window.removeEventListener("scroll", perbarui, true);
      window.removeEventListener("resize", perbarui);
    };
  }, [terbuka]);

  // Tutup di luar klik dan lewat Escape. Panel ini mengambang di atas baris
  // tabel yang bisa digulir, jadi "klik di mana pun di luar" adalah satu-satunya
  // cara yang tidak membuat pengguna terjebak di dalamnya. Karena panelnya kini
  // hidup di document.body (bukan di dalam pembungkus), keduanya harus diperiksa
  // — kalau tidak, klik pada baris opsi justru menutupnya sebelum terpilih.
  useEffect(() => {
    if (!terbuka) return;
    const tutup = (e: MouseEvent) => {
      const sasaran = e.target as Node;
      if (pembungkus.current?.contains(sasaran) || panel.current?.contains(sasaran)) return;
      setTerbuka(false);
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
    const cocok = (o: OpsiJamak) => !k || o.label.toLowerCase().includes(k);
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
        ref={tombol}
        type="button"
        id={idAkses}
        disabled={disabled}
        onClick={() => setTerbuka((b) => !b)}
        aria-expanded={terbuka}
        className={cn(
          "w-full min-w-0 flex items-center justify-between gap-1.5 text-left border border-border-subtle bg-surface text-content-body rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-50 overflow-hidden",
          buttonClassName
        )}
      >
        <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
          {terpilih.length === 0 ? (
            <span className="text-content-subtle italic">{kosong}</span>
          ) : (
            <>
              {/* #708 — pemicunya hanya menampung DUA chip. Yang tidak tampil
                  tidak hilang: daftar lengkapnya ada satu klik jauhnya, dan
                  setiap baris di sana sudah punya centang. Tanpa batas ini,
                  empat anggota terpilih membuat tombolnya empat baris tinggi
                  sementara kotak di sebelahnya tetap satu baris. */}
              {terpilih.slice(0, CHIP_TERPAKAI).map((o) => (
                <span
                  key={o.id}
                  // #765 — chip yang punya warna dari master data memakainya
                  // (`label-chip` menurunkan latar, garis, dan teks dari satu
                  // hex — #564/#590); yang tidak punya tetap warna merek.
                  className={cn(
                    "inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded-md text-[10px] leading-tight font-normal break-words",
                    o.warna ? "label-chip" : "bg-primary/10 text-primary border border-primary/20"
                  )}
                  style={o.warna ? gayaLabel(o.warna) : undefined}
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
              ))}
              {terpilih.length > CHIP_TERPAKAI && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] leading-tight font-normal bg-surface-sunken text-content-muted border border-border-subtle">
                  {t("discussion.sisaJamak", { jumlah: terpilih.length - CHIP_TERPAKAI })}
                </span>
              )}
            </>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-content-subtle" />
      </button>

      {terbuka &&
        createPortal(
          <div
            ref={panel}
            data-pemilih-jamak=""
            style={{
              position: "fixed",
              left: posisi.kiri,
              width: posisi.lebar,
              top: posisi.bawah,
              bottom: posisi.atas,
              zIndex: 10000,
            }}
            className="bg-surface border border-border-subtle rounded-md shadow-xl overflow-hidden"
          >
            {cari && (
              <div className="relative shrink-0 border-b border-border-faint bg-surface-sunken/60">
                <Search className="w-3.5 h-3.5 text-content-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={kueri}
                  onChange={(e) => setKueri(e.target.value)}
                  placeholder={cari}
                  className="w-full min-w-0 pl-9 pr-3 py-2.5 bg-transparent text-content-strong outline-none text-xs font-normal placeholder:text-content-subtle"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {tersaring.length === 0 ? (
                <p className="px-3 py-3 text-xs text-content-subtle italic">
                  {t("discussion.tidakAdaOpsi")}
                </p>
              ) : (
                tersaring.map((o) => {
                  const aktif = nilai.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={aktif}
                      onClick={() => ganti(o.id)}
                      /* #708 — barisnya `items-start`, bukan `items-center`:
                       * judul isu panjang membungkus dua-tiga baris, dan kotak
                       * centang yang ditengahkan melayang di samping baris
                       * kedua. Penanda terpilih cukup dari latar beronda plus
                       * centangnya; teksnya satu warna supaya daftar tidak
                       * terlihat bergantian warna. */
                      className={cn(
                        "w-full min-w-0 flex items-start gap-2.5 px-3 py-2 text-left text-xs font-normal leading-snug transition-colors cursor-pointer",
                        aktif ? "bg-primary/10" : "hover:bg-surface-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 shrink-0 mt-px rounded-md border flex items-center justify-center",
                          aktif
                            ? "border-primary bg-primary text-content-inverse"
                            : "border-border-subtle bg-surface"
                        )}
                      >
                        {aktif && <Check className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-content-strong">
                        {o.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
