"use client";

import { useState } from "react";
import { Check, Copy, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copyToClipboard } from "@/lib/clipboard";

interface GeneratedPromptPanelProps {
  prompt: string;
  onValidate: () => void;
}

export function GeneratedPromptPanel({ prompt, onValidate }: GeneratedPromptPanelProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleCopy() {
    const success = await copyToClipboard(prompt);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleValidate() {
    onValidate();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-foreground">Prompt généré</h2>
        </div>
        {prompt && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copier dans le presse-papiers
                </>
              )}
            </Button>
            <Button size="sm" variant="primary" onClick={handleValidate}>
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Enregistré
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Valider &amp; archiver la semaine
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {prompt ? (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-border-soft bg-surface-soft p-4 font-mono text-[13px] leading-relaxed text-foreground">
          <code>{prompt}</code>
        </pre>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-soft py-10 text-center">
          <FileText className="h-6 w-6 text-muted-soft" />
          <p className="text-sm text-muted">
            Remplissez au moins un champ ci-dessus puis cliquez sur{" "}
            <span className="font-medium text-foreground">Générer le prompt</span>.
          </p>
        </div>
      )}
    </Card>
  );
}
