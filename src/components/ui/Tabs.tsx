import React from "react";
import { cn } from "../../lib/utils";

/**
 * Tabs — chrome tab reusable (#432).
 *
 * Hanya bilah tab. State dan isi panel tetap di halaman pemanggil.
 * Jangan dipakai untuk routing.
 */

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  /** Label pendek di viewport sempit (opsional). */
  shortLabel?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** underline = garis bawah (Settings, Detail Pengguna). pills = segmented. */
  variant?: "underline" | "pills";
  tone?: "primary" | "success";
  /** Latar lembut pada tab aktif (pola Settings). */
  showActiveSurface?: boolean;
  className?: string;
  itemClassName?: string;
}

const activeTone: Record<"primary" | "success", { text: string; border: string; surface: string }> =
  {
    primary: {
      text: "text-primary",
      border: "border-primary",
      surface: "bg-primary/10",
    },
    success: {
      text: "text-emerald-600",
      border: "border-emerald-500",
      surface: "bg-emerald-500/10",
    },
  };

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = "underline",
  tone = "primary",
  showActiveSurface = false,
  className,
  itemClassName,
}: TabsProps<T>) {
  const colors = activeTone[tone];

  if (variant === "pills") {
    return (
      <div
        role="tablist"
        className={cn(
          "flex bg-surface-muted p-0.5 rounded-md border border-border-subtle/80 shrink-0 shadow-2xs",
          className
        )}
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-all rounded flex items-center gap-1.5 cursor-pointer",
                active
                  ? "bg-surface text-primary shadow-2xs"
                  : "text-content-muted hover:text-content-strong",
                itemClassName
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.shortLabel ? (
                <span className="sm:hidden">{tab.shortLabel}</span>
              ) : (
                <span className="sm:hidden">{tab.label}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn(
        "flex border-b border-border-subtle/80 overflow-x-auto custom-scrollbar shrink-0",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer shrink-0 whitespace-nowrap",
              active
                ? cn(
                    colors.text,
                    colors.border,
                    showActiveSurface && colors.surface,
                    tone === "primary" && "font-semibold"
                  )
                : "text-content-muted border-transparent hover:text-content-body",
              itemClassName
            )}
          >
            {tab.icon}
            <span className={tab.shortLabel ? "hidden sm:inline" : undefined}>{tab.label}</span>
            {tab.shortLabel && <span className="sm:hidden">{tab.shortLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}
