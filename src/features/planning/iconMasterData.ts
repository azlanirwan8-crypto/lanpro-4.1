import React from "react";
import { Zap, Target, Star, Flag, Tag, Folder, Layers, List } from "lucide-react";
import { MasterData } from "../../types";

// Peta statis nama icon → komponen. Sengaja TIDAK memakai
// `import * as LucideIcons` + lookup dinamis ke namespace module: pada
// production build yang di-minify pola itu pernah menghasilkan
// "TypeError: o is not a function". Semua komponen di-import eksplisit
// sehingga aman terhadap tree-shaking dan selalu berupa function.
const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  Zap,
  Target,
  Star,
  Flag,
  Tag,
  Folder,
  Layers,
  List,
};

export const findTypeData = (taskType: string, masterData: MasterData[]) => {
  if (!Array.isArray(masterData)) return undefined;
  return masterData.find(
    (m) =>
      (m.type || "").toLowerCase() === "issue_type" &&
      (m.label || "").toLowerCase() === taskType.toLowerCase()
  );
};

// Icon mengikuti MasterData; fallback aman bila nama icon tidak dikenal.
export const getIconForTaskType = (taskType: string, masterData: MasterData[]) => {
  const rawIcon = findTypeData(taskType, masterData)?.icon;
  if (typeof rawIcon === "string" && rawIcon.trim()) {
    const name = rawIcon.charAt(0).toUpperCase() + rawIcon.slice(1);
    const Icon = ICON_MAP[name];
    if (Icon) return Icon;
  }
  return taskType.toLowerCase() === "epic" ? Zap : Target;
};

// Warna mengikuti MasterData: kelas Tailwind dipakai sebagai className,
// nilai hex/rgb dipakai sebagai inline style. Keduanya opsional.
export const getColorForTaskType = (
  taskType: string,
  masterData: MasterData[]
): { colorClass: string; colorStyle?: React.CSSProperties } => {
  const color = findTypeData(taskType, masterData)?.color;
  if (typeof color === "string" && color.startsWith("text-")) {
    return { colorClass: color };
  }
  if (typeof color === "string" && (color.startsWith("#") || color.startsWith("rgb"))) {
    return { colorClass: "", colorStyle: { color } };
  }
  return { colorClass: "" };
};
