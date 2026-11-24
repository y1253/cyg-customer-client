import { LegalContact, LegalList, LegalSection } from './LegalLayout'

// The French text of the privacy policy (Quebec's Charter of the French language). Keep it
// in step with PrivacyPageEn in PrivacyPage.tsx — the two say the same thing.
export function PrivacyPageFr() {
  return (
    <>
      <LegalSection title="1. Qui nous sommes">
        <p>
          CYG Finance («&nbsp;nous&nbsp;») offre des services de tenue de livres sur cygfinance.com. La
          présente politique explique quels renseignements personnels nous recueillons, comment nous les
          utilisons, avec qui nous les communiquons et quels choix s’offrent à vous.
        </p>
      </LegalSection>

      <LegalSection title="2. Ce que nous recueillons">
        <LegalList>
          <li><strong>Renseignements de compte&nbsp;:</strong> votre nom, votre adresse courriel, votre numéro de téléphone et votre mot de passe (conservé uniquement sous forme hachée), ou votre connexion Google.</li>
          <li><strong>Documents que vous nous transmettez&nbsp;:</strong> relevés bancaires et de cartes, reçus, factures et notes vocales que vous téléversez ou que vous nous envoyez par texto, WhatsApp ou courriel.</li>
          <li>
            <strong>Données bancaires par Plaid&nbsp;:</strong> si vous choisissez de connecter une banque, nous
            recevons le nom de vos comptes, les derniers chiffres des numéros de compte, les soldes et les
            opérations. Votre nom d’utilisateur et votre mot de passe bancaires sont transmis à Plaid, jamais à nous.
          </li>
          <li><strong>Renseignements sur l’entreprise&nbsp;:</strong> ce que vous inscrivez lorsque vous enregistrez une entreprise auprès de nous.</li>
          <li><strong>Messages&nbsp;:</strong> ce que vous nous écrivez, à nous ou à notre assistant IA.</li>
          <li><strong>Paiements&nbsp;:</strong> la marque de la carte et ses quatre derniers chiffres. Les numéros de carte sont traités par Stripe et ne nous parviennent jamais.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Comment nous les utilisons">
        <LegalList>
          <li>Pour tenir vos livres&nbsp;: lire vos relevés et vos reçus, classer vos opérations et préparer vos rapports.</li>
          <li>Pour répondre à vos questions et vous informer au sujet de votre compte.</li>
          <li>Pour protéger votre compte et prévenir la fraude.</li>
        </LegalList>
        <p className="mt-3">
          Nous ne vendons <strong>pas</strong> vos renseignements et ne les utilisons pas à des fins publicitaires.
        </p>
      </LegalSection>

      <LegalSection title="4. Plaid">
        <p>
          Nous utilisons Plaid Inc. pour nous connecter à votre banque. Lorsque vous connectez un compte, vous
          autorisez Plaid à recueillir des données auprès de votre banque et à nous les communiquer, comme le
          décrit la{' '}
          <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand underline">
            politique de confidentialité de Plaid pour les utilisateurs finaux
          </a>
          {' '}(en anglais). La connexion d’une banque est facultative, et vous pouvez la retirer en tout temps
          à partir de votre page de tenue de livres; nous cessons alors de recevoir de nouvelles données de
          cette banque.
        </p>
      </LegalSection>

      <LegalSection title="5. Avec qui nous les communiquons">
        <p>Uniquement avec les fournisseurs de services qui nous aident à exploiter le service, chacun pour sa propre fin&nbsp;:</p>
        <LegalList>
          <li>Plaid (connexions bancaires), Stripe (paiements)</li>
          <li>OpenAI (lecture des documents et rédaction des réponses — les données ne servent pas à entraîner ses modèles)</li>
          <li>SignalWire et WhatsApp de Meta (messages texte), Google et Microsoft (courriel)</li>
          <li>Hetzner (nos serveurs) et Cloudflare R2 (stockage des documents)</li>
        </LegalList>
        <p className="mt-3">Nous pouvons aussi communiquer des renseignements lorsque la loi l’exige.</p>
      </LegalSection>

      <LegalSection title="6. Sécurité">
        <p>
          Toutes les communications passent par HTTPS, les secrets comme les jetons d’accès bancaires sont
          chiffrés en AES-256, et seul le personnel autorisé peut voir vos livres. Consultez notre{' '}
          <a href="/security-policy" className="text-brand underline">politique de sécurité</a>.
        </p>
      </LegalSection>

      <LegalSection title="7. Conservation et suppression">
        <p>
          Nous conservons vos renseignements tant que votre compte est actif. Si vous fermez votre compte ou
          nous demandez de supprimer vos données, nous supprimons vos données bancaires et vos documents dans
          un délai de 30&nbsp;jours, sauf les dossiers que la loi oblige un teneur de livres à conserver.
        </p>
      </LegalSection>

      <LegalSection title="8. Vos droits">
        <p>
          Vous pouvez demander à consulter, à rectifier ou à supprimer vos renseignements personnels, ou
          retirer votre consentement, en écrivant à office@cygfinance.com. Nous répondons dans un délai de
          30&nbsp;jours.
        </p>
      </LegalSection>

      <LegalSection title="9. Modifications">
        <p>Nous mettrons à jour la date ci-dessus lorsque cette politique changera, et nous vous informerons de tout changement important.</p>
      </LegalSection>

      <LegalSection title="10. Nous joindre">
        <LegalContact />
      </LegalSection>
    </>
  )
}
