import { LegalContact, LegalLayout, LegalList, LegalSection } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="October 20, 2026">
      <LegalSection title="1. Who we are">
        <p>
          CYG Finance ("we", "us") provides bookkeeping services through cygfinance.com. This policy
          explains what personal information we collect, how we use it, who we share it with and the
          choices you have.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <LegalList>
          <li><strong>Account information:</strong> your name, email address, phone number and password (stored only as a hash), or your Google sign-in.</li>
          <li><strong>Documents you give us:</strong> bank and card statements, receipts, invoices and voice notes you upload, text, WhatsApp or email to us.</li>
          <li>
            <strong>Bank data through Plaid:</strong> if you choose to connect a bank, we receive your account
            names, the last digits of account numbers, balances and transactions. Your bank username and
            password go to Plaid, never to us.
          </li>
          <li><strong>Business information:</strong> what you enter when registering a business with us.</li>
          <li><strong>Messages:</strong> what you write to us or to our AI assistant.</li>
          <li><strong>Payments:</strong> the card brand and last four digits. Card numbers are handled by Stripe and never reach us.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. How we use it">
        <LegalList>
          <li>To keep your books: read statements and receipts, categorize transactions and prepare reports.</li>
          <li>To answer your questions and tell you about your account.</li>
          <li>To secure your account and prevent fraud.</li>
        </LegalList>
        <p className="mt-3">
          We do <strong>not</strong> sell your information or use it for advertising.
        </p>
      </LegalSection>

      <LegalSection title="4. Plaid">
        <p>
          We use Plaid Inc. to connect to your bank. When you connect an account you authorize Plaid to
          collect data from your bank and share it with us, as described in{' '}
          <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand underline">
            Plaid's End User Privacy Policy
          </a>
          . Connecting a bank is optional, and you can disconnect it at any time from your bookkeeping page;
          we then stop receiving new data from that bank.
        </p>
      </LegalSection>

      <LegalSection title="5. Who we share it with">
        <p>Only with service providers that help us run the service, each for its own purpose:</p>
        <LegalList>
          <li>Plaid (bank connections), Stripe (payments)</li>
          <li>OpenAI (reading documents and drafting answers — not used to train their models)</li>
          <li>SignalWire and Meta WhatsApp (text messages), Google and Microsoft (email)</li>
          <li>Hetzner (our servers) and Cloudflare R2 (document storage)</li>
        </LegalList>
        <p className="mt-3">We may also disclose information when the law requires it.</p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Everything travels over HTTPS, secrets such as bank access tokens are encrypted with AES-256, and
          only authorized staff can see your books. See our{' '}
          <a href="/security-policy" className="text-brand underline">Security Policy</a>.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention and deletion">
        <p>
          We keep your information while your account is active. If you close your account or ask us to
          delete your data, we delete your bank data and documents within 30 days, except records the law
          requires a bookkeeper to keep.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>
          You may ask to see, correct or delete your personal information, or withdraw your consent, by
          emailing office@cygfinance.com. We answer within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>We will update the date above when this policy changes, and tell you about important changes.</p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <LegalContact />
      </LegalSection>
    </LegalLayout>
  )
}
