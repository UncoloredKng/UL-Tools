import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

interface ToolPageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ToolPageHeader({ title, description, icon: Icon }: ToolPageHeaderProps) {
  return (
    <header className="mb-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux outils
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
    </header>
  );
}
