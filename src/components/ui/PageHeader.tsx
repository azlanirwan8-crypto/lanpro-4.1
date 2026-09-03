import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export type PageHeaderCrumb = {
  label: string;
  current?: boolean;
};

type PageHeaderProps = {
  /** Breadcrumb items; last/current uses primary tint (Velzon page-title-box). */
  breadcrumbs?: PageHeaderCrumb[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-side actions (refresh, Add, filters). */
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/**
 * #397 — Pola page-title Velzon: breadcrumb + judul + aksi kanan.
 * Dipakai agar Admin/Team/Sessions/Settings/QA tidak reinvent header.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  actions,
  className,
  children,
}) => {
  return (
    <div
      className={cn("flex flex-col md:flex-row md:items-center justify-between gap-3", className)}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            className="flex flex-wrap items-center gap-1.5 text-[11px] font-normal uppercase tracking-wider text-content-subtle mb-0.5"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              const isCurrent = crumb.current ?? isLast;
              return (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-content-subtle shrink-0" />}
                  <span className={cn(isCurrent && "text-primary")}>{crumb.label}</span>
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-bold text-content-strong tracking-tight">{title}</h1>
          {children}
        </div>
        {subtitle && <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
