/**
 * Persistance d'un handle File System Access pour réécrire le JSON
 * de stratégie au même chemin (Chrome / Edge).
 *
 * Les navigateurs n'autorisent pas l'écriture arbitraire sur le disque :
 * l'utilisateur doit lier un fichier une fois (Sauvegarder ou Importer),
 * puis on réutilise ce handle pour l'auto-save.
 */

import type { StratDocument } from "@/types/strat-builder";
import { strategyFileName } from "@/lib/stratBuilder";

const DB_NAME = "ul-toolbox-strat-builder";
const DB_VERSION = 1;
const STORE = "handles";
const HANDLE_KEY = "strategy-file";

export const AUTOSAVE_INTERVAL_MS = 20 * 60 * 1000;

export function supportsFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    "showSaveFilePicker" in window &&
    "showOpenFilePicker" in window
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileHandle(
  handle: FileSystemFileHandle
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemFileHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(HANDLE_KEY);
        req.onsuccess = () =>
          resolve((req.result as FileSystemFileHandle | undefined) ?? null);
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function clearFileHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore : IndexedDB indisponible.
  }
}

export async function ensureWritePermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission === "granted") return true;
  const requested = await handle.requestPermission({ mode: "readwrite" });
  return requested === "granted";
}

export async function writeDocumentToHandle(
  handle: FileSystemFileHandle,
  document: StratDocument
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(document, null, 2));
  await writable.close();
}

export async function pickSaveHandle(
  document: StratDocument
): Promise<FileSystemFileHandle | null> {
  const picker = window.showSaveFilePicker;
  if (!picker) return null;
  try {
    const handle = await picker({
      suggestedName: strategyFileName(document),
      types: [
        {
          description: "Strat Builder JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    return handle;
  } catch (error) {
    // Annulation utilisateur.
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

export async function pickOpenHandle(): Promise<FileSystemFileHandle | null> {
  const picker = window.showOpenFilePicker;
  if (!picker) return null;
  try {
    const [handle] = await picker({
      multiple: false,
      types: [
        {
          description: "Strat Builder JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    return handle ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}
