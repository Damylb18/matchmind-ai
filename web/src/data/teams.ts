/**
 * Team identity and asset mapping.
 *
 * Crest licensing (checked 2026-10-21):
 * The official Manchester United and Arsenal crests are trademarked, copyrighted
 * artworks. Neither club's Wikidata item (Q18656, Q9617) carries a freely
 * licensed logo, and the crest files used on English Wikipedia
 * ("Manchester United FC crest.svg", "Arsenal FC.svg") are local non-free
 * "fair use" uploads that may not be reused outside Wikipedia articles.
 *
 * Until a licensed source is available (a Premier League / data-provider asset
 * pack, or written club permission), `crest` stays null and <TeamCrest> renders
 * a neutral monogram shield in club colours that does not imitate the official
 * crest. To add licensed crests: put the files in `web/public/crests/` and fill
 * in `crest` with the licence details.
 */

export type TeamId = "mun" | "ars";

export type LicensedAsset = {
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
};

export type TeamInfo = {
  id: TeamId;
  /** Exact `team` string emitted by the backend. */
  apiName: string;
  name: string;
  shortName: string;
  code: string;
  colors: {
    /** Club identity colour, used on crests and accents. */
    primary: string;
    secondary: string;
    /**
     * Colour used to encode this team in charts. Both clubs play in red, so the
     * away side is drawn in blue in data visualisations to keep them distinct.
     */
    data: string;
  };
  crest: LicensedAsset | null;
  wikidataId: string;
};

export const TEAMS: Record<TeamId, TeamInfo> = {
  mun: {
    id: "mun",
    apiName: "man_utd",
    name: "Manchester United",
    shortName: "Man Utd",
    code: "MUN",
    colors: { primary: "#DA291C", secondary: "#FBE122", data: "#E5383B" },
    crest: null,
    wikidataId: "Q18656",
  },
  ars: {
    id: "ars",
    apiName: "arsenal",
    name: "Arsenal",
    shortName: "Arsenal",
    code: "ARS",
    colors: { primary: "#EF0107", secondary: "#9C824A", data: "#4C8DF6" },
    crest: null,
    wikidataId: "Q9617",
  },
};

export const HOME = TEAMS.mun;
export const AWAY = TEAMS.ars;

export function teamByApiName(name: string): TeamInfo | undefined {
  return Object.values(TEAMS).find((team) => team.apiName === name);
}
