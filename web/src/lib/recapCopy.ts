import { teamByApiName } from "../data/teams";
import type { MatchRecap, NarrativeLanguage, TeamRecapStats } from "../types/match";

/**
 * Deterministic recap text, built only from the backend's recap statistics. Used when
 * OpenAI is off, still writing, failed, or has no text for the selected language.
 */

type Copy = {
  title: Record<MatchRecap["phase"], string>;
  aiPending: string;
  localSource: string;
  stats: { passes: string; shots: string; tackles: string; surges: string; pressure: string };
  score: (phase: string, home: string, hs: number, as: number, away: string) => string;
  passing: (home: string, h: TeamRecapStats, away: string, a: TeamRecapStats) => string;
  shots: (home: string, h: number, away: string, a: number) => string;
  surges: (home: string, h: number, away: string, a: number) => string;
  strongest: (team: string, minute: number, average: string) => string;
  caveat: (events: number) => string;
};

const pct = (value: number | null) => (value === null ? "–" : `${value}%`);
const dec = (value: number, lang: NarrativeLanguage) => (lang === "es" || lang === "fr" ? value.toFixed(2).replace(".", ",") : value.toFixed(2));

export const RECAP_COPY: Record<NarrativeLanguage, Copy> = {
  en: {
    title: { half_time: "Half-time recap", full_time: "Full-time recap" },
    aiPending: "AI recap is being written…",
    localSource: "Local summary",
    stats: { passes: "Passes (accuracy)", shots: "Shots (on target)", tackles: "Tackles won", surges: "Pressure surges", pressure: "Avg pressure" },
    score: (phase, home, hs, as, away) => `${phase}: ${home} ${hs}–${as} ${away}.`,
    passing: (home, h, away, a) =>
      `${home} completed ${h.completed_passes} of ${h.passes} passes (${pct(h.pass_accuracy)}); ${away} completed ${a.completed_passes} of ${a.passes} (${pct(a.pass_accuracy)}).`,
    shots: (home, h, away, a) => `Shots: ${home} ${h}, ${away} ${a}.`,
    surges: (home, h, away, a) => `Sustained pressure surges detected: ${home} ${h}, ${away} ${a}.`,
    strongest: (team, minute, average) => `The strongest came from ${team} in minute ${minute} (average ${average}).`,
    caveat: (events) =>
      `Based on ${events.toLocaleString("en")} simulated events. Pressure shows pressing intensity, not control or chance quality.`,
  },
  es: {
    title: { half_time: "Resumen del descanso", full_time: "Resumen final" },
    aiPending: "La IA está redactando el resumen…",
    localSource: "Resumen local",
    stats: { passes: "Pases (precisión)", shots: "Tiros (a puerta)", tackles: "Entradas ganadas", surges: "Oleadas de presión", pressure: "Presión media" },
    score: (phase, home, hs, as, away) => `${phase}: ${home} ${hs}–${as} ${away}.`,
    passing: (home, h, away, a) =>
      `${home} completó ${h.completed_passes} de ${h.passes} pases (${pct(h.pass_accuracy)}); ${away} completó ${a.completed_passes} de ${a.passes} (${pct(a.pass_accuracy)}).`,
    shots: (home, h, away, a) => `Tiros: ${home} ${h}, ${away} ${a}.`,
    surges: (home, h, away, a) => `Oleadas de presión sostenida detectadas: ${home} ${h}, ${away} ${a}.`,
    strongest: (team, minute, average) => `La más intensa fue de ${team} en el minuto ${minute} (media ${average}).`,
    caveat: (events) =>
      `Basado en ${events.toLocaleString("es")} eventos simulados. La presión mide la intensidad, no el control ni la calidad de las ocasiones.`,
  },
  fr: {
    title: { half_time: "Résumé de la mi-temps", full_time: "Résumé final" },
    aiPending: "L’IA rédige le résumé…",
    localSource: "Résumé local",
    stats: { passes: "Passes (précision)", shots: "Tirs (cadrés)", tackles: "Tacles gagnés", surges: "Temps forts de pressing", pressure: "Pression moyenne" },
    score: (phase, home, hs, as, away) => `${phase} : ${home} ${hs}–${as} ${away}.`,
    passing: (home, h, away, a) =>
      `${home} a réussi ${h.completed_passes} passes sur ${h.passes} (${pct(h.pass_accuracy)}) ; ${away} ${a.completed_passes} sur ${a.passes} (${pct(a.pass_accuracy)}).`,
    shots: (home, h, away, a) => `Tirs : ${home} ${h}, ${away} ${a}.`,
    surges: (home, h, away, a) => `Temps forts de pressing détectés : ${home} ${h}, ${away} ${a}.`,
    strongest: (team, minute, average) => `Le plus intense : ${team} à la ${minute}e minute (moyenne ${average}).`,
    caveat: (events) =>
      `Basé sur ${events.toLocaleString("fr")} événements simulés. La pression mesure l’intensité, pas le contrôle ni la qualité des occasions.`,
  },
  yo: {
    title: { half_time: "Àkópọ̀ ìdajì àkọ́kọ́", full_time: "Àkópọ̀ ìparí ìfẹsẹ̀wọnsẹ̀" },
    aiPending: "AI ń kọ àkópọ̀ náà…",
    localSource: "Àkópọ̀ agbègbè",
    stats: { passes: "Ìkọjá bọ́ọ̀lù (ìpéye)", shots: "Ìgbìyànjú sí góòlù", tackles: "Ìgbàbọ́ọ̀lù tó yọrí", surges: "Ìgbì titẹ", pressure: "Àpapọ̀ titẹ" },
    score: (phase, home, hs, as, away) => `${phase}: ${home} ${hs}–${as} ${away}.`,
    passing: (home, h, away, a) =>
      `${home} parí ìkọjá ${h.completed_passes} nínú ${h.passes} (${pct(h.pass_accuracy)}); ${away} parí ${a.completed_passes} nínú ${a.passes} (${pct(a.pass_accuracy)}).`,
    shots: (home, h, away, a) => `Ìgbìyànjú sí góòlù: ${home} ${h}, ${away} ${a}.`,
    surges: (home, h, away, a) => `Ìgbì titẹ tó ń bá a lọ: ${home} ${h}, ${away} ${a}.`,
    strongest: (team, minute, average) => `Èyí tó lágbára jù lọ wá láti ọ̀dọ̀ ${team} ní ìṣẹ́jú ${minute} (àpapọ̀ ${average}).`,
    caveat: (events) =>
      `Ó dá lórí iṣẹ́lẹ̀ àfarawé ${events.toLocaleString("en")}. Titẹ ń fi agbára hàn, kì í ṣe ìṣàkóso pápá tàbí àǹfààní góòlù.`,
  },
};

