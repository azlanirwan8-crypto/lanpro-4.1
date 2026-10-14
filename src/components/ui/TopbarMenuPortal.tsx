/**
 * #672 — panel menu topbar dirender lewat portal ke `document.body`.
 *
 * KENAPA. Bar header (`AppContainer.tsx`) adalah flex item ber-z-40, jadi ia
 * membentuk stacking context sendiri: menu `z-50` apa pun di dalamnya tetap
 * berlangit-langitkan z-40 header dan tidak bisa pernah menang atas lapisan
 * yang hidup DI LUAR header (scrim laci mobile z-[45], overlay modal z-50).
 * Me-render panel lewat portal memindahkannya ke context akar, dan posisinya
 * dihitung dari rect pemicu saat dibuka.
 *
 * ANGGARAN STACKING (#729) — posisi menu portaled ini di tangga sengaja
 * z-[44]: di atas kepala tabel sticky (z-30) dan bar header (z-40), di bawah
 * scrim laci mobile (z-[45]) dan overlay modal (z-50). Menu yang menembus
 * scrim akan tampak menyala di atas permukaan yang sedang diredupkan — itu
 * cacat, bukan fitur.
 *
 * PERILAKU. (1) posisi fixed dihitung dari `triggerRef` saat dibuka dan saat
 * resize; (2) gulir TUTUP menu — panel fixed tidak ikut header saat halaman
 * bergulir, jadi lebih jujur menutupnya daripada berpura-pura menempel;
 * (3) klik di luar (pemicu maupun panel) menutup — panel ikut dicek lewat ref
 * internal karena DOM-nya kini di `document.body`, bukan di dalam pemicu.
 */
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface TopbarMenuPortalProps {
  open: boolean;
  onClose: () => void;
  /** Elemen pemicu; panel digantung di bawah kanan elemen ini. */
  triggerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  /** Mode lembar-bawah untuk layar sempit (panel notifikasi mobile). */
  lembarBawahMobile?: boolean;
  children: React.ReactNode;
}

export const TopbarMenuPortal: React.FC<TopbarMenuPortalProps> = ({
  open,
  onClose,
  triggerRef,
  className,
  lembarBawahMobile = false,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      if (lembarBawahMobile && window.innerWidth < 768) {
        setPos({ top: undefined, right: 0, bottom: 0, left: 0 });
      } else {
        const r = el.getBoundingClientRect();
        setPos({
          top: r.bottom + 4,
          right: Math.max(8, window.innerWidth - r.right),
          bottom: undefined,
          left: undefined,
        });
      }
    };

    update();

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    };
    const onScroll = () => onClose();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("resize", update);
    // `scroll` tidak menggulung, tapi fase capture dari window menangkap
    // penggulung bersarang apa pun di subtree — cukup untuk menutup menu.
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose, triggerRef, lembarBawahMobile]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          style={{ position: "fixed", ...pos }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default TopbarMenuPortal;
