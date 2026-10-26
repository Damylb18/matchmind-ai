/* MatchMind integration note: this module intentionally exports its provider, hook and
   adaptInsight together (shared API across modes), so Fast Refresh's component-only rule
   is disabled here rather than splitting the teammate's module. */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Insight } from "../types/match";

export type ExplanationLanguage = "en" | "es" | "fr" | "yo";
export type ExplanationAudience = "fan" | "analyst" | "broadcast";

type ExplanationPreferences = {
  language: ExplanationLanguage;
  setLanguage: (language: ExplanationLanguage) => void;
};

export type StructuredExplanation = {
  headline: string;
  explanation: string;
  takeaway: string;
  evidenceNote: string;
  audience: ExplanationAudience;
  language: ExplanationLanguage;
  source: "local-demo-template" | "backend-fallback";
};

type CopyTemplate = {
  headline: string;
  explanation: string;
  takeaway: string;
  evidenceNote: string;
};

type StructuredInsightData = {
  team?: unknown;
  completedPasses?: unknown;
  totalPasses?: unknown;
  passAccuracy?: unknown;
  shotCount?: unknown;
  pressureAverage?: unknown;
  pressureEventCount?: unknown;
};

const PreferencesContext =
  createContext<ExplanationPreferences | null>(null);

export function ExplanationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguage] =
    useState<ExplanationLanguage>("en");

  return (
    <PreferencesContext.Provider value={{ language, setLanguage }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useExplanationPreferences() {
  const value = useContext(PreferencesContext);

  if (!value) {
    throw new Error(
      "useExplanationPreferences must be used inside ExplanationProvider",
    );
  }

  return value;
}

export const LANGUAGE_NAMES: Record<ExplanationLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  yo: "Yorùbá",
};

const COPY: Record<
  ExplanationLanguage,
  Record<string, Record<ExplanationAudience, CopyTemplate>>
> = {
  en: {
    pressure_surge: {
      fan: {
        headline: "Pressure is building",
        explanation:
          "{team} recorded an average pressure intensity of {average} across {events} recent pressure events. This suggests sustained pressure, but does not prove territorial control or clear chances.",
        takeaway: "Watch whether the pressure leads to a clear chance.",
        evidenceNote:
          "Based on recent pressure events. Intensity alone does not prove control or scoring threat.",
      },
      analyst: {
        headline: "Sustained pressure intensity",
        explanation:
          "{team} averaged {average} pressure intensity across {events} pressure events. Compare this with field position, recoveries and shot creation before inferring dominance.",
        takeaway:
          "Cross-check pressure with territory and chance creation.",
        evidenceNote:
          "Rule trigger: average pressure intensity of at least 0.75 across 5 events.",
      },
      broadcast: {
        headline: "{team}: pressure is building",
        explanation:
          "{team} are sustaining pressure, averaging {average} across their latest pressure events. Can they turn that intensity into a dangerous opportunity?",
        takeaway: "Sustained pressure — can they turn it into a chance?",
        evidenceNote:
          "Rule-based insight. Pressure intensity alone does not prove territorial control.",
      },
    },
    passing_pattern: {
      fan: {
        headline: "Passing accuracy needs attention",
        explanation:
          "{team} completed {completed} of their last {total} passes ({accuracy}%). Watch whether they settle their passing or continue giving the ball away.",
        takeaway: "The next few passes will show whether they improve.",
        evidenceNote:
          "Based on the team's latest 10 recorded passes.",
      },
      analyst: {
        headline: "Passing completion pattern",
        explanation:
          "{team} completed {completed} of {total} passes ({accuracy}%). Completion rate alone does not establish progression or explain failed passes.",
        takeaway:
          "Compare completion with pass length, field zone and pressure.",
        evidenceNote:
          "The rule triggers below 50% or at least 85% completion over 10 passes.",
      },
      broadcast: {
        headline: "{team}: passing pattern emerges",
        explanation:
          "{team} have completed {completed} of their last {total} passes ({accuracy}%). The question is whether they can find more reliable passing options.",
        takeaway: "Can they improve their execution in possession?",
        evidenceNote:
          "Based on the latest 10 recorded team passes.",
      },
    },
    shot_activity: {
      fan: {
        headline: "More shots are coming",
        explanation:
          "{team} recorded {count} shots in the recent event window. That means more attempts, but we do not yet know how dangerous they were.",
        takeaway: "Watch whether the next attempt creates a clearer chance.",
        evidenceNote:
          "Based on shots in the latest 30 match events. Shot location and outcome are unavailable.",
      },
      analyst: {
        headline: "Recent shot activity",
        explanation:
          "{team} recorded {count} shots in the recent event window. Shot volume alone does not establish expected goals, shot quality or attacking dominance.",
        takeaway:
          "Add shot location and outcome data to assess attacking threat.",
        evidenceNote:
          "Trigger: at least two team shots in the latest 30 match events.",
      },
      broadcast: {
        headline: "{team}: more shots in the recent spell",
        explanation:
          "{team} have registered {count} shots in this spell. The question is whether they can turn those attempts into a dangerous chance.",
        takeaway: "More attempts — can they make one count?",
        evidenceNote:
          "Rule-based shot count. Shot location and outcome are unavailable.",
      },
    },
  },

  es: {
    pressure_surge: {
      fan: {
        headline: "Aumenta la presión",
        explanation:
          "{team} registró una intensidad media de presión de {average} en {events} acciones recientes. Esto sugiere presión sostenida, pero no demuestra dominio territorial.",
        takeaway: "Veamos si la presión genera una ocasión clara.",
        evidenceNote:
          "Basado en acciones recientes de presión.",
      },
      analyst: {
        headline: "Intensidad de presión sostenida",
        explanation:
          "{team} promedió {average} de intensidad en {events} acciones de presión. Contrasta el dato con la posición en el campo y las ocasiones creadas.",
        takeaway: "Compara la presión con las recuperaciones y los tiros.",
        evidenceNote:
          "Regla: promedio igual o superior a 0,75 en 5 acciones.",
      },
      broadcast: {
        headline: "{team}: aumenta la presión",
        explanation:
          "{team} mantiene la presión, con una media de {average}. ¿Podrá convertir esa intensidad en una ocasión peligrosa?",
        takeaway: "Presión sostenida: ¿podrán crear una ocasión?",
        evidenceNote: "Dato generado por reglas del sistema.",
      },
    },
    passing_pattern: {
      fan: {
        headline: "Atención a los pases",
        explanation:
          "{team} completó {completed} de sus últimos {total} pases ({accuracy}%). Habrá que ver si mejora o sigue perdiendo el balón.",
        takeaway: "Observa los próximos pases para ver si mejora.",
        evidenceNote: "Basado en los últimos 10 pases registrados.",
      },
      analyst: {
        headline: "Patrón de pases completados",
        explanation:
          "{team} completó {completed} de {total} pases ({accuracy}%). El porcentaje no demuestra por sí solo progresión ni explica los fallos.",
        takeaway:
          "Compara la precisión con la zona del campo y la presión.",
        evidenceNote:
          "Umbrales: menos del 50% o al menos el 85% en 10 pases.",
      },
      broadcast: {
        headline: "{team}: aparece un patrón de pase",
        explanation:
          "{team} ha completado {completed} de sus últimos {total} pases ({accuracy}%). La clave será encontrar opciones más fiables.",
        takeaway: "¿Podrán mejorar con el balón?",
        evidenceNote: "Basado en los últimos 10 pases del equipo.",
      },
    },
    shot_activity: {
      fan: {
        headline: "Llegan más remates",
        explanation:
          "{team} registró {count} remates en los eventos recientes. Todavía no sabemos si fueron ocasiones peligrosas.",
        takeaway: "Veamos si el próximo remate genera una ocasión clara.",
        evidenceNote: "Basado en los últimos 30 eventos del partido.",
      },
      analyst: {
        headline: "Actividad reciente de remates",
        explanation:
          "{team} registró {count} remates. El volumen por sí solo no demuestra la calidad de las ocasiones ni el dominio ofensivo.",
        takeaway: "Añade la ubicación y el resultado de los remates.",
        evidenceNote:
          "Regla: al menos dos remates en los últimos 30 eventos.",
      },
      broadcast: {
        headline: "{team}: más remates en este tramo",
        explanation:
          "{team} ha sumado {count} remates. ¿Podrá convertir alguno en una ocasión realmente peligrosa?",
        takeaway: "Más intentos: ¿podrán aprovechar uno?",
        evidenceNote: "Recuento de remates basado en reglas.",
      },
    },
  },

  fr: {
    pressure_surge: {
      fan: {
        headline: "La pression monte",
        explanation:
          "{team} a atteint une intensité moyenne de {average} sur {events} actions de pressing récentes. Cela suggère une pression soutenue sans prouver une domination territoriale.",
        takeaway: "Voyons si cette pression crée une vraie occasion.",
        evidenceNote: "Basé sur les actions de pressing récentes.",
      },
      analyst: {
        headline: "Intensité de pressing soutenue",
        explanation:
          "{team} affiche une moyenne de {average} sur {events} actions de pressing. Comparez cette mesure à la position sur le terrain et aux occasions créées.",
        takeaway: "Croisez la pression avec les récupérations et les tirs.",
        evidenceNote:
          "Déclencheur : moyenne supérieure ou égale à 0,75 sur 5 actions.",
      },
      broadcast: {
        headline: "{team} : la pression monte",
        explanation:
          "{team} maintient la pression avec une moyenne de {average}. L'équipe peut-elle transformer cette intensité en occasion dangereuse ?",
        takeaway: "Pression soutenue : l'équipe peut-elle créer une occasion ?",
        evidenceNote: "Information issue d'une règle backend.",
      },
    },
    passing_pattern: {
      fan: {
        headline: "Attention à la précision des passes",
        explanation:
          "{team} a réussi {completed} passes sur {total} ({accuracy} %). Voyons si l'équipe améliore ses passes ou continue de perdre le ballon.",
        takeaway: "Les prochaines passes montreront si l'équipe se reprend.",
        evidenceNote: "Basé sur les 10 dernières passes enregistrées.",
      },
      analyst: {
        headline: "Tendance de réussite des passes",
        explanation:
          "{team} a réussi {completed} passes sur {total} ({accuracy} %). Ce taux ne prouve ni la progression ni la cause des échecs.",
        takeaway:
          "Comparez la réussite à la zone du terrain et à la pression.",
        evidenceNote:
          "Seuils : moins de 50 % ou au moins 85 % sur 10 passes.",
      },
      broadcast: {
        headline: "{team} : une tendance se dessine dans les passes",
        explanation:
          "{team} a réussi {completed} passes sur {total} ({accuracy} %). Il faudra trouver des solutions de passe plus fiables.",
        takeaway: "L'équipe peut-elle mieux conserver le ballon ?",
        evidenceNote: "Basé sur les 10 dernières passes enregistrées.",
      },
    },
    shot_activity: {
      fan: {
        headline: "Les tirs se multiplient",
        explanation:
          "{team} a enregistré {count} tirs dans la séquence récente. Leur dangerosité reste inconnue.",
        takeaway: "Voyons si le prochain tir crée une occasion plus nette.",
        evidenceNote: "Basé sur les 30 derniers événements du match.",
      },
      analyst: {
        headline: "Activité récente des tirs",
        explanation:
          "{team} a enregistré {count} tirs. Le volume seul ne permet pas d'établir la qualité des tirs ou une domination offensive.",
        takeaway: "Ajoutez l'emplacement et le résultat des tirs.",
        evidenceNote:
          "Déclencheur : au moins deux tirs sur les 30 derniers événements.",
      },
      broadcast: {
        headline: "{team} : davantage de tirs dans cette séquence",
        explanation:
          "{team} a tenté {count} tirs. Reste à savoir si l'équipe peut en faire une véritable occasion.",
        takeaway: "Plus de tentatives : l'équipe saura-t-elle en profiter ?",
        evidenceNote: "Décompte des tirs basé sur des règles.",
      },
    },
  },

  yo: {
    pressure_surge: {
      fan: {
        headline: "Titẹ ere ń pọ si",
        explanation:
          "{team} ní ìwọ̀n agbára titẹ {average} ní àwọn iṣẹ́ titẹ {events} tó ṣẹ̀ṣẹ̀ ṣẹlẹ̀. Èyí ń tọ́ka sí titẹ tó ń bá a lọ, ṣùgbọ́n kò fi ìṣàkóso pápá múlẹ̀.",
        takeaway: "Ẹ jẹ́ ká wo bóyá titẹ náà yóò dá àǹfààní góòlù sílẹ̀.",
        evidenceNote: "Ó dá lórí àwọn iṣẹ́ titẹ tó ṣẹ̀ṣẹ̀ ṣẹlẹ̀.",
      },
      analyst: {
        headline: "Agbára titẹ tó ń bá a lọ",
        explanation:
          "{team} ní àpapọ̀ agbára titẹ {average} ní àwọn iṣẹ́ {events}. Fi dátà yìí wé ipò bọ́ọ̀lù lórí pápá àti àwọn ìgbìyànjú sí góòlù.",
        takeaway: "Ṣàyẹ̀wò titẹ, gbígbà bọ́ọ̀lù padà àti ìgbìyànjú sí góòlù.",
        evidenceNote: "Òfin: àpapọ̀ tó tó 0.75 tàbí jù bẹ́ẹ̀ lọ nínú iṣẹ́ márùn-ún.",
      },
      broadcast: {
        headline: "{team}: titẹ ere ń pọ si",
        explanation:
          "{team} ń bá a lọ nínú titẹ, pẹ̀lú àpapọ̀ {average}. Ṣé wọ́n lè sọ agbára yìí di àǹfààní tó léwu?",
        takeaway: "Titẹ ń bá a lọ — ṣé wọ́n lè dá àǹfààní sílẹ̀?",
        evidenceNote: "Ìmọ̀ràn tí òfin backend dá sílẹ̀.",
      },
    },
    passing_pattern: {
      fan: {
        headline: "Ó yẹ kí a kíyèsí bí wọ́n ṣe ń kọjá bọ́ọ̀lù",
        explanation:
          "{team} parí ìkọjá bọ́ọ̀lù {completed} nínú {total} ({accuracy}%). Ẹ jẹ́ ká wo bóyá wọ́n yóò mú ìkọjá wọn sunwọ̀n sí i.",
        takeaway: "Wo àwọn ìkọjá tó kàn láti mọ bóyá wọ́n ń sunwọ̀n sí i.",
        evidenceNote: "Ó dá lórí ìkọjá bọ́ọ̀lù mẹ́wàá tó ṣẹ̀ṣẹ̀ ṣẹlẹ̀.",
      },
      analyst: {
        headline: "Àpẹẹrẹ ìpéye ìkọjá bọ́ọ̀lù",
        explanation:
          "{team} parí ìkọjá {completed} nínú {total} ({accuracy}%). Ìwọ̀n yìí nìkan kò fi ìlọsíwájú eré tàbí ìdí ìkùnà hàn dájú.",
        takeaway: "Fi ìpéye ìkọjá wé agbègbè pápá àti ìfúnpá.",
        evidenceNote: "Ààlà: kò tó 50% tàbí ó kéré tán 85% nínú ìkọjá mẹ́wàá.",
      },
      broadcast: {
        headline: "{team}: àpẹẹrẹ tuntun nínú ìkọjá bọ́ọ̀lù",
        explanation:
          "{team} parí ìkọjá {completed} nínú {total} ({accuracy}%). Ohun pàtàkì ni láti rí àwọn ọ̀nà ìkọjá tó dájú sí i.",
        takeaway: "Ṣé wọ́n lè mú eré wọn sunwọ̀n sí i?",
        evidenceNote: "Ó dá lórí ìkọjá mẹ́wàá tó ṣẹ̀ṣẹ̀ ṣẹlẹ̀.",
      },
    },
    shot_activity: {
      fan: {
        headline: "Àwọn ìgbìyànjú sí góòlù ń pọ̀ sí i",
        explanation:
          "{team} ti ṣe ìgbìyànjú sí góòlù {count} nínú àwọn iṣẹ́ eré tó ṣẹ̀ṣẹ̀ ṣẹlẹ̀. A kò tíì mọ bí wọ́n ṣe léwu tó.",
        takeaway: "Ẹ jẹ́ ká wo bóyá ìgbìyànjú tó kàn yóò dá àǹfààní sílẹ̀.",
        evidenceNote: "Ó dá lórí àwọn iṣẹ́ eré 30 tó ṣẹ̀ṣẹ̀ ṣẹlẹ̀.",
      },
      analyst: {
        headline: "Ìgbòkègbodò ìgbìyànjú sí góòlù",
        explanation:
          "{team} ti ṣe ìgbìyànjú sí góòlù {count}. Iye ìgbìyànjú nìkan kò fi dídára àǹfààní tàbí ìṣàkóso ìkọlù múlẹ̀.",
        takeaway: "Fi ibi ìgbìyànjú àti àbájáde rẹ̀ kún dátà.",
        evidenceNote: "Òfin: ó kéré tán ìgbìyànjú méjì nínú iṣẹ́ eré 30.",
      },
      broadcast: {
        headline: "{team}: ìgbìyànjú sí góòlù ń pọ̀ sí i",
        explanation:
          "{team} ti ṣe ìgbìyànjú sí góòlù {count}. Ṣé wọ́n lè sọ ọ̀kan di àǹfààní tó léwu?",
        takeaway: "Ìgbìyànjú pọ̀ sí i — ṣé wọ́n lè lo ọ̀kan dáadáa?",
        evidenceNote: "Ìṣírò ìgbìyànjú tí òfin dá sílẹ̀.",
      },
    },
  },
};

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? values[key]!
      : match,
  );
}

