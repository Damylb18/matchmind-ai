import type { TeamId } from "./teams";

/**
 * Demo player profile showcase.
 *
 * IMPORTANT: these profiles are NOT linked to the live event feed. The backend
 * emits synthetic identifiers (Player_7, Player_8, Player_10) and there is no
 * reliable mapping from those IDs to real players, so no live statistic in the
 * UI is ever attributed to a person listed here.
 *
 * Sources (verified 2026-10-21):
 * - Name, current club (P54 without end date) and position (P413): Wikidata.
 * - Photos: Wikimedia Commons, CC BY-SA 4.0, photographer Bryan Berlin. All are
 *   international-match photos, tagged with personality rights — they must be
 *   attributed and must not be used to imply endorsement.
 *   URLs are the 330px thumbnails returned by the Commons imageinfo API.
 */

export type PhotoCredit = {
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  /** Focal point for object-position, so faces stay in frame when cropped. */
  focus: string;
};

export type RoleZone = "attacking-mid" | "central-mid" | "defensive-mid" | "winger" | "forward";

export type PlayerProfile = {
  id: string;
  name: string;
  teamId: TeamId;
  /** Position exactly as listed on Wikidata (P413). */
  position: string;
  roleZone: RoleZone;
  wikidataId: string;
  photo: PhotoCredit | null;
};

const CC_BY_SA_4 = {
  author: "Bryan Berlin",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

const thumb = (path: string, file: string) =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${file}/330px-${file}`;

export const PLAYER_PROFILES: PlayerProfile[] = [
  {
    id: "bruno-fernandes",
    name: "Bruno Fernandes",
    teamId: "mun",
    position: "Attacking midfielder",
    roleZone: "attacking-mid",
    wikidataId: "Q4979316",
    photo: {
      ...CC_BY_SA_4,
      src: thumb("c/c7", "Bruno_Fernandes_USMNT_v_Portugal_Mar_31_2026-27_%28cropped%29.jpg"),
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Bruno_Fernandes_USMNT_v_Portugal_Mar_31_2026-27_(cropped).jpg",
      focus: "50% 18%",
    },
  },
  {
    id: "kobbie-mainoo",
    name: "Kobbie Mainoo",
    teamId: "mun",
    position: "Midfielder",
    roleZone: "central-mid",
    wikidataId: "Q114703020",
    photo: {
      ...CC_BY_SA_4,
      src: thumb("c/cd", "Kobbie_Mainoo_England_v_Panama_27_June_26-052.jpg"),
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Kobbie_Mainoo_England_v_Panama_27_June_26-052.jpg",
      focus: "50% 18%",
    },
  },
  {
    id: "matheus-cunha",
    name: "Matheus Cunha",
    teamId: "mun",
    position: "Forward",
    roleZone: "forward",
    wikidataId: "Q35831063",
    photo: {
      ...CC_BY_SA_4,
      src: thumb("3/31", "Matheus_Cunha_Brazil_V_Morocco_13_June_2026-178_%28cropped%29.jpg"),
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Matheus_Cunha_Brazil_V_Morocco_13_June_2026-178_(cropped).jpg",
      focus: "50% 18%",
    },
  },
  {
    id: "bukayo-saka",
    name: "Bukayo Saka",
    teamId: "ars",
    position: "Winger",
    roleZone: "winger",
    wikidataId: "Q59306386",
    photo: {
      ...CC_BY_SA_4,
      src: thumb("2/2f", "Bukayo_Saka_England_v_Ghana_23_June_2026-057_%28cropped%29.jpg"),
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Bukayo_Saka_England_v_Ghana_23_June_2026-057_(cropped).jpg",
      focus: "50% 18%",
    },
  },
  {
    id: "martin-odegaard",
    name: "Martin Ødegaard",
    teamId: "ars",
    position: "Midfielder",
    roleZone: "attacking-mid",
    wikidataId: "Q16902219",
    photo: {
      ...CC_BY_SA_4,
      src: thumb("3/36", "Martin_Odegaard_Morocco_v_Norway_7_June_2026-56_%28cropped%29.jpg"),
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Martin_Odegaard_Morocco_v_Norway_7_June_2026-56_(cropped).jpg",
      focus: "50% 18%",
    },
  },
  {
    id: "declan-rice",
    name: "Declan Rice",
    teamId: "ars",
    position: "Defensive midfielder",
    roleZone: "defensive-mid",
    wikidataId: "Q30007142",
    photo: {
      ...CC_BY_SA_4,
      src: thumb("5/5d", "Declan_Rice_England_v_Ghana_23_June_2026-150.jpg"),
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Declan_Rice_England_v_Ghana_23_June_2026-150.jpg",
      focus: "50% 14%",
    },
  },
];
