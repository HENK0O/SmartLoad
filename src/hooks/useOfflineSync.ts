"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { queueSync, getPendingSyncs, clearSynced, cacheData, getCachedData } from "@/lib/localforage";

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return isOnline;
}

async function processSyncQueue() {
  const pending = await getPendingSyncs();
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const op of pending) {
    try {
      if (op.operation === "insert" && op.payload) {
        const { error } = await supabase.from(op.table).insert(op.payload);
        if (!error) {
          await clearSynced(op.id);
          synced++;
        }
      } else if (op.operation === "update" && op.where && op.payload) {
        let query = supabase.from(op.table).update(op.payload);
        for (const [key, val] of Object.entries(op.where)) {
          query = query.eq(key, val as string);
        }
        const { error } = await query;
        if (!error) {
          await clearSynced(op.id);
          synced++;
        }
      } else if (op.operation === "delete" && op.where) {
        let query = supabase.from(op.table).delete();
        for (const [key, val] of Object.entries(op.where)) {
          query = query.eq(key, val as string);
        }
        const { error } = await query;
        if (!error) {
          await clearSynced(op.id);
          synced++;
        }
      }
    } catch {
      // skip failed ops, retry later
    }
  }
  return synced;
}

async function syncWorkoutSets(workoutId: string, sets: unknown[]) {
  const { error } = await supabase.from("workout_sets").upsert(sets as Record<string, unknown>[]);
  return !error;
}

async function syncWorkoutStatus(workoutId: string, status: string, completedAt: string | null) {
  const update: Record<string, unknown> = { status };
  if (completedAt) update.completed_at = completedAt;
  const { error } = await supabase.from("workouts").update(update).eq("id", workoutId);
  return !error;
}

async function cacheWorkoutData(workoutId: string, data: Record<string, unknown>) {
  await cacheData(`workout_${workoutId}`, data);
}

async function getCachedWorkout(workoutId: string) {
  return getCachedData<Record<string, unknown>>(`workout_${workoutId}`);
}

export { useOnlineStatus, processSyncQueue, queueSync, syncWorkoutSets, syncWorkoutStatus, cacheWorkoutData, getCachedWorkout };
