import localforage from "localforage";

export const db = localforage.createInstance({
  name: "smartload",
  storeName: "data",
});

const syncStore = localforage.createInstance({
  name: "smartload",
  storeName: "sync_queue",
});

export interface SyncOperation {
  id: string;
  timestamp: number;
  table: string;
  operation: "insert" | "update" | "delete";
  payload?: Record<string, unknown>;
  where?: Record<string, unknown>;
}

export async function queueSync(op: Omit<SyncOperation, "id" | "timestamp">): Promise<string> {
  const id = `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const operation: SyncOperation = { ...op, id, timestamp: Date.now() };
  await syncStore.setItem(id, operation);
  return id;
}

export async function getPendingSyncs(): Promise<SyncOperation[]> {
  const ops: SyncOperation[] = [];
  await syncStore.iterate<SyncOperation, void>((value) => {
    ops.push(value);
  });
  return ops.sort((a, b) => a.timestamp - b.timestamp);
}

export async function clearSynced(id: string): Promise<void> {
  await syncStore.removeItem(id);
}

export async function clearAllSyncs(): Promise<void> {
  await syncStore.clear();
}

export async function cacheData(key: string, data: unknown): Promise<void> {
  await db.setItem(`cache_${key}`, { data, timestamp: Date.now() });
}

export async function getCachedData<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
  const cached = await db.getItem<{ data: T; timestamp: number }>(`cache_${key}`);
  return cached;
}

export async function clearCache(key: string): Promise<void> {
  await db.removeItem(`cache_${key}`);
}

export async function clearAllCache(): Promise<void> {
  const keys: string[] = [];
  await db.iterate<unknown, void>((_, key) => {
    if (key.startsWith("cache_")) keys.push(key);
  });
  for (const key of keys) {
    await db.removeItem(key);
  }
}
