import React, { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";

type Task = any;

// --- Utils ---
export const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

export const ensureDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  if (dateValue && typeof dateValue.toDate === "function") {
    const d = dateValue.toDate();
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const safeFormat = (dateValue: any, formatStr: string, fallback: string = "-") => {
  try {
    const d = ensureDate(dateValue);
    if (!dateValue || isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

// --- Components ---
export const TimelineDatePills = ({
  task,
  tempDates,
}: {
  task: Task;
  minDate: Date;
  totalDays: number;
  interaction: any;
  tempDates: any;
}) => {
  const dates = tempDates[task.id] || {
    startDate: task.startDate,
    endDate: task.endDate,
  };
  if (!dates.startDate || !dates.endDate) return null;

  const start = ensureDate(dates.startDate);
  const end = ensureDate(dates.endDate);
  const duration = differenceInDays(end, start) + 1;

  return (
    <>
      <div className="absolute -left-1 transform -translate-x-full pr-2 top-1/2 -translate-y-1/2 whitespace-nowrap z-50 pointer-events-none">
        <div className="bg-overlay/90 text-xs sm:text-[10px] font-medium text-content-inverse px-2 py-1 rounded shadow-soft-lg backdrop-blur-sm border border-slate-700/50 flex items-center gap-1.5 animate-dropdown">
          <Calendar className="w-2.5 h-2.5 text-content-subtle" />
          {format(start, "MMM d, yyyy")}
        </div>
      </div>
      <div className="absolute -right-1 transform translate-x-full pl-2 top-1/2 -translate-y-1/2 whitespace-nowrap z-50 pointer-events-none">
        <div className="bg-overlay/90 text-xs sm:text-[10px] font-medium text-content-inverse px-2 py-1 rounded shadow-soft-lg backdrop-blur-sm border border-slate-700/50 flex items-center gap-1.5 animate-dropdown">
          <Calendar className="w-2.5 h-2.5 text-content-subtle" />
          {format(end, "MMM d, yyyy")}
          <span className="text-content-subtle font-normal">
            ({duration} {duration === 1 ? "day" : "days"})
          </span>
        </div>
      </div>
    </>
  );
};

// --- Components ---
export const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  size = "md",
  dataText,
  ...props
}: any) => {
  const base =
    "btn-animation waves-effect waves-light rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 " +
    "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-indigo-500/20 active:scale-[0.98] cursor-pointer shadow-xs";

  const sizes: any = {
    sm: "px-3 py-1.5 h-8 text-xs",
    md: "px-4 py-2 h-9 text-xs sm:text-[13px]",
    lg: "px-5 py-2.5 h-11 text-sm",
  };

  const variants: any = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    success: "btn-success",
    info: "btn-info",
    warning: "btn-warning",
    danger: "btn-danger",
    ["dark"]: "btn-dark",
    ghost:
      "bg-transparent text-content-secondary hover:bg-surface-sunken border border-transparent",
    outline: "bg-surface text-content-strong hover:bg-surface-sunken border border-border-subtle",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      data-text={dataText}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span>{children}</span>
    </button>
  );
};

export const VelzonButton = Button;

export const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  ...props
}: any) => (
  <input
    type={type}
    value={value ?? ""}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-2.5 min-h-11 bg-surface text-content border border-border-subtle rounded-lg placeholder:text-content-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${className}`}
    {...props}
  />
);

export const Textarea = ({ value, onChange, placeholder, className = "", rows = 3 }: any) => (
  <textarea
    value={value ?? ""}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-4 py-2.5 bg-surface text-content border border-border-subtle rounded-lg placeholder:text-content-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none ${className}`}
  />
);

export const VelzonFloatingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.floor(Math.random() * 5) + 3, // 3px to 8px
      left: `${(i * 2.4 + Math.random() * 3) % 98}%`,
      duration: Math.random() * 8 + 6, // 6s to 14s
      delay: Math.random() * 6,
      opacity: Math.random() * 0.7 + 0.25,
      drift: Math.random() * 40 - 20,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-surface shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: "-20px",
          }}
          animate={{
            y: ["0vh", "-115vh"],
            x: [0, p.drift, 0],
            opacity: [0, p.opacity, p.opacity, 0],
            scale: [0.6, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

/* ─── Card ─────────────────────────────────────────────────────────────────
 * Kartu adalah wadah paling sering dipakai di aplikasi ini, tetapi selama ini
 * ditulis ulang di tiap layar dengan kombinasi utility yang sedikit berbeda —
 * ada yang rounded-lg, ada rounded-xl, ada shadow-sm, ada tanpa bayangan.
 * Ketiga komponen di bawah menyatukannya, memakai token sehingga otomatis
 * benar di mode gelap.
 * ───────────────────────────────────────────────────────────────────────── */

export const Card = ({ children, className = "", ...props }: any) => (
  <div
    className={cn(
      "bg-surface border border-border-subtle rounded-lg shadow-soft overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = "", ...props }: any) => (
  <div
    className={cn(
      "px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-3",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardBody = ({ children, className = "", ...props }: any) => (
  <div className={cn("p-5", className)} {...props}>
    {children}
  </div>
);

/* ─── Badge ────────────────────────────────────────────────────────────────
 * Label status kecil. Varian mengikuti warna status pada sistem token, dengan
 * latar transparan agar terbaca di mode terang maupun gelap tanpa perlu dua
 * definisi warna.
 * ───────────────────────────────────────────────────────────────────────── */

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

export const Badge = ({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) => {
  const variants: Record<BadgeVariant, string> = {
    primary: "bg-primary-surface/10 text-primary border-primary/20",
    success: "bg-success/10 text-success-text border-success/20",
    warning: "bg-warning/15 text-warning-text border-warning/30",
    danger: "bg-danger/10 text-danger-text border-danger/20",
    info: "bg-info/10 text-info-text border-info/20",
    neutral: "bg-surface-muted text-content-secondary border-border-subtle",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md border",
        "text-xs sm:text-[11px] font-normal uppercase tracking-wide whitespace-nowrap",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
