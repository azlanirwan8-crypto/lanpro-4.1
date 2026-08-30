import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

interface LanproDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  minDate?: string;
  maxDate?: string;
}

export const LanproDatePicker: React.FC<LanproDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  buttonClassName = "",
  minDate,
  maxDate,
}) => {
  const { t, i18n } = useTranslation();
  const isId = (i18n.language || "id").startsWith("id");

  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  }>({ left: 0, width: 280, placement: "bottom" });

  // Parse initial view date
  const parsedValueDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  }, [value]);

  const [viewYear, setViewYear] = useState(
    () => parsedValueDate?.getFullYear() || new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsedValueDate?.getMonth() ?? new Date().getMonth()
  );

  // Keep view aligned when value changes externally
  useEffect(() => {
    if (parsedValueDate) {
      setViewYear(parsedValueDate.getFullYear());
      setViewMonth(parsedValueDate.getMonth());
    }
  }, [parsedValueDate]);

  /**
   * Lebar panel MENGIKUTI lebar pemicunya (#294).
   *
   * Sebelumnya lebar dipaku 280 px dan lebar pemicu diabaikan sama sekali.
   * Diukur di peramban: field tanggal 183 px, panel 280 px, sehingga panel
   * menjulur 97 px ke kanan dan menutupi kolom di sebelahnya. Pemilik
   * proyek menggambarkannya "datang dari kiri ke kanan, bukan dari tempat
   * saya klik" -- dan itu tepat, sebab yang terlihat memang kotak yang mulai
   * di field lalu melebar ke samping.
   *
   * `StyledDropdown` sudah lama mengikuti pemicunya; hanya kedua pemilih ini
   * yang tidak, sehingga dropdown terasa menempel sedangkan tanggal dan jam
   * terasa melayang.
   *
   * Grid isinya fluid (`grid-cols-7 gap-1` tanpa lebar sel tetap), jadi sel
   * tanggal menyusut sendiri mengikuti panel -- keputusan pemilik proyek 30
   * Agu 2026, memilih panel yang selalu sejajar field daripada sel yang
   * selalu lega. Batas bawah 160 px tetap ada sebagai penjaga: di bawah itu
   * tujuh kolom tidak lagi bisa dirender masuk akal, dan itu bukan pertukaran
   * yang dipilih siapa pun -- hanya jaring pengaman untuk pemicu yang sangat
   * sempit.
   */
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
      const lebarPanel = Math.max(rect.width, 160);
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320;
      const spaceBelow = viewportHeight - rect.bottom;

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setDropdownPos({
          bottom: viewportHeight - rect.top + 4,
          left: Math.max(10, Math.min(rect.left, window.innerWidth - lebarPanel - 10)),
          width: lebarPanel,
          placement: "top",
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 4,
          left: Math.max(10, Math.min(rect.left, window.innerWidth - lebarPanel - 10)),
          width: lebarPanel,
          placement: "bottom",
        });
      }
    }
  }, [isOpen]);

  const monthNamesId = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthNamesEn = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthNames = isId ? monthNamesId : monthNamesEn;

  const dayHeadersId = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dayHeadersEn = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const dayHeaders = isId ? dayHeadersId : dayHeadersEn;

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handleSelectDate = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${year}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    handleSelectDate(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Formatted display text
  const displayText = useMemo(() => {
    if (!value) return "";
    const parts = value.split("-").map(Number);
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const mmStr = isId ? monthNamesId[m - 1] : monthNamesEn[m - 1];
      return `${d} ${mmStr} ${y}`;
    }
    return value;
  }, [value, isId]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

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
          <CalendarIcon className="w-3.5 h-3.5 text-content-subtle shrink-0" />
          <span className={cn("truncate", !displayText && "text-content-subtle")}>
            {displayText || placeholder || (isId ? "Pilih tanggal..." : "Select date...")}
          </span>
        </div>
        {value && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-0.5 hover:bg-surface-muted rounded text-content-subtle hover:text-content-strong transition-colors cursor-pointer"
            title={isId ? "Hapus tanggal" : "Clear date"}
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <CalendarIcon className="w-3 h-3 text-content-subtle opacity-50 shrink-0" />
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
                width: dropdownPos.width,
                zIndex: 10000,
              }}
              className="bg-surface rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-border-subtle p-3 text-content select-none animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Month Year + Prev/Next */}
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="font-semibold text-xs text-content-strong">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 hover:bg-surface-muted text-content-secondary hover:text-content-strong rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-surface-muted text-content-secondary hover:text-content-strong rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {dayHeaders.map((d, i) => (
                  <span
                    key={d}
                    className={cn(
                      "text-[10px] font-medium text-content-muted py-1",
                      (i === 0 || i === 6) && "text-rose-500/80"
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month leading days */}
                {Array.from({ length: firstDayWeekday }).map((_, idx) => {
                  const dayNum = daysInPrevMonth - firstDayWeekday + idx + 1;
                  return (
                    <div
                      key={`prev-${idx}`}
                      className="h-7 flex items-center justify-center text-[11px] text-content-subtle/40 pointer-events-none"
                    >
                      {dayNum}
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isSelected = dateStr === value;
                  const isToday = dateStr === todayStr;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
                      className={cn(
                        "h-7 rounded-md text-xs font-normal transition-all flex items-center justify-center relative cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : isToday
                            ? "border border-primary/40 text-primary font-medium hover:bg-primary-surface/20"
                            : "text-content-body hover:bg-surface-sunken hover:text-content-strong"
                      )}
                    >
                      {dayNum}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer quick action buttons */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border-faint text-[11px]">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 text-content-muted hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                >
                  {isId ? "Hapus" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 text-primary font-medium hover:bg-primary-surface/20 rounded transition-colors cursor-pointer"
                >
                  {isId ? "Hari Ini" : "Today"}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
