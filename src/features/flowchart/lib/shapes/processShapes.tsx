import React from "react";
import type { FlowNode } from "../../types";

export function renderProcessShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any,
  isSelected: boolean
): React.ReactNode | null {
  switch (node.type) {
    case "multiDocument":
      return (
        <svg {...svgProps}>
          <path
            d="M15,10 L75,10 L75,60 Q60,50 45,60 Q30,70 15,60 Z"
            {...elementProps}
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "currentColor"}
          />
          <path
            d="M10,15 L70,15 L70,68 Q55,58 40,68 Q25,78 10,68 Z"
            {...elementProps}
            fill="none"
            stroke={isSelected ? "#8b5cf6" : "currentColor"}
          />
          <path d="M5,20 L65,20 L65,75 Q50,65 35,75 Q20,85 5,75 Z" {...elementProps} />
        </svg>
      );
    case "manualInput":
      return (
        <svg {...svgProps}>
          <polygon points="5,25 95,5 95,95 5,95" {...elementProps} />
        </svg>
      );
    case "manualOperation":
      return (
        <svg {...svgProps}>
          <polygon points="5,5 95,5 80,95 20,95" {...elementProps} />
        </svg>
      );
    case "preparation":
      return (
        <svg {...svgProps}>
          <polygon points="20,5 80,5 95,50 80,95 20,95 5,50" {...elementProps} />
        </svg>
      );
    case "display":
      return (
        <svg {...svgProps}>
          <path
            d="M5,50 L25,5 L70,5 C85,5 95,25 95,50 C95,75 85,95 70,95 L25,95 Z"
            {...elementProps}
          />
        </svg>
      );
    case "summingJunction":
      return (
        <svg {...svgProps}>
          <circle cx="50" cy="50" r="42" {...elementProps} />
          <line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="4" />
          <line x1="80" y1="20" x2="20" y2="80" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case "collate":
      return (
        <svg {...svgProps}>
          <polygon points="5,5 95,5 5,95 95,95" {...elementProps} />
        </svg>
      );
    case "connectorOr":
      return (
        <svg {...svgProps}>
          <circle cx="50" cy="50" r="42" {...elementProps} />
          <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" strokeWidth="4" />
          <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case "sort":
      return (
        <svg {...svgProps}>
          <polygon points="50,5 95,50 50,95 5,50" {...elementProps} />
          <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case "merge":
      return (
        <svg {...svgProps}>
          <polygon points="5,5 95,5 50,95" {...elementProps} />
        </svg>
      );
    default:
      return null;
  }
}

export function renderProcessPreviewIcon(type: string, commonProps: any, elementProps: any): React.ReactNode | null {
  switch (type) {
    case "multiDocument":
      return (
        <svg {...commonProps}>
          <path
            d="M22,15 L78,15 L78,65 Q62,55 46,65 Q30,75 22,65 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          />
          <path d="M14,23 L70,23 L70,73 Q54,63 38,73 Q22,83 14,73 Z" {...elementProps} />
        </svg>
      );
    case "manualInput":
      return (
        <svg {...commonProps}>
          <polygon points="15,40 85,20 85,80 15,80" {...elementProps} />
        </svg>
      );
    case "manualOperation":
      return (
        <svg {...commonProps}>
          <polygon points="15,20 85,20 73,80 27,80" {...elementProps} />
        </svg>
      );
    case "preparation":
      return (
        <svg {...commonProps}>
          <polygon points="25,20 75,20 88,50 75,80 25,80 12,50" {...elementProps} />
        </svg>
      );
    case "display":
      return (
        <svg {...commonProps}>
          <path
            d="M15,50 L30,20 L75,20 C85,20 88,35 88,50 C88,65 85,80 75,80 L30,80 Z"
            {...elementProps}
          />
        </svg>
      );
    case "summingJunction":
      return (
        <svg {...commonProps}>
          <circle cx="50" cy="50" r="32" {...elementProps} />
          <line x1="27" y1="27" x2="73" y2="73" stroke="currentColor" strokeWidth={3.5} />
          <line x1="73" y1="27" x2="27" y2="73" stroke="currentColor" strokeWidth={3.5} />
        </svg>
      );
    case "collate":
      return (
        <svg {...commonProps}>
          <polygon points="15,20 85,20 15,80 85,80" {...elementProps} />
        </svg>
      );
    case "connectorOr":
      return (
        <svg {...commonProps}>
          <circle cx="50" cy="50" r="32" {...elementProps} />
          <line x1="50" y1="18" x2="50" y2="82" stroke="currentColor" strokeWidth={3.5} />
          <line x1="18" y1="50" x2="82" y2="50" stroke="currentColor" strokeWidth={3.5} />
        </svg>
      );
    case "sort":
      return (
        <svg {...commonProps}>
          <polygon points="50,15 85,50 50,85 15,50" {...elementProps} />
          <line x1="15" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth={3.5} />
        </svg>
      );
    case "merge":
      return (
        <svg {...commonProps}>
          <polygon points="15,20 85,20 50,80" {...elementProps} />
        </svg>
      );
    default:
      return null;
  }
}
