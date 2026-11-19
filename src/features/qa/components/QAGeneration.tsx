import { useEffect, useRef, useState } from "react";
import {
  fetchGenerationSources,
  generateSuiteDrafts,
  saveSuiteDrafts,
  searchGenerationSources,
} from "../services/qa.service";
import type { QAGenerationDraft, QAGenerationSource, QATestSuite } from "../types";

const labels = {
  document: "Documents",
  flowchart: "Flowchart",
  meeting: "Meeting Notes",
  issue: "Issue List",
};
const draftLabels = { positive: "Positif", negative: "Negatif", clarify: "Perlu konfirmasi" };
const sourceKey = (source: QAGenerationSource) => `${source.kind}:${source.id}`;
const button = "rounded-md border border-border-subtle px-3 py-1.5 text-sm disabled:opacity-50";

export function QAGeneration({
  suite,
  onSaved,
  register,
}: {
  suite: QATestSuite;
  onSaved: () => Promise<void>;
  register: React.RefObject<(() => void) | null>;
}) {
  const [sources, setSources] = useState<QAGenerationSource[] | null>(null);
  const [options, setOptions] = useState<QAGenerationSource[] | null>(null);
  const [search, setSearch] = useState(suite.name);
  const [drafts, setDrafts] = useState<Array<QAGenerationDraft & { id: string }> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function run(message: string, action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(message);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permintaan QA gagal.");
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  }

  async function fetchOptions() {
    setOptions([]);
    setOptions(await searchGenerationSources(suite, search));
  }

  async function fetchSavedSources() {
    if (sources) return { data: sources, missing: 0 };
    const result = await fetchGenerationSources(suite);
    setSources(result.data);
    return result;
  }

  function findSources() {
    return run("Mencari sumber…", async () => {
      await fetchSavedSources();
      await fetchOptions();
    });
  }

  function generate() {
    if (inFlight.current) return;
    void run("Membuat draf test case…", async () => {
      const { data: confirmed, missing } = await fetchSavedSources();
      if (!confirmed.length || missing) {
        await fetchOptions();
        if (missing)
          setError(`${missing} rujukan sudah tidak tersedia. Periksa sumber sebelum melanjutkan.`);
        return;
      }
      const generated = await generateSuiteDrafts(suite, confirmed);
      const next = generated.map((draft) => ({ ...draft, id: crypto.randomUUID() }));
      setOptions(null);
      setDrafts(next);
      setSelected(next.filter((draft) => draft.kind !== "clarify").map(({ id }) => id));
    });
  }
  useEffect(() => {
    register.current = generate;
    return () => {
      register.current = null;
    };
  });

  function save() {
    void run("Menyimpan test case…", async () => {
      const choices = (drafts || []).filter(
        ({ id, kind }) => kind !== "clarify" && selected.includes(id)
      );
      const saved = await saveSuiteDrafts(suite, choices);
      const processed = new Set(saved.map(({ id }) => id));
      setDrafts((current) => current?.filter(({ id }) => !processed.has(id)) || null);
      setSelected((current) => current.filter((id) => !processed.has(id)));
      const duplicates = saved.filter(({ status }) => status === "duplicate").length;
      if (duplicates) setError(`${duplicates} draf dilewati karena test case sudah ada di suite.`);
      if (mounted.current) await onSaved();
    });
  }

  return (
    <section className="space-y-3 p-3" aria-label="Generate AI Quality Assessment">
      <button type="button" className={button} onClick={findSources} disabled={Boolean(busy)}>
        Sumber AI{sources && ` (${sources.length})`}
      </button>
      {busy && <p role="status">{busy}</p>}
      {error && <p role="alert">{error}</p>}
      {options && (
        <div className="space-y-2">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void findSources();
            }}
          >
            <input
              className={button}
              aria-label="Cari sumber QA"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className={button} disabled={Boolean(busy)}>
              Cari sumber
            </button>
          </form>
          <p>Pilih sumber yang berkaitan dengan {suite.name}. Maksimal 12 sumber.</p>
          <p className="text-sm text-content-subtle">
            Cuplikan sumber terpilih diproses oleh Gemini.
          </p>
          <div className="max-h-60 space-y-1 overflow-auto">
            {[
              ...(sources || []),
              ...options.filter(
                (option) => !sources?.some((item) => sourceKey(item) === sourceKey(option))
              ),
            ].map((source) => {
              const key = sourceKey(source);
              const checked = sources?.some((item) => sourceKey(item) === key) || false;
              return (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={Boolean(busy) || (!checked && (sources?.length || 0) >= 12)}
                    onChange={() =>
                      setSources((items) =>
                        checked
                          ? (items || []).filter((item) => sourceKey(item) !== key)
                          : [...(items || []), source]
                      )
                    }
                  />
                  {labels[source.kind]} · {source.label}
                </label>
              );
            })}
            {!options.length && !busy && <p>Belum ada hasil pencarian sumber.</p>}
          </div>
          <button
            type="button"
            className={button}
            onClick={generate}
            disabled={!sources?.length || Boolean(busy)}
          >
            Generate dari sumber terpilih
          </button>
        </div>
      )}
      {drafts && (
        <div className="space-y-2">
          <h3 className="font-medium">
            Draf test case · {suite.name} · {suite.phase}
          </h3>
          {!drafts.length && <p>Tidak ada draf baru untuk ditinjau.</p>}
          {drafts.map((draft) => (
            <article key={draft.id} className="rounded-md border border-border-subtle p-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(draft.id)}
                  disabled={draft.kind === "clarify" || Boolean(busy)}
                  onChange={() =>
                    setSelected((ids) =>
                      ids.includes(draft.id)
                        ? ids.filter((id) => id !== draft.id)
                        : [...ids, draft.id]
                    )
                  }
                />
                {draftLabels[draft.kind]} · {draft.title}
              </label>
              <details className="mt-1">
                <summary>Langkah dan rujukan</summary>
                {draft.kind !== "clarify" && (
                  <label className="my-2 block">
                    Judul skenario
                    <input
                      value={draft.title}
                      maxLength={255}
                      disabled={Boolean(busy)}
                      className={`${button} block w-full`}
                      onChange={(event) => {
                        const title = event.target.value;
                        setDrafts(
                          (items) =>
                            items?.map((item) =>
                              item.id === draft.id ? { ...item, title } : item
                            ) || null
                        );
                      }}
                    />
                  </label>
                )}
                {draft.preconditions && <p>Prasyarat · {draft.preconditions}</p>}
                {draft.testData && <p>Data uji · {draft.testData}</p>}
                <ol className="list-decimal pl-5">
                  {draft.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
                <p>Hasil yang diharapkan · {draft.expected}</p>
                <p>
                  {draft.sources
                    .map((source) => `${labels[source.kind]} · ${source.label}`)
                    .join(" | ")}
                </p>
              </details>
            </article>
          ))}
          {drafts.length > 0 && (
            <button
              type="button"
              className={button}
              onClick={save}
              disabled={!selected.length || Boolean(busy)}
            >
              Simpan {selected.length} test case ke {suite.phase}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
