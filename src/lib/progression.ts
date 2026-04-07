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
  type: "reps" | "weight" | "deload" | "maintain";
  reps: number;
  weight: number;
  estimated1RM: number;
  totalVolume: number;
  label: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

export interface ProgressionAnalysis {
  current1RM: number;
  bestSession1RM: number;
  e1RMTrend: number[];
  plateauSessions: number;
  isPlateau: boolean;
  needsDeload: boolean;
  progressionSpeed: "aggressive" | "normal" | "conservative" | "deload";
  sessionsSinceProgress: number;
  primaryOption: ProgressionOption;
  alternativeOption: ProgressionOption;
  deloadOption: ProgressionOption | null;
  totalVolumeLastSession: number;
  volumeTrend: "up" | "down" | "stable";
  avgRPE: number;
  suggestedWeight: number;
  suggestedReps: number;
  progressionReason: string;
  exerciseType: "compound" | "isolation" | "unknown";
}

export interface AutoFillData {
  weight: number;
  reps: number;
  source: "last_session" | "progression" | "target" | "pr";
  reason: string;
}

const COMPOUND_KEYWORDS = [
  "squat", "deadlift", "soulevé", "developpé", "développé",
  "bench", "presse", "row", "tirage", "hip thrust",
  "fente", "lunge", "clean", "snatch", "arrach", "épaulé",
  "traction", "pull-up", "pullup", "dip", "military", "overhead",
  "rowing", "tractions"
];

const ISOLATION_KEYWORDS = [
  "curl", "biceps", "triceps", "latéral", "delt", "pec", "fly",
  "leg extension", "leg curl", "calf", "mollets", "abductor", "adductor",
  "shrug", "face pull", "reverse fly", "lateral raise", "cable curl"
];

export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 30) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function classifyExercise(name: string): "compound" | "isolation" | "unknown" {
  const lower = name.toLowerCase();
  const compoundMatches = COMPOUND_KEYWORDS.filter(k => lower.includes(k)).length;
  const isolationMatches = ISOLATION_KEYWORDS.filter(k => lower.includes(k)).length;
  
  if (compoundMatches > isolationMatches) return "compound";
  if (isolationMatches > 0) return "isolation";
  return "unknown";
}

function getIncrement(exerciseType: "compound" | "isolation" | "unknown"): number {
  if (exerciseType === "compound") return 2.5;
  if (exerciseType === "isolation") return 1.25;
  return 1.25;
}

function getProgressionIncrement(
  exerciseType: "compound" | "isolation" | "unknown",
  sessionsSinceProgress: number,
  plateau: boolean
): number {
  const base = exerciseType === "compound" ? 2.5 : exerciseType === "isolation" ? 1.25 : 1.25;
  
  if (plateau) {
    return base * 0.5;
  }
  
  if (sessionsSinceProgress === 0) {
    return base;
  } else if (sessionsSinceProgress === 1) {
    return base * 0.75;
  } else if (sessionsSinceProgress === 2) {
    return base * 0.5;
  } else {
    return base * 0.25;
  }
}

function calculateAvgRPE(sets: WorkoutSetRecord[]): number {
  const setsWithRPE = sets.filter(s => s.rpe && s.rpe > 0 && s.completed);
  if (setsWithRPE.length === 0) return 0;
  return setsWithRPE.reduce((sum, s) => sum + (s.rpe || 0), 0) / setsWithRPE.length;
}

function calculateVolume(sets: WorkoutSetRecord[]): number {
  return sets.filter(s => s.completed).reduce((sum, s) => sum + s.reps * s.weight, 0);
}

function getBestSet(sets: WorkoutSetRecord[]): WorkoutSetRecord | null {
  let best = 0;
  let bestSet: WorkoutSetRecord | null = null;
  for (const s of sets) {
    if (s.completed && s.reps > 0 && s.weight > 0) {
      const e1rm = estimate1RM(s.weight, s.reps);
      if (e1rm > best) {
        best = e1rm;
        bestSet = s;
      }
    }
  }
  return bestSet;
}

