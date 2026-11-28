import { useTranslation } from "react-i18next";
import { Modal } from "../../../components/ui/Modal";
import type { DiscussionPoint } from "../../../types/meeting";

export function ReferencedPointDialog({
  point,
  onClose,
}: {
  point: DiscussionPoint;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal isOpen title={t("discussion.pointDetails")} onClose={onClose}>
      <dl className="space-y-3">
        {[
          [t("discussion.concernTopic"), point.concern],
          [t("discussion.notesLabel"), point.keterangan],
          [t("discussion.followUp"), point.tindakanLanjut],
          [t("discussion.thTargetDate"), point.targetDate],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-content-muted">{label}</dt>
            <dd className="whitespace-pre-wrap break-words text-content-body">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
