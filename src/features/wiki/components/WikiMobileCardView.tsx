import React from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Calendar,
  Download,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  BookOpen,
  Layers,
  FileSpreadsheet,
  FileCheck,
} from "lucide-react";
import { Card } from "../../../components/ui/CoreUI";
import type { DocumentModel } from "../types";

interface WikiMobileCardViewProps {
  documents: DocumentModel[];
  onSelectDoc: (docId: string) => void;
  onEditDoc: (doc: DocumentModel, e: React.MouseEvent) => void;
  onDeleteDoc: (doc: DocumentModel, e: React.MouseEvent) => void;
  onDownloadDoc: (docId: string, fileName?: string) => void;
  getUserName: (userId?: string) => string;
  canModifyDoc: (doc: DocumentModel) => boolean;
  canCreate: boolean;
  onOpenCreate: () => void;
}

export const WikiMobileCardView: React.FC<WikiMobileCardViewProps> = ({
  documents,
  onSelectDoc,
  onEditDoc,
  onDeleteDoc,
  onDownloadDoc,
  getUserName,
  canModifyDoc,
  canCreate,
  onOpenCreate,
}) => {
  const { t } = useTranslation();

  const getCategoryBadgeClass = (type: string) => {
    switch (type?.toUpperCase()) {
      case "PRD":
        return "bg-primary/10 text-primary border border-primary/20";
      case "PANDUAN":
        return "bg-blue-500/10 text-blue-700 border border-blue-500/30";
      case "LAPORAN":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30";
      case "SPESIFIKASI":
        return "bg-primary/10 text-primary border border-primary/30";
      default:
        return "bg-surface-sunken text-content-body border border-border-subtle";
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "PRD":
        return <Layers className="w-3 h-3" />;
      case "PANDUAN":
        return <BookOpen className="w-3 h-3" />;
      case "LAPORAN":
        return <FileSpreadsheet className="w-3 h-3" />;
      case "SPESIFIKASI":
        return <FileCheck className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (documents.length === 0) {
    return (
      <Card className="p-8 text-center shadow-2xs rounded-lg">
        <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary shadow-2xs">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="font-medium text-content-strong text-sm">{t("wiki.emptyTitle")}</p>
        <p className="text-xs text-content-subtle mt-1 mb-3">{t("wiki.emptyHint")}</p>
        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="btn-animation waves-effect waves-light btn-primary h-8 px-3 rounded-md text-xs font-medium cursor-pointer"
          >
            {t("wiki.addDocument")}
          </button>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc, index) => {
        const canModify = canModifyDoc(doc);
        const authorName = getUserName(doc.createdBy);
        const badgeClass = getCategoryBadgeClass(doc.type);

        return (
          <Card
            key={doc.id || index}
            onClick={() => onSelectDoc(doc.id)}
            className="p-4 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-3 rounded-lg"
          >
            {/* Header: Title & Action buttons */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-content-strong line-clamp-2 leading-snug">
                  {doc.title}
                </h4>
                {doc.description && (
                  <p className="text-xs text-content-muted line-clamp-2 mt-1 leading-relaxed">
                    {doc.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onSelectDoc(doc.id)}
                  aria-label={t("wiki.viewDetail") || "View Detail"}
                  className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-primary transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {canModify && (
                  <button
                    type="button"
                    onClick={(e) => onEditDoc(doc, e)}
                    aria-label={t("wiki.editDoc") || "Edit"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {canModify && (
                  <button
                    type="button"
                    onClick={(e) => onDeleteDoc(doc, e)}
                    aria-label={t("wiki.deleteDoc") || "Delete"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category badge, Attachment, External Link */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 text-[10px] leading-none font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${badgeClass}`}
              >
                {getCategoryIcon(doc.type)}
                {doc.type || "DOC"}
              </span>

              {doc.fileName && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadDoc(doc.id, doc.fileName);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 font-medium hover:underline cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span className="truncate max-w-[140px]">{doc.fileName}</span>
                </button>
              )}

              {doc.link && (
                <a
                  href={doc.link.startsWith("http") ? doc.link : `https://${doc.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{t("wiki.openLink")}</span>
                </a>
              )}
            </div>

            {/* Footer: Author & Last Updated */}
            <div className="pt-2 border-t border-border-faint flex items-center justify-between gap-2 text-xs text-content-subtle">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px]">{t("meetings.thAuthor")}:</span>
                <span className="font-medium text-content truncate">{authorName}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0 text-[11px]">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(doc.updatedAt)}</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
