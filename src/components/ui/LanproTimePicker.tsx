import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

interface LanproTimePickerProps {
  value: string; // "HH:MM" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export const LanproTimePicker: React.FC<LanproTimePickerProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  buttonClassName = "",
}) => {
  const { i18n } = useTranslation();
  const isId = (i18n.language || "id").startsWith("id");

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  }>({ left: 0, width: 220, placement: "bottom" });

  const [selectedHour, selectedMinute] = useMemo(() => {
    if (!value) return ["", ""];
    const parts = value.split(":");
    return [parts[0] || "", parts[1] || ""];
  }, [value]);

  /**
   * `useLayoutEffect`, BUKAN `useEffect` (#294).
   *
   * Posisi panel diukur dari `getBoundingClientRect()` pemicunya, jadi ia baru
   * bisa dihitung sesudah panel ada di DOM. Dengan `useEffect`, pengukuran itu
   * berjalan SESUDAH browser melukis — dan karena nilai awal state-nya
   * `left: 0` tanpa `top`, bingkai pertama benar-benar tergambar di sudut
   * kiri-atas layar sebelum melompat ke tempatnya. Digabung animasi masuk,
   * gerakannya terbaca sebagai panel yang meluncur dari sudut.
   *
   * `useLayoutEffect` berjalan sesudah DOM berubah tapi SEBELUM paint, jadi
   * bingkai salah posisi itu tidak pernah sampai ke mata.
   */
  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 260;
      const spaceBelow = viewportHeight - rect.bottom;

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setDropdownPos({
          bottom: viewportHeight - rect.top + 4,
          left: Math.max(10, Math.min(rect.left, window.innerWidth - 230)),
          width: 220,
          placement: "top",
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 4,
          left: Math.max(10, Math.min(rect.left, window.innerWidth - 230)),
          width: 220,
          placement: "bottom",
        });
      }
    }
  }, [isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  const handleSelectHour = (h: string) => {
    const min = selectedMinute || "00";
    onChange(`${h}:${min}`);
  };

  const handleSelectMinute = (m: string) => {
    const hr = selectedHour || "09";
    onChange(`${hr}:${m}`);
  };

  const handleNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const hr = String(now.getHours()).padStart(2, "0");
    const min = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
    onChange(`${hr}:${min}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-surface border border-border-subtle hover:border-border rounded-md text-xs font-normal text-content-strong outline-none transition-all shadow-2xs cursor-pointer focus:ring-1 focus:ring-primary/20",
          disabled && "bg-surface-sunken text-content-muted cursor-not-allowed opacity-60",
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Clock className="w-3.5 h-3.5 text-content-subtle shrink-0" />
          <span className={cn("truncate font-mono", !value && "text-content-subtle font-sans")}>
            {value || placeholder || (isId ? "--:--" : "--:--")}
          </span>
        </div>
        {value && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-0.5 hover:bg-surface-muted rounded text-content-subtle hover:text-content-strong transition-colors cursor-pointer"
            title={isId ? "Hapus jam" : "Clear time"}
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <Clock className="w-3 h-3 text-content-subtle opacity-50 shrink-0" />
        )}
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9999]"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <div
              style={{
                position: "fixed",
                top: dropdownPos.placement === "bottom" ? dropdownPos.top : undefined,
                bottom: dropdownPos.placement === "top" ? dropdownPos.bottom : undefined,
                left: dropdownPos.left,
                width: 220,
                zIndex: 10000,
              }}
              className="bg-surface rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-border-subtle p-3 text-content select-none animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border-faint">
                <span className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
                  {isId ? "Pilih Waktu" : "Select Time"}
                </span>
                <span className="text-xs font-mono font-semibold text-primary">
                  {value || "--:--"}
                </span>
              </div>

              {/* Time columns */}
              {/*
                TIGA hal menahan tinggi di sini, dan ketiganya perlu (#294).
                Percobaan pertama hanya memasang `min-h-0` pada daftar di dalam
                kolom, dan itu TIDAK cukup — diukur di peramban: grid-nya 143 px
                sementara kolomnya tetap 557 px, sehingga `overflow-hidden`
                hanya MEMOTONG daftarnya, bukan membuatnya bisa digulir.
                Gejalanya justru lebih membingungkan daripada sebelum
                diperbaiki: daftar terlihat rapi tapi separuh isinya tidak bisa
                dijangkau sama sekali.

                Penyebab sesungguhnya ada di lapisan grid: tanpa baris yang
                ditetapkan, baris implisitnya ber-ukuran AUTO dan tumbuh
                mengikuti isi, jadi `h-44` pada grid tidak pernah sampai ke
                anaknya. `grid-rows-[minmax(0,1fr)]` memaksa barisnya mengisi
                tinggi grid dan boleh menyusut sampai nol; `min-h-0` pada kolom
                membuat kolom flex mau menyusut; `min-h-0` pada daftar membuat
                daftarnya yang menerima sisa tinggi dan memunculkan gulir.
              */}
              <div className="grid grid-cols-2 grid-rows-[minmax(0,1fr)] gap-2 h-44 overflow-hidden">
                {/* Hours column */}
                <div className="flex flex-col min-h-0">
                  <span className="text-[10px] font-medium text-content-subtle text-center mb-1">
                    {isId ? "Jam" : "Hour"}
                  </span>
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                    {hours.map((h) => {
                      const isSelected = h === selectedHour;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleSelectHour(h)}
                          className={cn(
                            "w-full text-center py-1 rounded text-xs font-mono transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-content-body hover:bg-surface-sunken hover:text-content-strong"
                          )}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minutes column */}
                <div className="flex flex-col min-h-0">
                  <span className="text-[10px] font-medium text-content-subtle text-center mb-1">
                    {isId ? "Menit" : "Minute"}
                  </span>
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                    {minutes.map((m) => {
                      const isSelected = m === selectedMinute;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          className={cn(
                            "w-full text-center py-1 rounded text-xs font-mono transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-content-body hover:bg-surface-sunken hover:text-content-strong"
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer quick action buttons */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-faint text-[11px]">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 text-content-muted hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                >
                  {isId ? "Hapus" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={handleNow}
                  className="px-2.5 py-1 text-primary font-medium hover:bg-primary-surface/20 rounded transition-colors cursor-pointer"
                >
                  {isId ? "Sekarang" : "Now"}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
