import { LegalContact, LegalList, LegalSection } from './LegalLayout'

// The French text of the security policy (Quebec's Charter of the French language). Keep it
// in step with SecurityPolicyPageEn in SecurityPolicyPage.tsx — the two say the same thing.
export function SecurityPolicyPageFr() {
  return (
    <>
      <LegalSection title="1. Objet et portée">
        <p>
          La présente politique décrit comment CYG Finance protège les renseignements que ses clients lui
          confient — données de compte, relevés bancaires, reçus, messages et données bancaires reçues par
          Plaid. Elle s’applique à cygfinance.com, à notre application destinée au personnel, à nos serveurs
          et à toute personne qui y travaille.
        </p>
      </LegalSection>

      <LegalSection title="2. Responsabilité">
        <p>
          Le propriétaire de CYG Finance est responsable de la sécurité de l’information&nbsp;: il tient cette
          politique à jour, accorde et retire les accès, évalue les risques et répond aux incidents. Les
          questions et les signalements de sécurité doivent être envoyés à{' '}
          <a href="mailto:office@cygfinance.com" className="text-brand underline">office@cygfinance.com</a>,
          une adresse surveillée.
        </p>
      </LegalSection>

      <LegalSection title="3. Contrôle des accès">
        <LegalList>
          <li>Seul le propriétaire peut accéder aux serveurs de production, au moyen de clés SSH. Aucune connexion par mot de passe n’est utilisée.</li>
          <li>La base de données n’est pas exposée à Internet; seules nos propres applications, sur le même serveur, s’y connectent.</li>
          <li>
            Le personnel utilise une application distincte, avec des accès selon le rôle (administrateur,
            gestionnaire, utilisateur). Chaque membre du personnel ne voit que ce que son rôle exige. Le
            personnel se connecte par reconnaissance faciale; la connexion de l’administrateur exige en plus un
            code à usage unique envoyé par courriel.
          </li>
          <li>L’authentification multifacteur est activée sur nos comptes d’hébergement, de code source, de courriel et Plaid.</li>
          <li>Les accès sont retirés dès qu’une personne n’en a plus besoin.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Chiffrement">
        <LegalList>
          <li>Toutes les communications avec cygfinance.com et notre application destinée au personnel passent par HTTPS (TLS&nbsp;1.2 ou plus récent).</li>
          <li>
            Les jetons d’accès bancaires, les jetons des comptes de courriel et les autres secrets sont chiffrés en
            AES-256 avant d’être enregistrés.
          </li>
          <li>Les mots de passe des clients ne sont conservés que sous forme de hachages bcrypt.</li>
          <li>Les documents sont conservés dans un stockage privé et ne sont servis qu’au client connecté et au personnel autorisé.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Données bancaires par Plaid">
        <LegalList>
          <li>
            Les clients connectent leur banque au moyen de Plaid. Leur nom d’utilisateur et leur mot de passe
            bancaires sont transmis à Plaid, jamais à nous.
          </li>
          <li>Notre accès est en lecture seule&nbsp;: nous recevons les comptes, les soldes et les opérations pour tenir les livres du client.</li>
          <li>Un client peut déconnecter une banque en tout temps. La déconnexion supprime notre jeton d’accès et arrête la synchronisation.</li>
          <li>Les données bancaires servent uniquement à la tenue de livres du client. Elles ne sont jamais vendues ni utilisées à des fins publicitaires.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Systèmes et mises à jour">
        <LegalList>
          <li>Les serveurs et les ordinateurs du personnel installent automatiquement les mises à jour de sécurité du système d’exploitation.</li>
          <li>Les ordinateurs du personnel sont protégés par un antivirus (Microsoft Defender).</li>
          <li>Les modifications de nos logiciels sont révisées et testées avant leur mise en production.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Conservation et suppression des données">
        <p>
          Nous conservons les données des clients tant que le compte est actif. Lorsqu’un client ferme son
          compte ou nous demande de supprimer ses données, nous supprimons ses données bancaires et ses
          documents dans un délai de 30&nbsp;jours, sauf les dossiers que la loi oblige un teneur de livres à
          conserver. Cette politique respecte les lois sur la protection des renseignements personnels qui
          s’appliquent à nous, dont la Loi&nbsp;25 du Québec et la LPRPDE du Canada.
        </p>
      </LegalSection>

      <LegalSection title="8. Incidents">
        <p>
          Toute personne qui soupçonne un problème de sécurité doit écrire sans tarder à office@cygfinance.com.
          Nous examinons chaque signalement, contenons et corrigeons la cause, et avisons rapidement les clients
          touchés et les autorités lorsque la loi l’exige.
        </p>
      </LegalSection>

      <LegalSection title="9. Révision">
        <p>Cette politique est révisée au moins une fois par année et chaque fois que nos systèmes changent de façon importante.</p>
      </LegalSection>

      <LegalSection title="10. Nous joindre">
        <LegalContact />
      </LegalSection>
    </>
  )
}