const nameOf = (id: string) => teamByApiName(id)?.name ?? id;

/** The local recap as short paragraphs, using only the backend's numbers. */
export function localRecapLines(recap: MatchRecap, lang: NarrativeLanguage): string[] {
  const copy = RECAP_COPY[lang];
  const home = nameOf(recap.home_team_id);
  const away = nameOf(recap.away_team_id);
  const h = recap.teams[recap.home_team_id]!;
  const a = recap.teams[recap.away_team_id]!;
  const lines = [
    copy.score(phaseLabel(recap.phase, lang), home, recap.score.home, recap.score.away, away),
    copy.passing(home, h, away, a),
    copy.shots(home, h.shots, away, a.shots),
    copy.surges(home, recap.pressure_surges[recap.home_team_id] ?? 0, away, recap.pressure_surges[recap.away_team_id] ?? 0),
  ];
  const strongest = [...recap.key_moments].sort((x, y) => y.average - x.average)[0];
  if (strongest) lines.push(copy.strongest(nameOf(strongest.team_id), strongest.minute, dec(strongest.average, lang)));
  lines.push(copy.caveat(recap.events_analysed));
  return lines;
}

const PHASE_LABEL: Record<NarrativeLanguage, Record<MatchRecap["phase"], string>> = {
  en: { half_time: "Half-time", full_time: "Full-time" },
  es: { half_time: "Descanso", full_time: "Final" },
  fr: { half_time: "Mi-temps", full_time: "Fin du match" },
  yo: { half_time: "Ìsinmi ààbọ̀", full_time: "Ìparí ìfẹsẹ̀wọnsẹ̀" },
};

export const phaseLabel = (phase: MatchRecap["phase"], lang: NarrativeLanguage) => PHASE_LABEL[lang][phase];

export const formatAverage = dec;
