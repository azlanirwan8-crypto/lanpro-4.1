import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { detectPrototypeControls } from "../services/flowchart.service";
import type { FlowNode, FlowEdge } from "../types";
import {
  compareClick,
  readDesign,
  type PrototypeImage,
  type PrototypeStep,
  type ScreenControl,
} from "../lib/imagePrototype";

const field =
  "rounded-lg border border-border-divider bg-surface px-2 py-1 text-sm text-content-body";
const button = field + " hover:bg-surface-muted";
type Props = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  project: string;
  start: string;
  edit: boolean;
  onClose: () => void;
  onSave: (image?: PrototypeImage) => void;
  onReport: (steps: PrototypeStep[]) => void;
};
export function ScreenPrototype({
  nodes,
  edges,
  project,
  start,
  edit,
  onClose,
  onSave,
  onReport,
}: Props) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [screen, setScreen] = useState(start);
  const node = nodes.find((n) => n.id === screen);
  const [draft, setDraft] = useState<PrototypeImage | undefined>(node?.prototypeImage);
  const [selected, select] = useState("");
  const [expected, expectEdge] = useState("");
  const [steps, setSteps] = useState<PrototypeStep[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const image = edit ? draft : node?.prototypeImage;
  const control = draft?.controls.find((c) => c.id === selected);
  const outgoing = edges.filter((e) => e.fromNodeId === screen);
  const name = (id: string) => nodes.find((n) => n.id === id)?.label || id || "Belum dipetakan";
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function update(patch: Partial<ScreenControl>) {
    if (draft)
      setDraft({
        ...draft,
        controls: draft.controls.map((c) => (c.id === selected ? { ...c, ...patch } : c)),
      });
  }
  async function read(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const src = await readDesign(file);
      if (src.length > 1800000) throw Error("Gambar terlalu besar setelah kompresi.");
      setDraft({ src, controls: [] });
      select("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gambar gagal dibaca.");
    } finally {
      setBusy(false);
    }
  }
  async function detect() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const result = await detectPrototypeControls(project, draft.src);
      const proposed = result.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
      }));
      if (!proposed.length) setError("Tidak ditemukan kontrol. Klik gambar untuk menandai area.");
      setDraft({ ...draft, controls: [...draft.controls, ...proposed] });
      select(proposed[0]?.id || "");
    } catch {
      setError("Deteksi gagal. Anda tetap bisa menandai area pada gambar.");
    } finally {
      setBusy(false);
    }
  }
  function move(action: string, target?: string) {
    const actual = nodes.find((n) => n.id === target)?.id || "";
    const wanted =
      outgoing.find((e) => e.id === (outgoing.length === 1 ? outgoing[0].id : expected))
        ?.toNodeId || "";
    const entry = compareClick(screen, action, actual, wanted);
    const next = [
      ...steps,
      { ...entry, screen: name(screen), actual: name(actual), expected: name(wanted) },
    ];
    setSteps(next);
    onReport(next);
    if (actual) {
      setScreen(actual);
      expectEdge("");
      setFileNames({});
    } else setError("Tombol ini belum memiliki tujuan. Temuan dicatat di Flow Report.");
  }
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-label={edit ? t("flowchart.prototype.editor") : t("flowchart.prototype.player")}
      className="m-auto max-h-[92vh] w-[min(58rem,94vw)] overflow-auto rounded-xl border border-border-divider bg-surface p-4 text-content-body shadow-lg"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          {edit ? t("flowchart.prototype.image") : t("flowchart.prototype.player")} · {name(screen)}
        </h2>
        <button className={button} onClick={onClose}>
          Tutup
        </button>
      </header>
      {edit && (
        <fieldset disabled={busy} className="mb-3 flex flex-wrap items-center gap-2">
          <label className={button}>
            {draft ? t("flowchart.prototype.replaceImage") : t("flowchart.prototype.selectImage")}
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => void read(e.target.files?.[0])}
            />
          </label>
          {draft && (
            <>
              <button className={button} onClick={detect}>
                Deteksi area dengan AI
              </button>
              <button
                className={button}
                onClick={() => {
                  setDraft(undefined);
                  select("");
                }}
              >
                Lepas gambar
              </button>
            </>
          )}
        </fieldset>
      )}
      {!edit && outgoing.length > 1 && (
        <label className="mb-2 block">
          Cabang yang diharapkan{" "}
          <select className={field} value={expected} onChange={(e) => expectEdge(e.target.value)}>
            <option value="">{t("flowchart.prototype.selectBranch")}</option>
            {outgoing.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label || name(e.toNodeId)}
              </option>
            ))}
          </select>
        </label>
      )}
      {edit && image && (
        <p className="mb-2 text-xs text-content-muted">
          Klik gambar untuk menandai kontrol. Pilih area untuk mengatur ukuran, jenis, dan tujuan.
        </p>
      )}
      {image && (
        <div key={screen} className="relative mx-auto w-fit max-w-full">
          <img
            src={image.src}
            alt={name(screen)}
            className="block max-h-[56vh] max-w-full object-contain"
            onClick={(e) => {
              if (!edit || busy || !draft) return;
              const box = e.currentTarget.getBoundingClientRect();
              const c: ScreenControl = {
                id: crypto.randomUUID(),
                kind: "button",
                label: "Tombol",
                x: Math.max(0, Math.min(80, ((e.clientX - box.left) / box.width) * 100 - 10)),
                y: Math.max(0, Math.min(92, ((e.clientY - box.top) / box.height) * 100 - 4)),
                width: 20,
                height: 8,
              };
              setDraft({ ...draft, controls: [...draft.controls, c] });
              select(c.id);
            }}
          />
          {image.controls.map((c) => {
            const style: React.CSSProperties = {
              position: "absolute",
              left: c.x + "%",
              top: c.y + "%",
              width: c.width + "%",
              height: c.height + "%",
            };
            if (edit)
              return (
                <button
                  key={c.id}
                  disabled={busy}
                  aria-label={c.label}
                  style={style}
                  onClick={() => select(c.id)}
                  className={
                    "overflow-hidden rounded border border-primary text-xs " +
                    (selected === c.id ? "bg-primary/30" : "bg-primary/10")
                  }
                >
                  {c.label}
                </button>
              );
            if (c.kind === "text")
              return (
                <input
                  key={c.id}
                  aria-label={c.label}
                  autoComplete="off"
                  style={style}
                  className={field}
                />
              );
            if (c.kind === "file")
              return (
                <label
                  key={c.id}
                  style={style}
                  className="overflow-hidden rounded focus-within:ring-2 focus-within:ring-primary"
                >
                  {fileNames[c.id]}
                  <input
                    aria-label={c.label}
                    type="file"
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                    onChange={(e) =>
                      setFileNames({ ...fileNames, [c.id]: e.target.files?.[0]?.name || "" })
                    }
                  />
                </label>
              );
            return (
              <button
                key={c.id}
                aria-label={c.label}
                style={style}
                disabled={outgoing.length > 1 && !expected}
                className="rounded hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => move(c.label, c.target)}
              />
            );
          })}
        </div>
      )}
      {edit && control && (
        <fieldset disabled={busy} className="mt-3 grid gap-2 sm:grid-cols-3">
          <label>
            Nama{" "}
            <input
              className={field}
              value={control.label}
              onChange={(e) => update({ label: e.target.value })}
            />
          </label>
          <label>
            Jenis{" "}
            <select
              className={field}
              value={control.kind}
              onChange={(e) => update({ kind: e.target.value as ScreenControl["kind"] })}
            >
              <option value="button">Tombol</option>
              <option value="text">Teks</option>
              <option value="file">{t("flowchart.prototype.simulatedUpload")}</option>
            </select>
          </label>
          {control.kind === "button" && (
            <label>
              Tujuan tombol{" "}
              <select
                className={field}
                value={control.target || ""}
                onChange={(e) => update({ target: e.target.value })}
              >
                <option value="">{t("flowchart.prototype.selectScreen")}</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {name(n.id)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(["x", "y", "width", "height"] as const).map((key, i) => (
            <label key={key}>
              {["Kiri", "Atas", "Lebar", "Tinggi"][i]} (%){" "}
              <input
                className={field}
                type="number"
                min={i < 2 ? 0 : 1}
                max={100}
                value={Math.round(control[key])}
                onChange={(e) => {
                  const max = [
                    100 - control.width,
                    100 - control.height,
                    100 - control.x,
                    100 - control.y,
                  ][i];
                  update({ [key]: Math.max(i < 2 ? 0 : 1, Math.min(max, Number(e.target.value))) });
                }}
              />
            </label>
          ))}
          <button
            className={button}
            onClick={() => {
              if (draft)
                setDraft({ ...draft, controls: draft.controls.filter((c) => c.id !== selected) });
              select("");
            }}
          >
            Hapus area
          </button>
        </fieldset>
      )}
      {!edit && !image && (
        <div className="space-y-2">
          <p>{outgoing.length ? t("flowchart.prototype.noImage") : t("flowchart.prototype.end")}</p>
          {outgoing.map((e) => (
            <button
              key={e.id}
              className={button}
              onClick={() => {
                setScreen(e.toNodeId);
                expectEdge("");
                setError("");
              }}
            >
              {e.label || name(e.toNodeId)}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{t("flowchart.prototype.processing")}</p>}
      <footer className="mt-3 flex justify-end">
        {edit ? (
          <button
            className="btn-primary rounded-lg px-3 py-2"
            disabled={busy}
            onClick={() => onSave(draft)}
          >
            Simpan
          </button>
        ) : (
          <button
            className={button}
            onClick={() => {
              onReport(steps);
              onClose();
            }}
          >
            Selesai dan lihat laporan
          </button>
        )}
      </footer>
    </dialog>
  );
}
