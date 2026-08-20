import React from "react";
import type { FlowNode } from "../../types";

export function renderAwsShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any,
  isBlueprint: boolean,
  isSelected: boolean
): React.ReactNode | null {
  switch (node.type) {
    case "awsLambda":
      return (
        <svg {...svgProps}>
          <polygon
            points="50,5 92,27 92,73 50,95 8,73 8,27"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fff7ed"}
            stroke={isSelected ? "#8b5cf6" : "#f97316"}
          />
          <path
            d="M38,72 L48,48 L41,28 M48,48 L56,28 M48,48 L56,72"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#f97316"}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "awsEc2":
      return (
        <svg {...svgProps}>
          <rect
            x="18"
            y="18"
            width="64"
            height="64"
            rx="8"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fff7ed"}
            stroke={isSelected ? "#8b5cf6" : "#f97316"}
          />
          <path
            d="M35,35 L65,35 M35,50 L65,50 M35,65 L65,65"
            stroke={isSelected ? "#8b5cf6" : "#f97316"}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="28" cy="35" r="2.5" fill={isSelected ? "#8b5cf6" : "#f97316"} />
          <circle cx="28" cy="50" r="2.5" fill={isSelected ? "#8b5cf6" : "#f97316"} />
          <circle cx="28" cy="65" r="2.5" fill={isSelected ? "#8b5cf6" : "#f97316"} />
        </svg>
      );
    case "awsS3":
      return (
        <svg {...svgProps}>
          <ellipse
            cx="50"
            cy="20"
            rx="25"
            ry="10"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#ecfdf5"}
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
          />
          <path
            d="M25,20 L25,65 A25,10 0 0,0 75,65 L75,20"
            {...elementProps}
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
          />
          <path
            d="M25,35 A25,5 0 0,0 75,35 M25,50 A25,5 0 0,0 75,50"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
            strokeWidth="1.5"
          />
          <line
            x1="50"
            y1="30"
            x2="50"
            y2="70"
            stroke={isSelected ? "#8b5cf6" : "#10b981"}
            strokeWidth="2.5"
            strokeDasharray="3,3"
          />
        </svg>
      );
    case "awsVpc":
      return (
        <svg {...svgProps}>
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="12"
            fill={isBlueprint ? "rgba(30, 58, 138, 0.2)" : "#f0f9ff"}
            stroke={isSelected ? "#8b5cf6" : "#0ea5e9"}
            strokeWidth="2.5"
            strokeDasharray="6,4"
          />
          <path
            d="M12,12 L42,12 L42,32 L12,32 Z"
            fill={isSelected ? "#8b5cf6" : "#0ea5e9"}
            opacity="0.15"
          />
          <text
            x="16"
            y="25"
            fill={isSelected ? "#8b5cf6" : "#0ea5e9"}
            fontSize="10"
            fontWeight="black"
            fontFamily="monospace"
          >
            VPC
          </text>
        </svg>
      );
    case "awsRds":
      return (
        <svg {...svgProps}>
          <ellipse
            cx="50"
            cy="18"
            rx="20"
            ry="8"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#eff6ff"}
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
          />
          <path
            d="M30,18 L30,50 A20,8 0 0,0 70,50 L70,18"
            {...elementProps}
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
          />
          <path
            d="M30,32 A20,6 0 0,0 70,32"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#3b82f6"}
            strokeWidth="2"
          />
          <ellipse
            cx="54"
            cy="58"
            rx="18"
            ry="7"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.3)" : "#e0f2fe"}
            stroke={isSelected ? "#8b5cf6" : "#0284c7"}
          />
          <path
            d="M36,58 L36,88 A18,7 0 0,0 72,88 L72,58"
            {...elementProps}
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#0284c7"}
          />
          <path
            d="M36,72 A18,5 0 0,0 72,72"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#0284c7"}
            strokeWidth="1.5"
          />
          <path
            d="M42,62 Q45,64 50,55"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="2,2"
          />
        </svg>
      );
    case "awsCloudwatch":
      return (
        <svg {...svgProps}>
          <circle
            cx="50"
            cy="50"
            r="42"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#fff1f2"}
            stroke={isSelected ? "#8b5cf6" : "#f43f5e"}
          />
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "#f43f5e"}
            strokeWidth="1.5"
            strokeDasharray="4,3"
          />
          <polygon points="50,22 55,48 45,48" fill={isSelected ? "#8b5cf6" : "#f43f5e"} />
          <circle cx="50" cy="50" r="6" fill={isSelected ? "#c084fc" : "#ec4899"} />
        </svg>
      );
    case "awsDynamo":
      return (
        <svg {...svgProps}>
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="8"
            {...elementProps}
            fill={isBlueprint ? "rgba(30, 58, 138, 0.4)" : "#f5f3ff"}
            stroke={isSelected ? "#8b5cf6" : "#a855f7"}
          />
          <path
            d="M30,30 L70,30 M30,50 L70,50 M30,70 L70,70"
            stroke={isSelected ? "#8b5cf6" : "#a855f7"}
            strokeWidth="3"
          />
          <path
            d="M50,15 L50,85"
            stroke={isSelected ? "#8b5cf6" : "#a855f7"}
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function renderAwsPreviewIcon(type: string, commonProps: any, elementProps: any): React.ReactNode | null {
  switch (type) {
    case "awsLambda":
      return (
        <svg {...commonProps}>
          <polygon
            points="50,15 85,35 85,65 50,85 15,65 15,35"
            {...elementProps}
            fill="rgba(249, 115, 22, 0.08)"
            stroke="#f97316"
          />
          <path
            d="M42,65 Q48,50 48,35 M48,45 L58,35 M48,45 L58,65"
            fill="none"
            stroke="#f97316"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </svg>
      );
    case "awsEc2":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(249, 115, 22, 0.08)"
            stroke="#f97316"
          />
          <line x1="35" y1="38" x2="65" y2="38" stroke="#f97316" strokeWidth={4} />
          <line x1="35" y1="50" x2="65" y2="50" stroke="#f97316" strokeWidth={4} />
          <line x1="35" y1="62" x2="65" y2="62" stroke="#f97316" strokeWidth={4} />
        </svg>
      );
    case "awsS3":
      return (
        <svg {...commonProps}>
          <ellipse
            cx="50"
            cy="27"
            rx="22"
            ry="7"
            {...elementProps}
            fill="rgba(16, 185, 129, 0.08)"
            stroke="#10b981"
          />
          <path
            d="M28,27 L28,68 A22,7 0 0,0 72,68 L72,27"
            fill="none"
            stroke="#10b981"
            strokeWidth={4}
          />
          <path
            d="M28,45 A22,4 0 0,0 72,45"
            fill="none"
            stroke="#10b981"
            strokeWidth={3}
            strokeDasharray="2,2"
          />
        </svg>
      );
    case "awsVpc":
      return (
        <svg {...commonProps}>
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="8"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={4}
            strokeDasharray="4,3"
          />
          <rect
            x="25"
            y="25"
            width="30"
            height="20"
            rx="2"
            fill="rgba(14, 165, 233, 0.1)"
            stroke="#0ea5e9"
            strokeWidth={2}
          />
        </svg>
      );
    case "awsRds":
      return (
        <svg {...commonProps}>
          <ellipse
            cx="42"
            cy="25"
            rx="15"
            ry="5"
            {...elementProps}
            fill="rgba(59, 130, 246, 0.08)"
            stroke="#3b82f6"
          />
          <path
            d="M27,25 L27,50 A15,5 0 0,0 57,50 L57,25"
            fill="none"
            stroke="#3b82f6"
            strokeWidth={3}
          />
          <ellipse
            cx="58"
            cy="62"
            rx="15"
            ry="5"
            {...elementProps}
            fill="rgba(59, 130, 246, 0.08)"
            stroke="#0ea5e9"
          />
          <path
            d="M43,62 L43,82 A15,5 0 0,0 73,82 L73,62"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={2.5}
          />
        </svg>
      );
    case "awsCloudwatch":
      return (
        <svg {...commonProps}>
          <circle
            cx="50"
            cy="50"
            r="32"
            {...elementProps}
            fill="rgba(244, 63, 94, 0.08)"
            stroke="#f43f5e"
          />
          <circle
            cx="50"
            cy="50"
            r="20"
            fill="none"
            stroke="#f43f5e"
            strokeWidth={2}
            strokeDasharray="3,2"
          />
          <circle cx="50" cy="50" r="5" fill="#f43f5e" />
        </svg>
      );
    case "awsDynamo":
      return (
        <svg {...commonProps}>
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="6"
            {...elementProps}
            fill="rgba(168, 85, 247, 0.08)"
            stroke="#a855f7"
          />
          <path
            d="M32,32 L68,32 M32,50 L68,50 M32,68 L68,68"
            stroke="#a855f7"
            strokeWidth={3}
          />
          <line
            x1="50"
            y1="20"
            x2="50"
            y2="80"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="2,2"
          />
        </svg>
      );
    default:
      return null;
  }
}
