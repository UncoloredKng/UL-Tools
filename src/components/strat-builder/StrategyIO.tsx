"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { useStratStore } from "@/store/useStratStore";
import { downloadStrategy, parseStrategyFile } from "@/lib/stratBuilder";
import { Button } from "@/components/ui/Button";

export function StrategyIO() {
  const document = useStratStore((s) => s.document);
  const loadDocument = useStratStore((s) => s.loadDocument);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        Importer
      </Button>
      <Button variant="primary" onClick={() => downloadStrategy(document)}>
        <Download className="h-4 w-4" />
        Sauvegarder
      </Button>
    </div>
  );
}
