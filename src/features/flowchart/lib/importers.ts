import i18n from "../../../i18n";
import type { FlowNode, FlowEdge } from "../types";

/** Hasil parse yang sama bentuknya untuk semua format asal. */
export interface ParsedDiagram {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * Mengubah entitas HTML (`&amp;`, `&lt;`, …) menjadi karakter aslinya.
 *
 * #348 — jangan pakai `textarea.innerHTML = userText` (XSS jika string
 * mengandung markup). Decoder berbasis ganti string untuk entitas umum +
 * numerik; cukup untuk label Draw.io/Miro yang ter-encode.
 */
export const decodeHtmlEntity = (htmlText: string): string => {
  if (!htmlText) return htmlText;
  return String(htmlText)
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
};

/**
 * Menghitung bounding box dan menggeser seluruh node agar berada di tengah / awal kanvas yang nyaman.
 */
export const autoCenterAndNormalizeDiagram = (
  diagram: ParsedDiagram,
  targetStartX = 180,
  targetStartY = 140
): ParsedDiagram => {
  if (!diagram.nodes || diagram.nodes.length === 0) {
    return diagram;
  }

  let minX = Infinity;
  let minY = Infinity;

  diagram.nodes.forEach((node) => {
    if (typeof node.x === "number" && node.x < minX) minX = node.x;
    if (typeof node.y === "number" && node.y < minY) minY = node.y;
  });

  if (minX === Infinity || minY === Infinity) {
    return diagram;
  }

  const shiftX = targetStartX - minX;
  const shiftY = targetStartY - minY;

  const normalizedNodes = diagram.nodes.map((node) => ({
    ...node,
    x: Math.round(node.x + shiftX),
    y: Math.round(node.y + shiftY),
  }));

  return {
    nodes: normalizedNodes,
    edges: diagram.edges || [],
  };
};

/** Membaca berkas .drawio/.xml dan memetakan tiap <mxCell> ke node atau edge. */
export const parseDrawIoXML = (xmlText: string): ParsedDiagram => {
  const parser = new DOMParser();
  let cleanXml = xmlText.trim();

  // Handle jika ada tag wrapper atau markdown code block
  if (cleanXml.startsWith("```")) {
    cleanXml = cleanXml
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
  }

  const xmlDoc = parser.parseFromString(cleanXml, "text/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error(i18n.t("flowchart.xmlInvalid") || "Format XML Draw.io tidak valid.");
  }

  const cells = xmlDoc.getElementsByTagName("mxCell");
  if (cells.length === 0) {
    throw new Error("Tidak ditemukan elemen diagram <mxCell> di dalam Draw.io XML.");
  }

  const extractedNodes: FlowNode[] = [];
  const extractedEdges: FlowEdge[] = [];
  const nodeIdsSet = new Set<string>();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const id = cell.getAttribute("id");
    const vertex = cell.getAttribute("vertex");
    const edge = cell.getAttribute("edge");
    const valueAttr = cell.getAttribute("value") || "";

    if (!id || id === "0" || id === "1") continue;

    if (vertex === "1") {
      const geometry = cell.getElementsByTagName("mxGeometry")[0];
      let x = Math.floor(Math.random() * 150 + 100);
      let y = Math.floor(Math.random() * 150 + 100);
      let width = 130;
      let height = 80;

      if (geometry) {
        x = parseFloat(geometry.getAttribute("x") || `${x}`);
        y = parseFloat(geometry.getAttribute("y") || `${y}`);
        width = parseFloat(geometry.getAttribute("width") || "130");
        height = parseFloat(geometry.getAttribute("height") || "80");
      }

      let decodedLabel = decodeHtmlEntity(valueAttr)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .trim();

      if (!decodedLabel) {
        decodedLabel = "Komponen Alur";
      }

      const style = (cell.getAttribute("style") || "").toLowerCase();
      let type: FlowNode["type"] = "rect";
      let color = "indigo";

      if (style.includes("ellipse") || style.includes("oval") || style.includes("circle")) {
        type = "oval";
        color = "emerald";
      } else if (style.includes("rhombus") || style.includes("diamond")) {
        type = "diamond";
        color = "orange";
      } else if (style.includes("cylinder") || style.includes("db") || style.includes("database")) {
        type = "cylinder";
        color = "sky";
      } else if (style.includes("cloud")) {
        type = "cloud";
        color = "slate";
      } else if (style.includes("parallelogram")) {
        type = "parallelogram";
        color = "yellow";
      } else if (style.includes("document")) {
        type = "document";
        color = "blue";
      } else if (style.includes("actor")) {
        type = "actor";
        color = "purple";
      } else if (style.includes("lambda")) {
        type = "awsLambda";
        color = "orange";
      } else if (style.includes("class")) {
        type = "umlClass";
        color = "slate";
      } else if (style.includes("sticky") || style.includes("note")) {
        type = "sticky";
        color = "yellow";
      }

      extractedNodes.push({
        id: `drawio-${id}`,
        type,
        x,
        y,
        label: decodedLabel,
        color,
        fontSize: 13,
        align: "center",
        width,
        height,
        borderStyle: "solid",
        strokeWidth: 2,
      });
      nodeIdsSet.add(`drawio-${id}`);
    } else if (edge === "1") {
      const sourceId = cell.getAttribute("source");
      const targetId = cell.getAttribute("target");

      if (sourceId && targetId) {
        const edgeId = `drawio-edge-${id}`;
        const labelText = decodeHtmlEntity(valueAttr)
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .trim();

        extractedEdges.push({
          id: edgeId,
          fromNodeId: `drawio-${sourceId}`,
          toNodeId: `drawio-${targetId}`,
          label: labelText || undefined,
        });
      }
    }
  }

  const validEdges = extractedEdges.filter(
    (e) => nodeIdsSet.has(e.fromNodeId) && nodeIdsSet.has(e.toNodeId)
  );

  return autoCenterAndNormalizeDiagram({ nodes: extractedNodes, edges: validEdges });
};

