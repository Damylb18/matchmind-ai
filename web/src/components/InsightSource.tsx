import { SOURCE_DESCRIPTION, SOURCE_LABEL, shortModel, type PersonalisedInsight } from "../lib/personalisation";

/** Small badge stating where an insight's wording came from (OpenAI, local template or backend text). */
export function InsightSource({ personalised }: { personalised: PersonalisedInsight }) {
  const { source, language, model } = personalised;
  const detail =
    source === "openai"
      ? `${shortModel(model)} · ${language.toUpperCase()}`
      : source === "local-demo-template"
        ? language.toUpperCase()
        : "untranslated";
  return (
    <span className={`insight-source source-${source}`} title={SOURCE_DESCRIPTION[source]}>
      {SOURCE_LABEL[source]} · {detail}
    </span>
  );
}
