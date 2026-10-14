# JobScout — site web et application ChatGPT

Version adaptée de [latenightsbeats1208-pixel/jobscout](https://github.com/latenightsbeats1208-pixel/jobscout), copiée dans le dépôt de cet environnement. Le code et la licence MIT d’origine sont conservés. La documentation originale se trouve dans [docs/README-upstream.md](docs/README-upstream.md).

## Ce qui fonctionne

- Site Next.js responsive : recherche France Travail, import manuel d’annonces, import de CV PDF texte/DOCX/TXT, préparation d’une candidature et export PDF/DOCX.
- Serveur MCP Streamable HTTP à `/mcp`, avec SDK officiel et interface MCP Apps / Apps SDK.
- Outils `open_jobscout`, `search_jobs`, `rank_jobs` et `render_application`.
- ChatGPT analyse et rédige dans la conversation de chaque utilisateur. Le serveur ne fait aucun appel à une API de modèle et ne demande aucune clé API.
- Profils et documents sans sauvegarde serveur : chaque requête traite les contenus explicitement fournis. Aucun compte, cookie de session ni base personnelle commune ne sont utilisés par le nouveau parcours.

Le site autonome propose un passage explicite vers ChatGPT et l’import du JSON de candidature. Dans ChatGPT connecté à JobScout, la conversation appelle directement les outils MCP et affiche l’interface. L’hébergement d’un site ne connecte pas automatiquement l’abonnement ChatGPT du visiteur.

## Lancer

Node **24** recommandé (minimum 22.13).

```sh
npm ci --no-audit --no-fund
npm run dev
```

Le mode web écoute sur le port 3000. `npm run dev:local` limite l’écoute à la machine locale. `npm start` prépare les fichiers statiques et démarre le serveur autonome de Next.js. Les builds de développement sont écrits dans `.next-dev`, ceux de production dans `.next`.

```sh
npm run build
npm start
```

Les imports, exports et outils MCP ne journalisent pas les contenus de CV et ne les écrivent pas sur disque. Le texte reste dans l’onglet jusqu’au rechargement ou à l’effacement ; ChatGPT et l’hébergeur peuvent avoir leurs propres politiques de conservation. Voir `/privacy`.

## Connecter à ChatGPT

1. Déployer le serveur avec une URL publique **HTTPS**.
2. Définir `JOBSCOUT_PUBLIC_URL` sur cette origine, par exemple votre adresse d’hébergement réelle, sans chemin.
3. Dans les paramètres ChatGPT, si le compte dispose des applications personnalisées et du mode développeur, ajouter une application JobScout avec l’URL `https://votre-domaine/mcp`, en mode sans authentification.
4. Sélectionner JobScout dans une conversation et demander « Ouvre JobScout ».
5. Joindre son CV, rechercher une offre, demander l’adaptation, valider les textes et appeler le rendu des documents.

Le mode sans authentification est volontaire : aucune donnée d’un utilisateur précédent n’est conservée ou récupérable. La connexion au compte ChatGPT est gérée par ChatGPT ; ce projet ne fournit pas un OAuth « connexion avec ChatGPT » pour un site tiers et ne partage pas l’abonnement du propriétaire. La disponibilité dépend du compte et de l’espace de travail. La distribution dans l’annuaire public requiert une démarche et une validation distinctes par OpenAI.

Références : [Apps SDK](https://developers.openai.com/apps-sdk/), [exemples officiels](https://github.com/openai/openai-apps-sdk-examples), [MCP Apps](https://github.com/modelcontextprotocol/ext-apps).

## Déployer

Un `Dockerfile` multi-étapes et une configuration `render.yaml` sont fournis. Le serveur nécessite un runtime Node : un hébergement purement statique ne peut pas exécuter `/mcp` ni le rendu des documents.

```sh
docker build -t jobscout .
docker run --rm -p 3000:3000 -e JOBSCOUT_PUBLIC_URL=https://votre-domaine jobscout
```

Remplacer `https://votre-domaine` par l’origine publique réelle. Le processus s’exécute avec l’utilisateur Node non privilégié et les anciennes données locales sont exclues du contexte Docker. La route de santé est `/api/health`. Configurer HTTPS et une limite de requêtes à l’entrée pour protéger les opérations de parsing et de rendu. Avant ouverture publique, compléter les coordonnées de l’exploitant et la politique de logs de l’hébergeur dans la page de confidentialité.

L’intégration exige que l’hébergeur puisse accéder à `candidat.francetravail.fr`. Si la source refuse la lecture automatisée, le site le signale et permet d’ouvrir les recherches publiques ou d’importer une annonce. La recherche intégrée couvre la France et classe les extraits disponibles ; elle ne garantit pas la disponibilité de toutes les annonces. Les autres plateformes sont proposées sous forme de liens de recherche.

Aucune fonction spécifique de l’outil Sites de ChatGPT n’est présumée. Le déploiement y nécessite sa prise en charge d’un serveur Next.js/Node ou une liaison à un serveur MCP externe. La session Codex utilisée pour cette adaptation ne dispose pas d’un outil de publication Sites.

## Vérifier

```sh
npm run build:widget
npm run typecheck
npm test -- --maxWorkers=3
npm run build
# Avec le serveur en marche :
npm run smoke
npm run smoke:browser
npm run smoke:widget
```

`smoke` exerce le site, les frontières de données, le protocole MCP, l’interface intégrée et les quatre documents PDF/DOCX. Les tests automatiques ne font pas d’appels payants. `smoke:browser` nécessite Chromium ; définir `JOBSCOUT_CHROMIUM_PATH` si son exécutable diffère de `/usr/bin/chromium`. Définir `JOBSCOUT_TEST_URL` pour tester une autre instance. Le test navigateur couvre l’ajout d’annonce, la consigne contenant le CV, l’import JSON, le téléchargement PDF, l’effacement et le mobile.

Le test `smoke:widget` exerce l’initialisation MCP Apps, les appels d’outils, le message à la conversation et le téléchargement via un hôte simulé, ainsi que le SDK ChatGPT `window.openai`. Un hôte qui ne prend pas en charge le téléchargement peut utiliser l’export via le site.

L’ajout réel à ChatGPT et la publication publique sont des validations externes distinctes des tests locaux du protocole.

## Application locale originale

Le code original reste présent pour référence. Ses routes de profils, clés API, génération et documents sont fermées par défaut, ainsi que ses pages privées. Elles peuvent être réactivées uniquement en accès local avec `JOBSCOUT_ENABLE_LOCAL_APP=1`. Ne jamais activer ce mode dans un hébergement public. La nouvelle page d’accueil reste l’interface web.

Les versions corrigées de Next.js et des dépendances transitives source-map-js, uuid et argparse sont verrouillées. Le CLI Mammoth n’est pas utilisé : seul son lecteur DOCX est exercé par l’application.

L’import/export Excel historique utilise désormais ExcelJS, installé depuis npm, à la place de l’archive SheetJS dont le domaine était inaccessible dans cet environnement. Les formats PDF/DOCX utilisent les moteurs du dépôt original. Le contrôle d’une page utilise PDF.js et échoue explicitement si un document reste trop long.
