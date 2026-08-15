import { useState } from "react";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { kirimLengkapiPendaftaran } from "./services/sso.service";
import type { CompleteRegistrationScreenProps } from "./types";

/**
 * Langkah terakhir pendaftaran lewat Google/Microsoft.
 *
 * KENAPA LAYAR INI ADA. Google dan Microsoft hanya memberi email dan nama —
 * tidak ada username. Sementara aturan LanPro mewajibkan username yang unik,
 * hanya huruf, maksimal 10 karakter. Membangkitkannya otomatis akan
 * menghasilkan nama yang aneh dan mudah bertabrakan, jadi pengguna memilih
 * sendiri (ketetapan F5.1, opsi C).
 *
 * Email dan nama sengaja ditampilkan TIDAK BISA DIUBAH: keduanya berasal dari
 * identitas yang sudah diverifikasi provider, dan membiarkannya diedit akan
 * membatalkan seluruh gunanya verifikasi itu.
 *
 * Akun baru dibuat SETELAH tombol ini ditekan, bukan sebelumnya. Bila pengguna
 * menutup layar sekarang, tidak ada baris setengah jadi yang tertinggal.
 */
export const CompleteRegistrationScreen = ({
  email,
  nama,
  onSelesai,
  onBatal,
}: CompleteRegistrationScreenProps) => {
  const [username, setUsername] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<string | null>(null);

  // Penyaringan sama persis dengan form pendaftaran manual — aturan lama tidak
  // boleh berbeda hanya karena jalur masuknya berbeda.
  const ubahUsername = (nilai: string) => {
    const disaring = nilai.replace(/[^a-zA-Z]/g, "").slice(0, 10);
    if (nilai !== disaring) {
      setGalat("Username hanya boleh berupa huruf, maksimal 10 karakter");
    } else {
      setGalat(null);
    }
    setUsername(disaring);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setGalat("Username wajib diisi");
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

  if (berhasil) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-2xl font-semibold text-content-strong">Pendaftaran Berhasil</h2>
        <p className="mt-2 text-sm text-content-secondary">{berhasil}</p>
        <button
          type="button"
          onClick={onSelesai}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6
                     text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-hover"
        >
          Kembali ke Halaman Masuk
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <h2 className="text-2xl font-semibold text-content-strong">Lengkapi Pendaftaran</h2>
      <p className="mt-1.5 text-sm text-content-secondary">
        Satu langkah lagi. Pilih username untuk akun LanPro Anda.
      </p>

      <form onSubmit={kirim} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-content-body">Nama</label>
          <input
            type="text"
            value={nama}
            readOnly
            disabled
            className="min-h-11 w-full rounded-lg border border-border-subtle bg-surface-muted px-3.5
                       text-sm text-content-muted"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-content-body">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="min-h-11 w-full rounded-lg border border-border-subtle bg-surface-muted px-3.5
                       text-sm text-content-muted"
          />
          <p className="mt-1 text-xs text-content-muted">
            Diambil dari akun Google/Microsoft Anda dan tidak dapat diubah.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-content-body">
            Username <span className="text-danger">*</span>{" "}
            <span className="font-normal text-content-muted">(Huruf saja, maks 10)</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => ubahUsername(e.target.value)}
            placeholder="johndoe"
            autoFocus
            className="min-h-11 w-full rounded-lg border border-border-subtle bg-surface px-3.5
                       text-sm text-content transition-colors duration-150
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {galat && (
          <div className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{galat}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={mengirim || !username}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg
                     bg-primary px-4 text-sm font-medium text-white
                     transition-colors duration-150 hover:bg-primary-hover
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mengirim ? "Memproses..." : "Selesaikan Pendaftaran"}
          {!mengirim && <ArrowRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onBatal}
          className="inline-flex min-h-11 w-full items-center justify-center text-sm
                     text-content-secondary transition-colors duration-150 hover:text-content"
        >
          Batal
        </button>
      </form>
    </motion.div>
  );
};
