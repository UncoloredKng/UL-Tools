# UL Toolbox

Boîte à outils interne pour les opérations de **Media Trading** et **Social Ads**.

MVP fonctionnant **entièrement en local** (aucun backend, aucune base de données externe) : toutes les données de campagne saisies sont stockées dans le `localStorage` du navigateur, afin de garantir la confidentialité des données clients.

## Stack technique

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com) — design system "Warm Fintech Dark Mode"
- [Zustand](https://zustand.docs.pmnd.rs) + middleware `persist` — état des campagnes sauvegardé en `localStorage`
- [Lucide React](https://lucide.dev) — iconographie

## Outils disponibles

- **Prompt Builder** : gestion de campagnes, ingestion des données hebdomadaires (y compris collage direct depuis Excel/Google Sheets), historique des semaines précédentes, et génération d'un prompt d'analyse prêt à copier.
- *À venir* : To-Do Campagne, Extracteur Tracking.

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Notes

- Aucune donnée n'est envoyée à un serveur : tout le traitement se fait côté client.
- Les campagnes et leur historique sont persistés dans le `localStorage` de votre navigateur (clé `ul-toolbox-prompt-builder`). Vider le cache du navigateur effacera ces données.
