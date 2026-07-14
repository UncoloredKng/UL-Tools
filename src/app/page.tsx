import { LayoutGrid, ListChecks, Link2, Sparkles } from "lucide-react";
import { ToolCard } from "@/components/ToolCard";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          100% local · aucune donnée envoyée à un serveur
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Bienvenue sur la <span className="text-accent">UL Toolbox</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Votre boîte à outils pour les opérations de Media Trading et Social
          Ads. Choisissez un outil ci-dessous pour démarrer.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-soft">
          Outils disponibles
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            title="Prompt Builder"
            description="Construisez un prompt d'analyse hebdomadaire à partir des données de campagne, du contexte et des benchmarks."
            icon={Sparkles}
            href="/prompt-builder"
            available
          />
          <ToolCard
            title="To-Do Campagne"
            description="Suivez les actions à mener sur vos campagnes en cours, semaine après semaine."
            icon={ListChecks}
            available={false}
          />
          <ToolCard
            title="Extracteur Tracking"
            description="Parsez les fichiers Flashtalking et Nielsen DAR, puis exportez les URLs de tracking fusionnées."
            icon={Link2}
            href="/tracking-extractor"
            available
          />
          <ToolCard
            title="DDS Creator"
            description="Préparez la base d'un Doc de Structure via un formulaire : phases, publishers, segments et assets, puis export Excel."
            icon={LayoutGrid}
            href="/dds-creator"
            available
          />
        </div>
      </section>
    </div>
  );
}
