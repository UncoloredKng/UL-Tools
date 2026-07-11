import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  available: boolean;
}

export function ToolCard({ title, description, icon: Icon, href, available }: ToolCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            available ? "bg-accent-soft text-accent" : "bg-surface-hover text-muted"
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {available ? (
          <ArrowRight className="h-4 w-4 text-muted-soft transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent" />
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-muted">
            <Clock className="h-3 w-3" />
            Bientôt disponible
          </span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </>
  );

  const baseClasses =
    "group relative flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200";

  if (!available || !href) {
    return (
      <div className={cn(baseClasses, "cursor-not-allowed opacity-60")}>{content}</div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        baseClasses,
        "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_32px_-12px_rgba(92,228,146,0.25)]"
      )}
    >
      {content}
    </Link>
  );
}
