import React from "react";
import type { FlowNode } from "../../types";

export function renderUmlShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any,
  isBlueprint: boolean,
  isSelected: boolean
): React.ReactNode | null {
  switch (node.type) {
    case "umlClass":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="4"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.5)" : "#f8fafc"}
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
          />
          <line
            x1="5"
            y1="30"
            x2="95"
            y2="30"
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
            strokeWidth="2"
          />
          <line
            x1="5"
            y1="65"
            x2="95"
            y2="65"
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
            strokeWidth="2"
          />
        </svg>
      );
    case "umlInterface":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="4"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.5)" : "#f5f3ff"}
            stroke={isSelected ? "#8b5cf6" : "#8b5cf6"}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
          <line
            x1="5"
            y1="35"
            x2="95"
            y2="35"
            stroke={isSelected ? "#8b5cf6" : "#8b5cf6"}
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="65"
            r="14"
            fill={isBlueprint ? "rgba(30, 58, 138, 0.6)" : "#faf5ff"}
            stroke={isSelected ? "#8b5cf6" : "#a855f7"}
            strokeWidth="2"
          />
          <line
            x1="50"
            y1="35"
            x2="50"
            y2="51"
            stroke={isSelected ? "#8b5cf6" : "#a855f7"}
            strokeWidth="2.5"
          />
        </svg>
      );
    case "umlUseCase":
      return (
        <svg {...svgProps}>
          <ellipse
            cx="50"
            cy="50"
            rx="44"
            ry="32"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#eff6ff"}
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
          />
        </svg>
      );
    case "umlBoundary":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="8"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
            strokeWidth="1"
            strokeDasharray="4,2"
          />
          <circle
            cx="55"
            cy="50"
            r="14"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#f8fafc"}
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
          />
          <line
            x1="25"
            y1="20"
            x2="25"
            y2="80"
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
            strokeWidth="3"
          />
          <line
            x1="25"
            y1="50"
            x2="41"
            y2="50"
            stroke={isSelected ? "#8b5cf6" : "#64748b"}
            strokeWidth="3"
          />
        </svg>
      );
    case "umlControl":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="8"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
            strokeWidth="1"
            strokeDasharray="4,2"
          />
          <circle
            cx="50"
            cy="50"
            r="26"
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#eff6ff"}
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
            strokeWidth="2"
          />
          <path
            d="M52,18 L56,24 L62,16"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "umlEntity":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="8"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
            strokeWidth="1"
            strokeDasharray="4,2"
          />
          <ellipse
            cx="50"
            cy="55"
            rx="25"
            ry="14"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#ecfdf5"}
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
          />
          <line
            x1="18"
            y1="75"
            x2="82"
            y2="75"
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
            strokeWidth="3.5"
          />
          <line
            x1="50"
            y1="55"
            x2="50"
            y2="75"
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
            strokeWidth="2.5"
          />
        </svg>
      );
    case "umlNote":
      return (
        <svg {...svgProps}>
          <polygon
            points="10,10 70,10 90,30 90,90 10,90"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fffbeb"}
            stroke={isSelected ? "#8b5cf6" : "#eab308"}
          />
          <polygon
            points="70,10 70,30 90,30"
            fill={isSelected ? "#8b5cf6" : "#fef08a"}
            stroke={isSelected ? "#c084fc" : "#eab308"}
            strokeWidth="1.5"
          />
          <line
            x1="22"
            y1="38"
            x2="60"
            y2="38"
            stroke={isSelected ? "#c084fc" : "#ca8a04"}
            strokeWidth="1.5"
          />
          <line
            x1="22"
            y1="52"
            x2="78"
            y2="52"
            stroke={isSelected ? "#c084fc" : "#ca8a04"}
            strokeWidth="1.5"
          />
          <line
            x1="22"
            y1="66"
            x2="78"
            y2="66"
            stroke={isSelected ? "#c084fc" : "#ca8a04"}
            strokeWidth="1.5"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function renderUmlPreviewIcon(type: string, commonProps: any, elementProps: any): React.ReactNode | null {
  switch (type) {
    case "umlClass":
      return (
        <svg {...commonProps}>
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="4"
            {...elementProps}
            fill="rgba(100, 116, 139, 0.08)"
            stroke="#64748b"
          />
          <line x1="15" y1="36" x2="85" y2="36" stroke="#64748b" strokeWidth={3} />
          <line x1="15" y1="62" x2="85" y2="62" stroke="#64748b" strokeWidth={3} />
        </svg>
      );
    case "umlInterface":
      return (
        <svg {...commonProps}>
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="4"
            {...elementProps}
            fill="rgba(168, 85, 247, 0.08)"
            stroke="#8b5cf6"
            strokeDasharray="3,2"
          />
          <circle cx="50" cy="52" r="12" fill="none" stroke="#a855f7" strokeWidth={3} />
          <line x1="50" y1="15" x2="50" y2="40" stroke="#a855f7" strokeWidth={3} />
        </svg>
      );
    case "umlUseCase":
      return (
        <svg {...commonProps}>
          <ellipse
            cx="50"
            cy="50"
            rx="38"
            ry="25"
            {...elementProps}
            fill="rgba(59, 130, 246, 0.08)"
            stroke="#3b82f6"
          />
        </svg>
      );
    case "umlBoundary":
      return (
        <svg {...commonProps}>
          <circle
            cx="55"
            cy="50"
            r="18"
            {...elementProps}
            fill="rgba(100, 116, 139, 0.08)"
            stroke="#64748b"
          />
          <line x1="25" y1="25" x2="25" y2="75" stroke="#64748b" strokeWidth={4} />
          <line x1="25" y1="50" x2="37" y2="50" stroke="#64748b" strokeWidth={4} />
        </svg>
      );
    case "umlControl":
      return (
        <svg {...commonProps}>
          <circle
            cx="50"
            cy="50"
            r="22"
            {...elementProps}
            fill="rgba(59, 130, 246, 0.08)"
            stroke="#3b82f6"
          />
          <path d="M52,18 L56,24 L62,16" fill="none" stroke="#3b82f6" strokeWidth={3.5} />
        </svg>
      );
    case "umlEntity":
      return (
        <svg {...commonProps}>
          <ellipse
            cx="50"
            cy="52"
            rx="20"
            ry="12"
            {...elementProps}
            fill="rgba(16, 185, 129, 0.08)"
            stroke="#10b981"
          />
          <line x1="20" y1="72" x2="80" y2="72" stroke="#10b981" strokeWidth={4.5} />
          <line x1="50" y1="52" x2="50" y2="72" stroke="#10b981" strokeWidth={3.5} />
        </svg>
      );
    case "umlNote":
      return (
        <svg {...commonProps}>
          <polygon
            points="18,15 62,15 82,35 82,85 18,85"
            {...elementProps}
            fill="rgba(234, 179, 8, 0.08)"
            stroke="#eab308"
          />
          <polygon points="62,15 62,35 82,35" fill="#fef08a" stroke="#eab308" strokeWidth={2} />
        </svg>
      );
    default:
      return null;
  }
}
