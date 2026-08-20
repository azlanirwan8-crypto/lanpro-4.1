import React from "react";
import { Modal } from "../ui/Modal";
import { Input, Button } from "../ui/CoreUI";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  newProjectName: string;
  setNewProjectName: (val: string) => void;
  newProjectKey: string;
  setNewProjectKey: (val: string) => void;
  newProjectDescription: string;
  setNewProjectDescription: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  newProjectName,
  setNewProjectName,
  newProjectKey,
  setNewProjectKey,
  newProjectDescription,
  setNewProjectDescription,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Project Name
          </label>
          <Input
            value={newProjectName}
            onChange={(e: any) => setNewProjectName(e.target.value)}
            placeholder="e.g. Website Redesign"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Project Key (Short)
          </label>
          <Input
            value={newProjectKey}
            onChange={(e: any) => setNewProjectKey(e.target.value.toUpperCase())}
            placeholder="e.g. KAN"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-content-body mb-1">
            Description
          </label>
          <textarea
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            className="w-full border border-border-subtle rounded-lg p-2 text-sm"
            placeholder="Describe this project..."
            rows={3}
          />
        </div>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full justify-center"
        >
          Create Project
        </Button>
      </div>
    </Modal>
  );
};
