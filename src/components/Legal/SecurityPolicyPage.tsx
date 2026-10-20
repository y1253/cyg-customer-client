import { LegalContact, LegalLayout, LegalList, LegalSection } from './LegalLayout'

export function SecurityPolicyPage() {
  return (
    <LegalLayout title="Information Security Policy" updated="October 20, 2026">
      <LegalSection title="1. Purpose and scope">
        <p>
          This policy describes how CYG Finance protects the information our customers trust us
          with — account details, bank statements, receipts, messages and bank data received
          through Plaid. It covers cygfinance.com, our staff application, our servers and every
          person who works on them.
        </p>
      </LegalSection>

      <LegalSection title="2. Responsibility">
        <p>
          The owner of CYG Finance is responsible for information security: maintaining this
          policy, granting and removing access, reviewing risks and responding to incidents.
          Security questions and reports go to{' '}
          <a href="mailto:office@cygfinance.com" className="text-brand underline">office@cygfinance.com</a>,
          which is monitored.
        </p>
      </LegalSection>

      <LegalSection title="3. Access control">
        <LegalList>
          <li>Production servers can be reached only by the owner, with SSH keys. Password logins are not used.</li>
          <li>The database is not exposed to the internet; only our own applications on the same server connect to it.</li>
          <li>
            Staff use a separate application with role-based access (Admin, Manager, User). Staff see only
            what their role requires. Staff sign in with face recognition; the administrator sign-in also
            requires a one-time code sent by email.
          </li>
          <li>Multi-factor authentication is enabled on our hosting, source code, email and Plaid accounts.</li>
          <li>Access is removed as soon as someone no longer needs it.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Encryption">
        <LegalList>
          <li>All traffic to cygfinance.com and our staff application uses HTTPS (TLS 1.2 or newer).</li>
          <li>
            Bank access tokens, email account tokens and other secrets are encrypted with AES-256 before
            they are stored.
          </li>
          <li>Customer passwords are stored only as bcrypt hashes.</li>
          <li>Documents are kept in private storage and are served only to the signed-in customer and authorized staff.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Bank data through Plaid">
        <LegalList>
          <li>
            Customers connect their bank through Plaid. Their bank username and password go to Plaid,
            never to us.
          </li>
          <li>Our access is read-only: we receive accounts, balances and transactions to keep the customer's books.</li>
          <li>A customer can disconnect a bank at any time. Disconnecting deletes our access token and stops syncing.</li>
          <li>Bank data is used only for the customer's bookkeeping. It is never sold or used for advertising.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Systems and patching">
        <LegalList>
          <li>Servers and staff computers install operating-system security updates automatically.</li>
          <li>Staff computers run antivirus protection (Microsoft Defender).</li>
          <li>Changes to our software are reviewed and tested before they are released.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Data retention and deletion">
        <p>
          We keep customer data while the account is active. When a customer closes their account or
          asks us to delete their data, we delete their bank data and documents within 30 days, except
          records the law requires a bookkeeper to keep. This policy follows the privacy laws that apply
          to us, including Quebec's Law 25 and Canada's PIPEDA.
        </p>
      </LegalSection>

      <LegalSection title="8. Incidents">
        <p>
          Anyone who suspects a security problem should email office@cygfinance.com right away. We
          investigate every report, contain and fix the cause, and tell affected customers and the
          authorities promptly when the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="9. Review">
        <p>This policy is reviewed at least once a year and whenever our systems change significantly.</p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <LegalContact />
      </LegalSection>
    </LegalLayout>
  )
}
