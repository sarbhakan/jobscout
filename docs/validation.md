# Validation de l’adaptation web / ChatGPT

Validations exécutées dans cet environnement :

- Installation propre avec `npm ci` et le lockfile final.
- Vérification TypeScript.
- 124 tests réussis dans 13 fichiers : tests d’origine et nouveaux tests web/MCP/documents.
- Audit npm des dépendances de production : aucune vulnérabilité connue signalée.
- Recherche réelle France Travail : huit offres récupérées pour une recherche de développeur à Paris.
- Test HTTP : site, santé, refus des anciennes routes personnelles, initialisation MCP, catalogue d’outils, ressource d’interface, quatre téléchargements PDF/DOCX, absence de données d’une requête précédente et refus d’une origine étrangère.
- Chromium : import de CV texte, import d’annonce, passage du CV à la consigne, import JSON de candidature, téléchargement PDF, effacement et mobile sans débordement horizontal ni erreur JavaScript.
- Interface MCP Apps dans un hôte simulé : handshake, appel de recherche, message à la conversation et téléchargement PDF par l’hôte.
- Compatibilité du widget avec un SDK ChatGPT `window.openai` simulé : lecture des résultats, appel d’outil et message de suivi.
- Paquet autonome : le worker PDF.js est inclus explicitement ; son absence a été identifiée puis corrigée.

Les tests de protocole et d’interface simulée ne prouvent pas une connexion réelle à ChatGPT. Aucun domaine public, publication Sites, ajout réel d’application ChatGPT ou validation d’annuaire n’a été réalisé. Le Dockerfile et `render.yaml` sont fournis ; les commandes natives du paquet autonome ont été exercées, pas un déploiement chez un hébergeur.
