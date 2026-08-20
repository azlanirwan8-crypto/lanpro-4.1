import React from "react";
import { format } from "date-fns";
import { ensureDate } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import { Input, Textarea, Button } from "../ui/CoreUI";
import { Sprint } from "../../types";

interface EditSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSprint: Sprint | null;
  setEditingSprint: (sprint: Sprint | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const EditSprintModal: React.FC<EditSprintModalProps> = ({
  isOpen,
  onClose,
  editingSprint,
  setEditingSprint,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Phase"
      maxWidth="max-w-xl"
    >
      {editingSprint && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
              Name
            </label>
            <Input
              value={editingSprint.name}
              onChange={(e: any) =>
                setEditingSprint({ ...editingSprint, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
              Goal
            </label>
            <Textarea
              value={editingSprint.goal}
              onChange={(e: any) =>
                setEditingSprint({ ...editingSprint, goal: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={editingSprint.status}
              onChange={(e: any) =>
                setEditingSprint({
                  ...editingSprint,
                  status: e.target.value as "planned" | "active" | "completed",
                })
              }
              className="w-full px-4 py-2 border border-border-subtle rounded-lg text-sm bg-surface"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={
                  editingSprint.startDate
                    ? typeof editingSprint.startDate === "string"
                      ? editingSprint.startDate
                      : format(ensureDate(editingSprint.startDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e: any) =>
                  setEditingSprint({
                    ...editingSprint,
                    startDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-border-subtle rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={
                  editingSprint.endDate
                    ? typeof editingSprint.endDate === "string"
                      ? editingSprint.endDate
                      : format(ensureDate(editingSprint.endDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e: any) =>
                  setEditingSprint({
                    ...editingSprint,
                    endDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-border-subtle rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={editingSprint.status}
              onChange={(e: any) =>
                setEditingSprint({
                  ...editingSprint,
                  status: e.target.value as any,
                })
              }
              className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium outline-none"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border-subtle">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 justify-center"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1 justify-center bg-primary-surface hover:bg-primary-surface-hover active:bg-primary-active text-content-inverse shadow-xs rounded-md text-xs font-medium py-2 cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
