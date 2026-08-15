"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload, HardDrive, Unlink } from "lucide-react";
import { useStratStore } from "@/store/useStratStore";
import { downloadStrategy, parseStrategyFile } from "@/lib/stratBuilder";
import {
  AUTOSAVE_INTERVAL_MS,
  clearFileHandle,
  ensureWritePermission,
  loadFileHandle,
  pickOpenHandle,
  pickSaveHandle,
  saveFileHandle,
  supportsFileSystemAccess,
  writeDocumentToHandle,
} from "@/lib/stratFileHandle";
import { Button } from "@/components/ui/Button";

function formatTime(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StrategyIO() {
  const document = useStratStore((s) => s.document);
  const loadDocument = useStratStore((s) => s.loadDocument);
  const inputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef(document);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const fsa = supportsFileSystemAccess();
  const [linkedName, setLinkedName] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const writeLinked = useCallback(async (): Promise<boolean> => {
    const handle = await loadFileHandle();
    if (!handle) return false;
    const allowed = await ensureWritePermission(handle);
    if (!allowed) {
      setStatus("Permission d'écriture refusée — recliquez sur Sauvegarder.");
      return false;
    }
    await writeDocumentToHandle(handle, documentRef.current);
    setLinkedName(handle.name);
    setLastSavedAt(new Date());
    setStatus(null);
    return true;
  }, []);

  // Restaure le handle lié au chargement (Chrome / Edge).
  useEffect(() => {
    if (!fsa) return;
    void (async () => {
      const handle = await loadFileHandle();
      if (handle) setLinkedName(handle.name);
    })();
  }, [fsa]);

  // Auto-save toutes les 20 minutes sur le fichier lié.
  useEffect(() => {
    if (!fsa || !linkedName) return;
    const id = window.setInterval(() => {
      void writeLinked().then((ok) => {
        if (ok) setStatus("Auto-sauvegarde effectuée");
      });
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fsa, linkedName, writeLinked]);

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const imported = parseStrategyFile(text);
      loadDocument(imported);
    } catch {
      window.alert(
        "Impossible d'importer ce fichier : il n'est pas au format Strat Builder attendu."
      );
    }
  }

  async function onImport() {
    if (fsa) {
      try {
        const handle = await pickOpenHandle();
        if (!handle) return;
        const file = await handle.getFile();
        await handleImportFile(file);
        await saveFileHandle(handle);
        setLinkedName(handle.name);
        setStatus(`Fichier lié : ${handle.name}`);
        return;
      } catch {
        window.alert("Import impossible via le sélecteur de fichiers.");
        return;
      }
    }
    inputRef.current?.click();
  }

  async function onSave() {
    if (fsa) {
      try {
        // Réécrit le fichier lié si possible, sinon propose un chemin.
        const existing = await loadFileHandle();
        if (existing && (await ensureWritePermission(existing))) {
          await writeDocumentToHandle(existing, document);
          setLinkedName(existing.name);
          setLastSavedAt(new Date());
          setStatus(`Enregistré dans ${existing.name}`);
          return;
        }
        const handle = await pickSaveHandle(document);
        if (!handle) return;
        await writeDocumentToHandle(handle, document);
        await saveFileHandle(handle);
        setLinkedName(handle.name);
        setLastSavedAt(new Date());
        setStatus(`Fichier lié : ${handle.name}`);
        return;
      } catch {
        // Fallback téléchargement.
      }
    }
    downloadStrategy(document);
    setLastSavedAt(new Date());
    setStatus("Téléchargement JSON lancé");
  }

  async function onUnlink() {
    await clearFileHandle();
    setLinkedName(null);
    setStatus("Fichier délié — auto-save désactivé");
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => void onImport()}>
          <Upload className="h-4 w-4" />
          Importer
        </Button>
        <Button variant="primary" onClick={() => void onSave()}>
          <Download className="h-4 w-4" />
          Sauvegarder
        </Button>
        {linkedName && (
          <Button variant="ghost" size="sm" onClick={() => void onUnlink()}>
            <Unlink className="h-4 w-4" />
            Délier
          </Button>
        )}
      </div>
      {(linkedName || status || lastSavedAt) && (
        <p className="max-w-sm text-right text-[11px] text-muted-soft">
          {linkedName && (
            <span className="inline-flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Lié : {linkedName}
              {fsa ? " · auto-save 20 min" : ""}
            </span>
          )}
          {!linkedName && fsa && (
            <span>Sauvegardez ou importez pour lier un fichier (auto-save 20 min).</span>
          )}
          {!fsa && (
            <span>
              {" "}
              Auto-save sur disque indisponible dans ce navigateur (Chrome/Edge
              recommandé).
            </span>
          )}
          {lastSavedAt && (
            <span className="ml-1">· Dernière save {formatTime(lastSavedAt)}</span>
          )}
          {status && !linkedName && <span className="ml-1">· {status}</span>}
        </p>
      )}
    </div>
  );
}
