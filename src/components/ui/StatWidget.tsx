import React from "react";
import { cn } from "../../lib/utils";

/**
 * StatWidget — komponen KPI card reusable (#429).
 *
 * Menggantikan 31 stat card inline di 8+ panel. Mendukung 3 varian:
 * - "default"  : ikon kiri, label uppercase, angka besar (Team, Admin)
 * - "full"     : label + angka + ikon kanan + footer opsional (Dashboard, Sessions)
 * - "compact"  : tanpa ikon, label + angka kecil (QA micro stats)
 */

export interface StatWidgetProps {
  /** Label deskriptif (uppercase tracking-wider otomatis) */
  label: string;
  /** Nilai angka atau teks */
  value: React.ReactNode;
  /** Ikon lucide-react (opsional untuk compact) */
  icon?: React.ReactNode;
  /** Warna latar ikon: "primary" | "success" | "warning" | "danger" | "info" | string kustom */
  iconBg?: string;
  /** Warna teks ikon — kalau tidak diset, ikut iconBg */
  iconColor?: string;
  /** Konten footer di bawah angka (link, badge, progress) */
  footer?: React.ReactNode;
  /** Varian tampilan */
  variant?: "default" | "full" | "compact";
  /** Kelas tambahan untuk kontainer */
  className?: string;
}

const iconBgMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  info: "bg-info/10 text-info-text border-info/20",
};

export const StatWidget: React.FC<StatWidgetProps> = ({
  label,
  value,
  icon,
  iconBg = "primary",
  iconColor,
  footer,
  variant = "default",
  className,
}) => {
  const resolvedIconBg = iconBgMap[iconBg] ?? iconBg;
  const resolvedIconColor = iconColor ? iconColor : undefined;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "bg-surface border border-border-subtle/80 p-2 rounded-md text-center",
          className
        )}
      >
        <span className="text-2xs text-content-subtle font-normal block">{label}</span>
        <span className="text-sm font-semibold text-content-strong block mt-0.5">{value}</span>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div
        className={cn(
          "bg-surface p-3 sm:p-5 rounded-lg border border-border-subtle/80 shadow-2xs flex flex-col justify-between relative overflow-hidden",
          className
        )}
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs sm:text-xsm font-normal uppercase tracking-wider text-content-subtle">
              {label}
            </span>
            <h3 className="text-2xl font-semibold text-content-strong mt-1">{value}</h3>
          </div>
          {icon && (
            <div
              className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border shrink-0",
                resolvedIconBg
              )}
              style={resolvedIconColor ? { color: resolvedIconColor } : undefined}
            >
              {icon}
            </div>
          )}
        </div>
        {footer && (
          <div className="mt-4 flex items-center justify-between text-xs border-t border-border-faint pt-3">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // variant === "default" — horizontal ikon kiri
  return (
    <div
      className={cn(
        "bg-surface p-3 md:p-4 rounded-lg border border-border-subtle/80 shadow-2xs flex items-center justify-between gap-2 min-w-0",
        className
      )}
    >
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {icon && (
          <div
            className={cn(
              "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 border",
              resolvedIconBg
            )}
            style={resolvedIconColor ? { color: resolvedIconColor } : undefined}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-2xs md:text-xs font-normal text-content-subtle uppercase tracking-wider truncate">
            {label}
          </div>
          <div className="text-lg md:text-xl font-medium text-content-strong mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
};
