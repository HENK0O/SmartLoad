export interface TemplateExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
}

export interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  level: "debutant" | "intermediaire" | "avance";
  levelLabel: string;
  levelLabelEn: string;
  daysPerWeek: number;
  days: TemplateDay[];
  muscles: string[];
  musclesEn: string[];
}

export const STATIC_TEMPLATES: ProgramTemplate[] = [
  {
    id: "ppl",
    name: "PPL — Push Pull Legs",
    nameEn: "PPL — Push Pull Legs",
    description: "Programme Push/Pull/Legs classique pour un développement complet et équilibré.",
    descriptionEn: "Classic Push/Pull/Legs program for balanced full-body development.",
    level: "intermediaire",
    levelLabel: "Intermédiaire",
    levelLabelEn: "Intermediate",
    daysPerWeek: 3,
    muscles: ["Pectoraux", "Épaules", "Triceps", "Dos", "Biceps", "Quadriceps", "Ischio-jambiers", "Mollets"],
    musclesEn: ["Chest", "Shoulders", "Triceps", "Back", "Biceps", "Quads", "Hamstrings", "Calves"],
    days: [
      {
        name: "Push",
        exercises: [
          { name: "Développé couché", muscleGroup: "Pectoraux", sets: 4, reps: "6-10" },
          { name: "Développé incliné", muscleGroup: "Pectoraux", sets: 3, reps: "8-12" },
          { name: "Chest press", muscleGroup: "Pectoraux", sets: 3, reps: "10-12" },
          { name: "Élévations latérales", muscleGroup: "Épaules", sets: 3, reps: "12-15" },
          { name: "Extensions poulie haute", muscleGroup: "Triceps", sets: 3, reps: "10-12" },
        ],
      },
      {
        name: "Pull",
        exercises: [
          { name: "Tractions", muscleGroup: "Dos", sets: 4, reps: "6-10" },
          { name: "Rowing", muscleGroup: "Dos", sets: 4, reps: "8-10" },
          { name: "Tirage vertical", muscleGroup: "Dos", sets: 3, reps: "10-12" },
          { name: "Curl haltères alterné", muscleGroup: "Biceps", sets: 3, reps: "10-12" },
          { name: "Pec Deck inversé", muscleGroup: "Épaules", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { name: "Belt Squat", muscleGroup: "Quadriceps", sets: 4, reps: "6-10" },
          { name: "Presse à cuisse", muscleGroup: "Quadriceps", sets: 3, reps: "10-12" },
          { name: "Leg Curl", muscleGroup: "Ischio-jambiers", sets: 3, reps: "10-12" },
          { name: "Leg Extension", muscleGroup: "Quadriceps", sets: 3, reps: "12-15" },
          { name: "Extensions mollets", muscleGroup: "Mollets", sets: 4, reps: "12-15" },
        ],
      },
    ],
  },
  {
    id: "fullbody-3x",
    name: "Full Body 3x",
    nameEn: "Full Body 3x",
    description: "Idéal pour les débutants. 3 séances par semaine qui travaillent tout le corps à chaque fois.",
    descriptionEn: "Ideal for beginners. 3 sessions per week working the entire body each time.",
    level: "debutant",
    levelLabel: "Débutant",
    levelLabelEn: "Beginner",
    daysPerWeek: 3,
    muscles: ["Pectoraux", "Dos", "Quadriceps", "Ischio-jambiers", "Biceps", "Triceps", "Épaules", "Mollets"],
    musclesEn: ["Chest", "Back", "Quads", "Hamstrings", "Biceps", "Triceps", "Shoulders", "Calves"],
    days: [
      {
        name: "Jour A",
        exercises: [
          { name: "Belt Squat", muscleGroup: "Quadriceps", sets: 3, reps: "8-10" },
          { name: "Développé couché", muscleGroup: "Pectoraux", sets: 3, reps: "8-10" },
          { name: "Rowing", muscleGroup: "Dos", sets: 3, reps: "8-10" },
          { name: "Curl haltères alterné", muscleGroup: "Biceps", sets: 3, reps: "10-12" },
          { name: "Extensions poulie haute", muscleGroup: "Triceps", sets: 3, reps: "10-12" },
        ],
      },
      {
        name: "Jour B",
        exercises: [
          { name: "Soulevé de terre", muscleGroup: "Dos", sets: 3, reps: "5-8" },
          { name: "Développé militaire", muscleGroup: "Épaules", sets: 3, reps: "8-10" },
          { name: "Tirage horizontal", muscleGroup: "Dos", sets: 3, reps: "10-12" },
          { name: "Leg Extension", muscleGroup: "Quadriceps", sets: 3, reps: "10-12" },
          { name: "Extensions mollets", muscleGroup: "Mollets", sets: 3, reps: "12-15" },
        ],
      },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    nameEn: "Upper / Lower",
    description: "Alternance haut/bas du corps. 4 séances par semaine pour un volume optimal.",
    descriptionEn: "Upper/lower body split. 4 sessions per week for optimal volume.",
    level: "intermediaire",
    levelLabel: "Intermédiaire",
    levelLabelEn: "Intermediate",
    daysPerWeek: 4,
    muscles: ["Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Quadriceps", "Ischio-jambiers", "Mollets"],
    musclesEn: ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Calves"],
    days: [
      {
        name: "Upper",
        exercises: [
          { name: "Développé couché", muscleGroup: "Pectoraux", sets: 4, reps: "6-10" },
          { name: "Rowing", muscleGroup: "Dos", sets: 4, reps: "8-10" },
          { name: "Développé militaire", muscleGroup: "Épaules", sets: 3, reps: "8-10" },
          { name: "Curl haltères alterné", muscleGroup: "Biceps", sets: 3, reps: "10-12" },
          { name: "Extensions poulie haute", muscleGroup: "Triceps", sets: 3, reps: "10-12" },
        ],
      },
      {
        name: "Lower",
        exercises: [
          { name: "Belt Squat", muscleGroup: "Quadriceps", sets: 4, reps: "6-10" },
          { name: "Soulevé de terre", muscleGroup: "Dos", sets: 3, reps: "5-8" },
          { name: "Presse à cuisse", muscleGroup: "Quadriceps", sets: 3, reps: "10-12" },
          { name: "Leg Curl", muscleGroup: "Ischio-jambiers", sets: 3, reps: "10-12" },
          { name: "Extensions mollets", muscleGroup: "Mollets", sets: 4, reps: "12-15" },
        ],
      },
    ],
  },
  {
    id: "531",
    name: "5/3/1 Basique",
    nameEn: "5/3/1 Basic",
    description: "Méthode Jim Wendler pour la force pure. Progression cyclique sur 4 jours.",
    descriptionEn: "Jim Wendler's method for pure strength. Cyclic progression over 4 days.",
    level: "avance",
    levelLabel: "Avancé",
    levelLabelEn: "Advanced",
    daysPerWeek: 4,
    muscles: ["Quadriceps", "Dos", "Pectoraux", "Épaules", "Ischio-jambiers", "Biceps", "Triceps", "Mollets"],
    musclesEn: ["Quads", "Back", "Chest", "Shoulders", "Hamstrings", "Biceps", "Triceps", "Calves"],
    days: [
      {
        name: "Jour 1 — Squat",
        exercises: [
          { name: "Belt Squat", muscleGroup: "Quadriceps", sets: 5, reps: "5/3/1" },
          { name: "Presse à cuisse", muscleGroup: "Quadriceps", sets: 3, reps: "8-10" },
          { name: "Leg Curl", muscleGroup: "Ischio-jambiers", sets: 3, reps: "10-12" },
          { name: "Extensions mollets", muscleGroup: "Mollets", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "Jour 2 — Développé couché",
        exercises: [
          { name: "Développé couché", muscleGroup: "Pectoraux", sets: 5, reps: "5/3/1" },
          { name: "Développé incliné", muscleGroup: "Pectoraux", sets: 3, reps: "8-10" },
          { name: "Rowing", muscleGroup: "Dos", sets: 3, reps: "8-10" },
          { name: "Extensions poulie haute", muscleGroup: "Triceps", sets: 3, reps: "10-12" },
        ],
      },
      {
        name: "Jour 3 — Soulevé de terre",
        exercises: [
          { name: "Soulevé de terre", muscleGroup: "Dos", sets: 5, reps: "5/3/1" },
          { name: "Tractions", muscleGroup: "Dos", sets: 3, reps: "8-10" },
          { name: "Leg Extension", muscleGroup: "Quadriceps", sets: 3, reps: "10-12" },
          { name: "Curl haltères alterné", muscleGroup: "Biceps", sets: 3, reps: "10-12" },
        ],
      },
      {
        name: "Jour 4 — Développé militaire",
        exercises: [
          { name: "Développé militaire", muscleGroup: "Épaules", sets: 5, reps: "5/3/1" },
          { name: "Élévations latérales", muscleGroup: "Épaules", sets: 3, reps: "12-15" },
          { name: "Tirage horizontal", muscleGroup: "Dos", sets: 3, reps: "10-12" },
          { name: "Extensions poulie haute", muscleGroup: "Triceps", sets: 3, reps: "10-12" },
        ],
      },
    ],
  },
];
