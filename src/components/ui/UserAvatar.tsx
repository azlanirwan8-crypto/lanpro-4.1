import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { gayaLabel } from "../../lib/warnaLabel";
import { UserProfile } from "../../types";

// #122 — URL avatar yang sudah terbukti 404, dibagi seluruh instance.
const avatarGagal = new Set<string>();

/**
 * RONANya satu orang — SATU sumber, dan ia lembut.
 *
 * SEJARAH YANG PERLU DIKETAH BIAR TIDAK DIULANG. #125 memaksa lingkaran avatar
 * ke latar PEKAT palet Tailwind (`bg-*-700` + teks putih) karena lapisan 15 % di
 * atas kartu gelap nyaris lenyap: inisial terbaca kontras 1,85. Arah itu keputusan
 * pemilik proyek sendiri, dan angka alasannya sah. Yang TIDAK dilihat waktu itu:
 * palet `-700` adalah kelas warna MENTAH yang lolos `audit:warna` (gerbang itu
 * hanya menghitung keluarga abu-abu), dan di layar ia berdiri sebagai blok jenuh
 * yang berdampingan — pada 17 Okt pemilik proyek menolaknya: "icon user ini agak
 * kasar, coba benchmark ke aplikasi lain, icon avatar nya clean dan enak dilihat
 * tidak keras".
 *
 * #770 memisahkan dua hal yang dulu tercampur. Yang dibutuhkan #125 sebenarnya
 * bukan latar pekat, melainkan TEKS yang tidak bisa kalah kontras. Kelas
 * `.avatar-tint` (src/index.css) memberi itu dari satu heksa: latar 16 % di atas
 * `--color-surface`, garis 32 %, dan teks heksa itu sendiri di-mix ke
 * `--color-content` — gelap di mode terang, terang di mode gelap, jadi tidak ada
 * satu pun varian gelap yang perlu ditulis (§22.4) dan nol kelas palet mentah.
 *
 * KENAPA SATU DAFTAR. Rona seorang orang dipakai oleh lingkaran avatar, chip PIC
 * papan diskusi, dan kartu HP. Kalau daftarnya lebih dari satu, ketiganya bisa
 * bertukar urutan sendiri-sendiri dan satu orang berubah warna antar layar —
 * pelanggaran #122/#125. Karena itu hanya ada `HEKSA_AVATAR` + `indeksWarna`,
 * dan `warnaSmooth-770.test.ts` mengunci jumlah, keunikan, dan kestabilan
 * indeksnya.
 */
export const HEKSA_AVATAR = [
  "#1D4ED8", // blue
  "#047857", // emerald
  "#6D28D9", // violet
  "#B45309", // amber
  "#BE123C", // rose
  "#4338CA", // indigo
  "#0E7490", // cyan
  "#A21CAF", // fuchsia
];

const indeksWarna = (idOrName: string = ""): number => {
  let hash = 0;
  const target = idOrName || "";
  for (let i = 0; i < target.length; i++) {
    hash = target.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % HEKSA_AVATAR.length;
};

/** Rona seorang orang — dipakai lingkaran avatar, chip PIC, dan kartu HP. */
export const getUserAvatarHex = (idOrName: string = "") => HEKSA_AVATAR[indeksWarna(idOrName)];

export const getInitials = (fullName?: string): string => {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export interface UserAvatarProps {
  user?: UserProfile | any;
  uid?: string;
  members?: UserProfile[] | any[];
  name?: string;
  src?: string;
  avatar_url?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | string;
  onClick?: (e: React.MouseEvent) => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  uid,
  members,
  name,
  src,
  avatar_url,
  className,
  size,
  onClick,
}) => {
  // #122 — `imgError` adalah state LOKAL, jadi setiap instance dengan URL rusak
  // yang sama mencoba memuatnya sendiri-sendiri; satu avatar hilang yang muncul
  // di lima tempat menghasilkan lima 404. Set di tingkat modul membuat kegagalan
  // diingat bersama, termasuk saat komponen dipasang ulang.
  const [imgError, setImgError] = useState(false);

  // 1. Resolve user entity or member from members list
  const memberList = Array.isArray(members) ? members : [];
  const member =
    user ||
    (memberList.length > 0 && uid
      ? memberList.find(
          (m: any) =>
            m &&
            ((m.uid && String(m.uid) === String(uid)) ||
              (m.id && String(m.id) === String(uid)) ||
              (m.username && String(m.username) === String(uid)) ||
              (m.email && String(m.email) === String(uid)))
        )
      : undefined);

  // 2. Resolve display name
  const displayName =
    name ||
    member?.displayName ||
    member?.nama_lengkap ||
    member?.name ||
    member?.username ||
    member?.email ||
    "User";

  // 3. Resolve avatar URL (supports avatar_url, photoURL, avatarUrl, avatar, src)
  const resolvedAvatarUrl =
    src ||
    avatar_url ||
    member?.avatar_url ||
    member?.photoURL ||
    member?.avatarUrl ||
    member?.avatar ||
    (user as any)?.photoUrl;

  // Reset imgError if avatar URL changes
  useEffect(() => {
    setImgError(false);
  }, [resolvedAvatarUrl]);

  const targetId = member?.id || member?.uid || uid || displayName;
  const heksa = getUserAvatarHex(String(targetId));

  const sizeClasses: Record<string, string> = {
    xs: "w-5 h-5 text-xs sm:text-[11px] sm:text-[9px]",
    sm: "w-6 h-6 text-xs sm:text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
    xl: "w-16 h-16 text-xl",
  };

  const defaultSizeClass =
    size && sizeClasses[size] ? sizeClasses[size] : "w-6 h-6 text-xs sm:text-[10px]";

  return (
    <div
      onClick={onClick}
      /* #770 — `avatar-tint` menurunkan latar, garis, dan teks dari SATU heksa
         identitas orang itu; tidak ada lagi kelas palet mentah di sini. */
      className={cn(
        "avatar-tint rounded-full flex items-center justify-center font-semibold overflow-hidden shrink-0 select-none transition-all border shadow-2xs",
        defaultSizeClass,
        className
      )}
      style={gayaLabel(heksa)}
      title={displayName}
    >
      {resolvedAvatarUrl && !imgError && !avatarGagal.has(resolvedAvatarUrl) ? (
        <img
          src={resolvedAvatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            avatarGagal.add(resolvedAvatarUrl);
            setImgError(true);
          }}
        />
      ) : (
        <span className="leading-none">{getInitials(displayName)}</span>
      )}
    </div>
  );
};

export default UserAvatar;
