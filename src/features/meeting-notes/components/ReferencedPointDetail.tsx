import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/CoreUI";
import type { DiscussionPoint } from "../../../types/meeting";

export function ReferencedPointDetail({
  point,
  onShowAll,
}: {
  point: DiscussionPoint;
  onShowAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="referenced-point-title"
      className="space-y-4 rounded-lg border border-border-panel-divider bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="referenced-point-title" className="text-sm font-semibold text-content-strong">
          {t("discussion.pointDetails")}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={onShowAll}>
          {t("issueReferences.showAllMeetingPoints")}
        </Button>
      </div>
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
    </section>
  );
}
