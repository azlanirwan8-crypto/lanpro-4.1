import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { UserProfile } from "../../types";

export const getUserAvatarColors = (idOrName: string = "") => {
  const colors = [
    { bg: "bg-blue-500/15", text: "text-blue-600", border: "border-blue-500/30" },
    { bg: "bg-emerald-500/15", text: "text-emerald-600", border: "border-emerald-500/30" },
    { bg: "bg-violet-500/15", text: "text-violet-600", border: "border-violet-500/30" },
    { bg: "bg-amber-500/15", text: "text-amber-600", border: "border-amber-500/30" },
    { bg: "bg-rose-500/15", text: "text-rose-600", border: "border-rose-500/30" },
    { bg: "bg-indigo-500/15", text: "text-indigo-600", border: "border-indigo-500/30" },
    { bg: "bg-cyan-500/15", text: "text-cyan-600", border: "border-cyan-500/30" },
    { bg: "bg-fuchsia-500/15", text: "text-fuchsia-600", border: "border-fuchsia-500/30" },
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
      {resolvedAvatarUrl && !imgError ? (
        <img
          src={resolvedAvatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="leading-none">{getInitials(displayName)}</span>
      )}
    </div>
  );
};

export default UserAvatar;
