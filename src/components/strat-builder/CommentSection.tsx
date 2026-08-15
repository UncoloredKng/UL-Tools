"use client";

import { useState } from "react";
import { MessageSquarePlus, Trash2, MessageSquare } from "lucide-react";
import type { StratComment } from "@/types/strat-builder";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const AUTHOR_KEY = "ul-toolbox-strat-author";

interface CommentSectionProps {
  comments: StratComment[];
  onAdd: (comment: { author: string; text: string }) => void;
  onRemove: (commentId: string) => void;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Zone commentaires repliable : nom + message court pour les retours d'équipe.
 */
export function CommentSection({ comments, onAdd, onRemove }: CommentSectionProps) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(AUTHOR_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [text, setText] = useState("");

  function submit() {
    const cleanText = text.trim();
    if (!cleanText) return;
    const cleanAuthor = author.trim() || "Anonyme";
    try {
      window.localStorage.setItem(AUTHOR_KEY, cleanAuthor);
    } catch {
      // Ignore.
    }
    onAdd({ author: cleanAuthor, text: cleanText });
    setText("");
  }

  return (
    <div className="mt-4 border-t border-border-soft pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        Commentaires
        {comments.length > 0 && (
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-foreground">
            {comments.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-soft">
              Aucun commentaire. Posez une question ou une suggestion à l&apos;équipe.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-xl border border-border-soft bg-surface-soft/60 px-3 py-2"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {comment.author}
                      </span>
                      <span className="ml-2 text-[11px] text-muted-soft">
                        {formatWhen(comment.createdAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(comment.id)}
                      aria-label="Supprimer le commentaire"
                      className="shrink-0 text-muted hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted">
                    {comment.text}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto]">
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Votre nom"
              className="h-9"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Commentaire rapide…"
              rows={2}
              className="min-h-[38px] resize-y"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={submit}
              disabled={!text.trim()}
              className="self-start"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
