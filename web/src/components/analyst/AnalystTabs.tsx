import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "./analyst.css";
import { PERIOD_LABELS, type Period, type PeriodKind } from "../../lib/analysis";

export type AnalystTab = "overview" | "players" | "passing" | "teams" | "events";

const TABS: { id: AnalystTab; label: string }[] = [
  { id: "overview", label: "Tactical Overview" },
  { id: "players", label: "Player Analysis" },
  { id: "passing", label: "Passing Network" },
  { id: "teams", label: "Team Comparison" },
  { id: "events", label: "Event Analysis" },
];

type AnalystNavProps = {
  tab: AnalystTab;
  onTabChange: (tab: AnalystTab) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  maxMinute: number;
};

export function AnalystNav({ tab, onTabChange, period, onPeriodChange, maxMinute }: AnalystNavProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep the active tab visible when the strip scrolls on narrow screens
  // (e.g. after "View all" switches tabs). Scrolls the strip only, not the page.
  useEffect(() => {
    const list = listRef.current;
    const active = refs.current[TABS.findIndex((item) => item.id === tab)];
    if (!list || !active) return;
    const left = active.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + active.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = left - 8;
    }
  }, [tab]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + TABS.length) % TABS.length;
    onTabChange(TABS[next]!.id);
    refs.current[next]?.focus();
  };

  return (
    <div className="analyst-nav">
      <div className="analyst-tabs" role="tablist" aria-label="Analyst Mode sections" ref={listRef}>
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`analyst-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`analyst-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <PeriodSelector period={period} onChange={onPeriodChange} maxMinute={maxMinute} />
    </div>
  );
}

type PeriodSelectorProps = { period: Period; onChange: (period: Period) => void; maxMinute: number };

function PeriodSelector({ period, onChange, maxMinute }: PeriodSelectorProps) {
  const [from, setFrom] = useState(String(period.fromMin));
  const [to, setTo] = useState(String(period.toMin));
  const fromNum = Number(from);
  const toNum = Number(to);
  const valid = Number.isInteger(fromNum) && Number.isInteger(toNum) && fromNum >= 0 && toNum > fromNum;

  const select = (kind: PeriodKind) => {
    if (kind === "custom") onChange({ kind, fromMin: valid ? fromNum : 0, toMin: valid ? toNum : 90 });
    else onChange({ kind, fromMin: 0, toMin: 90 });
  };

  return (
    <div className="period-selector">
      <div className="period-options" role="group" aria-label="Match period">
        {(Object.keys(PERIOD_LABELS) as PeriodKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={period.kind === kind}
            onClick={() => select(kind)}
          >
            {PERIOD_LABELS[kind]}
          </button>
        ))}
      </div>

      {period.kind === "custom" && (
        <form
          className="custom-period"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onChange({ kind: "custom", fromMin: fromNum, toMin: toNum });
          }}
        >
          <label>
            <span className="sr-only">From minute</span>
            <input
              type="number"
              min={0}
              max={maxMinute}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-invalid={!valid}
            />
          </label>
          <span aria-hidden="true">–</span>
          <label>
            <span className="sr-only">To minute</span>
            <input
              type="number"
              min={1}
              max={maxMinute + 1}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-invalid={!valid}
            />
          </label>
          <span className="custom-unit">min</span>
          <button type="submit" disabled={!valid}>
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
