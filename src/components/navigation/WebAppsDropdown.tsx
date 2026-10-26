import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, MessageSquareQuote, ExternalLink } from "lucide-react";
import { TopbarMenuPortal } from "../ui/TopbarMenuPortal";

export interface WebAppItem {
  id: string;
  name: string;
  url: string;
  icon?: React.ReactNode;
  /** Kunci kamus, bukan teks jadi — lihat #804 dan `AGENTS.md` §12. */
  descriptionKey?: string;
}

const DEFAULT_WEB_APPS: WebAppItem[] = [
  {
    id: "maps-cabang",
    name: "Maps Cabang",
    url: "https://match-sepia.vercel.app/",
    descriptionKey: "appShell.webAppsMapsDesc",
    icon: (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-content-inverse shadow-sm transition-transform group-hover:scale-105">
        <MapPin className="w-5 h-5" />
      </div>
    ),
  },
  {
    id: "sentil",
    name: "Sentil",
    url: "https://sentil-eight.vercel.app/",
    descriptionKey: "appShell.webAppsSentilDesc",
    icon: (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-content-inverse shadow-sm transition-transform group-hover:scale-105">
        <MessageSquareQuote className="w-5 h-5" />
      </div>
    ),
  },
];

interface WebAppsDropdownProps {
  className?: string;
  apps?: WebAppItem[];
}

export const WebAppsDropdown: React.FC<WebAppsDropdownProps> = ({
  className = "",
  apps = DEFAULT_WEB_APPS,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // #672 — klik-di-luar dan posisi panel dipindah ke TopbarMenuPortal (panel
  // di-portal ke document.body); yang tinggal di sini hanya Escape.

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 md:min-w-0 md:min-h-0 min-w-11 min-h-11 flex items-center justify-center text-content-subtle hover:text-content-strong hover:bg-surface-sunken rounded-md transition-all cursor-pointer relative"
        title={t("appShell.webApps", "Web Apps")}
        aria-label={t("appShell.webApps", "Web Apps")}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Bento / App Launcher 4-shape icon (Persegi & Lingkaran) */}
        <svg
          className="w-4 h-4 transition-transform duration-200 hover:scale-110"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <circle cx="17.5" cy="6.5" r="3.5" />
          <circle cx="6.5" cy="17.5" r="3.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </button>

      <TopbarMenuPortal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={containerRef}
        className="z-[44] w-72 rounded-xl border border-border-subtle bg-surface shadow-soft-lg p-3 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-border-subtle">
          <span className="text-xs font-semibold text-content-strong">
            {t("appShell.webApps", "Web Apps")}
          </span>
          <span className="text-[10px] font-medium text-content-muted bg-surface-sunken px-1.5 py-0.5 rounded">
            {apps.length}
          </span>
        </div>

        {/* Grid Aplikasi */}
        <div className="grid grid-cols-1 gap-1.5">
          {apps.map((app) => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-surface-sunken transition-all text-content-body hover:text-content-strong text-left border border-transparent hover:border-border-subtle"
              role="menuitem"
            >
              <div className="shrink-0">{app.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate text-content-strong group-hover:text-primary transition-colors">
                    {app.name}
                  </span>
                  <ExternalLink className="w-3 h-3 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                {app.descriptionKey && (
                  <p className="text-[11px] text-content-muted truncate">{t(app.descriptionKey)}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      </TopbarMenuPortal>
    </div>
  );
};
export default WebAppsDropdown;
