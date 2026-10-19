import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import { ListPerPageSelect } from "../../../components/ui/ListPerPageSelect";
import { cn } from "../../../lib/utils";
import type { ArahSortir, KolomSortir, SetelanSortir } from "../lib/sortir";

/**
 * #703 — kepala (cari + tombol asisten AI) dan kaki (paginasi) papan diskusi,
 * dikeluarkan dari `DiscussionPointsTable.tsx`.
 *
 * Alasannya murni batas §4: induknya masih 858 baris sesudah laci sunting, baris
 * data, baris cepat, dan laci utas keluar. Dua potong tata letak yang tidak
 * punya logika data adalah tempat paling aman untuk memotongnya, dan keduanya
 * memang sudah berbentuk begitu — hanya props yang masuk, tidak ada state.
 *
 * #707 menambahkan `KepalaTabel` ke berkas yang sama, dan itu bukan tempat
 * parkir: kepala tabel adalah potongan ketiga yang tidak punya state, dan
 * induknya sudah 780 baris dari batas 800 §4 sebelum item ini dimulai.
 */

interface KepalaProps {
  tampilAI: boolean;
  onToggleAI: () => void;
  cari: string;
  onCari: (teks: string) => void;
}

export const KepalaPapan: React.FC<KepalaProps> = ({ tampilAI, onToggleAI, cari, onCari }) => {
  const { t } = useTranslation();
  return (
    <div className="px-3 sm:px-5 py-3 border-b border-border-subtle/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-sunken/40 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs shrink-0">
          <Search className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-content-strong tracking-tight truncate">
            {t("discussion.heading2")}
          </h3>
          <p className="text-xs font-normal text-content-subtle hidden sm:block">
            {t("discussion.subheading")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
        {!tampilAI && (
          <div className="relative flex-1 min-w-0 sm:w-64 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-content-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("discussion.searchPlaceholder")}
              value={cari}
              onChange={(e) => onCari(e.target.value)}
              className="w-full min-w-0 pl-9 pr-3 py-2 bg-surface border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md text-xs font-normal text-content-strong outline-none shadow-2xs"
            />
          </div>
        )}

        <button
          onClick={onToggleAI}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-md text-xs font-normal transition-all border shadow-2xs cursor-pointer shrink-0",
            tampilAI
              ? "bg-surface-muted hover:bg-surface-strong text-content-body border-border-subtle"
              : "bg-primary/10 hover:bg-primary/15 text-primary border-primary/20"
          )}
          title={tampilAI ? t("discussion.closeAiAssistant") : t("discussion.aiAssistant")}
        >
          {tampilAI ? (
            <>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("discussion.closeAiAssistant")}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t("discussion.aiAssistant")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * #707 — garis pemisah antar baris. Sejak #712 ia hanya dipakai `BarisDiskusi`:
 * baris cepat keluar dari tabel dan tidak punya sel lagi. Bentuknya tetap di
 * berkas ini karena tabelnya kini `border-separate` — syarat agar garis bawah
 * kepala tabel ikut melekat — dan pada model terpisah CSS tidak menggambar
 * border pada `<tr>`, sehingga `divide-y` di `<tbody>` diam-diam menghasilkan
 * nol garis.
 *
 * #714 — `overflow-hidden` ditambahkan, dan itu bukan pemanis. Dengan
 * `table-fixed` lebar kolom DIPATOK dari kepala, tetapi konten yang lebih lebar
 * tidak dibuang maupun dipotong: ia tetap DIGAMBAR melewati tepi sel, di atas
 * kolom tetangga. Itulah yang pemilik proyek lihat sebagai "dropdown lolos dari
 * wadahnya" pada 13 Okt — kali ini bukan panelnya (itu sudah portal sejak
 * `ea671294`), melainkan pemicunya dan chip nama berkas. `ea671294` menambal
 * satu panel; yang dibutuhkan adalah pagar di setiap sel, supaya cacat yang sama
 * tidak bisa lahir lagi di kolom berikutnya.
 *
 * #714 menambahkan `border-r` sebagai pemisah antar kolom.
 *
 * #715 memindahkan papan ini ke keputusan #699 dan #678b yang sudah lama berlaku
 * untuk Daftar Isu, dan itu mengubah DUA garis sekaligus:
 *  - Garis pemisah BARIS naik dari `border-border-faint` ke `border-border-subtle`.
 *    #699 mengukur yang pertama hanya 1,096:1 terhadap putih — mata tidak
 *    membacanya sebagai pemisah, jadi baris-baris papan ini seperti mengalir ke
 *    satu sama lain. Itu sebagian dari "berantakan" yang dilaporkan.
 *  - Garis pemisah KOLOM tetap `border-border-faint` (#678b: "garis setajam garis
 *    kontrol di setiap kolom akan mengubah tabel menjadi kisi").
 * Karena dua sisi butuh warna berbeda, kelasnya ditulis PER SISI
 * (`border-b-border-subtle`, `border-r-border-faint`). Menulis
 * `border-border-subtle border-border-faint` tidak akan bekerja: keduanya
 * mengatur `border-color` untuk semua sisi, dan yang menang ditentukan urutan
 * stylesheet, bukan maksud penulisnya.
 */
export const SEL =
  "px-4 border-b border-b-border-subtle border-r border-r-border-faint last:border-r-0 overflow-hidden";

/**
 * #707 — kepala tabel desktop. `position: sticky` hanya bekerja terhadap
 * scrollport TERDEKAT, dan selama berkas ini masih dibungkus `ResponsiveTable`
 * (satu `overflow-x-auto` lagi di dalam), scrollport terdekat itu adalah bungkus
 * dalam yang tingginya mengikuti isi — jadi ia tidak pernah bergulir dan kepala
 * tabel tetap ikut lolos ke atas. Yang menahan tampilan itu bukan kelasnya,
 * melainkan jumlah wadahnya; lihat `DiscussionPointsTable.tsx`.
 *
 * Dua turunannya ikut ditangani di sini:
 *  - Latar kepala harus OPAN. `bg-primary-surface/5` (standar #422) tembus
 *    pandang, jadi baris yang lewat di bawahnya terlihat menembus. `surface-sunken`
 *    adalah token latar terdekat yang tidak tembus, baik di mode terang maupun
 *    gelap, dan tidak satu pun override mode gelap ditambahkan (§22).
 *  - Garis bawah pindah dari baris ke sel kepala. Tabel ini kini
 *    `border-separate` (tanpa itu garis bawah kepala ikut hilang bersama model
 *    `border-collapse`), dan pada model terpisah border pada baris tidak digambar.
 *
 * Lebar kolom ditulis di sini dan hanya di sini: dengan `table-fixed` nilai
 * inilah kolomnya, dan baris data tidak perlu menebak lagi.
 *
 * #714 — dari DUA BELAS kolom menjadi lebih sedikit, dan lebarnya tidak lagi
 * ditentukan oleh nama kolomnya melainkan oleh teks yang benar-benar duduk di
 * dalamnya. Chip PIC memakai `px-2 text-[10px]`: "Mohamad Rifky Pramadanianto"
 * (27 karakter) butuh ±153 px termasuk padding, sementara kolomnya dipatok
 * 150 px — jadi secara matematis TIDAK PERNAH bisa berbagi baris dengan chip
 * lain. Tiga PIC berarti tiga lajur, dan satu baris tabel naik ke enam lajur
 * tinggi. Pada saat yang sama Notes/Remarks memegang 280 px — kolom terlebar
 * kedua di papan — dan kosong pada kedua baris papan yang difoto.
 *
 * #715 — dua koreksi atas #714, keduanya laporan pemilik proyek dari layar.
 *
 * (1) URUTAN KEPALA ADALAH KONTRAK, dan #714 melanggarnya. Kepala ditulis
 * `Notes → Follow-up → Tags` sementara sel baris ditulis `Notes → Tags →
 * Follow-up`, jadi kolom "FOLLOW UP" menampilkan TAG dan "CONTEXT / TAGS"
 * menampilkan teks follow-up: dua kolom bertukar isi dan tidak satu pun perkakas
 * berteriak — `tsc` tidak tahu kolom mana berisi apa, dan build tetap hijau.
 * `kepalaSelSejajar-715.test.ts` sekarang menahan urutan itu.
 *
 * (2) PIC dan Target Date dipisah lagi. #714 menggabungkannya atas nama
 * "siapa dan kapan satu niat"; pemilik proyek menolaknya ("datetime kenapa di
 * gabung dengan pic, kolom pisah saja"), dan ia benar: tanggal adalah data yang
 * diurutkan dan dibaca cepat, bukan keterangan tambahan di samping nama.
 *
 * Sekalian kepala papan ini dipindah ke kit gaya rumah
 * (`src/features/issues/styles.ts`, `tableHeaderCell`): `text-[10px] font-normal
 * py-2.5` dengan pemisah kolom `border-border-faint`. Sebelumnya ia `text-xs
 * py-3` — huruf lebih besar dan baris lebih gemuk daripada tabel mana pun lain
 * di aplikasi yang sama, dan itu bagian dari "tidak Velzon".
 *
 * Jumlahnya jadi sebelas kolom: 170, 66, 220, 190, 200, 220, 200, 170, 150, 130,
 * 92 = 1.808 px. `min-w` wadah gulir WAJIB sama dengan jumlah ini; test
 * menguncinya.
 * (170 bukan 150 sejak #765 — lihat catatan di kolom TANGGAL TARGET. 66 bukan
 * 48 sejak putaran 3 #765: "No" digambar uppercase 10 px = 16,2 px, ditambah
 * gap 4 dan panah 12 = 32,2 px, sementara `px-4` kepala memakan 32 px dari 48 —
 * kolomnya hanya menyisakan 16 px, jadi peramban melebarkannya sendiri dan
 * angka yang dijumlahkan test itu tidak lagi menggambarkan layar.)
 *
 * #792 — sembilan jadi SEPULUH, dan yang berpindah adalah yang paling penting.
 * Selama "Status & actions" menjadi kolom TERAKHIR, kedelapan kolom sebelumnya
 * berjumlah 1.396 px: di layar mana pun yang lebih sempit dari itu, pil status
 * dan badge komentar TIDAK TERLIHAT sebelum pengguna menggulir horizontal —
 * persis "kejauhan" yang dilaporkan pemilik proyek. Kartu mobile sudah lama
 * menaruh nomor dan pil status di baris paling atas
 * (`DiscussionPointMobileCardView.tsx`), jadi yang menyimpang adalah desktopnya.
 *
 * Sel 230 px itu kini DIPECAH dua, dan pembagiannya bukan kosmetik: STATUS dan
 * komentar adalah keadaan yang dibaca, sunting dan hapus adalah perintah yang
 * ditekan. Yang pertama pindah ke kolom pertama (rata kiri); yang kedua tetap
 * di kanan sebagai AKSI karena di sanalah tombol baris berada di tabel mana pun
 * lain di aplikasi ini.
 *
 * ANGKA 170 BUKAN ANGKA BULAT YANG DIPILIH — ia sisa dari 230. #715 mengukur isi
 * sel lama ±214 px dari 230 px dan itu angka yang masih berlaku, karena yang
 * dibuang hanyalah dua tombol ikon: `p-1.5` atas ikon 16 px = 28 px tiap tombol,
 * dua tombol, plus dua `gap-1` = 64 px. 230 − 64 = 166 px yang harus ditanggung
 * pil status dan badge komentar sendirian, dan kolomnya diberi 170 px supaya
 * longgar seperti dulu. Kolom AKSI 92 px dihitung dari isinya juga: dua tombol
 * `p-1.5` atas ikon 16 px = 28 px tiap tombol, satu `gap-1` = 4 px, lalu `px-4`
 * kepala = 32 px. 28 + 28 + 4 + 32 = 92.
 *
 * #792 — enam dari sebelas kepala bisa ditekan untuk URUT (Status, No./
 * `createdAt`, Concern, Notes, Follow-up, Target Date). Yang tidak: Context/Tags,
 * PIC, Tanggal Selesai (#793), Lampiran, dan Aksi — tiga pertama datang dari
 * tabel relasi atau kolom `JSONB` (`tags`, `links`,
 * `discussion_point_assignees`) jadi tidak ada satu nilai pun di Database yang
 * bisa dipakai `ORDER BY` tanpa menambah whitelist server, dan yang terakhir
 * bukan kolom data sama sekali. Menaruh panah di sana akan menjanjikan urutan
 * yang tidak bisa ditunaikan server.
 *
 * YANG SENGAJA TIDAK DIUBAH: lebar kolom dan kelas kepala. Test
 * `kepalaSelSejajar-715.test.ts` menjumlahkan lebar itu dan membandingkannya
 * dengan `min-w` wadah, dan `tataletakPapan-707.test.ts` membaca blok kelas
 * kepala lewat penanda deklarasinya sendiri — karena itu komentar di berkas ini
 * TIDAK BOLEH mengulang penanda itu apa adanya, persis pelajaran yang sudah
 * ditulis di kepala `BarisDiskusi.tsx`: komentar yang menyebut marker membuat
 * `indexOf` test menemukannya lebih dulu daripada kodenya, dan penjaganya jatuh
 * untuk alasan yang bukan cacat. Yang dijaga di sini: kepala tetap seukuran
 * kit rumah (10 px, jarak vertikal 2.5) tanpa latar tembus. Karena itu ruang
 * panah dicari dari dalam, bukan dari lebar: tombolnya `flex` penuh di dalam
 * `px-4` kepala, label "Topik" (±60 px) dan "Catatan / Keterangan" masih punya
 * sisa panjang di kolomnya masing-masing, dan panah kecil tidak menyentuh
 * pemisah kolom.
 */
interface KepalaTabelProps {
  sortir: SetelanSortir;
  onSortir: (kolom: KolomSortir) => void;
}

/**
 * `aria-sort` wajib di sel kepala, bukan di tombolnya: yang membaca layar
 * perlu tahu kolom mana sedang jadi acuan dan ke mana arahnya, dan itu sifat
 * KOLOM. Nilai `none` tetap ditulis untuk kolom yang tidak diurut supaya
 * pembaca tahu kolom itu bisa ditekan tetapi sedang diam.
 */
const ariaSortir = (kolom: KolomSortir, setelan: SetelanSortir) =>
  setelan.kolom !== kolom ? "none" : setelan.arah === "asc" ? "ascending" : "descending";

export const KepalaTabel: React.FC<KepalaTabelProps> = ({ sortir, onSortir }) => {
  const { t } = useTranslation();
  /* `aria` pendek bukan kosmetik: ada test yang MENGHITUNG tag pembuka sel
     kepala tabel — `kepalaSelSejajar-715.test.ts` memotongnya lewat pola
     berpemisah spasi, `diskusiJamak-703.test.tsx` memindai seluruh berkas, dan
     `tataletakPapan-707.test.ts` membaca angkanya lewat kelas lebar. Kalau satu
     tag kepala terpecah ke baris berikutnya karena panjang, jumlah yang terbaca
     test jadi kurang dan papannya dianggap kehilangan kolom. Karena itu pula
     komentar ini tidak boleh menulis tag itu secara harfiah. */
  const aria = (kolom: KolomSortir) => ariaSortir(kolom, sortir);
  /**
   * Ikon penanda urutan — SELALU terlihat (pemilik proyek 16 Okt: "header table
   * harus ada desc, asc"). Versi pertama menyembunyikannya sampai hover, dan di
   * layar itu sama dengan tidak ada sama sekali.
   *
   * Yang aktif memakai dua sinyal sekaligus supaya tidak bergantung pada warna:
   * panah menunjuk arah (naik atau turun) dan bewarna primer. Yang diam memakai
   * panah dua arah `ArrowUpDown` dengan opasitas 45 % — terbaca sebagai "kolom ini
   * bisa ditekan" tanpa bersaing dengan enam kepala yang sedang tidak dipakai.
   */
  const ikon = (kolom: KolomSortir) => {
    if (sortir.kolom !== kolom)
      return (
        <ArrowUpDown
          className="w-3 h-3 shrink-0 opacity-45 text-content-subtle"
          aria-hidden="true"
        />
      );
    return sortir.arah === "asc" ? (
      <ArrowUp className="w-3 h-3 shrink-0 text-primary" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3 h-3 shrink-0 text-primary" aria-hidden="true" />
    );
  };
  const tombol =
    "group flex w-full items-center gap-1 uppercase cursor-pointer text-left text-content-subtle hover:text-content-body transition-colors";
  const th =
    "sticky top-0 z-30 bg-surface-sunken px-4 py-2.5 text-[10px] font-normal text-content-subtle whitespace-nowrap border-b border-b-border-subtle border-r border-r-border-faint last:border-r-0";
  return (
    <thead>
      <tr className="text-content-subtle">
        {/* #792 — kolom PERTAMA, dan rata kiri. Pil status + badge komentar
            pindah ke sini dari sel paling kanan; lihat catatan di kepala. */}
        <th scope="col" aria-sort={aria("status")} className={`${th} w-[170px]`}>
          <button
            type="button"
            onClick={() => onSortir("status")}
            title={t("discussion.urutkan")}
            className={tombol}
          >
            {t("discussion.thStatus")}
            {ikon("status")}
          </button>
        </th>
        <th scope="col" aria-sort={aria("createdAt")} className={`${th} w-[66px]`}>
          <button
            type="button"
            onClick={() => onSortir("createdAt")}
            title={t("discussion.urutkan")}
            className={`${tombol} justify-center`}
          >
            {t("discussion.thNo")}
            {ikon("createdAt")}
          </button>
        </th>
        <th scope="col" aria-sort={aria("concern")} className={`${th} w-[220px]`}>
          <button
            type="button"
            onClick={() => onSortir("concern")}
            title={t("discussion.urutkan")}
            className={tombol}
          >
            {t("discussion.thConcern")}
            {ikon("concern")}
          </button>
        </th>
        <th scope="col" aria-sort={aria("keterangan")} className={`${th} w-[190px]`}>
          <button
            type="button"
            onClick={() => onSortir("keterangan")}
            title={t("discussion.urutkan")}
            className={tombol}
          >
            {t("discussion.thNotes")}
            {ikon("keterangan")}
          </button>
        </th>
        {/* URUTAN INI yang salah di #714: tag dulu, baru follow-up — persis
            seperti urutan sel di `BarisDiskusi`. */}
        <th scope="col" className={`${th} w-[200px]`}>
          {t("discussion.thContextTags")}
        </th>
        {/* #703 butir 3 — Follow-up selama ini ADA di form dan ADA di basis
            data, tetapi tidak pernah punya kolom. */}
        <th scope="col" aria-sort={aria("tindakanLanjut")} className={`${th} w-[220px]`}>
          <button
            type="button"
            onClick={() => onSortir("tindakanLanjut")}
            title={t("discussion.urutkan")}
            className={tombol}
          >
            {t("discussion.followUp")}
            {ikon("tindakanLanjut")}
          </button>
        </th>
        <th scope="col" className={`${th} w-[200px]`}>
          {t("discussion.thPic")}
        </th>
        {/* #715 — 130 px sempat jadi angka yang tampak aman padahal tidak:
            kepala digambar `uppercase` dengan `letter-spacing: 0.05em`
            (`index.css:595`), dan "TANGGAL TARGET" — label terpanjang yang bisa
            duduk di kolom ini — adalah 14 karakter × ±7 px + `px-4` = ±130 px.
            Kepalanya persis menyentuh tepi, `whitespace-nowrap`, dan satu
            pixel bahasa lain langsung luber ke pemisah kolom. #765 menambahkan
            panah ±16 px di kolom ini, jadi lebarnya 150 → 170 dan `min-w`
            wadah ikut naik; itu BUKAN pilihan gaya, melainkan angka yang sama
            yang dihitung `kepalaSelSejajar-715.test.ts`. */}
        <th scope="col" aria-sort={aria("targetDate")} className={`${th} w-[170px]`}>
          <button
            type="button"
            onClick={() => onSortir("targetDate")}
            title={t("discussion.urutkan")}
            className={tombol}
          >
            {t("discussion.thTargetDate")}
            {ikon("targetDate")}
          </button>
        </th>
        {/* #793 — TANGGAL SELESAI, tepat setelah TANGGAL TARGET, atas permintaan
            pemilik proyek ("butuh 1 lagi field tanggal done setelah tanggal
            target"). Tanpa panah urutan: `tanggalUpdateStatus` bukan salah satu
            kunci di `DAFTAR_KOLOM_SORTIR` server, dan menambahnya berarti
            mengubah tiga whitelist yang wajib sepakat (`sortirDiskusi.ts`,
            skema Zod, `KolomSortir` klien) — bukan pekerjaan satu kolom.
            150 px dihitung dari label terpanjang yang bisa duduk di sini,
            "TANGGAL SELESAI" (15 karakter × ±7 px + `px-4` = ±137 px), mengikuti
            pelajaran #715 bahwa yang menentukan lebarnya adalah TEKSNYA. */}
        <th scope="col" className={`${th} w-[150px]`}>
          {t("discussion.thDoneDate")}
        </th>
        {/* #704 butir 5 dan 6: tautan dan gambar satu sel "Lampiran". Isinya
            tetap tampil penuh, bukan angka. */}
        <th scope="col" className={`${th} w-[130px]`}>
          {t("discussion.thLampiran")}
        </th>
        {/* #792 — tersisa AKSI saja: sunting dan hapus. Yang pindah ke kolom
            pertama adalah keadaan barisnya (status dan jumlah komentar), dan
            dua tombol ini bukan keadaan melainkan perintah, jadi ia tinggal di
            kanan bersama tombol baris di tabel mana pun lain di aplikasi ini.
            92 px = dua tombol `p-1.5` dengan ikon 16 px (28 px tiap tombol) +
            satu `gap-1` + `px-4` kepala; tanpa panah urutan karena tidak ada
            kolom Database yang bisa diurut dari sini. */}
        <th scope="col" className={`${th} w-[92px]`}>
          {t("discussion.thAction")}
        </th>
      </tr>
    </thead>
  );
};

interface KakiProps {
  tampil: number;
  total: number;
  halaman: number;
  totalPages: number;
  perHalaman: number;
  onPerHalaman: (jumlah: number) => void;
  onHalaman: (halaman: number) => void;
}

export const KakiPapan: React.FC<KakiProps> = ({
  tampil,
  total,
  halaman,
  totalPages,
  perHalaman,
  onPerHalaman,
  onHalaman,
}) => {
  const { t } = useTranslation();
  return (
    <div className="px-5 py-3 bg-surface-sunken/40 border-t border-border-subtle flex items-center justify-between text-[11px] text-content-subtle font-normal shrink-0">
      <div className="flex items-center gap-3">
        <span>{t("discussion.showingPoints", { shown: tampil, filtered: total, total })}</span>
        <ListPerPageSelect value={perHalaman} onChange={onPerHalaman} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onHalaman(Math.max(halaman - 1, 1))}
          disabled={halaman === 1}
          className="px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-content-body hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer text-xs font-normal"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t("discussion.prev")}
        </button>
        <span className="px-3 py-1 bg-surface border border-border-subtle rounded-md text-primary shadow-2xs text-xs font-normal">
          {halaman} {t("common.of")} {totalPages}
        </span>
        <button
          onClick={() => onHalaman(Math.min(halaman + 1, totalPages))}
          disabled={halaman >= totalPages}
          className="px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-content-body hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer text-xs font-normal"
        >
          {t("discussion.nextPage")} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
