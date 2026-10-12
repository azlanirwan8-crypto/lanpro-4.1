import React from "react";
import { useTranslation } from "react-i18next";
import { Image as IkonGambar, Link2, Plus, Upload, X } from "lucide-react";
import { LanproDatePicker } from "../../../components/ui/LanproDatePicker";
import { PemilihJamak, type OpsiJamak } from "./PemilihJamak";
import { SEL } from "./BagianPapan";
import type { TautanDiskusi } from "../../../types";
import { cn } from "../../../lib/utils";

/**
 * #703/#704 — baris "tambah cepat" (yang menempel di bawah tabel) dan blok
 * cepat versi HP, dikeluarkan dari `DiscussionPointsTable.tsx` (§4: induknya
 * 1.255 baris). Keduanya SATU sumber isian, supaya tidak lagi terjadi satu
 * field punya dua bentuk tergantung layar — pelajaran #645.
 *
 * Notes ikut jadi textarea di sini juga, bukan hanya di laci sunting: pemilik
 * proyek meminta field isian catatan berupa text area "karena dia bisa jadi
 * dalam paragraf", dan baris cepat adalah tempat catatan paling sering diketik.
 * Enter tidak lagi menyimpan dari kotak notes — di textarea Enter berarti ganti
 * baris, dan itulah gunanya. Simpan lewat tombol.
 *
 * #709 — tautan dan gambar akhirnya bisa diisi DARI SINI. Sebelumnya keduanya
 * hanya hidup di laci sunting karena baris `discussion_point_files` menunjuk
 * `point_id`, dan titik diskusi belum punya id sebelum disimpan. Itu benar
 * sebagai sebab, tetapi salah sebagai keputusan layar: pemilik proyek membuka
 * papan ini untuk mencatat, bukan untuk mencari tombol Edit. Jalur yang dipakai
 * sekarang adalah ANTRE LALU TEMPEL — tautan ikut dalam payload pembuatan
 * (kolom `links` sudah diterima `createDiscussionPointSchema`), dan berkas
 * diunggah setelah id sungguhan pulang. Karena itu `berkas` menyimpan `File`
 * mentah di sisi pengguna, bukan baris berkas: belum ada apa pun di basis data.
 */
export interface NilaiCepat {
  concern: string;
  keterangan: string;
  tindakanLanjut: string;
  assigneeIds: string[];
  tags: { id: string; label: string }[];
  targetDate: string;
  /** #709 — tautan yang ikut terkirim saat titik diskusi dibuat. */
  links: TautanDiskusi[];
  /** #709 — berkas yang diantre; baru naik ke server setelah titiknya ada. */
  berkas: File[];
}

interface BarisCepatProps {
  nilai: NilaiCepat;
  onUbah: (bagian: Partial<NilaiCepat>) => void;
  onTambah: () => void;
  sedangMenyimpan: boolean;
  opsiPenerima: OpsiJamak[];
  opsiIsu: OpsiJamak[];
}

/**
 * #708 — SATU tinggi untuk semua kontrol di baris ini.
 *
 * Yang terlihat sebagai "field entry nya tidak sama ukuran nya" terukur sebagai
 * EMPAT tinggi berbeda dalam satu baris: `input` concern 30 px (py-1.5),
 * textarea notes/follow-up 46 px (rows=2 + py-1.5), tombol pemilih jamak dan
 * pemilih tanggal 32 px (`h-8`), dan tombol tambah tautan/gambar 18 px
 * (py-0.5). Empat garis dasar pada satu baris tidak bisa dirapikan dengan
 * menggeser-geser angkanya — yang harus diseragamkan adalah tingginya, dan
 * hanya tingginya.
 *
 * `h-11` (44 px) dipilih karena tiga hal sekaligus: ia muat dua baris teks
 * `text-xs` (2 × 16 px + padding) sehingga textarea tidak langsung menyisakan
 * guliran, ia ambang sentuh minimum 44 px yang sudah dipakai blok HP berkas ini
 * (`min-h-11`), dan ia cukup tinggi untuk menampilkan chip pilihan pada satu
 * baris. Teks panjang TIDAK memanjangkan baris — kontrolnya yang menggulir di
 * dalam, sama seperti keputusan #708 pada sel data.
 */
const TINGGI = "h-11";
const isianKelas = `w-full min-w-0 ${TINGGI} px-3 bg-surface border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md text-xs font-normal text-content-strong outline-none shadow-2xs placeholder:text-content-subtle`;
/* Tombol pemakai `min-h`, bukan `h`: isinya chip pilihan, dan dua nama panjang
 * boleh memakan dua baris. Yang dijamin sama adalah TINGGI MINIMUMNYA — saat
 * kosong, yang dilihat pengguna. */
