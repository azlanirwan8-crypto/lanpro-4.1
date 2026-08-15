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
  /** Berasal dari identitas terverifikasi provider — tidak dapat diubah pengguna. */
  email: string;
  nama: string;
  onSelesai: () => void;
  onBatal: () => void;
}
