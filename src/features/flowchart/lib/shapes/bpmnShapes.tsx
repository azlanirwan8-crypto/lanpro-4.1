import React from "react";
import type { FlowNode } from "../../types";

export function renderBpmnShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any,
  isBlueprint: boolean,
  isSelected: boolean
): React.ReactNode | null {
  switch (node.type) {
    case "bpmnActivity":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="12"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fafafa"}
            stroke={isSelected ? "#8b5cf6" : "#1e293b"}
            strokeWidth="2.5"
          />
          <path
            d="M44,82 A6,6 0 1,1 54,82"
            {...elementProps}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <polygon points="54,82 58,78 54,74" fill="currentColor" />
        </svg>
      );
    case "bpmnEvent":
      return (
        <svg {...svgProps}>
          <circle
            cx="50"
            cy="50"
            r="40"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.3)" : "#fdfcf7"}
            stroke={isSelected ? "#8b5cf6" : "#059669"}
            strokeWidth="2"
          />
        </svg>
      );
    case "bpmnGateway":
      return (
        <svg {...svgProps}>
          <polygon
            points="50,5 95,50 50,95 5,50"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.3)" : "#fefdf0"}
            stroke={isSelected ? "#8b5cf6" : "#d97706"}
            strokeWidth="2.5"
          />
          <path
            d="M38,38 L62,62 M62,38 L38,62"
            stroke={isSelected ? "#8b5cf6" : "#d97706"}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "bpmnDataStore":
      return (
        <svg {...svgProps}>
          <ellipse
            cx="50"
            cy="22"
            rx="25"
            ry="9"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#f1f5f9"}
            stroke={isSelected ? "#8b5cf6" : "#475569"}
            strokeWidth="2.5"
          />
          <path
            d="M25,22 L25,75 A25,9 0 0,0 75,75 L75,22"
            {...elementProps}
            stroke={isSelected ? "#8b5cf6" : "#475569"}
            strokeWidth="2.5"
          />
          <path
            d="M25,36 A25,9 0 0,0 75,36 M25,50 A25,9 0 0,0 75,50"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#475569"}
            strokeWidth="2"
          />
          <path
            d="M50,57 L50,68 M44,63 L56,63"
            stroke={isSelected ? "#8b5cf6" : "#475569"}
            strokeWidth="2"
          />
        </svg>
      );
    case "bpmnDataObject":
      return (
        <svg {...svgProps}>
          <polygon
            points="15,5 65,5 85,25 85,95 15,95"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fff"}
            stroke={isSelected ? "#8b5cf6" : "#475569"}
          />
          <polygon
            points="65,5 65,25 85,25"
            fill="#e2e8f0"
            stroke={isSelected ? "#8b5cf6" : "#475569"}
          />
          <path
            d="M25,45 L40,45 M25,55 L55,55"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "bpmnEventEnd":
      return (
        <svg {...svgProps}>
          <circle
            cx="50"
            cy="50"
            r="40"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.3)" : "#fdf1f1"}
            stroke={isSelected ? "#8b5cf6" : "#dc2626"}
            strokeWidth="5.5"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function renderBpmnPreviewIcon(type: string, commonProps: any, elementProps: any): React.ReactNode | null {
  switch (type) {
    case "bpmnActivity":
      return (
        <svg {...commonProps}>
          <rect
            x="18"
            y="18"
            width="64"
            height="64"
            rx="8"
            {...elementProps}
            fill="rgba(30, 41, 59, 0.02)"
            stroke="#1e293b"
            strokeWidth={3}
          />
          <path d="M46,74 A4,4 0 1,1 54,74" fill="none" stroke="currentColor" strokeWidth="2" />
          <polygon points="54,74 57,71 54,68" fill="currentColor" />
        </svg>
      );
    case "bpmnEvent":
      return (
        <svg {...commonProps}>
          <circle
            cx="50"
            cy="50"
            r="30"
            {...elementProps}
            fill="none"
            stroke="#059669"
            strokeWidth={2.5}
          />
        </svg>
      );
    case "bpmnGateway":
      return (
        <svg {...commonProps}>
          <polygon
            points="50,18 82,50 50,82 18,50"
            {...elementProps}
            fill="none"
            stroke="#d97706"
            strokeWidth={3}
          />
          <path
            d="M42,42 L58,58 M58,42 L42,58"
            stroke="#d97706"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "bpmnDataStore":
      return (
        <svg {...commonProps}>
          <ellipse
            cx="50"
            cy="27"
            rx="20"
            ry="7"
            {...elementProps}
            fill="none"
            stroke="#475569"
            strokeWidth={3}
          />
          <path
            d="M30,27 L30,73 A20,7 0 0,0 70,73 L70,27"
            fill="none"
            stroke="#475569"
            strokeWidth={3}
          />
          <path
            d="M30,42 A20,7 0 0,0 70,42 M30,57 A20,7 0 0,0 70,57"
            fill="none"
            stroke="#475569"
            strokeWidth={2}
          />
        </svg>
      );
    case "bpmnDataObject":
      return (
        <svg {...commonProps}>
          <polygon
            points="25,15 63,15 78,30 78,85 25,85"
            {...elementProps}
            fill="none"
            stroke="#475569"
            strokeWidth={3}
          />
          <polygon points="63,15 63,30 78,30" fill="#e2e8f0" stroke="#475569" strokeWidth={2} />
        </svg>
      );
    case "bpmnEventEnd":
      return (
        <svg {...commonProps}>
          <circle
            cx="50"
            cy="50"
            r="30"
            {...elementProps}
            fill="none"
            stroke="#dc2626"
            strokeWidth={5.5}
          />
        </svg>
      );
    default:
      return null;
  }
}
