import React from "react";
import { cn } from "../../lib/utils";

/**
 * #422 — Pola list-page standar (koreksi pemilik 03 Sep):
 * PageHeader **flat** di latar `surface-muted` — tidak di dalam card/panel
 * (referensi: Manajemen Tim). Konten tabel/filter masuk kartu di bawahnya.
 */

/** Search input di strip aksi kanan PageHeader. */
export const LIST_SEARCH_INPUT_CLASS =
  "w-full min-w-0 pl-9 pr-3.5 py-2 bg-surface border border-border-subtle rounded-md text-xs placeholder:text-content-subtle outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-content-strong shadow-2xs font-medium";

/** Baris thead tabel list (bukan uppercase primary). */
export const LIST_THEAD_ROW_CLASS =
  "bg-primary-surface/5 border-b border-primary/15 text-xs font-normal text-content-subtle whitespace-nowrap";

/** Wrapper scroll tabel desktop di dalam kartu konten. */
export const LIST_TABLE_WRAP_CLASS =
  "hidden sm:block flex-1 overflow-x-auto overflow-y-auto m-4 md:m-6 bg-surface rounded-lg border border-border-subtle/80 shadow-2xs";

type ListPageShellProps = {
  /** Biasanya `<PageHeader … />` — flat, di luar kartu. */
  header: React.ReactNode;
  /** Isi kartu konten (tabel, filter, paginasi). */
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Override kelas kartu konten. */
  cardClassName?: string;
  /**
   * true = jangan bungkus children dalam satu kartu
   * (halaman KPI seperti Team: beberapa kartu di bawah header).
   */
  bare?: boolean;
};

export const ListPageShell: React.FC<ListPageShellProps> = ({
  header,
  children,
  className,
  headerClassName,
  cardClassName,
  bare = false,
}) => {
  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col p-3 md:p-6 min-h-0 overflow-hidden bg-surface-muted text-left gap-3 md:gap-4",
        className
      )}
    >
      <div className={cn("shrink-0", headerClassName)}>{header}</div>
      {bare ? (
        children
      ) : (
        <div
          className={cn(
            "flex-1 flex flex-col min-h-0 bg-surface border border-border-subtle/80 rounded-lg shadow-soft overflow-hidden",
            cardClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
