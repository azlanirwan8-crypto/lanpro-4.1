import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { getJwtSecret } from "../helpers/jwtSecret";

/**
 * Gerbang autentikasi untuk koneksi Socket.IO (item #50).
 *
 * Dipisah dari server.ts karena dua alasan: supaya bisa diuji perilakunya tanpa
 * menyalakan server sungguhan, dan supaya penjaga ini punya tempat yang jelas
 * alih-alih terselip di antara 900 baris konfigurasi.
 *
 * Sengaja TIDAK menyentuh database. Ia hanya menjawab satu pertanyaan: apakah
 * token pada handshake sah? Kebijakan lain — siapa boleh masuk room proyek mana
 * — adalah urusan lapisan lain.
 */

export const PESAN_TANPA_TOKEN = "AUTENTIKASI_DIBUTUHKAN";
export const PESAN_TOKEN_TIDAK_VALID = "TOKEN_TIDAK_VALID";

type SocketMirip = {
  handshake?: { auth?: any; query?: any };
  data?: any;
};

/**
 * Membaca token dari handshake. `auth` adalah jalur yang dipakai klien resmi;
 * `query` diterima sebagai cadangan karena sebagian proxy dan klien lama tidak
 * meneruskan payload `auth`.
 */
const bacaToken = (socket: SocketMirip): string | null => {
  const dariAuth = socket.handshake?.auth?.token;
  if (typeof dariAuth === "string" && dariAuth) return dariAuth;

  const dariQuery = socket.handshake?.query?.token;
  if (typeof dariQuery === "string" && dariQuery) return dariQuery;

  return null;
};

export const penjagaSocket = (socket: SocketMirip, next: (err?: Error) => void): void => {
  const token = bacaToken(socket);

  if (!token) {
    return next(new Error(PESAN_TANPA_TOKEN));
  }

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err || !user) {
      return next(new Error(PESAN_TOKEN_TIDAK_VALID));
    }
    socket.data = socket.data || {};
    socket.data.user = user;
    next();
  });
};

/**
 * Identitas pemilik socket menurut TOKEN, bukan menurut payload event.
 *
 * Inilah inti perbaikan #50: sebelum ini setiap handler mengambil `userId` dari
 * argumen event, sehingga satu klien bisa hadir, mengirim pesan, dan menerima
 * pesan pribadi atas nama orang lain. Mengembalikan string kosong bila tidak ada
 * identitas — pemanggilnya memperlakukan itu sebagai "abaikan event ini".
 */
export const idPemilikSocket = (socket: SocketMirip): string =>
  String(socket?.data?.user?.id || socket?.data?.user?.uid || "");

/**
 * Bidang profil yang boleh disiarkan lewat presence (item #59).
 *
 * Sebelumnya objek user dikirim APA ADANYA, sehingga `presence_sync` membawa
 * email, nomor telepon, departemen, jabatan, dan SELURUH matriks permission ke
 * setiap klien yang terhubung. Yang benar-benar dibaca antarmuka hanya bidang di
 * bawah ini — sudah diperiksa terhadap HeaderAvatarGroup, HeaderNetworkStatus,
 * LiveChatWidget, dan UserAvatar.
 */
/**
 * Nama room pribadi milik satu pengguna (item #51).
 *
 * Dipakai untuk mengirim peristiwa yang HANYA boleh dilihat pemilik akun —
 * mula-mula `FORCE_LOGOUT_EVENT`, yang dulu ditebar ke seluruh klien lewat
 * `io.emit` beserta JWT yang masih berlaku dua jam di dalamnya.
 *
 * Berawalan `user:` supaya tidak mungkin bentrok dengan room proyek, yang
 * dinamai memakai id proyek apa adanya.
 */
export const roomPengguna = (userId: string | number): string => `user:${String(userId)}`;

/**
 * Sidik jari token, untuk dikirim menggantikan tokennya sendiri (item #51).
 *
 * Klien perlu tahu satu hal saja: "apakah token yang baru terbit itu milikku?"
 * Untuk menjawab itu ia tidak perlu menerima tokennya — cukup sidik jarinya,
 * yang tidak bisa dipakai untuk mengautentikasi apa pun.
 */
export const sidikToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const profilAman = (user: any) => {
  if (!user) return null;
  return {
    id: user.id,
    uid: user.uid,
    username: user.username,
    displayName: user.displayName,
    nama_lengkap: user.nama_lengkap,
    role: user.role,
    status: user.status,
    avatar_url: user.avatar_url,
    photoURL: user.photoURL,
    avatarUrl: user.avatarUrl,
  };
};
