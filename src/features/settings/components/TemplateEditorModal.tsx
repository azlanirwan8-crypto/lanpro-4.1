import { useTranslation } from "react-i18next";
import React, { useState, useRef, useEffect } from "react";
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List } from "lucide-react";

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "email" | "whatsapp";
  initialSubject?: string;
  initialBody: string;
  onSave: (subject: string, body: string) => void;
}

const VARIABLES = [
  "{{user_name}}",
  "{{task_key}}",
  "{{task_title}}",
  "{{status}}",
  "{{project_name}}",
];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialSubject = "",
  initialBody,
  onSave,
}) => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);
    }
  }, [isOpen, initialSubject, initialBody]);

  if (!isOpen) return null;

  const insertAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const newBody = body.substring(0, selectionStart) + textToInsert + body.substring(selectionEnd);
    setBody(newBody);

    // Set cursor position back after React re-renders
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          selectionStart + textToInsert.length,
          selectionStart + textToInsert.length
        );
      }
    }, 0);
  };

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd } = textareaRef.current;
    const selectedText = body.substring(selectionStart, selectionEnd);
    const textToInsert = prefix + selectedText + suffix;

    const newBody = body.substring(0, selectionStart) + textToInsert + body.substring(selectionEnd);
    setBody(newBody);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          selectionStart + prefix.length,
          selectionEnd + prefix.length
        );
      }
    }, 0);
  };

  const handleFormat = (type: string) => {
    if (mode === "whatsapp") {
      switch (type) {
        case "bold":
          applyFormatting("*");
          break;
        case "italic":
          applyFormatting("_");
          break;
        case "strikethrough":
          applyFormatting("~");
          break;
      }
    } else {
      switch (type) {
        case "bold":
          applyFormatting("<b>", "</b>");
          break;
        case "italic":
          applyFormatting("<i>", "</i>");
          break;
        case "underline":
          applyFormatting("<u>", "</u>");
          break;
        case "align-left":
          applyFormatting('<div style="text-align: left;">', "</div>");
          break;
        case "align-center":
          applyFormatting('<div style="text-align: center;">', "</div>");
          break;
        case "align-right":
          applyFormatting('<div style="text-align: right;">', "</div>");
          break;
        case "list":
          applyFormatting("<ul>\\n  <li>", "</li>\\n</ul>");
          break;
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border-subtle">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-surface-sunken/50 shrink-0">
          <h3 className="font-medium text-content-strong text-sm">
            {t("rakit.broadcastTemplateFor", { kanal: mode === "email" ? "Email" : "WhatsApp" })}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-content-subtle hover:text-content-secondary hover:bg-surface-muted rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-content-body">
              {t("template.availableVariables")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((variable) => (
                <button
                  key={variable}
                  onClick={() => insertAtCursor(variable)}
                  className={`px-2.5 py-1 rounded-md text-xs sm:text-[11px] font-mono font-medium transition-all shadow-xs border ${
                    mode === "whatsapp"
                      ? "bg-success/10 hover:bg-success/15 text-success-text border-success/20"
                      : "bg-primary-surface/10 hover:bg-primary-surface/15 text-primary border-primary/20"
                  }`}
                  title={t("settings.insertVar", { nama: variable })}
                >
                  {variable}
                </button>
              ))}
            </div>
            <p className="text-xs sm:text-[11px] text-content-subtle">
              {t("template.clickVariable")}
            </p>
          </div>

          {mode === "email" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-content-body">
                {t("template.emailSubject")}
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 border border-border-subtle rounded-md shadow-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-xs bg-surface text-content-strong"
                placeholder={t("template.subjectPlaceholder")}
              />
            </div>
          )}

          <div className="space-y-1 border border-border-subtle rounded-md overflow-hidden shadow-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <div className="flex items-center gap-1 p-1.5 bg-surface-sunken border-b border-border-subtle flex-wrap">
              <button
                onClick={() => handleFormat("bold")}
                className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                title={t("template.bold")}
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => handleFormat("italic")}
                className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                title={t("template.italic")}
              >
                <Italic size={14} />
              </button>
              {mode === "email" && (
                <button
                  onClick={() => handleFormat("underline")}
                  className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                  title={t("template.underline")}
                >
                  <Underline size={14} />
                </button>
              )}
              <div className="w-px h-4 border-l border-border-subtle mx-1"></div>
              {mode === "email" && (
                <>
                  <button
                    onClick={() => handleFormat("align-left")}
                    className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                    title={t("template.alignLeft")}
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    onClick={() => handleFormat("align-center")}
                    className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                    title={t("template.alignCenter")}
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    onClick={() => handleFormat("align-right")}
                    className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                    title={t("template.alignRight")}
                  >
                    <AlignRight size={14} />
                  </button>
                  <div className="w-px h-4 border-l border-border-subtle mx-1"></div>
                  <button
                    onClick={() => handleFormat("list")}
                    className="p-1 text-content-secondary hover:bg-surface-muted rounded transition-colors"
                    title={t("template.bulletList")}
                  >
                    <List size={14} />
                  </button>
                </>
              )}
              {mode === "whatsapp" && (
                <span className="text-xs sm:text-[11px] text-content-subtle ml-2">
                  {t("template.supportsFormat")}
                </span>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="w-full p-3 outline-none resize-none font-mono text-xs leading-relaxed bg-surface text-content-strong"
              placeholder={
                mode === "email"
                  ? "Type your email content here (supports HTML)..."
                  : "Type your WhatsApp message here..."
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle bg-surface-sunken/50 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-content-secondary hover:bg-surface-muted transition-colors"
          >
            {t("template.cancel")}
          </button>
          <button
            onClick={() => onSave(subject, body)}
            className={`px-4 py-1.5 rounded-md text-content-inverse text-xs font-medium shadow-xs transition-colors ${
              mode === "whatsapp"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {t("template.saveTemplate")}
          </button>
        </div>
      </div>
    </div>
  );
};
