import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { LAPISAN_MENU_PAPAN } from "./NodeContextMenu";

interface DockAction {
  label: string;
  action: () => void;
  pressed?: boolean;
  danger?: boolean;
  testId?: string;
}

interface DockGroup {
  label?: string;
  actions: DockAction[];
}

export function CanvasDockMenu({
  label,
  icon,
  caption,
  groups,
  testId,
}: {
  label: string;
  icon?: ReactNode;
  caption?: string;
  groups: DockGroup[];
  testId?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    panel.current?.querySelector("button")?.focus({ preventScroll: true });
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      ) {
        setPosition(null);
      }
    };
    const close = () => setPosition(null);
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  const close = () => {
    setPosition(null);
    trigger.current?.focus({ preventScroll: true });
  };
  const actions = groups.map((group, index) => (
    <div
      key={group.label ?? index}
      role={group.label ? "group" : undefined}
      aria-label={group.label}
    >
      {group.label && (
        <p className="px-3 pb-1 pt-2 text-xs font-medium text-content-subtle">{group.label}</p>
      )}
      {group.actions.map(({ label: name, action, pressed, danger, testId: actionTestId }) => (
        <button
          key={name}
          type="button"
          title={name}
          aria-pressed={pressed}
          data-testid={actionTestId}
          onClick={() => {
            close();
            action();
          }}
          className={cn(
            "min-h-11 w-full rounded-md px-3 py-2 text-left text-xs font-medium hover:bg-surface-muted focus-visible:ring-1 focus-visible:ring-primary",
            danger ? "text-danger-text" : "text-content-body",
            pressed && "bg-primary/10 text-primary"
          )}
        >
          {name}
          {pressed && (
            <span aria-hidden className="float-right pl-2">
              <Check className="size-4" />
            </span>
          )}
        </button>
      ))}
    </div>
  ));

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={position !== null}
        aria-controls={id}
        title={label}
        data-testid={testId}
        onClick={() => {
          if (position) {
            close();
            return;
          }
          const rect = trigger.current?.getBoundingClientRect();
          if (rect) {
            setPosition({
              left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)),
              bottom: window.innerHeight - rect.top + 8,
            });
          }
        }}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs font-medium text-content-body hover:bg-surface-muted focus-visible:ring-1 focus-visible:ring-primary"
      >
        {icon}
        {caption && <span className={icon ? "hidden sm:inline" : undefined}>{caption}</span>}
      </button>
      {position ? (
        createPortal(
          <div
            id={id}
            ref={panel}
            role="group"
            aria-label={label}
            style={position}
            className={cn(
              LAPISAN_MENU_PAPAN,
              "max-h-[55vh] w-56 max-w-[calc(100vw_-_16px)] overflow-y-auto rounded-lg border border-border-panel-divider bg-surface p-1 shadow-lg"
            )}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => {
              if (
                event.relatedTarget !== trigger.current &&
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setPosition(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
          >
            {actions}
          </div>,
          document.body
        )
      ) : (
        <div id={id} hidden>
          {actions}
        </div>
      )}
    </>
  );
}
