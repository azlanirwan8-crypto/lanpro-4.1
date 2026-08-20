import React from "react";
import type { FlowNode } from "../../types";

export function renderAzureShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any,
  isBlueprint: boolean,
  isSelected: boolean
): React.ReactNode | null {
  switch (node.type) {
    case "azureUser":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#f0fdf4"}
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
          />
          <circle
            cx="50"
            cy="40"
            r="18"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#50e6ff"}
            strokeWidth="4"
          />
          <path
            d="M22,78 C22,60 34,58 50,58 C66,58 78,60 78,78"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "azureSql":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#eff6ff"}
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
          />
          <ellipse
            cx="50"
            cy="25"
            rx="22"
            ry="7"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
            strokeWidth="4"
          />
          <path
            d="M28,25 L28,70 A22,7 0 0,0 72,70 L72,25"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
            strokeWidth="4"
          />
          <path
            d="M28,40 A22,7 0 0,0 72,40 M28,55 A22,7 0 0,0 72,55"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#50e6ff"}
            strokeWidth="3"
          />
          <text
            x="50"
            y="86"
            fill={isSelected ? "#8b5cf6" : "#0078d4"}
            fontSize="11"
            fontWeight="black"
            fontFamily="monospace"
            textAnchor="middle"
          >
            SQL
          </text>
        </svg>
      );
    case "azureFunctions":
      return (
        <svg {...svgProps}>
          <polygon
            points="50,5 92,27 92,73 50,95 8,73 8,27"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.3)" : "#fffbeb"}
            stroke={isSelected ? "#8b5cf6" : "#f1c40f"}
          />
          <polygon
            points="55,20 28,52 48,52 42,80 72,44 50,44"
            fill={isSelected ? "#c084fc" : "#ff8c00"}
          />
        </svg>
      );
    case "azureKeyVault":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fdf2f8"}
            stroke={isSelected ? "#8b5cf6" : "#ec4899"}
          />
          <circle
            cx="50"
            cy="38"
            r="16"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#ec4899"}
            strokeWidth="4"
          />
          <path d="M44,52 L44,82 L56,82 L56,52 Z" fill={isSelected ? "#8b5cf6" : "#ec4899"} />
          <circle cx="50" cy="38" r="6" fill="#fff" />
        </svg>
      );
    case "azureCosmos":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#f0f9ff"}
            stroke={isSelected ? "#8b5cf6" : "#0ea5e9"}
          />
          <circle cx="50" cy="50" r="12" fill={isSelected ? "#8b5cf6" : "#0ea5e9"} />
          <circle cx="30" cy="30" r="6" fill={isSelected ? "#8b5cf6" : "#10b981"} />
          <circle cx="70" cy="70" r="6" fill={isSelected ? "#8b5cf6" : "#ff7800"} />
          <line
            x1="30"
            y1="30"
            x2="50"
            y2="50"
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
            strokeWidth="3"
          />
          <line
            x1="70"
            y1="70"
            x2="50"
            y2="50"
            stroke={isSelected ? "#8b5cf6" : "#0078d4"}
            strokeWidth="3"
          />
        </svg>
      );
    case "azurePowerBi":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fefce8"}
            stroke={isSelected ? "#8b5cf6" : "#eab308"}
          />
          <rect
            x="20"
            y="55"
            width="12"
            height="25"
            rx="2"
            fill={isSelected ? "#8b5cf6" : "#eab308"}
          />
          <rect
            x="38"
            y="35"
            width="12"
            height="45"
            rx="2"
            fill={isSelected ? "#8b5cf6" : "#ca8a04"}
          />
          <rect
            x="56"
            y="20"
            width="12"
            height="60"
            rx="2"
            fill={isSelected ? "#c084fc" : "#854d0e"}
          />
        </svg>
      );
    case "azureVm":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#eff6ff"}
            stroke={isSelected ? "#8b5cf6" : "#2563eb"}
          />
          <polygon
            points="50,15 80,30 80,65 50,80 20,65 20,30"
            fill="none"
            stroke={isSelected ? "#805cf6" : "#3b82f6"}
            strokeWidth="3"
          />
          <line
            x1="50"
            y1="15"
            x2="50"
            y2="80"
            stroke={isSelected ? "#805cf6" : "#3b82f6"}
            strokeWidth="2.5"
          />
          <line
            x1="50"
            y1="50"
            x2="80"
            y2="30"
            stroke={isSelected ? "#805cf6" : "#3b82f6"}
            strokeWidth="2"
          />
          <line
            x1="50"
            y1="50"
            x2="20"
            y2="30"
            stroke={isSelected ? "#805cf6" : "#3b82f6"}
            strokeWidth="2"
          />
        </svg>
      );
    case "azureStorage":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#f0fdfa"}
            stroke={isSelected ? "#8b5cf6" : "#0d9488"}
          />
          <rect
            x="25"
            y="25"
            width="40"
            height="40"
            rx="4"
            fill="none"
            stroke={isSelected ? "#815cf6" : "#0d9488"}
            strokeWidth="3"
          />
          <line
            x1="25"
            y1="45"
            x2="65"
            y2="45"
            stroke={isSelected ? "#815cf6" : "#0d9488"}
            strokeWidth="2"
          />
          <circle cx="35" cy="35" r="3" fill={isSelected ? "#815cf6" : "#2dd4bf"} />
          <circle cx="55" cy="35" r="3" fill={isSelected ? "#815cf6" : "#2dd4bf"} />
        </svg>
      );
    default:
      return null;
  }
}

