import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { UserProfile } from "../../types";

// #122 — URL avatar yang sudah terbukti 404, dibagi seluruh instance.
const avatarGagal = new Set<string>();

// #125 — SEMULA `bg-{warna}-500/15` + `text-{warna}-600`. Lapisan 15% di atas
// kartu GELAP nyaris lenyap, jadi teks `-600` yang gelap berdiri di atas latar
// yang praktis tetap gelap: inisial terbaca 1,85.
//
// Arahnya dipilih pemilik proyek: latar PEKAT dengan teks putih. Itu juga pola
// peran `-surface` di §22.3 — latar berwarna pekat selalu bersanding dengan
// teks putih, dan karena itu tidak perlu berubah antar mode. `content-inverse`
// bernilai #ffffff di KEDUA mode, jadi tidak ada override varian gelap yang
// perlu ditambah (§22.4 poin 2 melarangnya).
//
// Tingkat `-700`, bukan `-600`: dengan teks putih, `amber-600` hanya mencapai
// 3,48 dan gagal AA. Seluruh delapan warna di `-700` lolos:
//   blue 6,70 · emerald 6,45 · violet 7,10 · amber 5,02
//   rose 6,29 · indigo 7,90 · cyan 5,36 · fuchsia 6,32
export const getUserAvatarColors = (idOrName: string = "") => {
  const colors = [
    { bg: "bg-blue-700", text: "text-content-inverse", border: "border-blue-700" },
    { bg: "bg-emerald-700", text: "text-content-inverse", border: "border-emerald-700" },
    { bg: "bg-violet-700", text: "text-content-inverse", border: "border-violet-700" },
    { bg: "bg-amber-700", text: "text-content-inverse", border: "border-amber-700" },
    { bg: "bg-rose-700", text: "text-content-inverse", border: "border-rose-700" },
    { bg: "bg-indigo-700", text: "text-content-inverse", border: "border-indigo-700" },
    { bg: "bg-cyan-700", text: "text-content-inverse", border: "border-cyan-700" },
    { bg: "bg-fuchsia-700", text: "text-content-inverse", border: "border-fuchsia-700" },
  ];

  let hash = 0;
  const target = idOrName || "";
  for (let i = 0; i < target.length; i++) {
    hash = target.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

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
  const colors = getUserAvatarColors(String(targetId));

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
      className={cn(
        "rounded-full flex items-center justify-center font-semibold overflow-hidden shrink-0 select-none transition-all border shadow-2xs",
        colors.bg,
        colors.text,
        colors.border,
        defaultSizeClass,
        className
      )}
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
