import { useTranslation } from "react-i18next";
import React, { useRef, useState } from "react";
import {
  Link as LinkIcon,
  Paperclip as AttachmentIcon,
  Trash2,
  Eye,
  Download,
  Upload,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { Button } from "./TaskDetailPrimitives";
import { Task, Attachment } from "../../../../types";
import { uploadAttachmentDocument, addTaskAttachment } from "../../services/issues.service";
import { toast } from "sonner";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface TaskAttachmentsSectionProps {
  task: Task;
  isEditable: boolean;
  isAddingLink: boolean;
  setIsAddingLinkLocal: (open: boolean) => void;
  newLinkTitle: string;
  setNewLinkTitle: (val: string) => void;
  newLinkUrl: string;
  setNewLinkUrl: (val: string) => void;
  handleAddLink: () => void;
  handleRemoveAttachment?: (id: string) => void;
  onAttachmentAdded?: (newAtt: Attachment) => void;
  safeFormat: (date: any, formatStr: string) => string;
  wrapSubmit: (key: string, fn: () => Promise<void> | void) => () => Promise<void>;
  isSubmitting: Record<string, boolean>;
}

function isImageAttachment(att: Attachment): boolean {
  if (att.type === "image") return true;
  const name = att.name || att.filename || att.url || "";
  const ext = name.split("?")[0].split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"].includes(ext || "");
}

function getFileIcon(att: Attachment) {
  if (att.type === "link") {
    return <LinkIcon className="w-4 h-4 text-blue-500" />;
  }
  const name = (att.name || att.filename || "").toLowerCase();
  const ext = name.split("?")[0].split(".").pop() || "";

  if (isImageAttachment(att)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500" />;
  }
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) {
    return <FileText className="w-4 h-4 text-rose-500" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-500" />;
  }
  return <FileIcon className="w-4 h-4 text-primary" />;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TaskAttachmentsSection: React.FC<TaskAttachmentsSectionProps> = ({
  task,
  isEditable,
  isAddingLink,
  setIsAddingLinkLocal,
  newLinkTitle,
  setNewLinkTitle,
  newLinkUrl,
  setNewLinkUrl,
  handleAddLink,
  handleRemoveAttachment,
  onAttachmentAdded,
  safeFormat,
  wrapSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    size?: number;
  } | null>(null);

  const handleDownloadAttachment = (att: Attachment) => {
    const a = document.createElement("a");
    a.href = att.url;
    a.download = att.name || att.filename || "download";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleEyeClick = (att: Attachment) => {
    if (isImageAttachment(att)) {
      setPreviewImage({
        url: att.url,
        title: att.name || att.filename || "Image Preview",
        size: att.size,
      });
    } else {
      handleDownloadAttachment(att);
    }
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${t("attachments.fileSizeExceeded")}${f.name}`);
        return;
      }
    }

    setIsUploading(true);
    setUploadCount({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadCount({ current: i + 1, total: files.length });

        const uploadRes = await uploadAttachmentDocument(file);

        if (uploadRes?.data?.url) {
          const isImg = file.type.startsWith("image/");
          const postRes = (await addTaskAttachment(task.projectId, task.id, {
            filename: uploadRes.data.filename,
            name: file.name,
            originalName: uploadRes.data.originalName || file.name,
            mimetype: file.type || "application/octet-stream",
            type: isImg ? "image" : "document",
            size: file.size,
            url: uploadRes.data.url,
          })) as {
            status: string;
            data: Attachment;
          };

          if (postRes?.data && onAttachmentAdded) {
            onAttachmentAdded(postRes.data);
          }
        }
      }
      toast.success(t("attachments.uploadSuccess"));
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`${t("attachments.uploadFailed")}${err.message || ""}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditable && !isUploading) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (!isEditable || isUploading) return;
    if (e.dataTransfer?.files?.length) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const attachments = task.attachments || [];

  return (
    <div className="bg-surface border border-border-subtle/80 rounded-lg p-4 md:p-5 shadow-2xs space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) {
            void handleFiles(e.target.files);
          }
        }}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp,.gif,image/*"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-normal text-content-body uppercase tracking-normal flex items-center gap-2">
          <AttachmentIcon className="w-4 h-4 text-primary" />
          {t("attachments.sectionTitle")}
          {attachments.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {attachments.length}
            </span>
          )}
        </h3>

        {isEditable && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t("attachments.uploadFiles")}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingLinkLocal(!isAddingLink)}
              className="inline-flex items-center gap-1 text-xs font-medium text-content-muted hover:text-content bg-surface-sunken hover:bg-surface-strong px-2 py-1 rounded-md transition-colors"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{t("issues.addLink")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Dropzone Area (when editable) */}
      {isEditable && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all select-none",
            isDraggingOver
              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
              : "border-border-subtle hover:border-primary/50 bg-surface-sunken/40 hover:bg-surface",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-xs font-medium text-content-strong">
                {t("attachments.uploadingFiles")} ({uploadCount.current}/{uploadCount.total})
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5 text-content-subtle text-xs">
                <Upload className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-content-strong">
                  {t("attachments.uploadPrompt")}
                </span>
              </div>
              <p className="text-[11px] text-content-subtle">{t("attachments.uploadHint")}</p>
            </div>
          )}
        </div>
      )}

      {/* Form Input Tambah Tautan */}
      {isAddingLink && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3.5 bg-primary/5 rounded-lg border border-primary/20 space-y-2.5"
        >
          <input
            placeholder={t("attachments.resourceTitle")}
            className="w-full text-xs font-normal border border-border-subtle rounded-md bg-surface p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            value={newLinkTitle}
            onChange={(e) => setNewLinkTitle(e.target.value)}
          />
          <input
            placeholder={t("attachments.urlPlaceholder")}
            className="w-full text-xs font-normal border border-border-subtle rounded-md bg-surface p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setIsAddingLinkLocal(false)}>
              {t("attachments.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={wrapSubmit("addLink", () => {
                handleAddLink();
                setIsAddingLinkLocal(false);
              })}
              disabled={isSubmitting["addLink"] || !newLinkTitle || !newLinkUrl}
            >
              {t("attachments.saveLink")}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tampilan List Berkas / Lampiran */}
      <div className="space-y-2 pt-1">
        {attachments.map((att, attIdx) => {
          const isImg = isImageAttachment(att);
          return (
            <div
              key={att.id ? `${att.id}-${attIdx}` : `att-${attIdx}`}
              className="flex items-center justify-between gap-3 p-2.5 bg-surface-sunken/40 hover:bg-surface border border-border-subtle rounded-lg transition-all shadow-2xs group"
            >
              {/* Info Sisi Kiri */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Thumbnail atau Ikon Tipe File */}
                <div
                  className="w-8 h-8 rounded-md bg-surface flex items-center justify-center shrink-0 border border-border-subtle/80 overflow-hidden cursor-pointer"
                  onClick={() => handleEyeClick(att)}
                >
                  {isImg ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    getFileIcon(att)
                  )}
                </div>

                {/* Nama & Detail */}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-medium text-content truncate cursor-pointer hover:text-primary transition-colors"
                    title={att.name || att.filename}
                    onClick={() => handleEyeClick(att)}
                  >
                    {att.name || att.filename}
                  </p>
                  <p className="text-[10px] text-content-subtle truncate">
                    {att.size ? `${formatBytes(att.size)} • ` : ""}
                    {att.createdAt ? safeFormat(att.createdAt, "d MMM yyyy, HH:mm") : ""}
                    {att.uploadedByName ? ` • ${att.uploadedByName}` : ""}
                  </p>
                </div>
              </div>

              {/* Aksi Sisi Kanan: Icon Mata, Download, dan Hapus */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Icon Mata (Preview jika gambar, Download jika dokumen) */}
                <button
                  type="button"
                  onClick={() => handleEyeClick(att)}
                  className="p-1.5 rounded-md text-content-subtle hover:text-primary hover:bg-primary/10 transition-colors"
                  title={isImg ? t("attachments.previewImage") : t("attachments.downloadDoc")}
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Tombol Unduh Langsung */}
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(att)}
                  className="p-1.5 rounded-md text-content-subtle hover:text-content hover:bg-surface-strong transition-colors"
                  title={t("attachments.download")}
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Tombol Hapus */}
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment?.(att.id)}
                    className="p-1.5 rounded-md text-content-subtle hover:text-rose-500 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition-all"
                    title={t("attachments.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {attachments.length === 0 && !isAddingLink && (
          <div className="py-6 text-center text-content-subtle italic text-xs">
            {t("attachments.noAttachments")}
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          fileSize={previewImage.size}
        />
      )}
    </div>
  );
};
