import { motion } from "framer-motion";
import { VelzonFloatingParticles } from "../../../components/ui/CoreUI";

export const AuthHeroPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-surface-hover via-primary-surface to-primary-surface-active items-center justify-center p-8 xl:p-12 select-none min-h-screen z-10 overflow-hidden">
    {/* Floating White Particles Effect */}
    <VelzonFloatingParticles />

    {/* Subtle Ambient Mesh Gradient */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/30 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[60%] h-[60%] bg-cyan-400/20 rounded-full blur-[140px]" />
      <div className="absolute top-[35%] left-[15%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[130px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
    </div>

    {/* Organic S-Curve Wave Divider Overlay */}
    <svg
      className="absolute top-0 -right-[79px] xl:-right-[119px] h-full w-[80px] xl:w-[120px] pointer-events-none z-20 drop-shadow-[8px_0_16px_rgba(0,0,0,0.3)]"
      viewBox="0 0 120 1000"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wave-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Solid S-Curve Fill matching Velzon #405189 */}
      <path d="M 0 0 C 85 200, 115 380, 55 520 C -5 660, 80 840, 0 1000 L 0 0 Z" fill="#405189" />

      {/* Glowing Border Accent along the S-Curve Edge */}
      <path
        d="M 0 0 C 85 200, 115 380, 55 520 C -5 660, 80 840, 0 1000"
        fill="none"
        stroke="url(#wave-glow)"
        strokeWidth="3"
        filter="url(#glow-shadow)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>

    <div className="relative z-10 max-w-lg w-full text-center pr-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-6xl font-medium text-content-inverse leading-[0.9] tracking-tighter drop-shadow-md">
          LAN <span className="text-amber-400">PRO</span>
        </h1>
        <p className="text-xs font-medium text-content-inverse-muted mt-3 tracking-widest uppercase">
          Project Management Platform
        </p>
      </motion.div>
    </div>
  </div>
);
