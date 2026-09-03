import React from "react";
import { cn } from "../../lib/utils";

/**
 * #422 / #424 — List page Velzon:
 * PageHeader = panel putih full-bleed nempel header;
 * Search/Tambah di toolbar dalam kartu konten.
 */

/** Search input di strip toolbar dalam kartu. */
export const LIST_SEARCH_INPUT_CLASS =
  "w-full min-w-0 pl-9 pr-3.5 py-2 bg-surface border border-border-subtle rounded-md text-xs placeholder:text-content-subtle outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-content-strong shadow-2xs font-medium";

/** Baris thead tabel list (bukan uppercase primary). */
export const LIST_THEAD_ROW_CLASS =
  "bg-primary-surface/5 border-b border-primary/15 text-xs font-normal text-content-subtle whitespace-nowrap";

/** Wrapper scroll tabel desktop di dalam kartu konten. */
export const LIST_TABLE_WRAP_CLASS =
  "hidden sm:block flex-1 overflow-x-auto overflow-y-auto m-4 md:m-6 bg-surface rounded-lg border border-border-subtle/80 shadow-2xs";

/** Strip toolbar Search + Tambah di atas isi kartu (#424). */
const LIST_CARD_TOOLBAR_CLASS =
  "px-4 py-3 border-b border-border-subtle/80 bg-surface shrink-0 flex flex-wrap items-center justify-end gap-2";

type ListPageShellProps = {
  /** `<PageHeader />` — panel putih full-bleed, di luar padding konten. */
  header: React.ReactNode;
  /** Search + Tambah (pojok kanan atas dalam kartu). */
  toolbar?: React.ReactNode;
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
  toolbar,
  children,
  className,
  headerClassName,
  cardClassName,
  bare = false,
}) => {
  return (
    <div
      className={cn(
        // Konten di bawah panel title — gap tipis (Velzon rapi)
        "w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-muted text-left",
        className
      )}
    >
      <div className={cn("shrink-0", headerClassName)}>{header}</div>

      <div className="flex-1 flex flex-col min-h-0 px-3 md:px-5 pt-2.5 md:pt-3 pb-3 md:pb-5">
        {bare ? (
          children
        ) : (
          <div
            className={cn(
              "flex-1 flex flex-col min-h-0 bg-surface border border-border-subtle/80 rounded-lg shadow-soft overflow-hidden",
              cardClassName
            )}
          >
            {toolbar && <div className={LIST_CARD_TOOLBAR_CLASS}>{toolbar}</div>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
