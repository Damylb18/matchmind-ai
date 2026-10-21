/**
 * Illustrative formation templates.
 *
 * The backend provides no formations, line-ups or player coordinates. These
 * are generic textbook shapes used to lay out pitch diagrams. They are never
 * presented as an observed team shape.
 *
 * Coordinates are on a vertical pitch, 68 wide × 105 long, with the team
 * attacking upwards: y = 105 is the team's own goal line.
 */

export type FormationSlot = { role: string; label: string; x: number; y: number };

const GK: FormationSlot = { role: "GK", label: "Goalkeeper", x: 34, y: 99 };

const BACK_FOUR: FormationSlot[] = [
  { role: "LB", label: "Left-back", x: 8, y: 80 },
  { role: "LCB", label: "Left centre-back", x: 25, y: 86 },
  { role: "RCB", label: "Right centre-back", x: 43, y: 86 },
  { role: "RB", label: "Right-back", x: 60, y: 80 },
];

const BACK_THREE: FormationSlot[] = [
  { role: "LCB", label: "Left centre-back", x: 16, y: 85 },
  { role: "CB", label: "Centre-back", x: 34, y: 87 },
  { role: "RCB", label: "Right centre-back", x: 52, y: 85 },
];

export const FORMATIONS: Record<string, FormationSlot[]> = {
  "4-2-3-1": [
    GK,
    ...BACK_FOUR,
    { role: "LDM", label: "Left defensive midfielder", x: 25, y: 68 },
    { role: "RDM", label: "Right defensive midfielder", x: 43, y: 68 },
    { role: "LAM", label: "Left attacking midfielder", x: 10, y: 46 },
    { role: "CAM", label: "Central attacking midfielder", x: 34, y: 50 },
    { role: "RAM", label: "Right attacking midfielder", x: 58, y: 46 },
    { role: "ST", label: "Striker", x: 34, y: 27 },
  ],
  "4-3-3": [
    GK,
    ...BACK_FOUR,
    { role: "LCM", label: "Left central midfielder", x: 17, y: 60 },
    { role: "CM", label: "Central midfielder", x: 34, y: 67 },
    { role: "RCM", label: "Right central midfielder", x: 51, y: 60 },
    { role: "LW", label: "Left winger", x: 10, y: 33 },
    { role: "ST", label: "Striker", x: 34, y: 26 },
    { role: "RW", label: "Right winger", x: 58, y: 33 },
  ],
  "4-4-2": [
    GK,
    ...BACK_FOUR,
    { role: "LM", label: "Left midfielder", x: 8, y: 57 },
    { role: "LCM", label: "Left central midfielder", x: 25, y: 63 },
    { role: "RCM", label: "Right central midfielder", x: 43, y: 63 },
    { role: "RM", label: "Right midfielder", x: 60, y: 57 },
    { role: "LS", label: "Left striker", x: 25, y: 31 },
    { role: "RS", label: "Right striker", x: 43, y: 31 },
  ],
  "3-4-3": [
    GK,
    ...BACK_THREE,
    { role: "LWB", label: "Left wing-back", x: 6, y: 60 },
    { role: "LCM", label: "Left central midfielder", x: 26, y: 65 },
    { role: "RCM", label: "Right central midfielder", x: 42, y: 65 },
    { role: "RWB", label: "Right wing-back", x: 62, y: 60 },
    { role: "LW", label: "Left winger", x: 12, y: 33 },
    { role: "ST", label: "Striker", x: 34, y: 26 },
    { role: "RW", label: "Right winger", x: 56, y: 33 },
  ],
  "3-5-2": [
    GK,
    ...BACK_THREE,
    { role: "LWB", label: "Left wing-back", x: 6, y: 57 },
    { role: "LCM", label: "Left central midfielder", x: 20, y: 63 },
    { role: "CM", label: "Central midfielder", x: 34, y: 69 },
    { role: "RCM", label: "Right central midfielder", x: 48, y: 63 },
    { role: "RWB", label: "Right wing-back", x: 62, y: 57 },
    { role: "LS", label: "Left striker", x: 26, y: 30 },
    { role: "RS", label: "Right striker", x: 42, y: 30 },
  ],
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);
