import React from "react";
import type { FlowNode } from "../../types";

export function renderBasicShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any,
  strokeCol: string
): React.ReactNode | null {
  switch (node.type) {
    case "circle":
      return (
        <svg {...svgProps}>
          <circle cx="50" cy="50" r="46" {...elementProps} />
        </svg>
      );
    case "oval":
      return (
        <svg {...svgProps}>
          <rect x="4" y="4" width="92" height="92" rx="46" ry="46" {...elementProps} />
        </svg>
      );
    case "decision":
    case "diamond":
      return (
        <svg {...svgProps}>
          <polygon points="50,0 100,50 50,100 0,50" {...elementProps} />
        </svg>
      );
    case "pentagon":
      return (
        <svg {...svgProps}>
          <polygon points="50,0 100,38 81,100 19,100 0,38" {...elementProps} />
        </svg>
      );
    case "triangle":
      return (
        <svg {...svgProps}>
          <polygon points="50,0 100,100 0,100" {...elementProps} />
        </svg>
      );
    case "hexagon":
      return (
        <svg {...svgProps}>
          <polygon points="25,0 75,0 100,50 75,100 25,100 0,50" {...elementProps} />
        </svg>
      );
    case "octagon":
      return (
        <svg {...svgProps}>
          <polygon points="30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30" {...elementProps} />
        </svg>
      );
    case "star":
      return (
        <svg {...svgProps}>
          <polygon
            points="50,0 63,35 100,35 70,55 79,100 50,70 21,100 30,55 0,35 37,35"
            {...elementProps}
          />
        </svg>
      );
    case "arrowRight":
      return (
        <svg {...svgProps}>
          <polygon points="0,30 65,30 65,0 100,50 65,100 65,70 0,70" {...elementProps} />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg {...svgProps}>
          <polygon points="100,30 35,30 35,0 0,50 35,100 35,70 100,70" {...elementProps} />
        </svg>
      );
    case "arrowLeftRight":
      return (
        <svg {...svgProps}>
          <polygon
            points="0,50 25,25 25,40 75,40 75,25 100,50 75,75 75,60 25,60 25,75"
            {...elementProps}
          />
        </svg>
      );
    case "trapezoid":
      return (
        <svg {...svgProps}>
          <polygon points="20,0 80,0 100,100 0,100" {...elementProps} />
        </svg>
      );
    case "cross":
      return (
        <svg {...svgProps}>
          <polygon
            points="35,0 65,0 65,35 100,35 100,65 65,65 65,100 35,100 35,65 0,65 0,35 35,35"
            {...elementProps}
          />
        </svg>
      );
    case "curlyLeft":
      return (
        <svg {...svgProps}>
          <path
            d="M70,5 Q50,5 50,25 Q50,45 20,50 Q50,55 50,75 Q50,95 70,95"
            fill="none"
            stroke={strokeCol}
            strokeWidth={elementProps.strokeWidth}
            strokeDasharray={elementProps.strokeDasharray}
          />
        </svg>
      );
    case "curlyRight":
      return (
        <svg {...svgProps}>
          <path
            d="M30,5 Q50,5 50,25 Q50,45 80,50 Q50,55 50,75 Q50,95 30,95"
            fill="none"
            stroke={strokeCol}
            strokeWidth={elementProps.strokeWidth}
            strokeDasharray={elementProps.strokeDasharray}
          />
        </svg>
      );
    case "chevron":
      return (
        <svg {...svgProps}>
          <polygon points="5,5 75,5 95,50 75,95 5,95 25,50" {...elementProps} />
        </svg>
      );
    case "delay":
      return (
        <svg {...svgProps}>
          <path d="M5,5 L60,5 A45,45 0 0,1 60,95 L5,95 Z" {...elementProps} />
        </svg>
      );
    case "callout":
      return (
        <svg {...svgProps}>
          <path d="M5,5 L95,5 L95,75 L65,75 L50,95 L45,75 L5,75 Z" {...elementProps} />
        </svg>
      );
    default:
      return null;
  }
}

