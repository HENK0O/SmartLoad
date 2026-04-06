export interface WorkoutSetRecord {
  reps: number;
  weight: number;
  completed: boolean;
  rpe?: number;
}

export interface ExerciseSession {
  date: string;
  sets: WorkoutSetRecord[];
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  sessions: ExerciseSession[];
}

export interface ProgressionTargets {
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  currentWeight: number;
}

export interface ProgressionOption {
  type: "reps" | "weight" | "deload";
  reps: number;
  weight: number;
  estimated1RM: number;
  totalVolume: number;
  label: string;
  description: string;
}

export interface ProgressionAnalysis {
  current1RM: number;
  bestSession1RM: number;
  plateauSessions: number;
  isPlateau: boolean;
  needsDeload: boolean;
  progressionSpeed: "fast" | "normal" | "slow";
  sessionsSinceProgress: number;
  primaryOption: ProgressionOption;
  alternativeOption: ProgressionOption;
  deloadOption: ProgressionOption | null;
  totalVolumeLastSession: number;
  volumeTrend: "up" | "down" | "stable";
}

function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  if (reps > 30) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function getBest1RMFromSession(sets: WorkoutSetRecord[]): number {
  let best = 0;
  for (const s of sets) {
    if (s.completed && s.reps > 0 && s.weight > 0) {
      const e = estimate1RM(s.weight, s.reps);
      if (e > best) best = e;
    }
  }
  return best;
}

function isCompoundExercise(name: string): boolean {
  const n = name.toLowerCase();
  const compounds = [
    "squat", "deadlift", "soulevé", "developp", "développ",
    "bench", "row", "tirage", "presse", "hip thrust",
    "fente", "lunge", "clean", "snatch", "arrach", "epaul",
    "traction", "pull-up", "dip", "military", "overhead",
  ];
  return compounds.some((c) => n.includes(c));
}

function getBaseIncrement(exerciseName: string): number {
  return isCompoundExercise(exerciseName) ? 2.5 : 1.25;
}

