import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../../../components/ui/Modal";
import {
  fetchGenerationSources,
  generateSuiteDrafts,
  saveSuiteDrafts,
  searchGenerationSources,
} from "../services/qa.service";
import type { QAGenerationDraft, QAGenerationSource, QATestSuite } from "../types";

type SuiteProps = { suite: QATestSuite; onSaved: () => Promise<void> };
const categories = ["all", "document", "meeting", "flowchart", "issue"] as const;
const keyOf = (source: QAGenerationSource) => source.kind + ":" + source.id;
const secondary =
  "rounded-md border border-border-panel-divider px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-50";
const primary = "btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50";

export function QAGeneration({
  suite,
  onSaved,
  register,
}: SuiteProps & {
  register: React.RefObject<(() => void) | null>;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    register.current = () => {
      trigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    return () => {
      register.current = null;
    };
  }, [register]);
  if (!open) return null;
  return (
    <GenerationDialog
      suite={suite}
      onSaved={onSaved}
      onClose={() => {
        setOpen(false);
        trigger.current?.focus();
      }}
    />
  );
}

function GenerationDialog({ suite, onSaved, onClose }: SuiteProps & { onClose: () => void }) {
  const { t: tr } = useTranslation(undefined, { keyPrefix: "qaGenerate" });
  const [sources, setSources] = useState<QAGenerationSource[]>([]);
  const [options, setOptions] = useState<QAGenerationSource[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [drafts, setDrafts] = useState<Array<QAGenerationDraft & { id: string }> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<"generating" | "saving" | null>(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const review = drafts !== null;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (review) heading.current?.focus();
  }, [review]);
  useEffect(() => {
    let active = true;
    setReady(false);
    fetchGenerationSources(suite)
      .then((result) => {
        if (!active) return;
        setSources(result.data);
        setReady(true);
        if (result.missing) setError(tr("missing"));
      })
      .catch(() => {
        if (active) setError(tr("failed"));
      });
    return () => {
      active = false;
    };
  }, [suite.id, suite.projectId, retry, tr]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(
      () => {
        searchGenerationSources(suite, search)
          .then((rows) => {
            if (active) setOptions(rows);
          })
          .catch(() => {
            if (active) {
              setOptions([]);
              setError(tr("failed"));
            }
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      search ? 180 : 0
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [suite.id, suite.projectId, search, retry, tr]);

  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setBusy(review ? "saving" : "generating");
    setError("");
    try {
      if (drafts === null) {
        const generated = await generateSuiteDrafts(suite, sources);
        if (!mounted.current) return;
        const rows = generated.map((draft) => ({ ...draft, id: crypto.randomUUID() }));
        setDrafts(rows);
        setSelected(rows.filter((row) => row.kind !== "clarify").map((row) => row.id));
      } else {
        const saved = await saveSuiteDrafts(
          suite,
          drafts.filter((row) => row.kind !== "clarify" && selected.includes(row.id))
        );
        if (!mounted.current) return;
        const duplicates = saved.filter((row) => row.status === "duplicate").length;
        if (duplicates) toast.info(tr("duplicates", { count: duplicates }));
        await onSaved();
        if (mounted.current) onClose();
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : tr("failed"));
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(null);
    }
  }

  const chosen = new Set(sources.map(keyOf));
  const query = search.trim().toLocaleLowerCase();
  const visible = [
    ...sources.filter((row) => row.label.toLocaleLowerCase().includes(query)),
    ...options.filter((row) => !chosen.has(keyOf(row))),
  ].filter((row) => category === "all" || category === row.kind);
  const blocked = review
    ? !selected.length || drafts.some((row) => selected.includes(row.id) && !row.title.trim())
    : !ready || !sources.length;

  return (
    <Modal
      isOpen
      title={tr("title")}
      dialogLabel={tr("title")}
      maxWidth="max-w-2xl"
      onClose={() => {
        if (busy !== "saving") onClose();
      }}
      footer={
        <>
          <span className="mr-auto text-xs text-content-subtle">
            {suite.name} · {suite.phase}
          </span>
          <button
            type="button"
            className={secondary}
            disabled={!!busy}
            onClick={() => (review ? setDrafts(null) : onClose())}
          >
            {tr(review ? "back" : "cancel")}
          </button>
          <button type="button" className={primary} disabled={!!busy || blocked} onClick={submit}>
            {busy
              ? tr(busy)
              : review
                ? tr("save", { count: selected.length, phase: suite.phase })
                : tr("generate")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <h4 ref={heading} tabIndex={-1} className="flex items-center gap-3 text-sm font-medium">
          <span className={review ? "text-content-subtle" : "text-primary"}>
            1 · {tr("sources")}
          </span>
          <span aria-hidden="true" className="h-px w-6 bg-surface-marker" />
          <span className={review ? "text-primary" : "text-content-subtle"}>
            2 · {tr("review")}
          </span>
        </h4>
        {error && (
          <div role="alert" className="text-sm text-danger-text">
            {error}{" "}
            {!review && (
              <button
                className="underline"
                onClick={() => {
                  setError("");
                  setRetry((n) => n + 1);
                }}
              >
                {tr("retry")}
              </button>
            )}
          </div>
        )}
        {busy && <p role="status">{tr(busy)}</p>}
        {drafts === null ? (
          <>
            <label className="flex items-center gap-2 rounded-md border border-border-panel-divider px-3 py-2 focus-within:border-primary">
              <Search size={16} aria-hidden="true" className="text-content-subtle" />
              <input
                autoFocus
                type="search"
                aria-label={tr("search")}
                placeholder={tr("search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {categories.map((kind) => (
                <button
                  key={kind}
                  aria-pressed={category === kind}
                  className={
                    category === kind
                      ? "rounded-md bg-primary px-3 py-1 text-sm text-content-inverse"
                      : "rounded-md px-3 py-1 text-sm text-content-secondary hover:bg-surface-muted"
                  }
                  onClick={() => setCategory(kind)}
                >
                  {tr(kind)}
                </button>
              ))}
            </div>
            <div className="divide-y divide-border-divider rounded-md border border-border-subtle">
              {loading ? (
                <p role="status" className="p-4 text-sm">
                  {tr("loading")}
                </p>
              ) : visible.length ? (
                visible.map((row) => {
                  const key = keyOf(row);
                  const checked = chosen.has(key);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-3 py-3 text-sm hover:bg-surface-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!ready || !!busy || (!checked && sources.length >= 12)}
                        onChange={() =>
                          setSources((items) =>
                            checked ? items.filter((item) => keyOf(item) !== key) : [...items, row]
                          )
                        }
                      />
                      <span className="min-w-0 flex-1 break-words">{row.label}</span>
                      <span className="text-xs text-content-subtle">{tr(row.kind)}</span>
                    </label>
                  );
                })
              ) : (
                <div className="p-4 text-sm text-content-secondary">
                  {query ? tr("noMatch", { query: search }) : tr("none")}
                  {query && (
                    <button className="ml-2 text-primary underline" onClick={() => setSearch("")}>
                      {tr("clear")}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 text-xs text-content-subtle">
              <p>{tr("count", { count: sources.length })}</p>
              <p>{tr("privacy")}</p>
            </div>
          </>
        ) : (
          <>
            {!drafts.length && <p className="text-sm">{tr("empty")}</p>}
            {drafts.map((row) => (
              <article
                key={row.id}
                className="space-y-2 rounded-md border border-border-subtle p-3 text-sm"
              >
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    disabled={!!busy || row.kind === "clarify"}
                    checked={selected.includes(row.id)}
                    onChange={() =>
                      setSelected((ids) =>
                        ids.includes(row.id) ? ids.filter((id) => id !== row.id) : [...ids, row.id]
                      )
                    }
                  />
                  {tr(row.kind)} · {row.title}
                </label>
                <details>
                  <summary className="cursor-pointer text-primary">{tr("details")}</summary>
                  <div className="mt-2 space-y-2">
                    {row.kind !== "clarify" && (
                      <label className="block">
                        {tr("name")}
                        <input
                          className={secondary + " block w-full"}
                          value={row.title}
                          maxLength={255}
                          disabled={!!busy}
                          onChange={(event) =>
                            setDrafts(
                              drafts.map((item) =>
                                item.id === row.id ? { ...item, title: event.target.value } : item
                              )
                            )
                          }
                        />
                      </label>
                    )}
                    {row.preconditions && (
                      <p>
                        {tr("pre")} · {row.preconditions}
                      </p>
                    )}
                    {row.testData && (
                      <p>
                        {tr("data")} · {row.testData}
                      </p>
                    )}
                    <ol className="list-decimal pl-5">
                      {row.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <p>
                      {tr("expected")} · {row.expected}
                    </p>
                    <p>
                      {tr("refs")} · {row.sources.map((source) => source.label).join(", ")}
                    </p>
                  </div>
                </details>
              </article>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
