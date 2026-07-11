import type { KpiWeights, WeekDraft } from "@/types/prompt-builder";

const KPI_LABELS: Record<keyof KpiWeights, string> = {
  awareness: "Awareness",
  videoViews: "Vues Vidéo",
  engagement: "Engagement",
  traffic: "Trafic",
};

function buildKpiWeightsBlock(kpiWeights: KpiWeights): string {
  const lines = (Object.keys(kpiWeights) as Array<keyof KpiWeights>)
    .map((key) => `${KPI_LABELS[key]} : ${kpiWeights[key]}/10`)
    .join("\n");
  return `[DEBUT_PONDERATION_KPI]\n${lines}\n[FIN_PONDERATION_KPI]`;
}

/**
 * Section complète (délimiteurs `---` inclus) insérée juste après le
 * contexte/objectif de la tâche. La pondération des KPI est entièrement
 * optionnelle : si `useKpiWeighting` est désactivé, cette section est
 * intégralement retirée du prompt (aucune trace de la pondération KPI).
 */
function buildKpiSection({ useKpiWeighting, kpiWeights }: WeekDraft): string {
  if (!useKpiWeighting) {
    return "";
  }

  return `---
# ⚖️ PONDÉRATION STRATÉGIQUE DES KPI (ACTIVÉE)
L'analyse doit être polarisée en fonction des priorités stratégiques définies ci-dessous par le client. Un poids élevé (proche de 10) indique un KPI prioritaire dont la performance doit peser fortement dans le diagnostic et les recommandations ; un poids faible (proche de 0) indique un KPI secondaire, à mentionner sans lui accorder une importance disproportionnée.

${buildKpiWeightsBlock(kpiWeights)}
---

`;
}

/**
 * Étape 1 du protocole d'analyse : son contenu (polarisé ou neutre) dépend
 * strictement du toggle `useKpiWeighting`.
 */
function buildDynamicStep1(useKpiWeighting: boolean): string {
  if (useKpiWeighting) {
    return `### Étape 1 : Analyse polarisée des performances (TCD + BDD)
- Croisez les données du bloc [DEBUT_DONNEES_TCD_ACTUALISEES] et du bloc [DEBUT_BDD_SOCIAL_EXTRAIT] pour établir un diagnostic de performance complet de la semaine.
- Pondérez impérativement votre analyse selon la grille de pondération stratégique définie ci-dessus : accordez plus de poids aux KPIs prioritaires (score élevé) dans votre diagnostic, vos conclusions et vos recommandations, et reléguez au second plan les KPIs jugés secondaires (score faible), même si leur performance brute est notable.
- Comparez chaque indicateur pertinent aux données du bloc [DEBUT_BENCHMARKS_CAMPAGNE] afin de qualifier la performance (au-dessus, en ligne, ou en-dessous des standards).`;
  }

  return `### Étape 1 : Analyse neutre des performances (TCD + BDD)
- Croisez les données du bloc [DEBUT_DONNEES_TCD_ACTUALISEES] et du bloc [DEBUT_BDD_SOCIAL_EXTRAIT] pour établir un diagnostic de performance complet de la semaine.
- Accordez une importance égale à l'ensemble des KPIs disponibles (Awareness, Vues Vidéo, Engagement, Trafic), sans polariser votre analyse sur un axe stratégique en particulier.
- Comparez chaque indicateur pertinent aux données du bloc [DEBUT_BENCHMARKS_CAMPAGNE] afin de qualifier la performance (au-dessus, en ligne, ou en-dessous des standards).`;
}

/**
 * Template utilisé pour les modes "Run (Hebdo)" et "Bilan" : assemble
 * `promptFinal` en injectant les champs du brief (`oldComments`, `tcdData`,
 * `bddData`, `benchmarks`, `contexteAutre`) ainsi que les deux blocs
 * dynamiques `kpiSection` et `dynamicStep1`, calculés selon l'état
 * `useKpiWeighting`. La pondération KPI est optionnelle : lorsque le toggle
 * est désactivé, `kpiSection` est vide et aucune trace de la pondération
 * n'apparaît dans le prompt généré.
 */
