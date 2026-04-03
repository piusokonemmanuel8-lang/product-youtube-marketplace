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
      <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700, color: '#111827' }}>
        {title}
      </h2>
      <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#374151' }}>{children}</div>
    </section>
  );
}

export default function MonetizationPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: '36px', fontWeight: 800, color: '#111827' }}>
            VideoGad Monetization Policy
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: 1.7 }}>
            This Monetization Policy explains how creator monetization access, earnings
            qualification, payout protection, and enforcement may work on VideoGad.
          </p>
        </div>

        <Section title="1. Eligibility">
          <p>
            Monetization is available only to creators approved by VideoGad. Approval may depend on
            content quality, account standing, platform activity, policy compliance, audience trust,
            and internal review.
          </p>
        </Section>

        <Section title="2. Non-Guaranteed Access">
          <p>
            Monetization is a platform privilege, not an automatic right. Meeting baseline activity
            does not guarantee approval or continued access.
          </p>
        </Section>

        <Section title="3. Valid Activity">
          <p>
            Only valid activity may count toward monetization eligibility, earnings, or payout
            access. Fraudulent, automated, manipulated, or suspicious views, clicks, engagement, or
            traffic are prohibited.
          </p>
        </Section>

        <Section title="4. Review and Enforcement">
          <p>
            VideoGad may review creator accounts, videos, traffic patterns, product links,
            subscriptions, and monetization behavior at any time.
          </p>
          <p>
            We may pause or remove monetization where policy, trust, safety, or fraud concerns
            arise.
          </p>
        </Section>

        <Section title="5. Earnings and Payout Protection">
          <p>
            VideoGad may hold, delay, adjust, reverse, or deny earnings or payouts where invalid
            activity, abuse, disputes, technical issues, or risk concerns are identified.
          </p>
        </Section>

        <Section title="6. Continued Compliance">
          <p>
            Creators must continue to comply with platform content standards, community rules,
            creator terms, and payment rules in order to retain monetization access.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            For monetization support, contact{' '}
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