/**
 * Parser Mermaid Flowchart (flowchart TD / LR, graph TD / LR).
 */
export const parseMermaid = (mermaidText: string): ParsedDiagram => {
  let text = mermaidText.trim();
  if (text.startsWith("```")) {
    text = text
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
  }

  const lines = text.split(/\r?\n/);
  const extractedNodes: FlowNode[] = [];
  const extractedEdges: FlowEdge[] = [];
  const nodeMap = new Map<string, FlowNode>();

  let isHorizontal = false;
  let autoX = 180;
  let autoY = 140;
  const colSpacing = 220;
  const rowSpacing = 130;

  const parseNodeDef = (
    raw: string
  ): { id: string; label: string; type: FlowNode["type"]; color: string } => {
    const rawTrim = raw.trim();

    // Subroutine [[Label]]
    const subMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\[\[(.*?)\]\]$/);
    if (subMatch) {
      return { id: subMatch[1], label: subMatch[2].trim(), type: "subprocess", color: "blue" };
    }

    // Database [(Label)]
    const dbMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\[\((.*?)\)\]$/);
    if (dbMatch) {
      return { id: dbMatch[1], label: dbMatch[2].trim(), type: "cylinder", color: "sky" };
    }

    // Rounded / Oval ([Label])
    const stadiumMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\(\[(.*?)\]\)$/);
    if (stadiumMatch) {
      return { id: stadiumMatch[1], label: stadiumMatch[2].trim(), type: "oval", color: "emerald" };
    }

    // Circle ((Label))
    const circleMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\(\((.*?)\)\)$/);
    if (circleMatch) {
      return { id: circleMatch[1], label: circleMatch[2].trim(), type: "oval", color: "emerald" };
    }

    // Diamond {Label}
    const diamondMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\{(.*?)\}$/);
    if (diamondMatch) {
      return {
        id: diamondMatch[1],
        label: diamondMatch[2].trim(),
        type: "diamond",
        color: "orange",
      };
    }

    // Rounded (Label)
    const roundedMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\((.*?)\)$/);
    if (roundedMatch) {
      return { id: roundedMatch[1], label: roundedMatch[2].trim(), type: "oval", color: "emerald" };
    }

    // Rect [Label]
    const rectMatch = rawTrim.match(/^([a-zA-Z0-9_-]+)\s*\[(.*?)\]$/);
    if (rectMatch) {
      return { id: rectMatch[1], label: rectMatch[2].trim(), type: "rect", color: "indigo" };
    }

    // Plain ID
    return { id: rawTrim, label: rawTrim, type: "rect", color: "indigo" };
  };

  const getOrCreateNode = (raw: string): string => {
    const { id, label, type, color } = parseNodeDef(raw);
    const cleanId = `mermaid-${id}`;

    if (!nodeMap.has(cleanId)) {
      const node: FlowNode = {
        id: cleanId,
        type,
        x: autoX,
        y: autoY,
        label: label || id,
        color,
        fontSize: 13,
        align: "center",
        width: type === "diamond" ? 140 : 130,
        height: type === "diamond" ? 85 : 75,
        borderStyle: "solid",
        strokeWidth: 2,
      };
      nodeMap.set(cleanId, node);
      extractedNodes.push(node);

      if (isHorizontal) {
        autoX += colSpacing;
      } else {
        autoY += rowSpacing;
      }
    } else if (label !== id) {
      // Perbarui label bila definisi lengkap baru ditemukan
      const existing = nodeMap.get(cleanId)!;
      existing.label = label;
      existing.type = type;
      existing.color = color;
    }

    return cleanId;
  };

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("%%")) continue;

    const lower = line.toLowerCase();
    if (lower.startsWith("flowchart") || lower.startsWith("graph")) {
      if (lower.includes("lr") || lower.includes("rl")) {
        isHorizontal = true;
      }
      continue;
    }

    // Deteksi edge connection: A -->|Label| B atau A -- Label --> B atau A --> B atau A -.-> B atau A ==> B
    const edgeRegex = /^(.+?)\s*(?:-->\|(.*?)\||--\s*(.*?)\s*-->|-->|==>|-\.->|---)\s*(.+)$/;
    const match = line.match(edgeRegex);

    if (match) {
      const leftPart = match[1];
      const edgeLabel = (match[2] || match[3] || "").trim();
      const rightPart = match[4];

      const sourceId = getOrCreateNode(leftPart);
      const targetId = getOrCreateNode(rightPart);

      extractedEdges.push({
        id: `mermaid-edge-${sourceId}-${targetId}-${extractedEdges.length}`,
        fromNodeId: sourceId,
        toNodeId: targetId,
        label: edgeLabel || undefined,
      });
    } else {
      // Definisi node tunggal
      if (line.includes("[") || line.includes("(") || line.includes("{")) {
        getOrCreateNode(line);
      }
    }
  }

  return autoCenterAndNormalizeDiagram({ nodes: extractedNodes, edges: extractedEdges });
};