function getInsightData(insight: Insight): StructuredInsightData {
  return (insight as Insight & { data?: StructuredInsightData }).data ?? {};
}

function getTeam(insight: Insight): string {
  const dataTeam = getInsightData(insight).team;

  if (typeof dataTeam === "string" && dataTeam.trim()) {
    return dataTeam.trim();
  }

  const colonIndex = insight.headline.indexOf(":");

  return colonIndex > 0
    ? insight.headline.slice(0, colonIndex).trim()
    : "The team";
}

function getValues(insight: Insight): Record<string, string> {
  const data = getInsightData(insight);
  const team = getTeam(insight);

  if (insight.type === "pressure_surge") {
    const average = data.pressureAverage;
    const events = data.pressureEventCount;

    return {
      team,
      // Without a measured average, state the backend rule's trigger threshold. It is
      // factual and language-neutral (the word "high" was untranslated and unsupported).
      average: typeof average === "number" ? average.toFixed(2) : "≥ 0.75",
      // Backend rule window (api/src/rules.ts WINDOW_SIZE).
      events: typeof events === "number" ? String(events) : "5",
    };
  }

  if (insight.type === "passing_pattern") {
    const completed = data.completedPasses;
    const total = data.totalPasses;
    const accuracy = data.passAccuracy;

    if (
      typeof completed === "number" &&
      typeof total === "number" &&
      typeof accuracy === "number"
    ) {
      return {
        team,
        completed: String(completed),
        total: String(total),
        accuracy: String(Math.round(accuracy)),
      };
    }

    // Fallback for older API responses without structured data.
    const match = insight.explanation.match(
      /(\d+)\s+of the team's last\s+(\d+)\s+passes were completed\s+\((\d+)%\)/i,
    );

    if (match) {
      return {
        team,
        completed: match[1]!,
        total: match[2]!,
        accuracy: match[3]!,
      };
    }

    return {
      team,
      completed: "?",
      total: "10",
      accuracy: "?",
    };
  }

  if (insight.type === "shot_activity") {
    const count = data.shotCount;

    if (typeof count === "number") {
      return { team, count: String(count) };
    }

    const match = insight.explanation.match(/(\d+)\s+shots/i);

    return {
      team,
      count: match?.[1] ?? String(insight.evidence_event_ids.length),
    };
  }

  return { team };
}

