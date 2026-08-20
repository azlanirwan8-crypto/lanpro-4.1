/**
 * Render bentuk SVG kustom untuk kanvas Flowchart.
 *
 * Lapisan presentasi murni: menerima data node, mengembalikan markup. Tidak
 * memegang state, tidak memanggil API.
 * Dipecah secara modular per domain bentuk (Item #7 — Pemecahan Berkas Raksasa).
 */

import React from "react";
import type { FlowNode } from "../types";
import { colorPaletteHex } from "../constants";
import { renderBasicShape, renderBasicPreviewIcon } from "./shapes/basicShapes";
import { renderAwsShape, renderAwsPreviewIcon } from "./shapes/awsShapes";
import { renderUmlShape, renderUmlPreviewIcon } from "./shapes/umlShapes";
import { renderProcessShape, renderProcessPreviewIcon } from "./shapes/processShapes";
import { renderAzureShape, renderAzurePreviewIcon } from "./shapes/azureShapes";
import { renderBpmnShape, renderBpmnPreviewIcon } from "./shapes/bpmnShapes";

export const customSvgTypes = [
  "circle",
  "oval",
  "triangle",
  "callout",
  "star",
  "arrowRight",
  "arrowLeft",
  "arrowLeftRight",
  "pentagon",
  "octagon",
  "hexagon",
  "trapezoid",
  "cross",
  "curlyLeft",
  "curlyRight",
  "chevron",
  "delay",
  "awsLambda",
  "awsEc2",
  "awsS3",
  "awsVpc",
  "awsRds",
  "awsCloudwatch",
  "awsDynamo",
  "umlClass",
  "umlInterface",
  "umlUseCase",
  "umlBoundary",
  "umlControl",
  "umlEntity",
  "umlNote",
  "multiDocument",
  "manualInput",
  "manualOperation",
  "preparation",
  "display",
  "summingJunction",
  "collate",
  "connectorOr",
  "sort",
  "merge",
  "azureUser",
  "azureSql",
  "azureFunctions",
  "azureKeyVault",
  "azureCosmos",
  "azurePowerBi",
  "azureVm",
  "azureStorage",
  "bpmnActivity",
  "bpmnEvent",
  "bpmnGateway",
  "bpmnDataStore",
  "bpmnDataObject",
  "bpmnEventEnd",
];

export function renderCustomSvgShape(
  node: FlowNode,
  canvasTheme: "miro" | "blueprint",
  isSelected: boolean,
  isHovered: boolean = false,
  isDragging: boolean = false,
  isSourceOfConnect: boolean = false
) {
  const isBlueprint = canvasTheme === "blueprint";

  // Fallback or exact styling based on blueprint context
  const fillCol = isBlueprint
    ? "rgba(30, 58, 138, 0.4)" // translucent dark blue
    : `url(#grad-${node.color || "indigo"})`;

  const strokeCol = isSelected
    ? "#8b5cf6"
    : isSourceOfConnect
      ? "#f43f5e"
      : isBlueprint
        ? "#60a5fa"
        : colorPaletteHex[node.color]?.stroke || "#6366f1";

  const strokeDash = node.borderStyle === "dashed" ? "5,5" : "none";
  const strokeWidth = node.borderStyle === "none" ? "0" : "2";

  // Compute modern layered drop shadows for maximum softness and 3D feel
  const shadowFilter = isBlueprint
    ? "none"
    : isDragging
      ? "drop-shadow(0 20px 25px rgba(0,0,0,0.18)) drop-shadow(0 10px 10px rgba(0,0,0,0.12))"
      : isSourceOfConnect
        ? "drop-shadow(0 12px 20px rgba(244, 63, 94, 0.45))"
        : isSelected
          ? "drop-shadow(0 12px 20px rgba(139, 92, 246, 0.3))"
          : isHovered
            ? "drop-shadow(0 10px 15px rgba(0,0,0,0.12))"
            : "drop-shadow(0 3px 6px rgba(0,0,0,0.06))";

  // Common props
  const svgProps = {
    className:
      "w-full h-full absolute inset-0 pointer-events-none transition-colors duration-200 overflow-visible",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none" as const,
    style: { filter: shadowFilter, transition: "filter 0.2s ease-in-out" },
  };

  const elementProps = {
    fill: fillCol,
    stroke: strokeCol,
    strokeWidth: parseFloat(strokeWidth),
    strokeDasharray: strokeDash === "none" ? undefined : strokeDash,
    vectorEffect: "non-scaling-stroke",
    strokeLinejoin: "round" as const,
    className: "transition-colors duration-300",
  };

  return (
    renderBasicShape(node, svgProps, elementProps, strokeCol) ||
    renderAwsShape(node, svgProps, elementProps, isBlueprint, isSelected) ||
    renderUmlShape(node, svgProps, elementProps, isBlueprint, isSelected) ||
    renderProcessShape(node, svgProps, elementProps, isSelected) ||
    renderAzureShape(node, svgProps, elementProps, isBlueprint, isSelected) ||
    renderBpmnShape(node, svgProps, elementProps, isBlueprint, isSelected) ||
    null
  );
}

export function renderMiniPreviewIcon(type: string) {
  const commonProps = {
    className:
      "w-8 h-8 text-indigo-500 fill-indigo-50 stroke-indigo-400 transition-colors duration-150",
    viewBox: "0 0 100 100",
  };
  const elementProps = {
    fill: "rgba(99, 102, 241, 0.08)",
    stroke: "currentColor",
    strokeWidth: 3,
    vectorEffect: "non-scaling-stroke",
  };

  return (
    renderBasicPreviewIcon(type, commonProps, elementProps) ||
    renderAwsPreviewIcon(type, commonProps, elementProps) ||
    renderUmlPreviewIcon(type, commonProps, elementProps) ||
    renderProcessPreviewIcon(type, commonProps, elementProps) ||
    renderAzurePreviewIcon(type, commonProps, elementProps) ||
    renderBpmnPreviewIcon(type, commonProps, elementProps) || (
      <div className="w-5 h-5 bg-indigo-500 rounded-sm" />
    )
  );
}
