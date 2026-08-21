import React from "react";
import { motion } from "framer-motion";

interface AnimatedLogoutIconProps {
  size?: number;
  className?: string;
}

export const AnimatedLogoutIcon: React.FC<AnimatedLogoutIconProps> = ({
  size = 96,
  className = "",
}) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      data-testid="animated-logout-icon"
    >
      {/* Outer pulsing soft ring */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full bg-amber-500/15"
      />

      {/* Main icon container */}
      <div className="relative w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-sm">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Doorway / Portal frame on the right */}
          <path
            d="M26 10H36C37.1046 10 38 10.8954 38 12V36C38 37.1046 37.1046 38 36 38H26"
            stroke="#f06548"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* User Head */}
          <motion.circle
            cx="16"
            cy="18"
            r="5"
            stroke="#f7b84b"
            strokeWidth="3"
            animate={{
              x: [0, 4, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* User Body / Shoulders */}
          <motion.path
            d="M8 36C8 30.4772 11.5817 27 16 27C18.6667 27 21.05 28.25 22.4 30.2"
            stroke="#f7b84b"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{
              x: [0, 4, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Directional Exit Arrow */}
          <motion.g
            animate={{
              x: [0, 7, 0],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Arrow shaft */}
            <line
              x1="22"
              y1="24"
              x2="35"
              y2="24"
              stroke="#f06548"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Arrow head */}
            <path
              d="M31 19L36 24L31 29"
              stroke="#f06548"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>

          {/* Motion trail / step dots */}
          <motion.circle
            cx="12"
            cy="24"
            r="1.5"
            fill="#f7b84b"
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.circle
            cx="17"
            cy="24"
            r="1.5"
            fill="#f7b84b"
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
        </svg>
      </div>
    </div>
  );
};