function analyzeProgression(
  history: ExerciseHistory,
  targets: ProgressionTargets
): ProgressionAnalysis {
  const noHistory: ProgressionAnalysis = {
    current1RM: estimate1RM(targets.currentWeight, targets.repRangeMin),
    bestSession1RM: 0,
    plateauSessions: 0,
    isPlateau: false,
    needsDeload: false,
    progressionSpeed: "normal",
    sessionsSinceProgress: 0,
    primaryOption: {
      type: "reps",
      reps: targets.repRangeMin,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * targets.currentWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${targets.currentWeight} kg`,
      description: "Première séance — objectif de base",
    },
    alternativeOption: {
      type: "weight",
      reps: targets.repRangeMin,
      weight: Math.round((targets.currentWeight + getBaseIncrement(history.exerciseName)) * 10) / 10,
      estimated1RM: estimate1RM(
        Math.round((targets.currentWeight + getBaseIncrement(history.exerciseName)) * 10) / 10,
        targets.repRangeMin
      ),
      totalVolume: targets.targetSets * targets.repRangeMin * Math.round((targets.currentWeight + getBaseIncrement(history.exerciseName)) * 10) / 10,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${Math.round((targets.currentWeight + getBaseIncrement(history.exerciseName)) * 10) / 10} kg`,
      description: "Commencer plus lourd directement",
    },
    deloadOption: null,
    totalVolumeLastSession: 0,
    volumeTrend: "stable",
  };

  if (history.sessions.length === 0) return noHistory;

  const lastSession = history.sessions[history.sessions.length - 1];
  const completedSets = lastSession.sets.filter((s) => s.completed);

  if (completedSets.length === 0) {
    return {
      ...noHistory,
      current1RM: estimate1RM(targets.currentWeight, targets.repRangeMin),
    };
  }

  const current1RM = getBest1RMFromSession(completedSets);

  const session1RMs = history.sessions.map((s) =>
    getBest1RMFromSession(s.sets.filter((x) => x.completed))
  );
  const bestSession1RM = Math.max(...session1RMs.filter((x) => x > 0));

  let plateauCount = 0;
  for (let i = session1RMs.length - 1; i >= 0; i--) {
    if (i === session1RMs.length - 1) continue;
    if (session1RMs[i] >= session1RMs[i + 1]) {
      plateauCount++;
    } else {
      break;
    }
  }
  const isPlateau = plateauCount >= 3;
  const needsDeload = plateauCount >= 4;

  let sessionsSinceProgress = 0;
  for (let i = session1RMs.length - 2; i >= 0; i--) {
    sessionsSinceProgress++;
    if (session1RMs[i] < session1RMs[i + 1]) break;
  }

  let progressionSpeed: "fast" | "normal" | "slow" = "normal";
  if (sessionsSinceProgress <= 2 && history.sessions.length > 2) {
    progressionSpeed = "fast";
  } else if (sessionsSinceProgress >= 5) {
    progressionSpeed = "slow";
  }

  const baseIncrement = getBaseIncrement(history.exerciseName);
  let adaptiveIncrement = baseIncrement;
  if (progressionSpeed === "fast") {
    adaptiveIncrement = Math.round(baseIncrement * 1.5 * 10) / 10;
  } else if (progressionSpeed === "slow") {
    adaptiveIncrement = Math.round(baseIncrement * 0.75 * 10) / 10;
    if (adaptiveIncrement < 0.5) adaptiveIncrement = 0.5;
  }

  const bestLastReps = Math.max(...completedSets.map((s) => s.reps));
  const allSetsHitMax = completedSets.every(
    (s) => s.reps >= targets.repRangeMax
  );

  const avgRPE = completedSets.filter((s) => s.rpe && s.rpe > 0).length > 0
    ? completedSets.reduce((sum, s) => sum + (s.rpe || 0), 0) / completedSets.filter((s) => s.rpe && s.rpe > 0).length
    : 0;

  let primaryOption: ProgressionOption;
  let alternativeOption: ProgressionOption;

  if (avgRPE >= 9) {
    const conservativeWeight = Math.round((targets.currentWeight + Math.max(0.5, baseIncrement * 0.5)) * 10) / 10;
    primaryOption = {
      type: "reps",
      reps: bestLastReps + 1,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, bestLastReps + 1),
      totalVolume: targets.targetSets * (bestLastReps + 1) * targets.currentWeight,
      label: `${targets.targetSets}×${bestLastReps + 1} à ${targets.currentWeight} kg`,
      description: `RPE élevé (${avgRPE.toFixed(0)}/10) → progression conservatrice en reps`,
    };
    alternativeOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: conservativeWeight,
      estimated1RM: estimate1RM(conservativeWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * conservativeWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${conservativeWeight} kg`,
      description: `RPE élevé → augmentation légère du poids (+${Math.round((conservativeWeight - targets.currentWeight) * 10) / 10} kg)`,
    };
  } else if (avgRPE > 0 && avgRPE <= 7) {
    const ambitiousWeight = Math.round((targets.currentWeight + baseIncrement * 1.5) * 10) / 10;
    primaryOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: ambitiousWeight,
      estimated1RM: estimate1RM(ambitiousWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * ambitiousWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${ambitiousWeight} kg`,
      description: `RPE faible (${avgRPE.toFixed(0)}/10) → progression ambitieuse prioritaire`,
    };
    const repsOption = allSetsHitMax || bestLastReps >= targets.repRangeMax ? targets.repRangeMax + 1 : bestLastReps + 1;
    alternativeOption = {
      type: "reps",
      reps: repsOption,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, repsOption),
      totalVolume: targets.targetSets * repsOption * targets.currentWeight,
      label: `${targets.targetSets}×${repsOption} à ${targets.currentWeight} kg`,
      description: "Alternative : progresser en reps",
    };
  } else if (allSetsHitMax) {
    const newWeight = Math.round((targets.currentWeight + adaptiveIncrement) * 10) / 10;
    primaryOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: newWeight,
      estimated1RM: estimate1RM(newWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * newWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${newWeight} kg`,
      description: `Plafond atteint (${targets.repRangeMax} reps) → on augmente le poids et on repart en bas de la fourchette`,
    };
    alternativeOption = {
      type: "reps",
      reps: targets.repRangeMax + 1,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, targets.repRangeMax + 1),
      totalVolume: targets.targetSets * (targets.repRangeMax + 1) * targets.currentWeight,
      label: `${targets.targetSets}×${targets.repRangeMax + 1} à ${targets.currentWeight} kg`,
      description: "Continuer en reps au-delà de la fourchette",
    };
  } else if (bestLastReps >= targets.repRangeMax) {
    const newWeight = Math.round((targets.currentWeight + adaptiveIncrement) * 10) / 10;
    primaryOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: newWeight,
      estimated1RM: estimate1RM(newWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * newWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${newWeight} kg`,
      description: `Reps max atteintes → surcharge en poids (+${adaptiveIncrement} kg)`,
    };
    alternativeOption = {
      type: "reps",
      reps: bestLastReps + 1,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, bestLastReps + 1),
      totalVolume: targets.targetSets * (bestLastReps + 1) * targets.currentWeight,
      label: `${targets.targetSets}×${bestLastReps + 1} à ${targets.currentWeight} kg`,
      description: "+1 rep supplémentaire",
    };
  } else {
    primaryOption = {
      type: "reps",
      reps: bestLastReps + 1,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, bestLastReps + 1),
      totalVolume: targets.targetSets * (bestLastReps + 1) * targets.currentWeight,
      label: `${targets.targetSets}×${bestLastReps + 1} à ${targets.currentWeight} kg`,
      description: `Progression en reps (${bestLastReps} → ${bestLastReps + 1})`,
    };
    const weightOption = Math.round((targets.currentWeight + adaptiveIncrement) * 10) / 10;
    alternativeOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: weightOption,
      estimated1RM: estimate1RM(weightOption, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * weightOption,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${weightOption} kg`,
      description: `Sauter directement en poids (+${adaptiveIncrement} kg)`,
    };
  }

  let deloadOption: ProgressionOption | null = null;
  if (needsDeload) {
    const deloadWeight = Math.round(targets.currentWeight * 0.9 * 10) / 10;
    deloadOption = {
      type: "deload",
      reps: targets.repRangeMin,
      weight: deloadWeight,
      estimated1RM: estimate1RM(deloadWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * deloadWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} à ${deloadWeight} kg (-10%)`,
      description: "Plateau détecté — deload recommandé pour récupérer",
    };
  }

  const totalVolumeLastSession = completedSets.reduce(
    (sum, s) => sum + s.reps * s.weight,
    0
  );

  let volumeTrend: "up" | "down" | "stable" = "stable";
  if (history.sessions.length >= 2) {
    const prevSession = history.sessions[history.sessions.length - 2];
    const prevCompleted = prevSession.sets.filter((s) => s.completed);
    if (prevCompleted.length > 0) {
      const prevVolume = prevCompleted.reduce(
        (sum, s) => sum + s.reps * s.weight,
        0
      );
      if (totalVolumeLastSession > prevVolume * 1.05) volumeTrend = "up";
      else if (totalVolumeLastSession < prevVolume * 0.95) volumeTrend = "down";
    }
  }

  return {
    current1RM,
    bestSession1RM,
    plateauSessions: plateauCount,
    isPlateau,
    needsDeload,
    progressionSpeed,
    sessionsSinceProgress,
    primaryOption,
    alternativeOption,
    deloadOption,
    totalVolumeLastSession,
    volumeTrend,
  };
}

export { estimate1RM, analyzeProgression };
