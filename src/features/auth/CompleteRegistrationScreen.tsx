import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { kirimLengkapiPendaftaran } from "./services/sso.service";
import { usulkanUsername } from "./lib/ssoUsername";
import type { CompleteRegistrationScreenProps } from "./types";

/**
 * KENAPA LAYAR INI DUDUK DI ATAS KARTU (#165). Banner biru di `AuthLayout`
 * berposisi ABSOLUT, jadi ia keluar dari alur dan pemusatan tegak lurus di
 * sana mengabaikan tingginya. Layar login dan daftar tidak terganggu sebab
 * keduanya sudah punya kartu legap; layar ini dulu tidak punya, sehingga
 * judul dan subjudulnya ter-render langsung di atas banner. Terukur dari
 * token `index.css`: teks sekunder di atas banner hanya 3,71:1 di mode gelap
 * dan 1,01:1 di mode terang — yang kedua praktis tidak terbaca. Di atas
 * `bg-surface` keduanya menjadi 8,46:1 dan 7,58:1.
 */
/**
 * Langkah terakhir pendaftaran lewat Google/Microsoft.
 *
 * KENAPA LAYAR INI ADA. Google dan Microsoft hanya memberi email dan nama —
 * tidak ada username. Sementara aturan LanPro mewajibkan username yang unik,
 * hanya huruf, maksimal 10 karakter. Membangkitkannya otomatis akan
 * menghasilkan nama yang aneh dan mudah bertabrakan, jadi pengguna memilih
 * sendiri (ketetapan F5.1, opsi C).
 *
 * Email dan nama TIDAK ditampilkan di layar ini. Keduanya dulu berupa kolom
 * input mati yang membuat tampilan terasa kaku tanpa menambah manfaat. Yang
 * penting: identitas yang dipakai membuat akun diambil dari cookie bertanda
 * tangan di backend, bukan dari apa pun yang terlihat di layar — sehingga
 * menghapusnya dari tampilan tidak mengurangi keamanan sedikit pun.
 *
 * Akun baru dibuat SETELAH tombol ini ditekan, bukan sebelumnya. Bila pengguna
 * menutup layar sekarang, tidak ada baris setengah jadi yang tertinggal.
 */
/** Aturan baru: hanya huruf, maksimal 25 karakter (#214). */
const SAH = /^[a-zA-Z]{1,25}$/;

const ID_KOLOM = "sso-username";
const ID_GALAT = "sso-username-galat";
const ID_PETUNJUK = "sso-username-petunjuk";

