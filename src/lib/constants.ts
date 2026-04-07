export const BAR_WEIGHT = 20;

export const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export const DEFAULT_REST_TIME_SECONDS = 90;

export const REST_TIME_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300] as const;

export const LBS_TO_KG = 0.453592;
export const KG_TO_LBS = 2.20462;

export const PLATEAU_THRESHOLD = 3;
export const DELOAD_THRESHOLD = 4;

export const COMPOUND_EXERCISES = [
  "squat", "deadlift", "soulevé", "developp", "développ",
  "bench", "row", "tirage", "presse", "hip thrust",
  "fente", "lunge", "clean", "snatch", "arrach", "epaul",
  "traction", "pull-up", "dip", "military", "overhead",
] as const;

export const BASE_INCREMENT_COMPOUND = 2.5;
export const BASE_INCREMENT_ACCESSORY = 1.25;

export const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
