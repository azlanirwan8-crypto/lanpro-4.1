import i18n from "../../../i18n";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { KanbanBoardProps } from "../types";
import { statusSelesai } from "../../../lib/statusSelesai";
import { resolveStatusWriteValue } from "../../../lib/statusKolom";
import { updateTask, resolveUserId } from "../services/kanban.service";
import { suppressTaskDataRefresh } from "../../../lib/taskRefreshControl";

const checkTaskBlockers = (
  tasks: any[],
  taskId: string,
  targetStatus: string,
  masterData: any[]
) => {
  if (!statusSelesai(targetStatus, masterData)) return true;

  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.linkedTasks) return true;

  const blockers = task.linkedTasks.filter((l: any) => l.relationType === "is_blocked_by");

  for (const blocker of blockers) {
    const blockingTask = tasks.find((t) => t.id === blocker.targetTaskId);
    if (blockingTask && !statusSelesai(blockingTask.status, masterData)) {
      toast.error(
        i18n.t("toast.cannotCompleteBlocked", {
          kunci: task.key,
          pemblokir: blockingTask.key,
          status: blockingTask.status,
        })
      );
      return false;
    }
  }
  return true;
};

export const useBoard = (props: KanbanBoardProps, groupBy: "epic" | "assignee" = "epic") => {
  const { masterData, tasks, projectMembers, userRole, user, selectedProject } = props;
  const [shakingTaskId, setShakingTaskId] = useState<string | null>(null);

  const mArr = useMemo(() => (Array.isArray(masterData) ? masterData : []), [masterData]);
  const tArr = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const pArr = useMemo(
    () => (Array.isArray(projectMembers) ? projectMembers : []),
    [projectMembers]
  );

  const boardStatuses = useMemo(
    () => mArr.filter((d) => d.type === "status").sort((a, b) => (a.order || 0) - (b.order || 0)),
    [mArr]
  );

  const epics = useMemo(() => tArr.filter((t) => (t.type || "").toLowerCase() === "epic"), [tArr]);

  const standaloneTasks = useMemo(() => {
    const epicIds = new Set(epics.map((e) => e.id));
    return tArr.filter(
      (t) => (t.type || "").toLowerCase() !== "epic" && (!t.parentId || !epicIds.has(t.parentId))
    );
  }, [tArr, epics]);

  const groupedTasks = useMemo(() => {
    const epicIds = new Set(epics.map((e) => e.id));
    const groups: Record<string, typeof tArr> = {};

    tArr.forEach((task) => {
      const isEpic = (task.type || "").toLowerCase() === "epic";
      const isSubtask = task.parentId && !epicIds.has(task.parentId);

      if (isEpic || isSubtask) return;

      let laneKey = "standalone";
      if (groupBy === "epic") {
        const hasEpicParent = task.parentId && epicIds.has(task.parentId);
        laneKey = hasEpicParent ? task.parentId : "standalone";
      } else if (groupBy === "assignee") {
        const rawAid = task.assigneeId;
        const aid = typeof rawAid === "object" ? rawAid?.uid || rawAid?.id : rawAid;
        laneKey =
          aid && aid !== "null" && aid !== "undefined" && aid !== "none"
            ? String(aid)
            : "unassigned";
      }

      const key = `${laneKey}:${task.status}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });
    return groups;
  }, [tArr, epics, groupBy]);

  const handleDragEndBoard = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const taskToMove = tArr.find((t) => t.id === draggableId);

    const parts = destination.droppableId.split(":");
    const rawStatus = parts.length > 1 ? parts.slice(1).join(":") : destination.droppableId;
    // #382 — tulis code bila MasterData punya; tetap terima label warisan di droppableId
    const newStatus = resolveStatusWriteValue(
      rawStatus,
      (mArr || []).filter((m: any) => m.type === "status")
    );

    if (taskToMove && statusSelesai(newStatus, mArr)) {
      const inlineUnfinished = (taskToMove.subtasks || []).filter(
        (st: any) => !statusSelesai(st.status, mArr)
      );
      const childUnfinished = tArr.filter(
        (t: any) => t.parentId === taskToMove.id && !statusSelesai(t.status, mArr)
      );

      if (inlineUnfinished.length > 0 || childUnfinished.length > 0) {
        setShakingTaskId(draggableId);
        setTimeout(() => setShakingTaskId(null), 800);
        toast.error(i18n.t("toast.subtaskBlocker"), {
          duration: 5000,
        });
        if (props.refreshTasks) props.refreshTasks();
        return;
      }
    }

    if (taskToMove && taskToMove.linkedTasks) {
      const blockers = taskToMove.linkedTasks.filter(
        (l: any) => l.relationType === "is_blocked_by"
      );
      for (const blocker of blockers) {
        const blockingTask = tArr.find((t) => t.id === blocker.targetTaskId);
        if (blockingTask && !statusSelesai(blockingTask.status, mArr)) {
          toast.error(
            i18n.t("toast.cannotMoveBlocked", {
              judul: taskToMove.title,
              pemblokir: blockingTask.title,
            })
          );
          return;
        }
      }
    }

    if (taskToMove && !["admin", "manager"].includes(userRole)) {
      const parentEpic = taskToMove.parentId
        ? tArr.find((t) => t.id === taskToMove.parentId && (t.type || "").toLowerCase() === "epic")
        : null;
      const isEpicReporter = parentEpic && parentEpic.reporterId === user?.uid;

      if (
        taskToMove.assigneeId !== user?.uid &&
        taskToMove.reporterId !== user?.uid &&
        !isEpicReporter
      ) {
        toast.error(i18n.t("toast.moveAccessDenied"));
        return;
      }
    }

    const destLaneId = parts.length > 1 ? parts[0] : null;

    if (!checkTaskBlockers(tArr, draggableId, newStatus, mArr)) return;

    if (props.setTasks && taskToMove) {
      suppressTaskDataRefresh(8000);
      const newTasks = tArr.map((t) => {
        if (t.id === draggableId) {
          const updated = { ...t, status: newStatus };
          if (destLaneId) {
            if (groupBy === "epic") {
              updated.parentId =
                destLaneId === "unparented" || destLaneId === "standalone" ? null : destLaneId;
            } else if (groupBy === "assignee") {
              updated.assigneeId = destLaneId === "unassigned" ? null : destLaneId;
            }
          }
          return updated;
        }
        return t;
      });
      props.setTasks(newTasks);
    }

    try {
      const updates: any = {
        status: newStatus,
        version: taskToMove.version,
      };

      if (destLaneId) {
        if (groupBy === "epic") {
          updates.parentId =
            destLaneId === "unparented" || destLaneId === "standalone" ? null : destLaneId;
        } else if (groupBy === "assignee") {
          updates.assigneeId = destLaneId === "unassigned" ? null : destLaneId;
        }
      }

      suppressTaskDataRefresh(8000);
      await updateTask(selectedProject.id, draggableId, resolveUserId(user), updates);
    } catch (e: any) {
      console.error("Failed to update task status", e);
      toast.error(e.message || "Gagal memindahkan task.");
      if (props.refreshTasks) {
        props.refreshTasks();
      }
    }
  };

  return {
    mArr,
    tArr,
    pArr,
    boardStatuses,
    epics,
    standaloneTasks,
    groupedTasks,
    handleDragEndBoard,
    shakingTaskId,
  };
};