/**
 * Membaca ekspor Miro (CSV atau JSON).
 */
export const parseMiroContent = (fileContent: string, isCsv: boolean): ParsedDiagram => {
  if (isCsv) {
    const lines = fileContent.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error(i18n.t("flowchart.csvEmpty") || "File CSV Miro kosong.");
    }

    const headers = lines[0].split(",").map((h) =>
      h
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase()
    );
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells: string[] = [];
      let currentCell = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cells.push(currentCell.trim().replace(/^["']|["']$/g, ""));
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim().replace(/^["']|["']$/g, ""));

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] || "";
      });
      rows.push(rowObj);
    }

    const extractedNodes: FlowNode[] = [];
    const extractedEdges: FlowEdge[] = [];
    const nodeIdsSet = new Set<string>();

    rows.forEach((row, idx) => {
      const id = row.id || `miro-row-${idx}`;
      const source = row.from || row["from id"] || row.source;
      const target = row.to || row["to id"] || row.target;

      if (source && target) {
        extractedEdges.push({
          id: `miro-edge-${id}`,
          fromNodeId: `miro-${source}`,
          toNodeId: `miro-${target}`,
          label: row.label || row.text || row.value || undefined,
        });
      } else {
        const x = parseFloat(row.x || row.left || "150") || idx * 60 + 100;
        const y = parseFloat(row.y || row.top || "150") || idx * 40 + 120;
        const width = parseFloat(row.width || "130") || 130;
        const height = parseFloat(row.height || "80") || 80;

        let labelText =
          row.text || row.label || row.content || row.title || `Komponen Miro ${idx + 1}`;
        labelText = decodeHtmlEntity(labelText)
          .replace(/<[^>]*>/g, "")
          .trim();

        let type: FlowNode["type"] = "rect";
        let color = "indigo";
        const parsedShape = (row.shape || row.type || "").toLowerCase();
        if (parsedShape.includes("circle") || parsedShape.includes("oval")) {
          type = "oval";
          color = "emerald";
        } else if (parsedShape.includes("rhombus") || parsedShape.includes("diamond")) {
          type = "diamond";
          color = "orange";
        } else if (parsedShape.includes("cylinder") || parsedShape.includes("database")) {
          type = "cylinder";
          color = "sky";
        } else if (parsedShape.includes("cloud")) {
          type = "cloud";
          color = "slate";
        } else if (parsedShape.includes("sticky") || parsedShape.includes("note")) {
          type = "sticky";
          color = "yellow";
        }

        extractedNodes.push({
          id: `miro-${id}`,
          type,
          x,
          y,
          label: labelText,
          color,
          fontSize: 13,
          align: "center",
          width,
          height,
          borderStyle: "solid",
          strokeWidth: 2,
        });
        nodeIdsSet.add(`miro-${id}`);
      }
    });

    const validEdges = extractedEdges.filter(
      (e) => nodeIdsSet.has(e.fromNodeId) && nodeIdsSet.has(e.toNodeId)
    );

    return autoCenterAndNormalizeDiagram({ nodes: extractedNodes, edges: validEdges });
  } else {
    const parsed = JSON.parse(fileContent);
    let items: any[] = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      items = parsed.data;
    } else if (parsed.widgets && Array.isArray(parsed.widgets)) {
      items = parsed.widgets;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      items = parsed.items;
    } else {
      const potentialArray = Object.values(parsed).find((val) => Array.isArray(val));
      if (potentialArray) {
        items = potentialArray as any[];
      } else {
        items = [parsed];
      }
    }

    const extractedNodes: FlowNode[] = [];
    const extractedEdges: FlowEdge[] = [];
    const nodeIdsSet = new Set<string>();

    items.forEach((item: any, idx: number) => {
      if (!item) return;
      const id = item.id || `miro-item-${idx}`;
      const typeStr = (item.type || "").toLowerCase();

      const isConnector =
        typeStr === "connector" ||
        typeStr === "line" ||
        typeStr === "link" ||
        item.start ||
        item.from;

      if (!isConnector) {
        let x = 150;
        let y = 150;
        if (item.position) {
          x =
            typeof item.position.x === "number"
              ? item.position.x
              : parseFloat(item.position.x || "150");
          y =
            typeof item.position.y === "number"
              ? item.position.y
              : parseFloat(item.position.y || "150");
        } else if (typeof item.x === "number") {
          x = item.x;
          y = item.y ?? 150;
        }

        let width = 130;
        let height = 80;
        if (item.geometry) {
          width = item.geometry.width || 130;
          height = item.geometry.height || 80;
        } else if (item.width) {
          width = item.width;
          height = item.height || 80;
        }

        let text = "";
        if (item.data && typeof item.data.content === "string") {
          text = item.data.content;
        } else if (item.data && typeof item.data.text === "string") {
          text = item.data.text;
        } else if (typeof item.text === "string") {
          text = item.text;
        } else if (typeof item.title === "string") {
          text = item.title;
        } else if (typeof item.content === "string") {
          text = item.content;
        }

        text = decodeHtmlEntity(text)
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .trim();

        if (!text) {
          text = `Miro ${item.type || "Bentuk"}`;
        }

        let type: FlowNode["type"] = "rect";
        let color = "indigo";
        const shapeStyle = (
          (item.style && item.style.shapeType) ||
          item.shape ||
          item.type ||
          ""
        ).toLowerCase();
        if (shapeStyle.includes("circle") || shapeStyle.includes("oval")) {
          type = "oval";
          color = "emerald";
        } else if (shapeStyle.includes("rhombus") || shapeStyle.includes("diamond")) {
          type = "diamond";
          color = "orange";
        } else if (shapeStyle.includes("cylinder") || shapeStyle.includes("database")) {
          type = "cylinder";
          color = "sky";
        } else if (shapeStyle.includes("cloud")) {
          type = "cloud";
          color = "slate";
        } else if (shapeStyle.includes("sticky") || shapeStyle.includes("note")) {
          type = "sticky";
          color = "yellow";
        }

        extractedNodes.push({
          id: `miro-${id}`,
          type,
          x,
          y,
          label: text,
          color,
          fontSize: 13,
          align: "center",
          width,
          height,
          borderStyle: "solid",
          strokeWidth: 2,
        });
        nodeIdsSet.add(`miro-${id}`);
      } else {
        const fromNode = item.start?.id || item.startCell || item.from || item.source;
        const toNode = item.end?.id || item.endCell || item.to || item.target;

        if (fromNode && toNode) {
          let label = "";
          if (item.captions && Array.isArray(item.captions) && item.captions[0]) {
            label = item.captions[0].text || "";
          } else if (item.label) {
            label = item.label;
          }

          extractedEdges.push({
            id: `miro-edge-${id}`,
            fromNodeId: `miro-${fromNode}`,
            toNodeId: `miro-${toNode}`,
            label: label
              ? decodeHtmlEntity(label)
                  .replace(/<[^>]*>/g, "")
                  .trim()
              : undefined,
          });
        }
      }
    });

    const validEdges = extractedEdges.filter(
      (e) => nodeIdsSet.has(e.fromNodeId) && nodeIdsSet.has(e.toNodeId)
    );

    return autoCenterAndNormalizeDiagram({ nodes: extractedNodes, edges: validEdges });
  }
};

