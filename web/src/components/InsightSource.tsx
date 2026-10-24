import { SOURCE_DESCRIPTION, SOURCE_LABEL, type PersonalisedInsight } from "../lib/personalisation";

/** Small badge stating where an insight's wording came from (local template or backend text). */
export function InsightSource({ personalised }: { personalised: PersonalisedInsight }) {
  const { source, language } = personalised;
  return (
    <span className={`insight-source source-${source}`} title={SOURCE_DESCRIPTION[source]}>
      {SOURCE_LABEL[source]} · {source === "local-demo-template" ? language.toUpperCase() : "untranslated"}
    </span>
  );
}