const tombolKelas = `w-full min-w-0 min-h-11 px-3 bg-surface border border-border-subtle text-xs text-left text-content-body rounded-md font-medium shadow-2xs`;

/** Kelas bersama untuk kontrol kecil di dalam sel baris cepat. */
const kelasKecil =
  "w-full min-w-0 h-9 px-2 bg-surface border border-border-subtle focus:border-primary rounded-md text-[11px] font-normal text-content-strong outline-none shadow-2xs placeholder:text-content-subtle";
/** Pembuka tautan/berkas: sama tingginya dengan kontrol di sebelahnya. */
const tombolSambung = `w-full min-w-0 ${TINGGI} px-3 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-normal bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 transition-colors cursor-pointer`;
const tombolKecil =
  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-normal bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 transition-colors cursor-pointer";

/**
 * #709 — editor tautan jamak. Satu implementasi dipakai baris desktop dan blok
 * HP; bentuk lama (dua berkas dengan dua bentuk) adalah persis yang dilarang
 * #645.
 *
 * `url` yang kosong TIDAK dibuang di sini supaya orang masih bisa menghapus
 * baris yang salah ketik; yang menyaringnya adalah induk, tepat sebelum
 * dikirim. Server menolak bukan http/https (`tautanMasuk`), dan penolakan itu
 * memang dikehendaki — ia tidak dipindahkan ke sini.
 */
