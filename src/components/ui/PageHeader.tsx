import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export type PageHeaderCrumb = {
  label: string;
  current?: boolean;
};

type PageHeaderProps = {
  /** Breadcrumb kanan — pola Velzon page-title-box. */
  breadcrumbs?: PageHeaderCrumb[];
  title: React.ReactNode;
  /** Deskripsi singkat di bawah judul (dikembalikan — #424 merge panel). */
  subtitle?: React.ReactNode;
  /** Aksi kanan opsional (di samping breadcrumb bila ada). */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Default UPPERCASE seperti "KANBAN BOARD". */
  uppercase?: boolean;
};

/**
 * #424 — Velzon page-title-box, visual-merge dengan topbar AppContainer:
 * border-b hanya di PageHeader (batas bawah panel gabungan),
 * topbar di atasnya tanpa border → keduanya tampil sebagai 1 panel.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  actions,
  className,
  children,
  uppercase = true,
}) => {
  const hasCrumbs = breadcrumbs && breadcrumbs.length > 0;

  return (
    <div
      className={cn(
        "w-full shrink-0 bg-surface border-b border-border-subtle",
        "px-4 md:px-5 py-2.5",
        "flex items-center justify-between gap-2 min-h-0",
        "[&_button]:min-h-0 [&_button]:h-7 [&_button]:px-2 [&_button]:text-[11px] [&_button]:rounded-md",
        "[&_input]:h-7 [&_input]:py-1 [&_input]:text-[11px]",
        className
      )}
    >
      <div className="min-w-0 flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <h4
            className={cn(
              "text-[13px] font-semibold leading-none m-0 text-content-strong font-sans tracking-wide",
              uppercase && "uppercase"
            )}
          >
            {title}
          </h4>
          {subtitle && (
            <p className="mt-1 text-[11px] leading-tight text-content-muted font-normal truncate">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>

      {(hasCrumbs || actions) && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          {actions}
          {hasCrumbs && (
            <nav
              className="flex flex-wrap items-center gap-0.5 text-[11px] font-normal text-content-muted font-sans leading-none"
              aria-label="Breadcrumb"
            >
              {breadcrumbs!.map((crumb, i) => {
                const isLast = i === breadcrumbs!.length - 1;
                const isCurrent = crumb.current ?? isLast;
                return (
                  <React.Fragment key={`${crumb.label}-${i}`}>
                    {i > 0 && (
                      <ChevronRight
                        className="w-3 h-3 text-content-subtle shrink-0 mx-0.5"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "leading-none",
                        isCurrent ? "text-content-body" : "text-content-muted"
                      )}
                    >
                      {crumb.label}
                    </span>
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </div>
  );
};
