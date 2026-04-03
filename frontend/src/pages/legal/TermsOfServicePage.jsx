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

export default function TermsOfServicePage() {
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
            VideoGad Terms of Service
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: 1.7,
            }}
          >
            These Terms of Service govern your access to and use of VideoGad, a
            video-first marketplace platform operated under the Supgad ecosystem
            for product promotion, video publishing, advertising, creator
            participation, and monetization.
          </p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing, browsing, creating an account on, or using VideoGad,
            you agree to be legally bound by these Terms of Service. If you do
            not agree to these terms, you must not use the platform.
          </p>
          <p>
            These terms apply to all users of VideoGad, including visitors,
            viewers, registered users, creators, advertisers, vendors, and any
            person or business interacting with the platform.
          </p>
        </Section>

        <Section title="2. About VideoGad">
          <p>
            VideoGad is a product-video marketplace and media platform where
            users can upload, watch, manage, promote, and interact with videos
            connected to products, brands, offers, and marketplace activity.
          </p>
          <p>
            Platform features may include creator channels, public video pages,
            product links, audience engagement tools, analytics, advertising,
            moderation systems, creator monetization, wallet features,
            subscriptions, and support services.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must provide accurate, current, and complete information when
            registering or using VideoGad.
          </p>
          <p>
            You are responsible for making sure your use of VideoGad complies
            with all laws, regulations, and legal duties that apply to you, your
            business, your content, your products, and your promotions.
          </p>
        </Section>

        <Section title="4. User Accounts">
          <p>
            You are responsible for your account, login credentials, and all
            activity that takes place under your account.
          </p>
          <p>
            You must not impersonate another individual or business, create
            misleading identities, or attempt to gain unauthorized access to any
            account, system, feature, database, or restricted area of VideoGad.
          </p>
          <p>
            We may suspend or restrict accounts that appear misleading,
            compromised, abusive, fraudulent, or in violation of platform rules.
          </p>
        </Section>

        <Section title="5. Creator and Advertiser Responsibilities">
          <p>
            Creators, advertisers, vendors, and promotional users are fully
            responsible for the videos, claims, descriptions, product links,
            external URLs, brand representations, and other content they publish
            or submit on VideoGad.
          </p>
          <p>
            You must ensure that all information you post is truthful, lawful,
            non-deceptive, and does not create safety, trust, copyright,
            payment, or compliance issues for users or the platform.
          </p>
          <p>
            VideoGad may review, reject, limit, remove, demonetize, or disable
            content, accounts, campaigns, links, or features where necessary to
            protect platform integrity, user trust, legal compliance, and
            business safety.
          </p>
        </Section>

        <Section title="6. Prohibited Use">
          <p>You must not use VideoGad to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>publish false, deceptive, or fraudulent product content</li>
            <li>promote prohibited, illegal, unsafe, or restricted items</li>
            <li>upload malware, malicious files, harmful redirects, or spam</li>
            <li>share dangerous, abusive, or rights-infringing material</li>
            <li>mislead users through fake offers, fake stores, or fake claims</li>
            <li>manipulate views, clicks, watch time, earnings, or analytics</li>
            <li>attempt to bypass moderation, payment, review, or security systems</li>
            <li>use the platform in any way that harms VideoGad or its users</li>
          </ul>
        </Section>

        <Section title="7. Content Ownership and License">
          <p>
            You retain ownership of the content you create and upload, to the
            extent permitted by law and subject to rights you grant under these
            terms.
          </p>
          <p>
            By uploading or submitting content to VideoGad, you grant VideoGad a
            non-exclusive, worldwide, royalty-free license to host, store, copy,
            process, display, distribute, publish, promote, review, moderate,
            and use that content for platform operations, improvement, security,
            marketing, and service delivery.
          </p>
          <p>
            You confirm that you own the content or have all rights, licenses,
            permissions, and authority required to upload, display, promote, and
            use that content on VideoGad.
          </p>
        </Section>

        <Section title="8. Moderation and Enforcement">
          <p>
            VideoGad may monitor, review, investigate, and take action on
            content, product links, monetization behavior, account activity,
            reporting patterns, and policy compliance.
          </p>
          <p>
            We may remove content, restrict reach, disable features, suspend
            monetization, hold payouts, limit account functions, or terminate
            access where necessary for safety, trust, compliance, fraud
            prevention, or operational reasons.
          </p>
        </Section>

        <Section title="9. Payments, Wallets, and Monetization">
          <p>
            Some parts of VideoGad may involve subscriptions, ad spend, wallet
            balances, creator earnings, withdrawals, monetization eligibility,
            payment reviews, or platform fees.
          </p>
          <p>
            Monetization and payment-related access may depend on internal
            reviews, eligibility status, compliance checks, valid activity, and
            adherence to platform policies.
          </p>
          <p>
            VideoGad may delay, adjust, reject, reverse, hold, or cancel
            payments, credits, earnings, or payouts where invalid activity,
            fraud, abuse, disputes, policy violations, technical issues, or risk
            concerns are identified.
          </p>
        </Section>

        <Section title="10. Third-Party Links and Services">
          <p>
            VideoGad may contain or allow links to external websites,
            marketplaces, stores, services, or payment providers.
          </p>
          <p>
            We do not control third-party websites or services and are not
            responsible for their actions, products, availability, content,
            payment handling, or policies. Your use of third-party services is
            at your own risk.
          </p>
        </Section>

        <Section title="11. Intellectual Property">
          <p>
            VideoGad, its branding, interface, software, features, systems,
            designs, and platform materials other than user-submitted content are
            protected by intellectual property and other applicable laws.
          </p>
          <p>
            You may not copy, reproduce, redistribute, scrape, reverse engineer,
            alter, or exploit any part of the platform except where expressly
            allowed in writing.
          </p>
        </Section>

        <Section title="12. Disclaimer">
          <p>
            VideoGad is provided on an “as available” and “as is” basis. We do
            not guarantee uninterrupted service, specific commercial results,
            constant uptime, complete accuracy, or error-free operation.
          </p>
          <p>
            We do not guarantee the safety, legality, truthfulness, quality,
            performance, availability, or reliability of user-submitted content,
            external links, product claims, third-party stores, or promotions.
          </p>
        </Section>

        <Section title="13. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, VideoGad, Supgad,
            and their owners, affiliates, officers, team members, contractors,
            and partners shall not be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages arising out of or
            related to your use of the platform.
          </p>
        </Section>

        <Section title="14. Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless VideoGad, Supgad,
            and their related parties from and against claims, liabilities,
            losses, damages, costs, and expenses arising from your content, your
            conduct, your products, your promotions, your links, your payments,
            or your violation of these Terms of Service.
          </p>
        </Section>

        <Section title="15. Termination">
          <p>
            VideoGad may suspend, limit, or terminate your account or access to
            all or part of the platform at any time where necessary for security,
            compliance, abuse prevention, fraud protection, legal reasons, or
            policy enforcement.
          </p>
          <p>
            You may stop using VideoGad at any time. Any rights, obligations,
            protections, or enforcement terms that should reasonably survive
            termination will continue to apply after access ends.
          </p>
        </Section>

        <Section title="16. Changes to These Terms">
          <p>
            We may update these Terms of Service from time to time to reflect
            product updates, operational needs, legal requirements, or platform
            policy changes. Your continued use of VideoGad after changes take
            effect means you accept the updated terms.
          </p>
        </Section>

        <Section title="17. Contact">
          <p>
            For support, complaints, legal notices, policy questions, or terms
            inquiries, contact VideoGad at{' '}
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