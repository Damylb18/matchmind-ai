import { LANGUAGE_NAMES, useExplanationPreferences, type ExplanationLanguage } from "../lib/explanation";

/** Language for personalised insight wording. Changing it re-renders text only; match state is untouched. */
export function LanguageSelect() {
  const { language, setLanguage } = useExplanationPreferences();
  return (
    <div className="sidebar-language">
      <label htmlFor="insight-language" className="sidebar-label">
        Insight language
      </label>
      <select
        id="insight-language"
        className="compact-select"
        value={language}
        onChange={(event) => setLanguage(event.target.value as ExplanationLanguage)}
      >
        {(Object.keys(LANGUAGE_NAMES) as ExplanationLanguage[]).map((code) => (
          <option key={code} value={code} lang={code}>
            {LANGUAGE_NAMES[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
