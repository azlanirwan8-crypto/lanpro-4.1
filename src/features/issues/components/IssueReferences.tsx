import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Link2 } from "lucide-react";
import { useAppStore } from "../../../store/useAppStore";
import type { IssueReference } from "../../../types/issueReference";
import { listIssueReferences } from "../services/issueReferences.service";

const previewSize = 3;
type Result = Awaited<ReturnType<typeof listIssueReferences>>;

export function IssueReferences({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { t } = useTranslation();
  const open = useAppStore((store) => store.openIssueReference);
  const [result, setResult] = useState<Result>();
  const [full, setFull] = useState<IssueReference["kind"]>();
  const [search, setSearch] = useState("");
  const [load, setLoad] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    listIssueReferences(projectId, taskId, request.signal).then((data) => {
      if (!request.signal.aborted) setResult(data);
    });
    return () => request.abort();
  }, [projectId, taskId, load]);

  const sections = result
    ? [
        { kind: "meeting" as const, label: t("issueReferences.meeting"), ...result.meeting },
        { kind: "flowchart" as const, label: t("issueReferences.flowchart"), ...result.flowchart },
      ].filter((section) => section.allowed && !section.unavailable)
    : [];
  const chosen = sections.find((section) => section.kind === full);
  const unavailable = result?.replies.some((reply) => reply.unavailable);
  const searchTerm = search.trim().toLocaleLowerCase();
  const matches = chosen?.data.filter((reference) =>
    `${reference.title} ${reference.kind === "meeting" ? reference.meetingTitle : ""}`
      .toLocaleLowerCase()
      .includes(searchTerm)
  );

  function renderRows(records: IssueReference[]) {
    const groups = new Map<string, { title?: string; records: IssueReference[] }>();
    for (const reference of records) {
      const meeting = reference.kind === "meeting" ? reference.meetingId : "";
      const group = groups.get(meeting) ?? {
        title: reference.kind === "meeting" ? reference.meetingTitle : undefined,
        records: [],
      };
      group.records.push(reference);
      groups.set(meeting, group);
    }
    return Array.from(groups, ([id, group]) => (
      <div key={id}>
        {group.title && (
          <p className="px-2 py-1 text-xs font-medium text-content-muted">{group.title}</p>
        )}
        <ul>
          {group.records.map((reference) => (
            <li
              key={JSON.stringify([
                reference.id,
                reference.kind === "flowchart" && reference.nodeId,
              ])}
            >
              <button
                type="button"
                onClick={() => open({ ...reference, projectId })}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm text-content-body hover:bg-surface-muted"
              >
                <span className="min-w-0 break-words">
                  {reference.title || t("issueReferences.untitled")}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-content-muted" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    ));
  }

  return (
    <section className="space-y-2 rounded-lg border border-border-panel-divider bg-surface p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-content-strong">
        <Link2 className="size-4 text-primary" aria-hidden="true" /> {t("issueReferences.title")}
      </h3>
      {!result && (
        <p role="status" className="text-sm text-content-muted">
          {t("issueReferences.loading")}
        </p>
      )}
      {unavailable && (
        <div role="alert" className="flex flex-wrap gap-2 text-sm text-content-muted">
          <span>{t("issueReferences.unavailable")}</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setResult(undefined);
              setLoad(load + 1);
            }}
          >
            {t("issueReferences.retry")}
          </button>
        </div>
      )}
      {result && !unavailable && !sections.some((section) => section.data.length) && (
        <p className="text-sm text-content-muted">{t("issueReferences.empty")}</p>
      )}
      {chosen ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setFull(undefined);
              setSearch("");
            }}
            className="text-sm text-primary hover:underline"
          >
            {t("issueReferences.back")}
          </button>
          <label className="block text-sm">
            {t("issueReferences.search", { source: chosen.label })}
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 block w-full rounded-md border border-border-panel-divider bg-surface px-2 py-2 text-content-body"
            />
          </label>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {matches?.length ? (
              renderRows(matches)
            ) : (
              <p className="text-sm text-content-muted">{t("issueReferences.noMatches")}</p>
            )}
          </div>
        </div>
      ) : (
        sections
          .filter((section) => section.data.length > 0)
          .map((section) => (
            <details key={section.kind} className="rounded-md border border-border-panel-divider">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-content-body">
                {section.label}{" "}
                <span className="ml-1 text-content-muted">({section.data.length})</span>
              </summary>
              <div className="space-y-2 px-2 pb-2">
                <div className="max-h-56 overflow-y-auto">
                  {renderRows(section.data.slice(0, previewSize))}
                </div>
                {section.data.length > previewSize && (
                  <button
                    type="button"
                    onClick={() => setFull(section.kind)}
                    className="px-2 py-1 text-sm text-primary hover:underline"
                  >
                    {t("issueReferences.all", { count: section.data.length })}
                  </button>
                )}
              </div>
            </details>
          ))
      )}
    </section>
  );
}
