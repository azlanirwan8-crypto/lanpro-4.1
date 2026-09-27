import React from "react";
import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../../lib/utils";

interface AlertBannerProps {
  message: string;
  className?: string;
}

export const KanbanAlertBanner: React.FC<AlertBannerProps> = ({ message, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "flex items-center gap-2 p-2.5 text-xs font-medium text-red-700 bg-red-50/90 border border-red-200/90 rounded-md shadow-2xs",
          className
        )}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600 animate-pulse" />
        <p>{message}</p>
      </div>
    </motion.div>
  );
};