function buildPromptRun(draft: WeekDraft): string {
  const { oldComments, tcdData, bddData, benchmarks, contexteAutre, useKpiWeighting } = draft;

  const kpiSection = buildKpiSection(draft);
  const dynamicStep1 = buildDynamicStep1(useKpiWeighting);

  const promptFinal = `# 🧠 RÔLE & EXPERTISE
Vous êtes un Expert en Social Media Advertising (Paid Social) et un Data Analyst Senior en agence média. Votre mission exclusive est d'analyser les performances de nos campagnes publicitaires et de rédiger le rapport hebdomadaire pour un client premium. Vous devez faire preuve d'un esprit critique aiguisé, d'une capacité de synthèse forte et d'une rigueur mathématique absolue.

# 🎯 CONTEXTE & OBJECTIF DE LA TÂCHE
Vous devez produire une analyse de performance hebdomadaire en vous basant sur l'historique de la semaine passée (pour conserver exactement le même ton et la même structure de présentation) et sur les nouvelles données brutes (TCD Excel et BDD Social de la semaine). 

${kpiSection}# 📊 DONNÉES INJECTÉES

[DEBUT_COMMENTAIRES_SEMAINE_PRECEDENTE]
${oldComments}
[FIN_COMMENTAIRES_SEMAINE_PRECEDENTE]

[DEBUT_DONNEES_TCD_ACTUALISEES]
${tcdData}
[FIN_DONNEES_TCD_ACTUALISEES]

[DEBUT_BDD_SOCIAL_EXTRAIT]
${bddData}
[FIN_BDD_SOCIAL_EXTRAIT]

[DEBUT_BENCHMARKS_CAMPAGNE]
${benchmarks}
[FIN_BENCHMARKS_CAMPAGNE]

[DEBUT_CONTEXTE_AUTRE]
${contexteAutre}
[FIN_CONTEXTE_AUTRE]

---

# ⚙️ PROTOCOLE D'ANALYSE ET DE RÉDACTION (ÉTAPE PAR ÉTAPE)

${dynamicStep1}

### Étape 2 : Intégration du contexte macro et causalité
- Appuyez-vous sur les éléments du bloc [DEBUT_CONTEXTE_AUTRE] pour expliquer rationnellement les évolutions de performance (ex: saisonnalité, baisse de budget, fatigue créative, changement d'algorithme).
- Ne vous contentez pas de décrire les chiffres : expliquez **pourquoi** ils ont évolué de cette manière.

### Étape 3 : Rédaction du Rapport Client
- Rédigez le nouveau commentaire de performance en respectant **strictement le même plan, le même ton, la même hiérarchie et la même typographie** que le texte présent dans [DEBUT_COMMENTAIRES_SEMAINE_PRECEDENTE].
- Mettez à jour l'ensemble des données chiffrées en utilisant exclusivement les résultats de votre analyse menée à l'Étape 1.

### Étape 4 : Encart d'Alerte Interne (Réservé à l'Account Manager)
Générez à la toute fin de votre réponse, séparé par une ligne horizontale (\`---\`), l'encart suivant :

### 🚨 ENCART EXPERT : RECO / ALERTES / POINTS D'ATTENTION (USAGE INTERNE)
- **Santé des KPI prioritaires :** Synthèse rapide sur l'atteinte ou non des objectifs selon la grille de pondération définie.
- **Diagnostic BDD :** Identification précise des freins ou des leviers de performance au niveau granulaire (ex: une créa vidéo spécifique qui surperforme/sous-performe, un format à couper, une saturation de fréquence sur une audience).
- **Plan d'action :** 2 à 3 recommandations d'optimisation concrètes et directement actionnables pour la semaine à venir dans le Business Manager / Ads Manager.

---

# 🛡️ CONTRAINTES STRICTES ET GARDE-FOUS
1. **Zéro Hallucination :** Vous ne devez sous aucun prétexte inventer, déduire ou approximer une donnée qui ne figure pas expressément dans les blocs injectés. Si une donnée nécessaire à l'analyse est absente, inscrivez la mention exacte : \`[DONNÉE NON DISPONIBLE]\`.
2. **Précision Mathématique :** Effectuez tous les calculs d'écarts et de variations (%) avec une rigueur absolue. Arrondissez systématiquement les taux et les coûts à deux décimales (ex: 3,45 % ou 12,50 €).
3. **Mise en forme des tableaux :** Si vous intégrez des récapitulatifs chiffrés, formatez-les impérativement en tableaux Markdown propres et lisibles.`;

  return promptFinal;
}

/**
 * Rappel, dans l'Étape 1, que le bloc de pondération KPI doit être pris en
 * compte en priorité — uniquement si ce bloc est effectivement présent dans
 * le prompt (`useKpiWeighting` actif). Retourne une chaîne vide sinon, pour
 * qu'aucune référence à la pondération ne subsiste quand elle est désactivée.
 */
function buildKpiPriorityBullet(useKpiWeighting: boolean): string {
  if (!useKpiWeighting) {
    return "";
  }
  return "\n- Le bloc de pondération stratégique des KPI ci-dessus est présent : accordez une attention prioritaire aux métriques qui ont un score élevé (7 à 10).";
}

/**
 * Template dédié au mode "Lancement" (première semaine d'activation, sans
 * historique de comparaison). Utilise `contexteGlobal` et `contexteCrea` à la
 * place de `oldComments`. La pondération KPI (`kpiSection`) reste optionnelle
 * et suit exactement la même règle que pour les autres modes : absente du
 * prompt si `useKpiWeighting` est désactivé.
 */
