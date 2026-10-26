/**
 * Checks that model text stays within the verified data it was given. Every number
 * written in digits must come from the payload (at the precision the text uses), and
 * event or player IDs may appear only when they were supplied.
 */

/** Collects every number in a JSON-like payload, including those inside strings like "12:05". */
export function collectNumbers(value: unknown, into: number[] = []): number[] {
  if (typeof value === "number" && Number.isFinite(value)) into.push(value);
  else if (typeof value === "string") {
    for (const match of value.matchAll(/\d+(?:\.\d+)?/g)) into.push(Number(match[0]));
  } else if (Array.isArray(value)) value.forEach((item) => collectNumbers(item, into));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectNumbers(item, into));
  return into;
}

const round = (value: number, decimals: number) => Math.round(value * 10 ** decimals) / 10 ** decimals;

/** Numbers written in text: "0.85", "0,85" (es/fr), "62%", "12". */
function numbersInText(text: string): { value: number; decimals: number }[] {
  // Ignore identifiers such as evt_120 or mun_7: they are checked separately.
  const cleaned = text.replace(/\b[a-z]+_\d+\b/gi, " ");
  return [...cleaned.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => {
    const normalised = match[0].replace(",", ".");
    const decimals = normalised.includes(".") ? normalised.split(".")[1]!.length : 0;
    return { value: Number(normalised), decimals };
  });
}

/** Facts the data never contains; text naming them was invented by the model. */
const UNSUPPORTED_FACTS = /\b(old trafford|emirates|wembley|stadium|stadiums|estadio|stade)\b/i;

/**
 * Yoruba cardinals 3–10, compared without tone marks. A count written as a word cannot be
 * checked against the evidence, so a Yoruba variant containing one is rejected. ("Méjì"
 * is left out: "ẹgbẹ́ méjì" / "méjèèjì" naturally mean the two teams.)
 */
const YORUBA_NUMBER_WORDS = /(^|[^a-z])(meta|merin|marun(-un)?|mefa|meje|mejo|mesan(-an)?|mewaa?)([^a-z]|$)/;

const stripTones = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function hasYorubaNumberWord(text: string): boolean {
  return YORUBA_NUMBER_WORDS.test(stripTones(text));
}

export type GroundingResult = { ok: true } | { ok: false; reason: string };

export function checkGrounding(
  text: string,
  allowedNumbers: readonly number[],
  allowedIds: ReadonlySet<string>,
): GroundingResult {
  for (const { value, decimals } of numbersInText(text)) {
    const grounded =
      decimals === 0
        ? allowedNumbers.some((allowed) => allowed === value)
        : allowedNumbers.some((allowed) => round(allowed, decimals) === value);
    if (!grounded) return { ok: false, reason: `number ${value} is not in the evidence` };
  }
  const unsupported = UNSUPPORTED_FACTS.exec(text);
  if (unsupported) return { ok: false, reason: `mentions "${unsupported[0]}", which is not in the data` };
  for (const match of text.matchAll(/\b[a-z]+_\d+\b/gi)) {
    if (!allowedIds.has(match[0].toLowerCase())) {
      return { ok: false, reason: `identifier ${match[0]} was not supplied` };
    }
  }
  return { ok: true };
}

export const LANGUAGES = ["en", "es", "fr", "yo"] as const;
export const AUDIENCES = ["fan", "analyst", "broadcast"] as const;
export type Language = (typeof LANGUAGES)[number];
export type Audience = (typeof AUDIENCES)[number];

/** JSON schema for { en: { fan: {...}, analyst: {...}, broadcast: {...} }, es: ..., fr: ..., yo: ... }. */
export function variantsSchema(fields: readonly string[]): Record<string, unknown> {
  const text = { type: "string" };
  const entry = {
    type: "object",
    properties: Object.fromEntries(fields.map((field) => [field, text])),
    required: [...fields],
    additionalProperties: false,
  };
  const language = {
    type: "object",
    properties: Object.fromEntries(AUDIENCES.map((audience) => [audience, entry])),
    required: [...AUDIENCES],
    additionalProperties: false,
  };
  return {
    type: "object",
    properties: Object.fromEntries(LANGUAGES.map((lang) => [lang, language])),
    required: [...LANGUAGES],
    additionalProperties: false,
  };
}

export type Variants<F extends string> = Partial<Record<Language, Partial<Record<Audience, Record<F, string>>>>>;

/**
 * Keeps each language/audience entry only if every field is present, within its length
 * limit and grounded. Rejected entries are dropped (the UI then uses its template for
 * that combination); `rejected` lists why, for the server log.
 */
export function validateVariants<F extends string>(
  raw: unknown,
  limits: Record<Audience, Record<F, number>>,
  allowedNumbers: readonly number[],
  allowedIds: ReadonlySet<string>,
): { variants: Variants<F>; accepted: number; rejected: string[] } {
  const variants: Variants<F> = {};
  const rejected: string[] = [];
  let accepted = 0;
  const record = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

  const root = record(raw);
  for (const lang of LANGUAGES) {
    const byAudience = record(root?.[lang]);
    for (const audience of AUDIENCES) {
      const entry = record(byAudience?.[audience]);
      const fieldLimits = limits[audience];
      const out = {} as Record<F, string>;
      let problem: string | null = entry ? null : "missing";
      for (const field of Object.keys(fieldLimits) as F[]) {
        if (problem) break;
        const value = entry?.[field];
        if (typeof value !== "string" || !value.trim()) problem = `${field} empty`;
        else if (value.length > fieldLimits[field]) problem = `${field} too long (${value.length})`;
        else if (lang === "yo" && hasYorubaNumberWord(value)) problem = `${field}: number written as a Yoruba word`;
        else {
          const grounding = checkGrounding(value, allowedNumbers, allowedIds);
          if (!grounding.ok) problem = `${field}: ${grounding.reason}`;
          else out[field] = value.trim();
        }
      }
      if (problem) {
        rejected.push(`${lang}/${audience}: ${problem}`);
        continue;
      }
      (variants[lang] ??= {})[audience] = out;
      accepted++;
    }
  }
  return { variants, accepted, rejected };
}
