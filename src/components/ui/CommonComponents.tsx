import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  Equal,
  ChevronDown as ChevronDownIcon,
  ChevronsDown,
  MinusCircle,
  Zap,
  CheckCircle2,
  CircleDot,
  Bug,
  Users,
  FileText,
  User as UserIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { MasterData, UserProfile } from "../../types";
import {
  cariMaster,
  gayaLabel,
  warnaDariMaster,
  warnaLabel,
  WARNA_NETRAL,
} from "../../lib/warnaLabel";
import { useAppStore } from "../../store/useAppStore";
import { RenderIcon } from "../RenderIcon";

import { UserAvatar } from "./UserAvatar";
export { UserAvatar };

export const UserBadge = ({
  uid,
  members,
  onClick,
  className,
}: {
  uid: string;
  members: UserProfile[];
  onClick?: () => void;
  className?: string;
}) => {
  const member = members.find((m) => m.uid === uid);
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 pr-3 pl-1 py-1 rounded-full bg-surface-muted/50 hover:bg-surface-strong/50 transition-all cursor-pointer border border-transparent hover:border-border-subtle group",
        className
      )}
    >
      <UserAvatar uid={uid} members={members} size="sm" />
      <span className="text-xs font-normal text-content-body group-hover:text-content truncate">
        {member?.displayName || member?.email?.split("@")[0] || "Unknown"}
      </span>
    </div>
  );
};

export const PriorityIcon = ({
  priority,
  className,
  masterData,
}: {
  priority: string;
  className?: string;
  masterData?: MasterData[];
}) => {
  const p = cariMaster(masterData, "priority", priority);
  const iconProps = { className: cn("w-4 h-4", className) };
  /** #564 — bentuknya menyampaikan tingkatan, warnanya tidak lagi sendiri-sendiri. */
  const hex = warnaLabel({
    kelompok: "priority",
    label: p?.label ?? priority,
    kode: p?.code,
    warnaMaster: p?.color,
  });

  if (p?.icon) {
    return <RenderIcon iconName={p.icon} className={iconProps.className} style={{ color: hex }} />;
  }

  const pLowerCase = priority?.toLowerCase() || "";
  if (pLowerCase.includes("blocker") || pLowerCase.includes("highest"))
    return <ChevronsUp {...iconProps} style={{ color: hex }} />;
  if (pLowerCase.includes("critical") || pLowerCase.includes("high"))
    return <ChevronUp {...iconProps} style={{ color: hex }} />;
  if (pLowerCase.includes("major") || pLowerCase.includes("medium"))
    return <Equal {...iconProps} style={{ color: hex }} />;
  if (pLowerCase.includes("minor") || pLowerCase.includes("low"))
    return <ChevronDownIcon {...iconProps} style={{ color: hex }} />;
  if (pLowerCase.includes("lowest")) return <ChevronsDown {...iconProps} style={{ color: hex }} />;
  if (pLowerCase.includes("hold")) return <MinusCircle {...iconProps} style={{ color: hex }} />;

  return <Equal {...iconProps} style={{ color: hex }} />;
};

export const TypeIcon = ({
  type,
  className,
  masterData,
}: {
  type: string;
  className?: string;
  masterData?: MasterData[];
}) => {
  const t = cariMaster(masterData, "issue_type", type);
  const iconProps = { className: cn("w-4 h-4", className) };
  /** #564 — satu hex untuk ikon DAN chip jenis; tidak ada lagi ungu lokal. */
  const hex = warnaLabel({
    kelompok: "issue_type",
    label: t?.label ?? type,
    kode: t?.code,
    warnaMaster: t?.color,
  });

  if (t?.icon) {
    return <RenderIcon iconName={t.icon} className={iconProps.className} style={{ color: hex }} />;
  }

  const tLowerCase = type?.toLowerCase() || "";
  const Ikon =
    tLowerCase === "epic"
      ? Zap
      : tLowerCase === "task"
        ? CheckCircle2
        : tLowerCase === "subtask"
          ? CircleDot
          : tLowerCase === "bug"
            ? Bug
            : tLowerCase === "meeting"
              ? Users
              : tLowerCase === "document"
                ? FileText
                : CircleDot;
  return <Ikon {...iconProps} style={{ color: hex }} />;
};

/**
 * #564 — geometri chip label. Warnanya milik `.label-chip` (src/index.css),
 * yang menurunkannya dari `--lbr`; di sini hanya bentuknya. Terpisah supaya
 * ritme radius/padding tetap jadi keputusan pemanggilnya.
 */
const CHIP_KECIL = "px-2 py-0.5 border rounded-md font-normal text-[10px] tracking-tight uppercase";
const CHIP_BIASA = "px-1.5 py-0.5 border rounded font-normal text-xs tracking-tight";

