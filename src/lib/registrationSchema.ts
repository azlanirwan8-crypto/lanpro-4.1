import { z } from "zod";

/**
 * Pesan di bawah ini adalah KUNCI i18n, bukan teks jadi (#171).
 *
 * Skema ini konstanta tingkat modul, jadi `t()` tidak bisa dipanggil di sini —
 * hasilnya akan membeku pada bahasa yang aktif saat modul pertama dimuat, dan
 * mengganti bahasa tidak akan mengubahnya lagi. Kuncinya diterjemahkan di
 * tempat galat dipetakan, di `RegisterScreen`. Pola yang sama dipakai
 * `evaluatePasswordStrength` di bawah, dan dijaga uji kunci dinamis.
 */
export const registrationSchema = z.object({
  name: z.string().min(3, "regValidation.nameMin").max(25, "regValidation.nameMax"),
  email: z.string().email("regValidation.emailInvalid"),
  username: z
    .string()
    .regex(/^[a-zA-Z]+$/, "regValidation.usernameLettersOnly")
    .max(10, "regValidation.usernameMax"),
  password: z
    .string()
    .min(8, "regValidation.passwordMin")
    .regex(/[A-Z]/, "regValidation.passwordUpper")
    .regex(/[a-z]/, "regValidation.passwordLower")
    .regex(/[0-9]/, "regValidation.passwordDigit")
    .regex(/[@$!%*?&]/, "regValidation.passwordSymbol"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

export interface PasswordCriteria {
  minLength: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

/**
 * `label` memulangkan KUNCI i18n, bukan teks. Hasilnya dihitung di dalam
 * useMemo di RegisterScreen, sehingga teks jadi akan membeku saat bahasa
 * diganti; kuncinya diterjemahkan di tempat render.
 */
export function evaluatePasswordStrength(password: string): {
  score: "weak" | "medium" | "strong";
  percentage: number;
  label: string;
  color: string;
  barColor: string;
  criteria: PasswordCriteria;
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const validCount = Object.values(criteria).filter(Boolean).length;

  if (password.length === 0) {
    return {
      score: "weak",
      percentage: 0,
      label: "register.strengthEmpty",
      color: "text-content-subtle",
      barColor: "bg-surface-marker",
      criteria,
    };
  }

  // Strong: Min 8 chars & ALL 4 combinations (Upper, Lower, Digit, Special)
  if (
    criteria.minLength &&
    criteria.upper &&
    criteria.lower &&
    criteria.digit &&
    criteria.special
  ) {
    return {
      score: "strong",
      percentage: 100,
      label: "register.strengthStrong",
      color: "text-emerald-500",
      barColor: "bg-emerald-500",
      criteria,
    };
  }

  // Medium: Has length >= 8 with uppercase + digits (or at least 3 valid criteria)
  if (password.length >= 8 && ((criteria.upper && criteria.digit) || validCount >= 3)) {
    return {
      score: "medium",
      percentage: 65,
      label: "register.strengthMedium",
      color: "text-amber-500",
      barColor: "bg-amber-500",
      criteria,
    };
  }

  // Weak: Length < 8 or only 1-2 variations
  return {
    score: "weak",
    percentage: 30,
    label: "register.strengthWeak",
    color: "text-rose-500",
    barColor: "bg-rose-500",
    criteria,
  };
}
