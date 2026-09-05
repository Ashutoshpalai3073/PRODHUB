import { createFileRoute } from '@tanstack/react-router';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  head: () => ({ meta: [{ title: 'Terms of Service — Sanyog' }] }),
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="5 September 2026">
      <LegalSection heading="1. About the service">
        <p style={{ margin: 0 }}>
          Sanyog is an innovation-procurement platform connecting government departments with recognised
          startups. It is a prototype built at the IIT Kharagpur Innovation Cell for Smart India Hackathon 2026.
          By creating an account or using the platform, you agree to these terms.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p style={{ margin: 0 }}>
          You are responsible for the accuracy of the information you provide and for activity on your account.
          Sign-in is via Google or a one-time email code. You may delete your account at any time from the
          account menu.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your content and intellectual property">
        <p style={{ margin: 0 }}>
          Content you submit — profiles, applications, documents — remains yours. Startups retain the
          intellectual property in their solutions; any licence to a government department is agreed separately
          in the relevant pilot agreement, not by these terms. You grant Sanyog only the limited rights needed to
          store and display your content to the users you direct it to.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p style={{ margin: 0 }}>
          Do not submit false or misleading information, attempt to access other users&rsquo; confidential
          material, interfere with the operation of the platform, or use it for any unlawful purpose. We may
          suspend accounts that breach these rules.
        </p>
      </LegalSection>

      <LegalSection heading="5. Scores and platform information">
        <p style={{ margin: 0 }}>
          Advisory scores (such as FitScore™) are automated aids, not decisions, endorsements or guarantees.
          Evaluation, payment and scale-up outcomes on the platform are decided by the responsible people and
          processes, and the platform records them for auditability.
        </p>
      </LegalSection>

      <LegalSection heading="6. No warranty">
        <p style={{ margin: 0 }}>
          The platform is provided &ldquo;as is&rdquo;, without warranties of any kind. As a prototype, it may
          contain demonstration data, and features may change or be unavailable. To the maximum extent permitted
          by law, we are not liable for indirect or consequential losses arising from use of the platform.
        </p>
      </LegalSection>

      <LegalSection heading="7. Governing law">
        <p style={{ margin: 0 }}>These terms are governed by the laws of India.</p>
      </LegalSection>

      <LegalSection heading="8. Changes">
        <p style={{ margin: 0 }}>
          We may update these terms as the platform evolves; material changes will be reflected on this page with
          a revised &ldquo;last updated&rdquo; date.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
