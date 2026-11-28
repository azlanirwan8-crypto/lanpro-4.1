import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/CoreUI";
import type { PrototypeStep } from "../lib/imagePrototype";
import { requestPrototypeAnalysis } from "../services/flowchart.service";

const LIMIT = 12;
type Advice = Awaited<ReturnType<typeof requestPrototypeAnalysis>>;

export function PrototypeAnalysis({
  projectId,
  steps,
}: {
  projectId: string;
  steps: PrototypeStep[];
}) {
  const { t, i18n } = useTranslation();
  const active = useRef<AbortController | null>(null);
  const [advice, setAdvice] = useState<Advice>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const candidates = steps
    .map((step, index) => ({ ...step, number: index + 1 }))
    .filter((step) => step.status !== "Sesuai");

  useEffect(() => () => active.current?.abort(), []);

  async function analyze() {
    if (active.current) return;
    const request = new AbortController();
    active.current = request;
    setBusy(true);
    setFailed(false);
    try {
      const batch = candidates.slice(0, LIMIT).map((step) => ({
        ...step,
        screen: step.screen.slice(0, 300),
        action: step.action.slice(0, 300),
        actual: step.actual.slice(0, 300),
        expected: step.expected.slice(0, 300),
      }));
      const language = i18n.resolvedLanguage?.startsWith("id") ? "id" : "en";
      const result = await requestPrototypeAnalysis(projectId, language, batch, request.signal);
      if (!request.signal.aborted) setAdvice(result);
    } catch {
      if (!request.signal.aborted) setFailed(true);
    } finally {
      active.current = null;
      if (!request.signal.aborted) setBusy(false);
    }
  }

  if (!candidates.length) return null;

  return (
    <div className="space-y-2 pt-2 text-xs">
      <Button type="button" size="sm" disabled={busy} onClick={() => void analyze()}>
        {t("flowchartPrototype.analysisAction")}
      </Button>
      {busy && <p role="status">{t("flowchartPrototype.analysisBusy")}</p>}
      {failed && <p role="alert">{t("flowchartPrototype.analysisFailed")}</p>}
      {candidates.length > LIMIT && (
        <p className="text-content-muted">
          {t("flowchartPrototype.analysisLimit", { count: LIMIT })}
        </p>
      )}
      {advice && (
        <ul className="space-y-2" aria-label={t("flowchartPrototype.analysisTitle")}>
          {advice.map((item) => (
            <li key={item.step} className="space-y-1 rounded-md border border-border-divider p-2">
              <h5 className="font-semibold">
                {t("flowchartPrototype.analysisStep", { number: item.step })}
              </h5>
              <p>{item.explanation}</p>
              <p>
                <strong>{t("flowchartPrototype.analysisCorrection")}</strong> {item.correction}
              </p>
              <p>
                <strong>{t("flowchartPrototype.analysisRetest")}</strong> {item.retest}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