function buildPromptLancement(draft: WeekDraft): string {
  const { contexteGlobal, contexteCrea, tcdData, bddData, useKpiWeighting } = draft;
  const dynamicKpiBlock = buildKpiSection(draft);
  const kpiPriorityBullet = buildKpiPriorityBullet(useKpiWeighting);

  const promptLancement = `# RÔLE & EXPERTISE
Vous êtes un Expert en Social Media Advertising (Paid Social) et un Data Analyst Senior en agence média. Votre mission est de rédiger le **tout premier rapport de lancement** d'une nouvelle campagne pour un client premium. Vous devez garantir une exactitude mathématique absolue et faire preuve de pédagogie pour expliquer les premiers signaux.

# CONTEXTE DU PROJET
La campagne vient d'être lancée. Il n'y a pas d'historique de comparaison. Votre but est d'analyser les données de cette première semaine d'activation pour valider le bon démarrage technique (diffusion, pacing) et identifier les toutes premières tendances selon la stratégie définie.

# DONNÉES INJECTÉES

${dynamicKpiBlock}### 1. CONTEXTE GLOBAL & OBJECTIFS (Rappel Stratégique)
[DEBUT_CONTEXTE_GLOBAL]
${contexteGlobal}
[FIN_CONTEXTE_GLOBAL]

### 2. STRATÉGIE CRÉA & AUDIENCES
[DEBUT_STRATEGIE_CREA_AUDIENCE]
${contexteCrea}
[FIN_STRATEGIE_CREA_AUDIENCE]

### 3. DONNÉES TCD DE LANCEMENT (Format TSV)
[DEBUT_DONNEES_TCD_ACTUALISEES]
${tcdData}
[FIN_DONNEES_TCD_ACTUALISEES]

### 4. BDD SOCIAL EXTRAIT
[DEBUT_BDD_SOCIAL_EXTRAIT]
${bddData}
[FIN_BDD_SOCIAL_EXTRAIT]

---

# DIRECTIVES DE TRAVAIL (ÉTAPES PROTOCOLAIRES)

Étape 1 : Validation du Lancement & Analyse des Premiers Signaux
- Vérifiez la bonne diffusion des budgets (Pacing) à travers les données TCD.
- Identifiez les premières tendances en croisant les résultats avec le bloc [DEBUT_CONTEXTE_GLOBAL]. Les premiers indicateurs sont-ils encourageants par rapport aux objectifs fixés ?${kpiPriorityBullet}

Étape 2 : Analyse Stratégique Créa / Audience
- Évaluez les performances initiales en vous basant sur les hypothèses de départ du bloc [DEBUT_STRATEGIE_CREA_AUDIENCE].
- Quelle est la créativité ou l'audience qui se détache (Winner) sur ces premiers jours ? Y a-t-il déjà un format qui sous-performe (Loser) ?

Étape 3 : Rédaction du Rapport Client
Rédigez le commentaire de lancement en structurant votre réponse de la manière suivante (utilisez exactement ces titres) :
1. **Bilan de Lancement :** Un résumé exécutif rassurant sur la bonne mise en ligne et la phase d'apprentissage des algorithmes.
2. **Performances Globales :** Analyse chiffrée des KPI clés selon la pondération demandée.
3. **Focus Créas & Audiences :** Retour sur les premiers A/B tests.
4. **Prochaines Étapes :** Les actions prévues pour la semaine 2 (ex: sortie de la phase d'apprentissage, premières optimisations).

Étape 4 : Encart d'Alerte Interne (Réservé à l'Account Manager)
À la toute fin, ajoutez obligatoirement cet encart :
### 🚨 ENCART EXPERT : RECO / ALERTES / POINTS D'ATTENTION (USAGE INTERNE)
- Le setup technique semble-t-il correct (tracking, CPM cohérent avec le marché) ?
- Faut-il déjà couper une créa ou ajuster un budget avant la semaine 2 ?
- Actions techniques urgentes à mener.

# CONTRAINTES STRICTES
1. **Zéro Hallucination :** Ne déduisez aucun chiffre.
2. **Précision :** Arrondissez les taux et devises à deux décimales (ex: 2.45% ou 1.20€).
3. **Pédagogie de Lancement :** Rappelez subtilement au client que la campagne est en phase d'apprentissage algorithmique (Learning Phase) et que les CPA/CPM peuvent se stabiliser dans les jours à venir.`;

  return promptLancement;
}

/**
 * Point d'entrée unique du moteur de génération. Le template utilisé dépend
 * strictement du mode de rapport sélectionné : `promptLancement` pour le mode
 * "Lancement", `promptFinal` (Run/Bilan) sinon. La pondération KPI
 * (`useKpiWeighting`) reste fonctionnelle et suit la même règle dans tous les
 * modes : le bloc de pondération n'apparaît que si le toggle est activé.
 */
export function buildPrompt(draft: WeekDraft): string {
  if (draft.mode === "lancement") {
    return buildPromptLancement(draft);
  }

  return buildPromptRun(draft);
}
