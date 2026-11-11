import i18n from "../i18n";
import { useState } from "react";
import { toast } from "sonner";

// FlowNode sebelumnya didefinisikan ulang di sini dengan `type: string` yang
// longgar, sementara useFlowchartNodes memakai union bentuk yang ketat. Akibatnya
// snapshot hasil handleUndo() tidak dapat diserahkan ke setNodes — string tidak
// assignable ke union. Kini keduanya memakai satu definisi yang sama.
//
// Re-export dipertahankan agar konsumen lama yang meng-import dari modul ini
// tetap berfungsi.
import type { FlowNode } from "../features/flowchart/types";
export type { FlowNode };

export interface FlowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

export interface HistorySnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * useFlowchartHistory
 * Manages undo/redo stack. Supports up to 50 history snapshots with
 * forward/backward navigation.
 *
 * #841 Fase 1 — keadaan simulasi (simpul aktif, bendera "sedang berjalan",
 * ref pembatal) DIHAPUS dari hook ini. Ketiganya tidak pernah dipakai fungsi
 * riwayat mana pun, dan simulasi baru tidak lagi berbentuk satu timer global:
 * langkahnya hidup bersama geometry papan di `FlowchartContainer`, tempat
 * token animasi benar-benar digambar.
 */
export function useFlowchartHistory() {
  // Undo/Redo stack management
  const [historyStack, setHistoryStack] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Record a state snapshot into history (called after mutations)
  const recordHistory = (nodes: FlowNode[], edges: FlowEdge[]) => {
    setHistoryStack((prevStack) => {
      // Trim stack to current index (discard redo history if we make new changes)
      const cleanStack = prevStack.slice(0, historyIndex + 1);

      // Create deep copy and add to stack
      const newSnapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      const updatedStack = [...cleanStack, newSnapshot];

      // Keep only last 50 snapshots (prevent memory bloat)
      if (updatedStack.length > 50) {
        updatedStack.shift();
      }

      // Update index to point to newest snapshot
      setHistoryIndex(updatedStack.length - 1);
      return updatedStack;
    });
  };

  // Undo: restore previous snapshot
  const handleUndo = (): HistorySnapshot | null => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      const snapshot = historyStack[prevIdx];
      toast.info(i18n.t("toast.undoDone"));
      return {
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
      };
    } else {
      toast.warning(i18n.t("toast.noUndoHistory"));
      return null;
    }
  };

  // Redo: restore next snapshot
  const handleRedo = (): HistorySnapshot | null => {
    if (historyIndex < historyStack.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const snapshot = historyStack[nextIdx];
      toast.info(i18n.t("toast.redoDone"));
      return {
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        edges: JSON.parse(JSON.stringify(snapshot.edges)),
      };
    } else {
      toast.warning(i18n.t("toast.noRedoHistory"));
      return null;
    }
  };

  // Check if undo is available
  const canUndo = (): boolean => historyIndex > 0;

  // Check if redo is available
  const canRedo = (): boolean => historyIndex < historyStack.length - 1;

  // Clear history stack (useful for fresh start)
  const clearHistory = () => {
    setHistoryStack([]);
    setHistoryIndex(-1);
  };

  // Initialize history with current state
  const initializeHistory = (nodes: FlowNode[], edges: FlowEdge[]) => {
    const initialSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    setHistoryStack([initialSnapshot]);
    setHistoryIndex(0);
  };

  // Get current history depth (for info display)
  const getHistoryDepth = (): number => historyStack.length;

  // Get current history position (for UI indicators)
  const getHistoryPosition = (): number => historyIndex + 1;

  return {
    // State
    historyStack,
    historyIndex,

    // Setters (for external control)
    setHistoryStack,
    setHistoryIndex,

    // History management
    recordHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    clearHistory,
    initializeHistory,
    getHistoryDepth,
    getHistoryPosition,
  };
}