/**
 * Universal diagram detector & parser.
 * Mendeteksi format file secara otomatis (Draw.io, Miro JSON/CSV, Mermaid, LanPro JSON).
 */
export const parseUniversalDiagram = (content: string, filename = ""): ParsedDiagram => {
  const cleanContent = content.trim();
  const lowerName = filename.toLowerCase();

  // 1. Ekstensi eksplisit
  if (lowerName.endsWith(".xml") || lowerName.endsWith(".drawio")) {
    return parseDrawIoXML(cleanContent);
  }
  if (lowerName.endsWith(".csv")) {
    return parseMiroContent(cleanContent, true);
  }
  if (lowerName.endsWith(".mmd") || lowerName.endsWith(".mermaid")) {
    return parseMermaid(cleanContent);
  }

  // 2. Deteksi isi teks bila nama file tidak spesifik
  if (
    cleanContent.startsWith("<") &&
    (cleanContent.includes("<mxGraphModel") ||
      cleanContent.includes("<mxCell") ||
      cleanContent.includes("<mxfile"))
  ) {
    return parseDrawIoXML(cleanContent);
  }

  if (
    cleanContent.startsWith("flowchart") ||
    cleanContent.startsWith("graph ") ||
    cleanContent.includes("-->")
  ) {
    return parseMermaid(cleanContent);
  }

  // 3. Coba JSON (LanPro native atau Miro)
  if (cleanContent.startsWith("{") || cleanContent.startsWith("[")) {
    try {
      const parsed = JSON.parse(cleanContent);
      if (parsed && (Array.isArray(parsed.nodes) || Array.isArray(parsed.edges))) {
        return autoCenterAndNormalizeDiagram({
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          edges: Array.isArray(parsed.edges) ? parsed.edges : [],
        });
      }
      return parseMiroContent(cleanContent, false);
    } catch {
      // continue
    }
  }

  // Fallback terakhir: coba Mermaid atau Draw.io
  try {
    return parseMermaid(cleanContent);
  } catch {
    return parseDrawIoXML(cleanContent);
  }
};