function analyzeProgressionInternal(
  history: ExerciseHistory,
  targets: ProgressionTargets
): ProgressionAnalysis {
  const exerciseType = classifyExercise(history.exerciseName);
  const isCompound = exerciseType === "compound" || COMPOUND_KEYWORDS.some(k => history.exerciseName.toLowerCase().includes(k));

  const noHistory: ProgressionAnalysis = {
    current1RM: estimate1RM(targets.currentWeight, targets.repRangeMin),
    bestSession1RM: 0,
    e1RMTrend: [],
    plateauSessions: 0,
    isPlateau: false,
    needsDeload: false,
    progressionSpeed: "normal",
    sessionsSinceProgress: 0,
    primaryOption: {
      type: "maintain",
      reps: targets.repRangeMin,
      weight: targets.currentWeight,
      estimated1RM: estimate1RM(targets.currentWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * targets.currentWeight,
      label: `${targets.targetSets}×${targets.repRangeMin} a ${targets.currentWeight} kg`,
      description: "Premiere seance - objectif de base",
      confidence: "high"
    },
    alternativeOption: {
      type: "weight",
      reps: targets.repRangeMin,
      weight: Math.round((targets.currentWeight + getIncrement(exerciseType)) * 10) / 10,
      estimated1RM: estimate1RM(targets.currentWeight + getIncrement(exerciseType), targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * (targets.currentWeight + getIncrement(exerciseType)),
      label: `${targets.targetSets}x${targets.repRangeMin} a ${targets.currentWeight + getIncrement(exerciseType)} kg`,
      description: "Commencer plus lourd si confiant",
      confidence: "low"
    },
    deloadOption: null,
    totalVolumeLastSession: 0,
    volumeTrend: "stable",
    avgRPE: 0,
    suggestedWeight: targets.currentWeight,
    suggestedReps: targets.repRangeMin,
    progressionReason: "Premiere seance",
    exerciseType
  };

  if (history.sessions.length === 0) return noHistory;

  const lastSession = history.sessions[history.sessions.length - 1];
  const completedSets = lastSession.sets.filter(s => s.completed);
  
  if (completedSets.length === 0) {
    return { ...noHistory, current1RM: estimate1RM(targets.currentWeight, targets.repRangeMin) };
  }

  const lastBestSet = getBestSet(completedSets);
  if (!lastBestSet) {
    return { ...noHistory, current1RM: estimate1RM(targets.currentWeight, targets.repRangeMin) };
  }

  const current1RM = estimate1RM(lastBestSet.weight, lastBestSet.reps);
  const avgRPE = calculateAvgRPE(completedSets);
  const totalVolume = calculateVolume(completedSets);
  
  const sessionE1RMs: number[] = [];
  const sessionVolumes: number[] = [];
  
  for (const session of history.sessions) {
    const completed = session.sets.filter(s => s.completed);
    if (completed.length > 0) {
      const best = getBestSet(completed);
      if (best) {
        sessionE1RMs.push(estimate1RM(best.weight, best.reps));
        sessionVolumes.push(calculateVolume(completed));
      }
    }
  }

  const e1RMTrend = sessionE1RMs.slice(-6);
  const bestSession1RM = sessionE1RMs.length > 0 ? Math.max(...sessionE1RMs) : current1RM;

  let plateauSessions = 0;
  let sessionsSinceProgress = 0;
  
  for (let i = sessionE1RMs.length - 1; i >= 0; i--) {
    if (i === sessionE1RMs.length - 1) continue;
    
    if (sessionE1RMs[i] >= sessionE1RMs[i + 1]) {
      plateauSessions++;
    } else {
      break;
    }
  }
  
  for (let i = sessionE1RMs.length - 2; i >= 0; i--) {
    if (sessionE1RMs[i] < sessionE1RMs[i + 1]) {
      sessionsSinceProgress = sessionE1RMs.length - 1 - i;
      break;
    }
  }

  const isPlateau = plateauSessions >= 3;
  const needsDeload = plateauSessions >= 4 || avgRPE >= 9.5;

  const baseIncrement = getIncrement(exerciseType);
  const progressionIncrement = getProgressionIncrement(exerciseType, sessionsSinceProgress, isPlateau);

  let progressionSpeed: "aggressive" | "normal" | "conservative" | "deload" = "normal";
  if (needsDeload) progressionSpeed = "deload";
  else if (sessionsSinceProgress === 0 && plateauSessions === 0 && avgRPE >= 8) progressionSpeed = "conservative";
  else if (sessionsSinceProgress === 0 && avgRPE <= 7) progressionSpeed = "aggressive";
  else if (sessionsSinceProgress >= 3) progressionSpeed = "conservative";

  let suggestedWeight = lastBestSet.weight;
  let suggestedReps = lastBestSet.reps;
  let progressionReason = "Valeurs de la dernière séance";

  const repsInRange = completedSets.filter(s => 
    s.reps >= targets.repRangeMin && s.reps <= targets.repRangeMax
  ).length;
  
  const allAboveMax = completedSets.every(s => s.reps >= targets.repRangeMax);
  const allBelowMin = completedSets.every(s => s.reps < targets.repRangeMin);

  let primaryOption: ProgressionOption;
  let alternativeOption: ProgressionOption;

  if (needsDeload) {
    const deloadWeight = Math.round((lastBestSet.weight * 0.9) * 10) / 10;
    suggestedWeight = deloadWeight;
    suggestedReps = targets.repRangeMin;
    progressionReason = "Deload recommande (fatigue excessive)";
    
    primaryOption = {
      type: "deload",
      reps: targets.repRangeMin,
      weight: deloadWeight,
      estimated1RM: estimate1RM(deloadWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * deloadWeight,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${deloadWeight} kg (-10%)`,
      description: `RPE moyen ${avgRPE.toFixed(1)}/10 - deload pour recuperer`,
      confidence: "high"
    };
    alternativeOption = {
      type: "maintain",
      reps: targets.repRangeMin,
      weight: lastBestSet.weight,
      estimated1RM: current1RM,
      totalVolume: targets.targetSets * targets.repRangeMin * lastBestSet.weight,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${lastBestSet.weight} kg (maintenir)`,
      description: "Conserver le poids actuel sans augmentation",
      confidence: "medium"
    };
  } else if (avgRPE >= 9) {
    const newWeight = Math.round((lastBestSet.weight + progressionIncrement * 0.5) * 10) / 10;
    suggestedWeight = newWeight;
    suggestedReps = targets.repRangeMin;
    progressionReason = `RPE eleve (${avgRPE.toFixed(1)}) - augmentation legere`;
    
    primaryOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: newWeight,
      estimated1RM: estimate1RM(newWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * newWeight,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${newWeight} kg`,
      description: `RPE ${avgRPE.toFixed(1)}/10 - augmenter legerement le poids`,
      confidence: "high"
    };
    alternativeOption = {
      type: "reps",
      reps: lastBestSet.reps + 1,
      weight: lastBestSet.weight,
      estimated1RM: estimate1RM(lastBestSet.weight, lastBestSet.reps + 1),
      totalVolume: targets.targetSets * (lastBestSet.reps + 1) * lastBestSet.weight,
      label: `${targets.targetSets}x${lastBestSet.reps + 1} a ${lastBestSet.weight} kg`,
      description: "Rester au meme poids, ajouter 1 rep",
      confidence: "medium"
    };
  } else if (allAboveMax && avgRPE <= 8) {
    const newWeight = Math.round((lastBestSet.weight + progressionIncrement) * 10) / 10;
    suggestedWeight = newWeight;
    suggestedReps = targets.repRangeMin;
    progressionReason = `Toutes les series a ${targets.repRangeMax}+ reps - augmenter le poids`;
    
    primaryOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: newWeight,
      estimated1RM: estimate1RM(newWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * newWeight,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${newWeight} kg`,
      description: `Toutes series a ${targets.repRangeMax}+ reps - progression en poids (+${progressionIncrement} kg)`,
      confidence: "high"
    };
    alternativeOption = {
      type: "reps",
      reps: targets.repRangeMax + 1,
      weight: lastBestSet.weight,
      estimated1RM: estimate1RM(lastBestSet.weight, targets.repRangeMax + 1),
      totalVolume: targets.targetSets * (targets.repRangeMax + 1) * lastBestSet.weight,
      label: `${targets.targetSets}x${targets.repRangeMax + 1} a ${lastBestSet.weight} kg`,
      description: "Continuer en reps au-dela de la fourchette",
      confidence: "low"
    };
  } else if (avgRPE <= 7 && sessionsSinceProgress === 0) {
    const newWeight = Math.round((lastBestSet.weight + progressionIncrement) * 10) / 10;
    suggestedWeight = newWeight;
    suggestedReps = targets.repRangeMin;
    progressionReason = `RPE faible (${avgRPE.toFixed(1)}) - progression normale`;
    
    primaryOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: newWeight,
      estimated1RM: estimate1RM(newWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * newWeight,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${newWeight} kg`,
      description: `RPE ${avgRPE.toFixed(1)}/10 - augmenter le poids de ${progressionIncrement} kg`,
      confidence: "high"
    };
    alternativeOption = {
      type: "reps",
      reps: Math.min(lastBestSet.reps + 2, targets.repRangeMax),
      weight: lastBestSet.weight,
      estimated1RM: estimate1RM(lastBestSet.weight, Math.min(lastBestSet.reps + 2, targets.repRangeMax)),
      totalVolume: targets.targetSets * Math.min(lastBestSet.reps + 2, targets.repRangeMax) * lastBestSet.weight,
      label: `${targets.targetSets}x${Math.min(lastBestSet.reps + 2, targets.repRangeMax)} a ${lastBestSet.weight} kg`,
      description: "Alternative : rester au meme poids, ajouter des reps",
      confidence: "medium"
    };
  } else if (repsInRange >= completedSets.length / 2) {
    suggestedWeight = lastBestSet.weight;
    suggestedReps = Math.min(lastBestSet.reps + 1, targets.repRangeMax);
    progressionReason = `Progression en reps (${lastBestSet.reps} -> ${suggestedReps})`;
    
    primaryOption = {
      type: "reps",
      reps: suggestedReps,
      weight: lastBestSet.weight,
      estimated1RM: estimate1RM(lastBestSet.weight, suggestedReps),
      totalVolume: targets.targetSets * suggestedReps * lastBestSet.weight,
      label: `${targets.targetSets}x${suggestedReps} a ${lastBestSet.weight} kg`,
      description: `Progression en reps (${lastBestSet.reps} -> ${suggestedReps})`,
      confidence: "high"
    };
    const weightOption = Math.round((lastBestSet.weight + progressionIncrement) * 10) / 10;
    alternativeOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: weightOption,
      estimated1RM: estimate1RM(weightOption, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * weightOption,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${weightOption} kg`,
      description: `Ou augmenter le poids de ${progressionIncrement} kg`,
      confidence: "medium"
    };
  } else {
    suggestedWeight = lastBestSet.weight;
    suggestedReps = lastBestSet.reps;
    progressionReason = "Maintenir les valeurs actuelles";
    
    primaryOption = {
      type: "maintain",
      reps: lastBestSet.reps,
      weight: lastBestSet.weight,
      estimated1RM: current1RM,
      totalVolume: targets.targetSets * lastBestSet.reps * lastBestSet.weight,
      label: `${targets.targetSets}x${lastBestSet.reps} a ${lastBestSet.weight} kg`,
      description: "Conserver les memes valeurs",
      confidence: "high"
    };
    const weightOption = Math.round((lastBestSet.weight + progressionIncrement * 0.5) * 10) / 10;
    alternativeOption = {
      type: "weight",
      reps: targets.repRangeMin,
      weight: weightOption,
      estimated1RM: estimate1RM(weightOption, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * weightOption,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${weightOption} kg`,
      description: `Legere augmentation de ${progressionIncrement * 0.5} kg si confiant`,
      confidence: "low"
    };
  }

  let deloadOption: ProgressionOption | null = null;
  if (plateauSessions >= 2 || avgRPE >= 9.5) {
    const deloadWeight = Math.round((lastBestSet.weight * 0.9) * 10) / 10;
    deloadOption = {
      type: "deload",
      reps: targets.repRangeMin,
      weight: deloadWeight,
      estimated1RM: estimate1RM(deloadWeight, targets.repRangeMin),
      totalVolume: targets.targetSets * targets.repRangeMin * deloadWeight,
      label: `${targets.targetSets}x${targets.repRangeMin} a ${deloadWeight} kg (-10%)`,
      description: "Deload suggere pour passer ce pallier",
      confidence: "medium"
    };
  }

  let volumeTrend: "up" | "down" | "stable" = "stable";
  if (sessionVolumes.length >= 2) {
    const recentVolume = sessionVolumes.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const previousVolume = sessionVolumes.slice(-4, -2).reduce((a, b) => a + b, 0) / Math.min(2, sessionVolumes.length - 2);
    if (recentVolume > previousVolume * 1.03) volumeTrend = "up";
    else if (recentVolume < previousVolume * 0.97) volumeTrend = "down";
  }

  return {
    current1RM,
    bestSession1RM,
    e1RMTrend,
    plateauSessions,
    isPlateau,
    needsDeload,
    progressionSpeed,
    sessionsSinceProgress,
    primaryOption,
    alternativeOption,
    deloadOption,
    totalVolumeLastSession: totalVolume,
    volumeTrend,
    avgRPE,
    suggestedWeight,
    suggestedReps,
    progressionReason,
    exerciseType
  };
}

function formatWeight(weight: number, unit: "kg" | "lbs"): string {
  if (unit === "lbs") {
    return Math.round(weight * 2.20462 * 10) / 10 + " lbs";
  }
  return weight + " kg";
}

function convertWeight(weight: number, fromUnit: "kg" | "lbs", toUnit: "kg" | "lbs"): number {
  if (fromUnit === toUnit) return weight;
  if (toUnit === "lbs") return Math.round(weight * 2.20462 * 10) / 10;
  return Math.round(weight / 2.20462 * 10) / 10;
}

export function analyzeProgression(
  history: ExerciseHistory,
  targets: ProgressionTargets,
  unit: "kg" | "lbs" = "kg"
): ProgressionAnalysis {
  const result = analyzeProgressionInternal(history, targets);
  
  const convertOption = (option: ProgressionOption): ProgressionOption => {
    const convertedWeight = convertWeight(option.weight, "kg", unit);
    return {
      ...option,
      weight: convertedWeight,
      label: option.label.replace(/\d+\.?\d*\s*kg/, formatWeight(option.weight, unit)),
    };
  };
  
  if (result.deloadOption) {
    result.deloadOption = convertOption(result.deloadOption);
  }
  result.primaryOption = convertOption(result.primaryOption);
  result.alternativeOption = convertOption(result.alternativeOption);
  
  result.suggestedWeight = convertWeight(result.suggestedWeight, "kg", unit);
  result.current1RM = convertWeight(result.current1RM, "kg", unit);
  result.bestSession1RM = convertWeight(result.bestSession1RM, "kg", unit);
  result.totalVolumeLastSession = unit === "lbs" 
    ? Math.round(result.totalVolumeLastSession * 2.20462 * 10) / 10 
    : result.totalVolumeLastSession;
  
  return result;
}

export function getAutoFill(
  lastSession: ExerciseSession | null,
  analysis: ProgressionAnalysis | null,
  targets: ProgressionTargets
): AutoFillData {
  if (!lastSession) {
    return {
      weight: targets.currentWeight,
      reps: targets.repRangeMin,
      source: "target",
      reason: "Pas d'historique - utilisation des valeurs cibles"
    };
  }

  const completedSets = lastSession.sets.filter(s => s.completed);
  if (completedSets.length === 0) {
    return {
      weight: targets.currentWeight,
      reps: targets.repRangeMin,
      source: "target",
      reason: "Derniere seance incomplète - utilisation des valeurs cibles"
    };
  }

  const lastBestSet = getBestSet(completedSets);
  if (!lastBestSet) {
    return {
      weight: targets.currentWeight,
      reps: targets.repRangeMin,
      source: "target",
      reason: "Pas de donnees valides - utilisation des valeurs cibles"
    };
  }

  if (!analysis) {
    return {
      weight: lastBestSet.weight,
      reps: lastBestSet.reps,
      source: "last_session",
      reason: "Analyse non disponible - reutilisation derniere seance"
    };
  }

  return {
    weight: analysis.suggestedWeight,
    reps: analysis.suggestedReps,
    source: "progression",
    reason: analysis.progressionReason
  };
}
