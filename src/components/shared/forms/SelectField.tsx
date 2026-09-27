/**
 * Bidang pilihan berlabel untuk kit form bersama.
 *
 * KENAPA BUKAN `<select>` LAGI (#282). Berkas ini dulu merender `<select>`
 * bawaan peramban di dalamnya, sehingga memakainya TIDAK menyeragamkan apa
 * pun — ia terlihat seperti komponen bersama tapi menghasilkan menu yang
 * berbeda-beda di Windows, macOS, dan Android, dan tidak mengikuti token
 * tema. Sekarang ia meneruskan ke `StyledDropdown`, kendali yang sama yang
 * dipakai 30-an berkas fitur lain.
 *
 * PERUBAHAN BENTUK API. `onChange` dulu menerima event `<select>` dan
 * pemanggil harus membaca `e.target.value`; kini ia menerima nilainya
 * langsung. Ini aman diubah karena kit `shared/forms` belum punya satu pun
 * pemakai — lihat catatan di `index.ts`.
 */
import React from "react";
import { StyledDropdown } from "../../ui/CommonComponents";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  /** Nilai terpilih. Angka diterima dan dibandingkan sebagai string. */
  value?: string | number;
  /** Menerima NILAI-nya, bukan event — lihat catatan bentuk API di atas. */
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  error,
  helperText,
  required,
  placeholder,
  value,
  onChange,
  disabled,
  className = "",
}) => {
  const daftar = [
    ...(placeholder ? [{ id: "", label: placeholder }] : []),
    ...options.map((opt) => ({ id: String(opt.value), label: opt.label })),
  ];

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs text-content-body font-normal block">
          {label}
          {required && <span className="text-danger-text ml-1">*</span>}
        </label>
      )}
      <StyledDropdown
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(val) => onChange?.(val)}
        options={daftar}
        disabled={disabled}
        buttonClassName={`w-full text-xs p-2.5 bg-surface-sunken border rounded-md text-left font-normal text-content-body ${
          error ? "border-danger/30" : "border-border-subtle"
        } ${className}`}
      />
      {error && <p className="text-xs sm:text-[10px] text-danger-text font-normal">{error}</p>}
      {helperText && !error && (
        <p className="text-xs sm:text-[10px] text-content-muted">{helperText}</p>
      )}
    </div>
  );
};