/** Warna chip selalu milik baris MasterData - satu komponen supaya panel tidak bisa menulis chip-nya sendiri lagi (#590). */
export const LabelChip = ({
  kelompok,
  nilai,
  masterData,
  kosong,
  ikon,
  className,
}: {
  /** `type` baris MasterData, mis. "jenis_dokumen" | "category" | "qa_status". */
  kelompok: string;
  nilai?: string | null;
  masterData?: MasterData[];
  kosong?: string;
  /** Ikut tampilkan ikon yang dipilih di Master Data untuk label ini. */
  ikon?: boolean;
  className?: string;
}) => {
  const dariStore = useAppStore((s) => s.masterData);
  const daftar = masterData ?? dariStore ?? [];
  const baris = cariMaster(daftar, kelompok, nilai);
  const teks = baris?.label ?? nilai ?? "";
  const hex = warnaDariMaster(daftar, kelompok, nilai);

  if (!teks) {
    return kosong ? <span className="text-content-subtle text-[10px]">{kosong}</span> : null;
  }

  return (
    <span
      className={cn(CHIP_KECIL, "label-chip inline-flex items-center gap-1.5", className)}
      style={gayaLabel(hex)}
    >
      {ikon && baris?.icon ? (
        <RenderIcon iconName={baris.icon} className="w-3 h-3 shrink-0" style={{ color: hex }} />
      ) : null}
      {teks}
    </span>
  );
};

/**
 * Hex sebuah chip dari nilai terpilih. Warna master data menang; tanpa itu
 * tabel baku; tanpa keduanya netral — dan pemanggil boleh memilih tetap abu
 * daripada menyamar berwarna (`berwarna`).
 */
const hexChip = (
  kelompok: string | undefined,
  baris: MasterData | undefined,
  opsi: { label?: string; color?: string } | undefined,
  nilai: string
) =>
  warnaLabel({
    kelompok: kelompok || "",
    label: baris?.label ?? opsi?.label ?? nilai,
    kode: baris?.code,
    warnaMaster: baris?.color ?? opsi?.color,
  });
