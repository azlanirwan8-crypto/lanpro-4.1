import React, { useState } from "react";
import { Mail, AlertCircle, CheckCircle2, ArrowRight, X } from "lucide-react";
import { cn } from "../../../lib/utils";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Gagal mengirim permintaan.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setEmail("");
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-surface border border-border-subtle rounded-xl shadow-2xl p-6 overflow-hidden">
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-1.5 text-content-subtle hover:text-content rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-content-strong">Lupa Kata Sandi?</h3>
          <p className="text-xs text-content-muted mt-1 max-w-xs mx-auto">
            Masukkan alamat email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata
            sandi.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold mb-0.5">Tautan Pemulihan Dikirim!</p>
                <p className="text-content-muted">
                  Jika alamat <strong>{email}</strong> terdaftar, instruksi pemulihan telah dikirim.
                  Tautan berlaku selama 15 menit.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleModalClose}
              className="w-full py-2.5 px-4 bg-surface-sunken hover:bg-surface-elevated text-content font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-content-body block">
                Alamat Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="nama@perusahaan.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className={cn(
                  "w-full px-3.5 py-2.5 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-xs font-medium text-content placeholder:text-content-subtle",
                  error
                    ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                    : "border-border-subtle focus:ring-primary/20 focus:border-primary"
                )}
              />
              {error && (
                <p className="text-xs font-medium text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-surface-sunken hover:bg-surface-elevated text-content font-medium rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex-1 py-2.5 px-4 bg-primary-surface text-content-inverse hover:bg-primary-surface-hover font-semibold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{loading ? "Mengirim..." : "Kirim Tautan"}</span>
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