export function adaptInsight(
  insight: Insight,
  audience: ExplanationAudience,
  language: ExplanationLanguage,
): StructuredExplanation {
  const template = COPY[language]?.[insight.type]?.[audience];

  if (!template) {
    return {
      headline: insight.headline,
      explanation: insight.explanation,
      takeaway: insight.explanation,
      evidenceNote:
        "Original backend explanation retained because no local template is available for this insight type.",
      audience,
      language,
      source: "backend-fallback",
    };
  }

  const values = getValues(insight);

  return {
    headline: fillTemplate(template.headline, values),
    explanation: fillTemplate(template.explanation, values),
    takeaway: fillTemplate(template.takeaway, values),
    evidenceNote: template.evidenceNote,
    audience,
    language,
    source: "local-demo-template",
  };
}

export function ExplanationSettings() {
  const { language, setLanguage } = useExplanationPreferences();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        padding: "8px 0",
      }}
    >
      <label
        htmlFor="matchmind-language"
        style={{ fontSize: 12, opacity: 0.8 }}
      >
        Explanation language
      </label>

      <select
        id="matchmind-language"
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value as ExplanationLanguage)
        }
        style={{
          borderRadius: 8,
          padding: "7px 10px",
          border: "1px solid var(--border, #555)",
          background: "var(--panel, transparent)",
          color: "inherit",
        }}
      >
        {(Object.keys(LANGUAGE_NAMES) as ExplanationLanguage[]).map(
          (code) => (
            <option key={code} value={code}>
              {LANGUAGE_NAMES[code]}
            </option>
          ),
        )}
      </select>

      <span style={{ fontSize: 11, opacity: 0.65 }}>
        Local demo templates
      </span>
    </div>
  );
}