export const StyledDropdown = ({
  value,
  onChange,
  options,
  type,
  masterData,
  className,
  buttonClassName,
  disabled,
  members = [],
  customButton,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string; color?: string; icon?: string }[];
  type?: string;
  masterData?: MasterData[];
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  members?: UserProfile[];
  customButton?: (selected: any) => React.ReactNode;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  }>({ left: 0, width: 0, placement: "bottom" });

  // De-duplicate options to prevent duplicate key errors
  const safeOptions = Array.from(new Map((options || []).map((o) => [o.id, o])).values());
  const selected = safeOptions.find((o) => o.id === value);

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
      const dropdownHeight = Math.min(safeOptions.length * 36 + 20, 300);
      const spaceBelow = viewportHeight - rect.bottom;

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setDropdownPos({
          bottom: viewportHeight - rect.top + 4,
          left: rect.left,
          width: Math.max(rect.width, 160),
          placement: "top",
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 160),
          placement: "bottom",
        });
      }
    }
  }, [isOpen, safeOptions.length]);

  const isStatus = type === "status";
  const isPriority = type === "priority";

  const baris = cariMaster(masterData, type || "", selected?.label || value);
  const hex = hexChip(type, baris, selected, value);
  /** Pemilih anggota/kosong tetap abu: labelnya memang tidak punya warna. */
  const berwarna = isStatus || isPriority || hex !== WARNA_NETRAL;
  const gaya = berwarna ? gayaLabel(hex) : undefined;

  return (
    <div className={cn("relative", className)}>
      {customButton ? (
        <div
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            !disabled && setIsOpen(!isOpen);
          }}
          className="cursor-pointer"
        >
          {customButton(selected)}
        </div>
      ) : (
        <button
          type="button"
          ref={buttonRef as any}
          onClick={(e) => {
            e.stopPropagation();
            !disabled && setIsOpen(!isOpen);
          }}
          disabled={disabled}
          style={gaya}
          className={cn(
            "flex items-center gap-1.5 group/dd transition-all cursor-pointer w-full justify-between focus:ring-1 focus:ring-primary/20",
            isStatus || isPriority
              ? cn(CHIP_KECIL, "label-chip transition-colors")
              : berwarna
                ? cn(CHIP_BIASA, "label-chip transition-colors")
                : "px-1.5 py-0.5 bg-surface border border-transparent hover:border-border-subtle rounded text-xs font-normal",
            disabled && "opacity-50 cursor-not-allowed",
            buttonClassName
          )}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {type === "member" &&
            selected?.id &&
            selected.id !== "Unassigned" &&
            selected.id !== "System" ? (
              <UserAvatar uid={selected.id} members={members} className="w-4 h-4 flex-shrink-0" />
            ) : type === "member" && (!selected?.id || selected.id === "Unassigned") ? (
              <div className="w-4 h-4 rounded-full bg-surface-muted border border-border-subtle border-dashed flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] text-content-subtle font-normal">?</span>
              </div>
            ) : isStatus ? (
              selected?.icon ? (
                <RenderIcon
                  iconName={selected.icon}
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: hex }}
                />
              ) : (
                <div
                  className="w-2 h-2 rounded-full shrink-0 shadow-inner border border-border-subtle"
                  style={{ backgroundColor: hex }}
                />
              )
            ) : isPriority ? (
              <PriorityIcon
                priority={selected?.label || value}
                className="w-3.5 h-3.5 flex-shrink-0"
                masterData={masterData}
              />
            ) : selected?.icon ? (
              <RenderIcon
                iconName={selected.icon}
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: selected.color || hex }}
              />
            ) : null}
            <span
              className={cn(
                "capitalize tracking-tight truncate",
                !selected?.label && !value
                  ? "text-content-subtle font-normal opacity-80 text-xs"
                  : isStatus
                    ? "font-normal text-[10px] text-inherit tracking-tight uppercase"
                    : isPriority
                      ? "font-normal text-[10px] text-inherit tracking-tight uppercase"
                      : "font-normal text-xs text-content-body"
              )}
            >
              {selected?.label || value || "Select..."}
            </span>
          </div>
          {!disabled && (
            <ChevronDown className="w-3 h-3 text-content-subtle group-hover/dd:text-content-muted flex-shrink-0" />
          )}
        </button>
      )}
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
              className="bg-surface rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-border-subtle overflow-hidden ring-1 ring-border-faint flex flex-col max-h-[300px] animate-dropdown"
            >
              {/*
                `min-h-0` wajib (#294). Induknya `flex flex-col max-h-[300px]`
                dengan `overflow-hidden`, dan anak flex punya `min-height: auto`
                bawaan — tanpa `min-h-0` ia MENOLAK menyusut di bawah tinggi
                isinya, sehingga daftar yang lebih panjang dari 300px terpotong
                induknya DAN tidak bisa digulir sama sekali. Paling terasa di
                pemilih bentuk flowchart yang punya 27 opsi (~810px).
              */}
              <div className="min-h-0 overflow-y-auto p-1.5 custom-scrollbar">
                {safeOptions.map((opt, optIdx) => {
                  const isActive = opt.id === value;
                  /** Titik/ikon daftar ikut warna label yang sama dengan chipnya. */
                  const hexOpt = warnaLabel({
                    kelompok: type || "",
                    label: opt.label,
                    warnaMaster: opt.color,
                  });
                  return (
                    <button
                      type="button"
                      key={opt.id ? `opt-${opt.id}-${optIdx}` : `opt-idx-${optIdx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md transition-all text-left group/opt",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-surface-sunken text-content-secondary"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {type === "member" &&
                        opt.id &&
                        opt.id !== "Unassigned" &&
                        opt.id !== "System" ? (
                          <UserAvatar
                            uid={opt.id}
                            members={members}
                            className="w-5 h-5 flex-shrink-0"
                          />
                        ) : type === "member" && (!opt.id || opt.id === "Unassigned") ? (
                          <div className="w-5 h-5 rounded-full bg-surface-muted border border-border-subtle border-dashed flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] text-content-subtle font-normal">?</span>
                          </div>
                        ) : isStatus ? (
                          opt.icon ? (
                            <RenderIcon
                              iconName={opt.icon}
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: hexOpt }}
                            />
                          ) : (
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner border border-border-faint"
                              style={{ backgroundColor: hexOpt }}
                            />
                          )
                        ) : isPriority ? (
                          <PriorityIcon
                            priority={opt.label}
                            className="w-4 h-4 flex-shrink-0"
                            masterData={masterData}
                          />
                        ) : opt.icon ? (
                          <RenderIcon
                            iconName={opt.icon}
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: opt.color || hexOpt }}
                          />
                        ) : null}
                        <span className="text-xs font-normal truncate text-content-body tracking-tight">
                          {opt.label}
                        </span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary/100" />}
                    </button>
                  );
                })}
                {safeOptions.length === 0 && (
                  <div className="p-4 text-center text-xs text-content-subtle italic font-normal">
                    {t("ui.noOptions")}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export const UncontrolledInput = ({
  initialValue,
  onSave,
  placeholder,
  className,
  disabled,
  type = "text",
  ...rest
}: any) => {
  const [val, setVal] = React.useState(initialValue || "");
  const [isFocused, setIsFocused] = React.useState(false);
  React.useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);
  return (
    <input
      type={type}
      className={className}
      placeholder={placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onBlur={() => {
        setIsFocused(false);
        if (val !== initialValue) onSave(val);
      }}
      disabled={disabled}
      {...rest}
    />
  );
};
