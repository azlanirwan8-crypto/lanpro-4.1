import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../../../lib/utils";
import { TEXTAREA_ISIAN, TEXTAREA_KACA } from "../../../../components/ui/gayaForm";

export const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  size = "md",
}: any) => {
  const variants = {
    primary:
      "btn-primary text-content-inverse hover:bg-primary-surface-hover active:bg-primary-surface-active shadow-xs border-transparent",
    secondary:
      "bg-surface text-content-body border-border-subtle hover:bg-surface-sunken shadow-2xs",
    ghost:
      "bg-transparent text-content-muted hover:bg-surface-muted border-transparent shadow-none",
    danger: "bg-danger/10 text-danger-text border-danger/30 hover:bg-danger/15 shadow-2xs",
  };

  /* #721 — skalanya sama dengan `CoreUI.tsx:92-96` (sm h-8, md h-9, lg h-11).
     Sebelumnya tombol di layar ini memakai `h-8` dan `h-9` bergantian lewat
     `className` di tempat pemanggil, sehingga dua tombol berdampingan bisa
     berbeda tinggi tanpa ada yang menulisnya. */
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-3.5 text-xs",
    lg: "h-11 px-5 text-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]",
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
    >
      {children}
    </button>
  );
};

export const Textarea = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
  tanpaBingkai = false,
}: any) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={cn(tanpaBingkai ? TEXTAREA_KACA : TEXTAREA_ISIAN, className)}
  />
);

export const UncontrolledInput = ({
  initialValue,
  onSave,
  onAutoSave,
  placeholder,
  className,
  disabled,
  type = "text",
  ...rest
}: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (onAutoSave) onAutoSave(val);
        else onSave(val);
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [val, isFocused, initialValue, onAutoSave, onSave]);

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
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (val !== initialValue) onSave(val);
      }}
      disabled={disabled}
      {...rest}
    />
  );
};

export const UncontrolledTextarea = ({
  initialValue,
  onSave,
  onCancel,
  onAutoSave,
  placeholder,
  className,
  rows = 3,
}: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (onAutoSave) onAutoSave(val);
        else onSave(val);
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [val, isFocused, initialValue, onAutoSave, onSave]);

  return (
    <textarea
      className={className}
      placeholder={placeholder}
      rows={rows}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      autoFocus
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (saveTimeout.current) clearTimeout(saveTimeout.current);
          if (val !== initialValue) onSave(val);
          else onCancel();
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (val !== initialValue) onSave(val);
        else onCancel();
      }}
    />
  );
};
