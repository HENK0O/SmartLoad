export interface ExerciseDef {
  baseName: string;
  muscleGroup: string;
  category: "PUSH" | "PULL" | "LEGS" | "AUTRES";
  supports: string[];
}

export const EXERCISE_CATALOG: ExerciseDef[] = [
  // PUSH - Pectoraux
  { baseName: "Développé couché", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Barre", "Haltères"] },
  { baseName: "Développé incliné", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Barre", "Haltères"] },
  { baseName: "Chest press", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Chest press inclinée", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Développé couché convergent", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Pec Deck", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Machine"] },
  { baseName: "Dips lestés", muscleGroup: "Pectoraux", category: "PUSH", supports: ["Poids de corps"] },
  // PUSH - Épaules
  { baseName: "Développé militaire", muscleGroup: "Épaules", category: "PUSH", supports: ["Machine", "Haltères"] },
  { baseName: "Élévations latérales", muscleGroup: "Épaules", category: "PUSH", supports: ["Haltères", "Poulie"] },
  { baseName: "Élévations frontales", muscleGroup: "Épaules", category: "PUSH", supports: ["Haltères"] },
  { baseName: "Pec Deck inversé", muscleGroup: "Épaules", category: "PUSH", supports: ["Machine"] },
  // PUSH - Triceps
  { baseName: "Barre au front", muscleGroup: "Triceps", category: "PUSH", supports: ["Barre EZ"] },
  { baseName: "Extensions poulie haute", muscleGroup: "Triceps", category: "PUSH", supports: ["Corde", "Barre droite"] },
  { baseName: "Extensions au-dessus de la tête", muscleGroup: "Triceps", category: "PUSH", supports: ["Corde", "Barre en V"] },
  // PULL - Dos
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
  // LEGS - Quadriceps
  { baseName: "Belt Squat", muscleGroup: "Quadriceps", category: "LEGS", supports: ["Machine"] },
  { baseName: "Presse à cuisse", muscleGroup: "Quadriceps", category: "LEGS", supports: ["Inclinée"] },
  { baseName: "Leg Extension", muscleGroup: "Quadriceps", category: "LEGS", supports: ["Machine"] },
  // LEGS - Ischio-jambiers
  { baseName: "Leg Curl", muscleGroup: "Ischio-jambiers", category: "LEGS", supports: ["Allongé", "Assis"] },
  // LEGS - Mollets
  { baseName: "Extensions mollets", muscleGroup: "Mollets", category: "LEGS", supports: ["Machine assis"] },
];

export function getFullName(baseName: string, support: string): string {
  return `${baseName} (${support})`;
}

export function getExerciseByBase(baseName: string): ExerciseDef | undefined {
  return EXERCISE_CATALOG.find((e) => e.baseName === baseName);
}
