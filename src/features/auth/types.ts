/** Tipe domain untuk layar autentikasi. Tanpa runtime, sesuai aturan lapisan. */

export interface LoginScreenProps {
  onLogin: (u: string, p: string, remember: boolean) => void;
  onRegisterClick: () => void;
  loading?: boolean;
  loadingText?: string;
}

export interface RegisterScreenProps {
  onRegister: (u: string, p: string, n: string, e: string) => Promise<any>;
  onBackToLogin: () => void;
}

export interface LoginSkeletonStateProps {
  loadingText?: string;
}

export interface CompleteRegistrationScreenProps {
  /**
   * Dipakai untuk menyusun usulan username. TIDAK ditampilkan di layar.
   * Identitas yang benar-benar dipakai membuat akun berasal dari cookie
   * bertanda tangan di backend, bukan dari nilai ini.
   */
  email: string;
  onSelesai: () => void;
  onBatal: () => void;
}