export function renderAzurePreviewIcon(type: string, commonProps: any, elementProps: any): React.ReactNode | null {
  switch (type) {
    case "azureUser":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(0, 120, 212, 0.05)"
            stroke="#0078d4"
            strokeWidth={3}
          />
          <circle cx="50" cy="42" r="11" fill="none" stroke="#0078d4" strokeWidth={3} />
          <path
            d="M32,68 C32,56 40,54 50,54 C60,54 68,56 68,68"
            fill="none"
            stroke="#0078d4"
            strokeWidth={3}
          />
        </svg>
      );
    case "azureSql":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(0, 120, 212, 0.05)"
            stroke="#0078d4"
            strokeWidth={3}
          />
          <ellipse
            cx="50"
            cy="34"
            rx="14"
            ry="4.5"
            fill="none"
            stroke="#0078d4"
            strokeWidth={2.5}
          />
          <path
            d="M36,34 L36,60 A14,4.5 0 0,0 64,60 L64,34"
            fill="none"
            stroke="#0078d4"
            strokeWidth={2.5}
          />
          <path
            d="M36,44 A14,4.5 0 0,0 64,44 M36,52 A14,4.5 0 0,0 64,52"
            fill="none"
            stroke="#0078d4"
            strokeWidth={1.5}
          />
        </svg>
      );
    case "azureFunctions":
      return (
        <svg {...commonProps}>
          <polygon
            points="50,15 85,35 85,65 50,85 15,65 15,35"
            {...elementProps}
            fill="rgba(241, 196, 15, 0.05)"
            stroke="#f1c40f"
          />
          <polygon points="54,28 32,52 48,52 44,72 66,46 50,46" fill="#ff8c00" />
        </svg>
      );
    case "azureKeyVault":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(236, 72, 153, 0.05)"
            stroke="#ec4899"
            strokeWidth={3}
          />
          <circle cx="50" cy="42" r="10" fill="none" stroke="#ec4899" strokeWidth={3} />
          <rect x="46" y="52" width="8" height="18" fill="#ec4899" />
        </svg>
      );
    case "azureCosmos":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(14, 165, 233, 0.05)"
            stroke="#0ea5e9"
            strokeWidth={3}
          />
          <circle cx="50" cy="50" r="8" fill="#0ea5e9" />
          <circle cx="36" cy="36" r="4.5" fill="#10b981" />
          <circle cx="64" cy="64" r="4.5" fill="#ff7800" />
          <line x1="36" y1="36" x2="50" y2="50" stroke="#0078d4" strokeWidth={2} />
          <line x1="64" y1="64" x2="50" y2="50" stroke="#0078d4" strokeWidth={2} />
        </svg>
      );
    case "azurePowerBi":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(234, 179, 8, 0.05)"
            stroke="#eab308"
            strokeWidth={3}
          />
          <rect x="30" y="52" width="7" height="16" rx="1.5" fill="#eab308" />
          <rect x="42" y="38" width="7" height="30" rx="1.5" fill="#ca8a04" />
          <rect x="54" y="28" width="7" height="40" rx="1.5" fill="#854d0e" />
        </svg>
      );
    case "azureVm":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(37, 99, 235, 0.05)"
            stroke="#2563eb"
            strokeWidth={3}
          />
          <polygon
            points="50,27 71,37 71,63 50,73 29,63 29,37"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <line x1="50" y1="27" x2="50" y2="73" stroke="#3b82f6" strokeWidth="2" />
          <line x1="50" y1="50" x2="71" y2="37" stroke="#3b82f6" strokeWidth="1.5" />
          <line x1="50" y1="50" x2="29" y2="37" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      );
    case "azureStorage":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(13, 148, 136, 0.05)"
            stroke="#0d9488"
            strokeWidth={3}
          />
          <rect
            x="33"
            y="33"
            width="34"
            height="34"
            rx="2"
            fill="none"
            stroke="#0d9488"
            strokeWidth={2.5}
          />
          <line x1="33" y1="50" x2="67" y2="50" stroke="#0d9488" strokeWidth={2} />
          <circle cx="41" cy="41" r="2" fill="#2dd4bf" />
          <circle cx="59" cy="41" r="2" fill="#2dd4bf" />
        </svg>
      );
    default:
      return null;
  }
}