export function renderBasicPreviewIcon(type: string, commonProps: any, elementProps: any): React.ReactNode | null {
  switch (type) {
    case "rect":
      return (
        <svg {...commonProps}>
          <rect x="15" y="25" width="70" height="50" rx="6" {...elementProps} />
        </svg>
      );
    case "actor":
      return (
        <svg
          className="w-8 h-8 text-indigo-500 transition-colors duration-150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "oval":
      return (
        <svg {...commonProps}>
          <rect x="10" y="30" width="80" height="40" rx="20" {...elementProps} />
        </svg>
      );
    case "circle":
      return (
        <svg {...commonProps}>
          <circle cx="50" cy="50" r="32" {...elementProps} />
        </svg>
      );
    case "triangle":
      return (
        <svg {...commonProps}>
          <polygon points="50,15 85,80 15,80" {...elementProps} />
        </svg>
      );
    case "pentagon":
      return (
        <svg {...commonProps}>
          <polygon points="50,15 85,42 71,85 29,85 15,42" {...elementProps} />
        </svg>
      );
    case "hexagon":
      return (
        <svg {...commonProps}>
          <polygon points="28,20 72,20 88,50 72,80 28,80 12,50" {...elementProps} />
        </svg>
      );
    case "octagon":
      return (
        <svg {...commonProps}>
          <polygon points="32,15 68,15 85,32 85,68 68,85 32,85 15,68 15,32" {...elementProps} />
        </svg>
      );
    case "star":
      return (
        <svg {...commonProps}>
          <polygon
            points="50,15 61,39 88,39 66,55 74,81 50,65 26,81 34,55 12,39 39,39"
            {...elementProps}
          />
        </svg>
      );
    case "arrowRight":
      return (
        <svg {...commonProps}>
          <polygon points="15,35 60,35 60,20 85,50 60,80 60,65 15,65" {...elementProps} />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg {...commonProps}>
          <polygon points="85,35 40,35 40,20 15,50 40,80 40,65 85,65" {...elementProps} />
        </svg>
      );
    case "arrowLeftRight":
      return (
        <svg {...commonProps}>
          <polygon
            points="15,50 32,32 32,41 68,41 68,32 85,50 68,68 68,59 32,59 32,68"
            {...elementProps}
          />
        </svg>
      );
    case "trapezoid":
      return (
        <svg {...commonProps}>
          <polygon points="25,20 75,20 88,80 12,80" {...elementProps} />
        </svg>
      );
    case "cross":
      return (
        <svg {...commonProps}>
          <polygon
            points="38,15 62,15 62,38 85,38 85,62 62,62 62,85 38,85 38,62 15,62 15,38 38,38"
            {...elementProps}
          />
        </svg>
      );
    case "curlyLeft":
      return (
        <svg {...commonProps}>
          <path
            d="M75,15 Q55,15 55,35 Q55,48 25,50 Q55,52 55,65 Q55,85 75,85"
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
          />
        </svg>
      );
    case "curlyRight":
      return (
        <svg {...commonProps}>
          <path
            d="M25,15 Q45,15 45,35 Q45,48 75,50 Q45,52 45,65 Q45,85 25,85"
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
          />
        </svg>
      );
    case "chevron":
      return (
        <svg {...commonProps}>
          <polygon points="15,20 70,20 88,50 70,80 15,80 32,50" {...elementProps} />
        </svg>
      );
    case "delay":
      return (
        <svg {...commonProps}>
          <path d="M15,20 L60,20 A30,30 0 0,1 60,80 L15,80 Z" {...elementProps} />
        </svg>
      );
    case "callout":
      return (
        <svg {...commonProps}>
          <path d="M15,15 L85,15 L85,65 L55,65 L40,82 L38,65 L15,65 Z" {...elementProps} />
        </svg>
      );
    case "diamond":
    case "decision":
      return (
        <svg {...commonProps}>
          <polygon points="50,15 85,50 50,85 15,50" {...elementProps} />
        </svg>
      );
    case "database":
    case "cylinder":
      return (
        <svg {...commonProps}>
          <ellipse cx="50" cy="27" rx="28" ry="10" {...elementProps} />
          <path
            d="M22,27 L22,70 A28,10 0 0,0 78,70 L78,27"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
          />
          <path
            d="M22,48 A28,10 0 0,0 78,48"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          />
        </svg>
      );
    default:
      return null;
  }
}