export const CompleteRegistrationScreen = ({
  email,
  onSelesai,
  onBatal,
}: CompleteRegistrationScreenProps) => {
  const { t } = useTranslation();
  // Kolom sudah terisi usulan dari email, TETAPI tetap bisa diubah. Mengunci
  // usulan akan membuat pengguna mentok bila nama itu sudah dipakai orang lain
  // — dan itu tidak jarang, karena pemotongan 10 karakter membuat nama yang
  // mirip bertabrakan.
  const [username, setUsername] = useState(() => usulkanUsername(email));
  const [adaUsulan] = useState(() => usulkanUsername(email) !== "");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<string | null>(null);

  // `aria-describedby` hanya menyebut id yang BENAR-BENAR ter-render. Menunjuk
  // ke elemen yang tidak ada dibaca pembaca layar sebagai tidak ada keterangan
  // sama sekali, jadi lebih buruk daripada tidak memasangnya (#167).
  const keteranganKolom = [galat ? ID_GALAT : null, adaUsulan ? ID_PETUNJUK : null]
    .filter(Boolean)
    .join(" ");

  // Penyaringan sama persis dengan form pendaftaran manual — aturan lama tidak
  // boleh berbeda hanya karena jalur masuknya berbeda.
  const ubahUsername = (nilai: string) => {
    // Nilainya disimpan APA ADANYA (#168). Versi sebelumnya membuang karakter
    // terlarang pada setiap ketikan, sehingga angka lenyap sebelum sempat
    // terlihat dan papan ketik terasa rusak. Efek sampingnya terbukti saat
    // #167: karena kolom sudah berisi hasil saringan, memperbaikinya dengan
    // mengetik ulang nilai yang sama tidak memicu peristiwa apa pun dan galat
    // lama bertahan di layar. Kini kolom menampilkan yang diketik, galat
    // menjelaskan yang salah, dan pengiriman yang menahan nilai tak sah.
    setUsername(nilai);
    setGalat(SAH.test(nilai) || nilai === "" ? null : t("completeReg.usernameInvalid"));
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setGalat(t("completeReg.usernameRequired"));
      return;
    }
    // Penjaga terakhir. Sejak #168 kolom tidak lagi menyaring saat mengetik,
    // jadi nilai tak sah bisa sampai ke sini — dan tidak boleh lewat.
    if (!SAH.test(username)) {
      setGalat(t("completeReg.usernameInvalid"));
      return;
    }
    setMengirim(true);
    setGalat(null);

    const hasil = await kirimLengkapiPendaftaran(username);
    setMengirim(false);

    if (hasil.berhasil) {
      setBerhasil(hasil.pesan);
      return;
    }
    setGalat(hasil.pesan);
  };

  // -- Auto-redirect ke halaman login setelah 5 detik --
  //
  // Hitung mundur ini BERHENTI pada interaksi pertama, untuk seterusnya (#166).
  // Pesan di layar sukses berbunyi "akun Anda menunggu persetujuan admin" —
  // pengguna baru saja mendaftar dan perlu tahu bahwa ia BELUM bisa masuk,
  // jadi melemparnya keluar saat ia masih membaca adalah kerugian bersih.
  // Tombolnya tetap ada, jadi yang memang ingin kembali tidak dihalangi.
  const [hitungMundur, setHitungMundur] = useState(5);
  const [dijeda, setDijeda] = useState(false);

  const kembali = useCallback(() => {
    onSelesai();
  }, [onSelesai]);

  useEffect(() => {
    if (!berhasil || dijeda) return;

    const hentikan = () => setDijeda(true);
    const peristiwa = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"] as const;
    for (const nama of peristiwa) {
      window.addEventListener(nama, hentikan, { passive: true });
    }

    return () => {
      for (const nama of peristiwa) {
        window.removeEventListener(nama, hentikan);
      }
    };
  }, [berhasil, dijeda]);

  useEffect(() => {
    if (!berhasil || dijeda) return;

    if (hitungMundur <= 0) {
      kembali();
      return;
    }

    const timer = setTimeout(() => {
      setHitungMundur((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [berhasil, dijeda, hitungMundur, kembali]);

  if (berhasil) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border-faint/90 p-8 sm:p-10 mx-auto text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
          <CheckCircle2 className="h-7 w-7 text-success-text" />
        </div>
        <h2 className="text-2xl font-semibold text-content-strong">
          {t("completeReg.regSuccess")}
        </h2>
        <p className="mt-2 text-sm text-content-secondary">{berhasil}</p>
        <button
          type="button"
          onClick={kembali}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-surface px-6
                     text-sm font-medium text-content-inverse transition-colors duration-150 hover:bg-primary-surface-hover"
        >
          {t("completeReg.backToLogin")}
        </button>
        {!dijeda && (
          <p className="mt-3 text-xs text-content-muted">
            {t("completeReg.backToLoginIn", { detik: hitungMundur })}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border-faint/90 p-8 sm:p-10 mx-auto"
    >
      <h2 className="text-2xl font-semibold text-content-strong">{t("completeReg.completeReg")}</h2>
      <p className="mt-1.5 text-sm text-content-secondary">{t("completeReg.oneMoreStep")}</p>

      {/* Nama dan email sengaja TIDAK ditampilkan. Keduanya dulu berupa kolom
          input mati yang tidak bisa disentuh, dan itu membuat layar terasa
          kaku tanpa menambah manfaat. Email tetap dipakai di balik layar untuk
          menyusun usulan username, dan identitas yang dipakai membuat akun
          diambil dari cookie bertanda tangan di backend — bukan dari apa yang
          ditampilkan di sini. */}
      <form onSubmit={kirim} className="mt-6 space-y-4">
        <div>
          <label htmlFor={ID_KOLOM} className="mb-1.5 block text-sm font-medium text-content-body">
            {t("completeReg.usernameLabel")} <span className="text-danger-text">*</span>{" "}
            <span className="font-normal text-content-muted">{t("completeReg.usernameHint")}</span>
          </label>
          <input
            id={ID_KOLOM}
            type="text"
            aria-invalid={galat ? "true" : "false"}
            aria-describedby={keteranganKolom || undefined}
            value={username}
            onChange={(e) => ubahUsername(e.target.value)}
            placeholder={t("completeReg.usernamePlaceholder")}
            autoFocus
            className="min-h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5
                       text-sm text-content transition-colors duration-150
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {/* Keterangan hanya muncul bila memang ada usulan. Menampilkan
              "kami sarankan" pada kolom kosong justru membingungkan. */}
          {adaUsulan && (
            <p id={ID_PETUNJUK} className="mt-1 text-xs text-content-muted">
              {t("completeReg.suggestHint")}
            </p>
          )}
        </div>

        {galat && (
          <div
            id={ID_GALAT}
            role="alert"
            className="flex items-start gap-2 text-sm text-danger-text"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{galat}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={mengirim || !username}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg
                     bg-primary-surface px-4 text-sm font-medium text-content-inverse
                     transition-colors duration-150 hover:bg-primary-surface-hover
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mengirim ? t("completeReg.submitting") : t("completeReg.submit")}
          {!mengirim && <ArrowRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onBatal}
          className="inline-flex min-h-11 w-full items-center justify-center text-sm
                     text-content-secondary transition-colors duration-150 hover:text-content"
        >
          {t("completeReg.cancel")}
        </button>
      </form>
    </motion.div>
  );
};
