import React from 'react';

function Section({ title, children }) {
  return (
    <section
      style={{
        marginBottom: '28px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        background: '#ffffff',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
      }}
    >
      <h2
        style={{
          margin: '0 0 12px',
          fontSize: '22px',
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {title}
      </h2>

      <div
        style={{
          fontSize: '15px',
          lineHeight: 1.8,
          color: '#374151',
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        padding: '40px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            marginBottom: '28px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: '0 0 10px',
              fontSize: '36px',
              fontWeight: 800,
              color: '#111827',
            }}
          >
            VideoGad Privacy Policy
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: 1.7,
            }}
          >
            This Privacy Policy explains how VideoGad collects, uses, stores,
            protects, and shares personal information when you use the platform,
            website, products, services, and related features.
          </p>
        </div>

        <Section title="1. About This Policy">
          <p>
            VideoGad is a video-first marketplace platform operated under the
            Supgad ecosystem. This Privacy Policy applies to visitors, viewers,
            creators, advertisers, vendors, customers, and other users who
            access or use VideoGad.
          </p>
          <p>
            By using VideoGad, you acknowledge that your information may be
            collected and processed in accordance with this Privacy Policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We may collect the following types of information:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>account details such as name, username, email address, and password</li>
            <li>profile details such as creator information, channel data, and public profile content</li>
            <li>content you upload, including videos, thumbnails, descriptions, captions, and links</li>
            <li>payment and wallet-related information connected to subscriptions, earnings, and withdrawals</li>
            <li>usage data such as pages visited, watch activity, clicks, views, device details, and browser information</li>
            <li>communications sent to support or through platform contact forms</li>
            <li>moderation, compliance, and security-related information</li>
          </ul>
        </Section>

        <Section title="3. How We Collect Information">
          <p>We collect information in different ways, including:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>when you create an account or update your profile</li>
            <li>when you upload content or submit product information</li>
            <li>when you watch videos, click links, or interact with the platform</li>
            <li>when you make payments, subscribe, or request withdrawals</li>
            <li>when you contact support or report a problem</li>
            <li>when system tools automatically record activity, analytics, and security events</li>
          </ul>
        </Section>

        <Section title="4. How We Use Information">
          <p>We use your information to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>create and manage user accounts</li>
            <li>operate, maintain, and improve VideoGad</li>
            <li>display videos, channels, profiles, and marketplace content</li>
            <li>process subscriptions, earnings, payouts, and other payment-related actions</li>
            <li>track analytics, performance, clicks, and engagement</li>
            <li>review content and enforce platform policies</li>
            <li>detect fraud, abuse, unauthorized access, and security issues</li>
            <li>respond to support requests, disputes, and legal concerns</li>
            <li>communicate service updates, policy changes, and important notices</li>
          </ul>
        </Section>

        <Section title="5. Content and Public Information">
          <p>
            Information you choose to make public on VideoGad, including channel
            names, creator names, profile details, public videos, thumbnails,
            descriptions, and approved marketplace content, may be visible to
            other users and the public.
          </p>
          <p>
            You are responsible for the information you choose to publish or make
            publicly available through the platform.
          </p>
        </Section>

        <Section title="6. Payments, Wallets, and Financial Data">
          <p>
            Where payment, subscription, wallet, or monetization features are
            available, VideoGad may process information needed to manage billing,
            purchases, earnings, withdrawals, fraud prevention, and compliance
            checks.
          </p>
          <p>
            Financial processing may involve third-party service providers. We do
            not promise that every payment service is controlled directly by
            VideoGad, and additional provider terms may apply.
          </p>
        </Section>

        <Section title="7. Cookies and Similar Technologies">
          <p>
            VideoGad may use cookies and similar technologies to keep you signed
            in, remember settings, understand usage patterns, improve
            performance, measure engagement, and support security.
          </p>
          <p>
            Your browser settings may allow you to limit or disable cookies, but
            some parts of the platform may not function properly if cookies are
            restricted.
          </p>
        </Section>

        <Section title="8. How We Share Information">
          <p>We may share information in limited situations, including:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>with service providers supporting hosting, analytics, storage, payments, or operations</li>
            <li>with moderators, administrators, and internal teams handling platform review or support</li>
            <li>where sharing is required for fraud prevention, security response, or legal compliance</li>
            <li>in connection with business restructuring, merger, sale, or transfer of platform assets</li>
            <li>when you direct us to share information through your public content or activity</li>
          </ul>
          <p>
            We do not share your information more broadly than is reasonably
            necessary for platform operations, business needs, compliance, or
            protection of users and the service.
          </p>
        </Section>

        <Section title="9. Data Retention">
          <p>
            We retain information for as long as reasonably necessary to operate
            VideoGad, maintain records, resolve disputes, enforce agreements,
            meet legal obligations, protect the platform, and support fraud or
            security investigations.
          </p>
          <p>
            Retention periods may vary depending on the type of information, the
            purpose for which it was collected, and operational or legal needs.
          </p>
        </Section>

        <Section title="10. Security">
          <p>
            VideoGad uses administrative, technical, and operational measures to
            help protect information from unauthorized access, misuse, loss,
            alteration, or disclosure.
          </p>
          <p>
            No system can be guaranteed to be completely secure, so you should
            also protect your account credentials and use the platform
            responsibly.
          </p>
        </Section>

        <Section title="11. Third-Party Links and Services">
          <p>
            VideoGad may include links to external stores, websites, payment
            tools, or third-party services. We are not responsible for the
            privacy practices, content, or security of third-party platforms.
          </p>
          <p>
            When you leave VideoGad or interact with a third-party service, that
            third party’s own terms and privacy practices may apply.
          </p>
        </Section>

        <Section title="12. Your Choices and Rights">
          <p>
            Depending on how VideoGad operates in your region, you may have the
            ability to access, correct, update, or request deletion of certain
            account information, subject to legal, security, operational, and
            fraud-prevention requirements.
          </p>
          <p>
            You may also be able to control some communication preferences and
            profile information directly from your account settings where such
            features are available.
          </p>
        </Section>

        <Section title="13. Children’s Privacy">
          <p>
            VideoGad is not intended for users who are not legally permitted to
            use the platform under applicable law. If we become aware that
            information has been collected in a way that violates applicable
            requirements, we may remove the information and take appropriate
            account action.
          </p>
        </Section>

        <Section title="14. International Use">
          <p>
            VideoGad may be accessed from different countries and regions. By
            using the platform, you understand that information may be processed
            and stored in locations where VideoGad, its providers, or its
            infrastructure operate.
          </p>
        </Section>

        <Section title="15. Changes to This Privacy Policy">
          <p>
            VideoGad may update this Privacy Policy from time to time to reflect
            platform changes, legal obligations, security improvements, or
            operational needs. Continued use of the platform after an update
            means you accept the revised Privacy Policy.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            For privacy questions, data concerns, support issues, or policy
            requests, contact VideoGad at{' '}
            <a
              href="mailto:support@videogad.com"
              style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
            >
              support@videogad.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}