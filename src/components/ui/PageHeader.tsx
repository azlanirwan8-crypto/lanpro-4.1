import React from "react";
import { cn } from "../../lib/utils";

export type PageHeaderCrumb = {
  label: string;
  current?: boolean;
};

type PageHeaderProps = {
  /**
   * Diterima agar pemanggil lama tidak pecah, tetapi #424 tidak merender
   * breadcrumb. Koreksi pemilik 03 Sep: list chrome tanpa jejak.
   */
  breadcrumbs?: PageHeaderCrumb[];
  title: React.ReactNode;
  /**
   * Diterima agar pemanggil lama tidak pecah; #424 tidak merender subtitle.
   */
  subtitle?: React.ReactNode;
  /** Aksi kanan opsional (bukan search/tambah list — itu di kartu). */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Default UPPERCASE seperti "KANBAN BOARD". */
  uppercase?: boolean;
};

/**
 * #424 — Velzon page-title: judul UPPERCASE ~15px/semibold, nempel di bawah
 * topbar. Tanpa breadcrumb, tanpa subtitle. Visual-merge: topbar tanpa
 * border-b; PageHeader punya border-b sebagai batas bawah panel gabungan.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  actions,
  className,
  children,
  uppercase = true,
}) => {
  return (
    <div
      className={cn(
        "w-full shrink-0 bg-surface-raised border-b border-border-subtle",
        "px-4 md:px-5 py-2",
        "flex items-center justify-between gap-2 min-h-0",
        "[&_button]:min-h-0 [&_button]:h-7 [&_button]:px-2 [&_button]:text-[11px] [&_button]:rounded-md",
        "[&_input]:h-7 [&_input]:py-1 [&_input]:text-[11px]",
        className
      )}
    >
      <div className="min-w-0 flex flex-wrap items-center gap-2">
        <h4
          className={cn(
            "text-[15px] font-semibold leading-none m-0 text-content-strong font-sans tracking-wide",
            uppercase && "uppercase"
          )}
        >
          {title}
        </h4>
        {children}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
