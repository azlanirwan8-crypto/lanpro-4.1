import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { motion } from "framer-motion";
import { VelzonFloatingParticles } from "../../../components/ui/CoreUI";

export const AuthHeroPanel = () => {
  const { t } = useTranslation();
  return (
    /*
      #231 — tepi kanan panel melengkung, dan ini SATU-SATUNYA sumber
      lengkungan itu.

      Pendekatan sebelumnya (SVG overlay tipis berisi path bezier, fill warna
      keras `#405189`, plus garis neon `linearGradient` + `feGaussianBlur`,
      diregangkan `preserveAspectRatio="none"` di kotak 120px × tinggi-layar)
      tidak pernah bisa terbaca mulus, dan bukan karena titik kontrolnya
      salah: meregangkan kurva secara non-uniform di kotak yang sangat
      sempit-dan-tinggi memperbesar setiap ketidaksempurnaan tangent secara
      horizontal, sementara fill warna kerasnya tidak pernah sama persis
      dengan gradient panel sehingga selalu meninggalkan jahitan yang terlihat.
      Tiga putaran menambal titik kontrol path itu (`C`→`S`, lalu memindah
      posisi SVG) tidak menyelesaikannya — masalahnya ada di pendekatannya.

      `clip-path: ellipse()` memotong panelnya SENDIRI, jadi lengkungannya
      adalah busur elips sesungguhnya yang dihitung peramban — mulus secara
      matematis, tanpa titik kontrol yang bisa patah, tanpa lapisan warna
      kedua yang bisa mismatch, dan gradient panel ikut terpotong apa adanya
      sehingga tidak ada jahitan sama sekali. `at 0% 50%` menaruh pusat elips
      di tepi kiri setinggi tengah, jadi tepi kanan menggembung paling jauh di
      tengah dan menyempit landai ke atas dan bawah. Radius vertikal 230%
      (lebih besar dari tinggi panel) sengaja: itu yang membuat lengkungannya
      landai dan tenang, bukan busur setengah lingkaran yang ekstrem. Angka
      ini dinaikkan dari 150% atas permintaan pemilik proyek supaya ayunannya
      lebih halus — pada elips, makin besar radius vertikal makin landai
      busurnya, jadi ini tuas yang tepat untuk "lebih smooth" tanpa
      menghilangkan lengkungannya sama sekali.
    */
    <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-primary-surface-hover via-primary-surface to-primary-surface-active items-center justify-center p-8 xl:p-12 select-none min-h-dvh z-10 overflow-hidden [clip-path:ellipse(100%_230%_at_0%_50%)]">
      {/* Floating White Particles Effect */}
      <VelzonFloatingParticles />

      {/* Subtle Ambient Mesh Gradient */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] bg-cyan-400/20 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] left-[15%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center pr-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-medium text-content-inverse leading-[0.9] tracking-tighter drop-shadow-md">
            LAN <span className="text-amber-400">PRO</span>
          </h1>
          <p className="text-xs font-normal text-content-inverse-muted mt-3 tracking-widest uppercase">
            {t("ui.platformTagline")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
