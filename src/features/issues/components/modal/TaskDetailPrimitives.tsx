import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../../../lib/utils";

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
      "bg-primary-surface text-content-inverse hover:bg-primary-surface-hover active:bg-primary-active shadow-xs border-transparent",
    secondary:
      "bg-surface text-content-body border-border-subtle/80 hover:bg-surface-sunken shadow-xs",
    ghost: "bg-transparent text-content-muted hover:bg-surface-muted border-transparent",
    danger: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/15 shadow-xs",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-xs font-medium",
    lg: "px-5 py-2 text-sm font-medium",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
    >
      {children}
    </button>
  );
};

export const Textarea = ({ value, onChange, placeholder, rows = 3, className = "" }: any) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={cn(
      "w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none font-medium text-content-body shadow-2xs",
      className
    )}
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
