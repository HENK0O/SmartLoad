import type { Lang } from "./i18n";

export interface ExerciseDef {
  baseName: string;
  muscleGroup: string;
  category: "PUSH" | "PULL" | "LEGS" | "AUTRES";
  supports: string[];
}

export const EXERCISE_CATALOG: ExerciseDef[] = [
  // PUSH - Chest
  { baseName: "Développé couché", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Barre", "Haltères"] },
  { baseName: "Développé incliné", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Barre", "Haltères"] },
  { baseName: "Chest press", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Chest press inclinée", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Développé couché convergent", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Pec Deck", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Dips lestés", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Poids de corps"] },
  // PUSH - Shoulders
  { baseName: "Développé militaire", muscleGroup: "Épaules", category: "PUSH", supports: ["Machine", "Haltères"] },
  { baseName: "Élévations latérales", muscleGroup: "Épaules", category: "PUSH", supports: ["Haltères", "Poulie"] },
  { baseName: "Élévations frontales", muscleGroup: "Épaules", category: "PUSH", supports: ["Haltères"] },
  { baseName: "Pec Deck inversé", muscleGroup: "Épaules", category: "PUSH", supports: ["Machine"] },
  // PUSH - Triceps
  { baseName: "Barre au front", muscleGroup: "Triceps", category: "PUSH", supports: ["Barre EZ"] },
  { baseName: "Extensions poulie haute", muscleGroup: "Triceps", category: "PUSH", supports: ["Corde", "Barre droite"] },
  { baseName: "Extensions au-dessus de la tête", muscleGroup: "Triceps", category: "PUSH", supports: ["Corde", "Barre en V"] },
  // PULL - Back
  { baseName: "Tractions", muscleGroup: "Dos", category: "PULL", supports: ["Poids de corps", "Lestées"] },
  { baseName: "Soulevé de terre", muscleGroup: "Dos", category: "PULL", supports: ["Classique"] },
  { baseName: "Tirage vertical", muscleGroup: "Dos", category: "PULL", supports: ["Poulie haute"] },
  { baseName: "Tirage horizontal", muscleGroup: "Dos", category: "PULL", supports: ["Poulie basse"] },
  { baseName: "Rowing", muscleGroup: "Dos", category: "PULL", supports: ["Barre", "Machine"] },
  { baseName: "Pull-over", muscleGroup: "Dos", category: "PULL", supports: ["Haltère", "Poulie"] },
  // PULL - Biceps
  { baseName: "Curl haltères alterné", muscleGroup: "Biceps", category: "PULL", supports: ["Debout", "Assis"] },
  { baseName: "Curl marteau", muscleGroup: "Biceps", category: "PULL", supports: ["Haltères"] },
  { baseName: "Curl pupitre", muscleGroup: "Biceps", category: "PULL", supports: ["Machine", "Barre EZ"] },
  { baseName: "Curl bayesian", muscleGroup: "Biceps", category: "PULL", supports: ["Poulie"] },
  // LEGS - Quads
  { baseName: "Belt Squat", muscleGroup: "Quadriceps", category: "LEGS", supports: ["Machine"] },
  { baseName: "Presse à cuisse", muscleGroup: "Quadriceps", category: "LEGS", supports: ["Inclinée"] },
  { baseName: "Leg Extension", muscleGroup: "Quadriceps", category: "LEGS", supports: ["Machine"] },
  // LEGS - Hamstrings
  { baseName: "Leg Curl", muscleGroup: "Ischio-jambiers", category: "LEGS", supports: ["Allongé", "Assis"] },
  // LEGS - Calves
  { baseName: "Extensions mollets", muscleGroup: "Mollets", category: "LEGS", supports: ["Machine assis"] },
];

// Real gym terminology translations
const exerciseNames: Record<string, { fr: string; en: string }> = {
  "Développé couché": { fr: "Développé couché", en: "Bench Press" },
  "Développé incliné": { fr: "Développé incliné", en: "Incline Bench Press" },
  "Chest press": { fr: "Chest press", en: "Chest Press" },
  "Chest press inclinée": { fr: "Chest press inclinée", en: "Incline Chest Press" },
  "Développé couché convergent": { fr: "Développé couché convergent", en: "Converging Chest Press" },
  "Pec Deck": { fr: "Pec Deck", en: "Pec Deck" },
  "Dips lestés": { fr: "Dips lestés", en: "Weighted Dips" },
  "Développé militaire": { fr: "Développé militaire", en: "Overhead Press" },
  "Élévations latérales": { fr: "Élévations latérales", en: "Lateral Raise" },
  "Élévations frontales": { fr: "Élévations frontales", en: "Front Raise" },
  "Pec Deck inversé": { fr: "Pec Deck inversé", en: "Reverse Pec Deck" },
  "Barre au front": { fr: "Barre au front", en: "Skull Crushers" },
  "Extensions poulie haute": { fr: "Extensions poulie haute", en: "Cable Pushdown" },
  "Extensions au-dessus de la tête": { fr: "Extensions au-dessus de la tête", en: "Overhead Triceps Extension" },
  "Tractions": { fr: "Tractions", en: "Pull-Ups" },
  "Soulevé de terre": { fr: "Soulevé de terre", en: "Deadlift" },
  "Tirage vertical": { fr: "Tirage vertical", en: "Lat Pulldown" },
  "Tirage horizontal": { fr: "Tirage horizontal", en: "Cable Row" },
  "Rowing": { fr: "Rowing", en: "Row" },
  "Pull-over": { fr: "Pull-over", en: "Pullover" },
  "Curl haltères alterné": { fr: "Curl haltères alterné", en: "Alternating Dumbbell Curl" },
  "Curl marteau": { fr: "Curl marteau", en: "Hammer Curl" },
  "Curl pupitre": { fr: "Curl pupitre", en: "Preacher Curl" },
  "Curl bayesian": { fr: "Curl bayesian", en: "Bayesian Curl" },
  "Belt Squat": { fr: "Belt Squat", en: "Belt Squat" },
  "Presse à cuisse": { fr: "Presse à cuisse", en: "Leg Press" },
  "Leg Extension": { fr: "Leg Extension", en: "Leg Extension" },
  "Leg Curl": { fr: "Leg Curl", en: "Leg Curl" },
  "Extensions mollets": { fr: "Extensions mollets", en: "Calf Raise" },
};

const supportNames: Record<string, { fr: string; en: string }> = {
  "Barre": { fr: "Barre", en: "Barbell" },
  "Haltères": { fr: "Haltères", en: "Dumbbell" },
  "Machine": { fr: "Machine", en: "Machine" },
  "Corde": { fr: "Corde", en: "Rope" },
  "Barre droite": { fr: "Barre droite", en: "Straight Bar" },
  "Barre EZ": { fr: "Barre EZ", en: "EZ Bar" },
  "Barre en V": { fr: "Barre en V", en: "V-Bar" },
  "Poids de corps": { fr: "Poids de corps", en: "Bodyweight" },
  "Lestées": { fr: "Lestées", en: "Weighted" },
  "Poulie": { fr: "Poulie", en: "Cable" },
  "Debout": { fr: "Debout", en: "Standing" },
  "Assis": { fr: "Assis", en: "Seated" },
  "Allongé": { fr: "Allongé", en: "Lying" },
  "Classique": { fr: "Classique", en: "Conventional" },
  "Poulie haute": { fr: "Poulie haute", en: "High Pulley" },
  "Poulie basse": { fr: "Poulie basse", en: "Low Pulley" },
  "Machine assis": { fr: "Machine assis", en: "Seated Machine" },
  "Inclinée": { fr: "Inclinée", en: "Incline" },
  "Haltère": { fr: "Haltère", en: "Dumbbell" },
};

const muscleNames: Record<string, { fr: string; en: string }> = {
  "Pectoraux": { fr: "Pectoraux", en: "Chest" },
  "Épaules": { fr: "Épaules", en: "Shoulders" },
  "Triceps": { fr: "Triceps", en: "Triceps" },
  "Dos": { fr: "Dos", en: "Back" },
  "Biceps": { fr: "Biceps", en: "Biceps" },
  "Quadriceps": { fr: "Quadriceps", en: "Quads" },
  "Ischio-jambiers": { fr: "Ischio-jambiers", en: "Hamstrings" },
  "Mollets": { fr: "Mollets", en: "Calves" },
};

export function exerciseName(baseName: string, lang: Lang): string {
  return exerciseNames[baseName]?.[lang] || baseName;
}

export function supportName(support: string, lang: Lang): string {
  return supportNames[support]?.[lang] || support;
}

export function muscleName(muscle: string, lang: Lang): string {
  return muscleNames[muscle]?.[lang] || muscle;
}

export function getFullName(baseName: string, support: string, lang: Lang = "fr"): string {
  return `${exerciseName(baseName, lang)} (${supportName(support, lang)})`;
}

export function getExerciseByBase(baseName: string): ExerciseDef | undefined {
  return EXERCISE_CATALOG.find((e) => e.baseName === baseName);
}
