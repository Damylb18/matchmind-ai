import { useState } from "react";
import { teamByApiName } from "../data/teams";
import { useExplanationPreferences, type ExplanationAudience } from "../lib/explanation";
import { shortModel } from "../lib/personalisation";
import { RECAP_COPY, formatAverage, localRecapLines } from "../lib/recapCopy";
import type { MatchRecap as Recap } from "../types/match";
import { TeamCrest } from "./TeamCrest";

type MatchRecapProps = {
  recaps: Partial<Record<Recap["phase"], Recap>>;
  audience: ExplanationAudience;
  /** Hides the statistics table (Broadcast side panel). */
  compact?: boolean;
};

/**
 * Half-time / full-time recap. Statistics always come from the backend; the prose is
 * OpenAI text for this audience and language when available, else a local summary.
 * Renders nothing until the backend sends a recap.
 */
export function MatchRecap({ recaps, audience, compact = false }: MatchRecapProps) {
  const { language } = useExplanationPreferences();
  const available = (["full_time", "half_time"] as const).filter((phase) => recaps[phase]);
  const [picked, setPicked] = useState<Recap["phase"] | null>(null);
  const phase = picked && recaps[picked] ? picked : available[0];
  const recap = phase ? recaps[phase] : undefined;
  if (!recap) return null;

  const copy = RECAP_COPY[language];
  const ai = recap.ai?.variants[language]?.[audience];
  const home = teamByApiName(recap.home_team_id);
  const away = teamByApiName(recap.away_team_id);
  const h = recap.teams[recap.home_team_id]!;
  const a = recap.teams[recap.away_team_id]!;
  const sourceTitle = ai
    ? "Written by an OpenAI model on the MatchMind backend from the recap statistics below, then checked so every number matches them."
    : "Built from the backend's recap statistics with a local template. No language model involved.";

  const rows: [string, string, string][] = [
    [copy.stats.passes, `${h.passes} (${h.pass_accuracy ?? "–"}%)`, `${a.passes} (${a.pass_accuracy ?? "–"}%)`],
    [copy.stats.shots, `${h.shots} (${h.shots_on_target})`, `${a.shots} (${a.shots_on_target})`],
    [copy.stats.tackles, `${h.tackles_won}/${h.tackles}`, `${a.tackles_won}/${a.tackles}`],
    [
      copy.stats.surges,
      String(recap.pressure_surges[recap.home_team_id] ?? 0),
      String(recap.pressure_surges[recap.away_team_id] ?? 0),
    ],
    [
      copy.stats.pressure,
      h.average_pressure === null ? "–" : formatAverage(h.average_pressure, language),
      a.average_pressure === null ? "–" : formatAverage(a.average_pressure, language),
    ],
  ];

  return (
    <section className={`panel recap-panel${compact ? " is-compact" : ""}`} aria-label={copy.title[recap.phase]}>
      <header className="panel-head">
        <h2>{copy.title[recap.phase]}</h2>
        {available.length > 1 && (
          <div className="recap-phases" role="group" aria-label="Recap">
            {available.map((item) => (
              <button
                key={item}
                type="button"
                className={item === phase ? "is-active" : undefined}
                aria-pressed={item === phase}
                onClick={() => setPicked(item)}
              >
                {item === "half_time" ? "HT" : "FT"}
              </button>
            ))}
          </div>
        )}
        <span className={`insight-source source-${ai ? "openai" : "local-demo-template"}`} title={sourceTitle}>
          {ai ? `OpenAI · ${shortModel(recap.ai?.model)}` : copy.localSource} · {language.toUpperCase()}
        </span>
      </header>

      <div className="recap-score">
        {home && <TeamCrest team={home} size={22} />}
        <strong>
          {home?.code ?? recap.home_team_id} {recap.score.home}–{recap.score.away} {away?.code ?? recap.away_team_id}
        </strong>
        {away && <TeamCrest team={away} size={22} />}
      </div>

      <div className="recap-body" lang={language}>
        {ai ? (
          <>
            <h3>{ai.headline}</h3>
            <p>{ai.summary}</p>
          </>
        ) : (
          <>
            {recap.ai_status === "pending" && <p className="recap-pending">{copy.aiPending}</p>}
            {localRecapLines(recap, language).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </>
        )}
      </div>

      {!compact && (
        <table className="recap-stats">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Statistic</span>
              </th>
              <th scope="col">{home?.code ?? recap.home_team_id}</th>
              <th scope="col">{away?.code ?? recap.away_team_id}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, hv, av]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{hv}</td>
                <td>{av}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
