import Link from "next/link";
export default function PrivacyPage() {
  return <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", lineHeight: 1.85 }}>
    <Link href="/">← Retour à JobScout</Link><h1 style={{ fontSize: 32, fontWeight: 650, margin: "24px 0" }}>Vos candidatures vous appartiennent.</h1>
    <p>Cette version web de JobScout ne crée pas de compte et ne conserve pas de CV, profils ou documents dans une base de données partagée.</p>
    <h2 style={{ fontSize: 20, marginTop: 26 }}>Sur le site</h2><p>Les textes et préférences que vous saisissez restent en mémoire dans l'onglet, jusqu'à son rechargement ou à leur effacement. Un fichier importé est transmis au serveur pour en extraire le texte, puis renvoyé au navigateur ; JobScout ne l'enregistre pas sur disque. Les contenus exportés sont transmis au serveur pour leur mise en page en mémoire.</p>
    <h2 style={{ fontSize: 20, marginTop: 26 }}>Dans ChatGPT</h2><p>Votre CV joint à une conversation et les réponses de ChatGPT sont gérés selon les paramètres et conditions de votre compte ChatGPT. Lorsque vous demandez le rendu PDF/DOCX, les contenus validés sont transmis au serveur JobScout. Les résultats et fichiers sont renvoyés à cette conversation. JobScout ne les sauvegarde pas, mais ChatGPT peut conserver la conversation.</p>
    <h2 style={{ fontSize: 20, marginTop: 26 }}>Recherche d'offres</h2><p>Les termes de recherche et le lieu sont envoyés à France Travail. L'ouverture d'un lien externe transmet les informations habituelles de navigation au site concerné. Les textes d'annonces sont des données provenant de tiers ; vérifiez leur exactitude et leur actualité.</p>
    <h2 style={{ fontSize: 20, marginTop: 26 }}>Hébergement</h2><p>L'hébergeur et le proxy peuvent produire leurs propres journaux techniques. L'exploitant doit préciser leur durée de conservation et ses coordonnées avant une ouverture publique. JobScout ne journalise pas les corps des requêtes contenant les CV ou documents. N'activez pas une journalisation de ces contenus chez votre hébergeur.</p>
    <p style={{ marginTop: 30 }}>Le service n'envoie pas de candidature et ne contacte pas de recruteur. Relisez vos documents avant de les utiliser.</p>
  </main>;
}
