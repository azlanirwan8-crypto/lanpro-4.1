import i18n from "../i18n";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  /**
   * Saat nilai ini berubah, galat yang tersimpan dibuang.
   *
   * KENAPA PERLU (#286). Tanpa ini, sekali sebuah tampilan melempar, batasnya
   * akan terus menampilkan layar galat itu SELAMANYA — termasuk sesudah
   * pengguna pindah ke menu lain, sebab React tidak punya cara lain untuk tahu
   * bahwa yang dirender sekarang bukan lagi komponen yang tadi rusak. Diisi
   * dengan nama tampilan aktif, sehingga berpindah menu memulihkannya sendiri.
   */
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  /**
   * Mencoba merender ulang anaknya TANPA memuat ulang halaman.
   *
   * Memuat ulang halaman membuang seluruh keadaan aplikasi — sesi, proyek yang
   * sedang dibuka, isian yang belum disimpan — untuk memperbaiki satu panel.
   * Bila galatnya sementara (impor dinamis yang gagal, satu respons yang
   * cacat), mencoba lagi sudah cukup. Tombol muat-ulang tetap disediakan
   * sebagai jalan terakhir.
   */
  private coba = () => this.setState({ hasError: false, error: null });

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-rose-500/10 rounded-xl p-8 max-w-md w-full text-center border border-rose-500/30 shadow-soft">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-lg font-medium text-content-strong mb-2">
              {i18n.t("ui.viewCrashTitle")}
            </h2>
            <p className="text-sm text-content-muted mb-6">{i18n.t("ui.viewCrashBody")}</p>
            <div className="bg-surface p-3 rounded text-left mb-6 overflow-auto max-h-32 border border-border-faint">
              <code className="text-xs sm:text-[10px] text-rose-500 font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={this.coba}
                className="inline-flex items-center gap-2 bg-surface-inverse text-content-inverse px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-inverse-strong transition-colors shadow-soft"
              >
                <RefreshCw className="w-4 h-4" />
                {i18n.t("ui.viewCrashRetry")}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 bg-surface border border-border-subtle text-content-body px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-sunken transition-colors"
              >
                {i18n.t("ui.reloadPage")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