const PenyuntingTautan: React.FC<{
  nilai: TautanDiskusi[];
  onUbah: (daftar: TautanDiskusi[]) => void;
}> = ({ nilai, onUbah }) => {
  const { t } = useTranslation();
  const tambah = () =>
    onUbah([...nilai, { id: `link-${Date.now()}-${nilai.length}`, label: "", url: "" }]);
  const ubah = (id: string, bagian: Partial<TautanDiskusi>) =>
    onUbah(nilai.map((l) => (l.id === id ? { ...l, ...bagian } : l)));
  const hapus = (id: string) => onUbah(nilai.filter((l) => l.id !== id));

  return (
    <div className="space-y-1">
      {nilai.map((l) => (
        <div key={l.id} className="space-y-1">
          <input
            type="text"
            placeholder={t("discussion.labelTautan")}
            value={l.label || ""}
            onChange={(e) => ubah(l.id, { label: e.target.value })}
            className={kelasKecil}
          />
          <div className="flex items-center gap-1">
            <input
              type="url"
              placeholder="https://"
              value={l.url}
              onChange={(e) => ubah(l.id, { url: e.target.value })}
              className={kelasKecil}
            />
            <button
              type="button"
              onClick={() => hapus(l.id)}
              title={t("discussion.hapusTautan")}
              className="p-1 text-content-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      {/* Saat masih kosong kontrolnya setinggi tetangga-tetangganya (#708);
          begitu ada isian, baris editan muncul di bawahnya dan tombol
          "tambah lagi" boleh lebih ramping. */}
      <button
        type="button"
        onClick={tambah}
        className={nilai.length === 0 ? tombolSambung : tombolKecil}
      >
        <Plus className="w-3.5 h-3.5" />
        {nilai.length === 0 ? t("discussion.tambahTautan") : t("discussion.tambahLagi")}
      </button>
    </div>
  );
};

/**
 * #709 — pemilih berkas yang MENGANTRE di sisi pengguna. Berkas baru naik ke
 * server setelah titik diskusinya punya id, jadi daftar ini berisi `File`
 * mentah dan bukan baris `discussion_point_files`.
 */
const AntreanBerkas: React.FC<{
  nilai: File[];
  onUbah: (daftar: File[]) => void;
  sedangMengunggah?: boolean;
}> = ({ nilai, onUbah, sedangMengunggah }) => {
  const { t } = useTranslation();
  const hapus = (nama: string, ukuran: number) =>
    onUbah(nilai.filter((f) => !(f.name === nama && f.size === ukuran)));

  return (
    <div className="space-y-1">
      {nilai.map((f, i) => (
        <div
          key={`${f.name}-${f.size}-${i}`}
          className="flex items-center gap-1 h-6 text-[10px] text-content-body"
        >
          <IkonGambar className="w-3 h-3 shrink-0 text-content-subtle" />
          <span className="min-w-0 flex-1 break-all">{f.name}</span>
          <button
            type="button"
            onClick={() => hapus(f.name, f.size)}
            title={t("discussion.hapusGambar")}
            className="p-0.5 text-content-muted hover:text-danger rounded-md transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {/* Sama seperti editor tautan: kosong = setinggi tetangganya (#708). */}
      <label
        className={cn(
          nilai.length === 0 ? tombolSambung : tombolKecil,
          sedangMengunggah && "opacity-50 pointer-events-none"
        )}
      >
        <Upload className="w-3.5 h-3.5" />
        {sedangMengunggah
          ? t("discussion.mengunggah")
          : nilai.length > 0
            ? t("discussion.berkasDiantre", { jumlah: nilai.length })
            : t("discussion.unggahGambar")}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={sedangMengunggah}
          onChange={(e) => {
            const daftar = Array.from(e.target.files || []);
            e.target.value = "";
            if (daftar.length) onUbah([...nilai, ...daftar]);
          }}
        />
      </label>
    </div>
  );
};

/** Versi desktop: satu `<tr>` dengan sel yang sama rata dengan kepala tabel. */
export const BarisCepat: React.FC<BarisCepatProps> = (props) => {
  const { nilai, onUbah, onTambah, sedangMenyimpan, opsiPenerima, opsiIsu } = props;
  const { t } = useTranslation();

  return (
    <tr className="bg-primary/10 hover:bg-primary/10 transition-colors">
      <td className={cn(SEL, "py-2.5 text-center text-primary text-xs align-middle font-normal")}>
        +
      </td>

      <td className={cn(SEL, "py-2.5 align-middle")}>
        <input
          id="quick-add-concern-desktop"
          type="text"
          placeholder={t("discussion.newConcernPlaceholder")}
          value={nilai.concern}
          onChange={(e) => onUbah({ concern: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onTambah();
          }}
          className={isianKelas}
        />
      </td>

      {/* #703 — catatan jadi textarea; Enter tidak lagi menyimpan dari sini.
          #708 — tingginya dikunci sama seperti kontrol di sebelahnya, dan teks
          yang melebihi dua baris menggulir di dalam kotak, bukan memanjangkan
          baris. */}
      <td className={cn(SEL, "py-2.5 align-middle")}>
        <textarea
          placeholder={t("discussion.notesPlaceholder")}
          value={nilai.keterangan}
          onChange={(e) => onUbah({ keterangan: e.target.value })}
          rows={2}
          className={cn(isianKelas, "resize-none overflow-y-auto py-1 leading-snug")}
        />
      </td>

      <td className={cn(SEL, "py-2.5 align-middle")}>
        <PemilihJamak
          nilai={nilai.tags.map((s) => s.id)}
          opsi={opsiIsu}
          onChange={(id) =>
            onUbah({
              tags: id
                .map((s) => {
                  const o = opsiIsu.find((x) => x.id === s);
                  return o ? { id: o.id, label: o.label } : null;
                })
                .filter((s): s is { id: string; label: string } => !!s),
            })
          }
          kosong={t("discussion.belumAdaTag")}
          cari={t("discussion.cariIsu")}
          buttonClassName={tombolKelas}
        />
      </td>

      {/* #703 butir 3 — Follow-up akhirnya punya kolom di kepala tabel, jadi
          baris cepatnya juga harus punya selnya. Kalau tidak, tombol "Add"
          melorot tiga kolom ke kiri dan tidak lagi lurus dengan ACTION —
          itulah yang ditangkap pemilik proyek 12 Okt malam. */}
      <td className={cn(SEL, "py-2.5 align-middle")}>
        <textarea
          placeholder={t("discussion.followUp")}
          value={nilai.tindakanLanjut}
          onChange={(e) => onUbah({ tindakanLanjut: e.target.value })}
          rows={2}
          className={cn(isianKelas, "resize-none overflow-y-auto py-1 leading-snug")}
        />
      </td>

      <td className={cn(SEL, "py-2.5 align-middle")}>
        <PemilihJamak
          nilai={nilai.assigneeIds}
          opsi={opsiPenerima}
          onChange={(id) => onUbah({ assigneeIds: id })}
          kosong={t("newTask.unassigned")}
          cari={t("discussion.cariAnggota")}
          buttonClassName={tombolKelas}
        />
      </td>

      <td className={cn(SEL, "py-2.5 align-middle")}>
        <LanproDatePicker
          value={nilai.targetDate}
          onChange={(val) => onUbah({ targetDate: val })}
          buttonClassName={tombolKelas}
        />
      </td>

      {/* #709 — tautan dan gambar akhirnya bisa diisi dari sini. Yang berubah
          bukan kemungkinan teknisnya (berkas tetap butuh `point_id`), melainkan
          jalurnya: tautan ikut payload pembuatan, berkas diantre lalu ditempel
          setelah id sungguhan pulang. */}
      <td className={cn(SEL, "py-2.5 align-middle")}>
        <PenyuntingTautan nilai={nilai.links} onUbah={(daftar) => onUbah({ links: daftar })} />
      </td>

      <td className={cn(SEL, "py-2.5 align-middle")}>
        <AntreanBerkas
          nilai={nilai.berkas}
          onUbah={(daftar) => onUbah({ berkas: daftar })}
          sedangMengunggah={sedangMenyimpan}
        />
      </td>

      <td className={cn(SEL, "py-2.5 text-center align-middle text-content-subtle text-xs")}>-</td>

      <td className={cn(SEL, "py-2.5 text-center align-middle")}>
        <span className="px-2.5 py-1 rounded-md text-[10px] leading-none font-normal bg-amber-500/10 text-amber-700 border border-amber-500/30">
          {t("discussion.statusPending")}
        </span>
      </td>

      <td className={cn(SEL, "py-2.5 text-center align-middle")}>
        <button
          type="button"
          onClick={onTambah}
          disabled={sedangMenyimpan || !nilai.concern.trim()}
          className="px-3 py-1.5 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active disabled:opacity-40 text-content-inverse rounded-md text-xs font-normal shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
          title={t("discussion.addPoint")}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("discussion.add")}</span>
        </button>
      </td>
    </tr>
  );
};

/** Versi HP (< 640px): blok kartu di atas daftar, bukan baris tabel. */
export const BlokCepatMobile: React.FC<BarisCepatProps> = (props) => {
  const { nilai, onUbah, onTambah, sedangMenyimpan, opsiPenerima, opsiIsu } = props;
  const { t } = useTranslation();

  const isianMobile = cn(isianKelas, "py-2.5");

  return (
    <div
      id="quick-add-section"
      className="rounded-xl border border-primary/25 bg-primary-surface/5 p-3 space-y-2.5 shadow-2xs"
    >
      <div className="text-[11px] font-medium text-content-strong">{t("discussion.addPoint")}</div>
      <input
        id="quick-add-concern"
        type="text"
        placeholder={t("discussion.newConcernPlaceholder")}
        value={nilai.concern}
        onChange={(e) => onUbah({ concern: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onTambah();
        }}
        className={cn(isianMobile, "min-w-0")}
      />
      <textarea
        placeholder={t("discussion.notesPlaceholder")}
        value={nilai.keterangan}
        onChange={(e) => onUbah({ keterangan: e.target.value })}
        rows={2}
        className={cn(isianMobile, "min-w-0 min-h-[56px] resize-y")}
      />
      {/* Satu sumber isian: apa yang ada di baris desktop ada juga di sini
          (#645 — satu field jangan punya dua bentuk tergantung layar). */}
      <textarea
        placeholder={t("discussion.followUp")}
        value={nilai.tindakanLanjut}
        onChange={(e) => onUbah({ tindakanLanjut: e.target.value })}
        rows={2}
        className={cn(isianMobile, "min-w-0 min-h-[56px] resize-y")}
      />
      <div className="grid grid-cols-1 gap-2 min-w-0">
        <PemilihJamak
          nilai={nilai.tags.map((s) => s.id)}
          opsi={opsiIsu}
          onChange={(id) =>
            onUbah({
              tags: id
                .map((s) => {
                  const o = opsiIsu.find((x) => x.id === s);
                  return o ? { id: o.id, label: o.label } : null;
                })
                .filter((s): s is { id: string; label: string } => !!s),
            })
          }
          kosong={t("discussion.belumAdaTag")}
          cari={t("discussion.cariIsu")}
          buttonClassName={cn(tombolKelas, "py-2.5")}
        />
        <PemilihJamak
          nilai={nilai.assigneeIds}
          opsi={opsiPenerima}
          onChange={(id) => onUbah({ assigneeIds: id })}
          kosong={t("newTask.unassigned")}
          cari={t("discussion.cariAnggota")}
          buttonClassName={cn(tombolKelas, "py-2.5")}
        />
        <LanproDatePicker
          value={nilai.targetDate}
          onChange={(val) => onUbah({ targetDate: val })}
          buttonClassName={cn(tombolKelas, "py-2.5")}
        />
        {/* #709 — dua isian yang sama rata dengan versi desktop (#645: satu
            field jangan punya dua bentuk tergantung layar). */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-content-muted">
            <Link2 className="w-3 h-3" />
            {t("discussion.tautan")}
          </div>
          <PenyuntingTautan nilai={nilai.links} onUbah={(daftar) => onUbah({ links: daftar })} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-content-muted">
            <IkonGambar className="w-3 h-3" />
            {t("discussion.gambar")}
          </div>
          <AntreanBerkas
            nilai={nilai.berkas}
            onUbah={(daftar) => onUbah({ berkas: daftar })}
            sedangMengunggah={sedangMenyimpan}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onTambah}
        disabled={sedangMenyimpan || !nilai.concern.trim()}
        className="w-full min-h-11 px-3 py-2.5 bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active disabled:opacity-40 text-content-inverse rounded-md text-xs font-medium shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        <span>{t("discussion.add")}</span>
      </button>
    </div>
  );
};
